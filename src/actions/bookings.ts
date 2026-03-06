'use server'

import { createClient } from '@/lib/supabase/server'
import { BookingRequestSchema } from '@/lib/schemas/booking'
import { revalidatePath } from 'next/cache'
import Stripe from 'stripe'

export type BookingResult =
  | { success: true; bookingId: string }
  | { success: false; error: 'slot_taken' | 'validation' | 'server' }

export async function submitBookingRequest(formData: unknown): Promise<BookingResult> {
  const parsed = BookingRequestSchema.safeParse(formData)
  if (!parsed.success) return { success: false, error: 'validation' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_booking', {
    p_teacher_id: parsed.data.teacherId,
    p_parent_email: parsed.data.email,
    p_student_name: parsed.data.studentName,
    p_subject: parsed.data.subject,
    p_booking_date: parsed.data.bookingDate,
    p_start_time: parsed.data.startTime,
    p_end_time: parsed.data.endTime,
    p_notes: parsed.data.notes ?? null,
  })

  if (error) return { success: false, error: 'server' }

  const result = data as { success: boolean; booking_id?: string; error?: string }

  if (!result.success) {
    return {
      success: false,
      error: result.error === 'slot_taken' ? 'slot_taken' : 'server',
    }
  }

  // Fire email notification — do not await so booking confirmation is not delayed.
  // sendBookingEmail is a no-op stub in src/lib/email.ts until Plan 02-03 wires up Resend.
  try {
    const { sendBookingEmail } = await import('@/lib/email')
    sendBookingEmail(parsed.data.teacherId, result.booking_id!, parsed.data).catch(
      console.error
    )
  } catch {
    // Defensive catch — silent fail if email module errors
  }

  revalidatePath('/[slug]', 'page')
  return { success: true, bookingId: result.booking_id! }
}

export async function acceptBooking(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Not authenticated' }

  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (teacherError || !teacher) return { error: 'Teacher not found' }

  const { count, error } = await supabase
    .from('bookings')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('teacher_id', teacher.id)
    .eq('status', 'requested')

  if (error) return { error: error.message }
  if (count === 0) return { error: 'Not found or already actioned' }

  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function markSessionComplete(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Not authenticated' }

  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (teacherError || !teacher) return { error: 'Teacher not found' }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, stripe_payment_intent')
    .eq('id', bookingId)
    .eq('teacher_id', teacher.id)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (!booking) return { error: 'Booking not found or not in confirmed state' }
  if (!booking.stripe_payment_intent) return { error: 'No payment intent found' }

  // Retrieve PaymentIntent to get capturable amount
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent)
  const amountToCapture = paymentIntent.amount_capturable ?? paymentIntent.amount
  const applicationFee = Math.round(amountToCapture * 0.07) // STRIPE-07: 7% platform fee

  // Capture payment with platform fee
  await stripe.paymentIntents.capture(booking.stripe_payment_intent, {
    amount_to_capture: amountToCapture,
    application_fee_amount: applicationFee,
  })

  // Update booking status
  await supabase
    .from('bookings')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  // Send session-complete email to parent (NOTIF-06) — fire and forget
  const { sendSessionCompleteEmail } = await import('@/lib/email')
  sendSessionCompleteEmail(bookingId).catch(console.error)

  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function declineBooking(
  bookingId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Not authenticated' }

  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (teacherError || !teacher) return { error: 'Teacher not found' }

  const { count, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('teacher_id', teacher.id)
    .eq('status', 'requested')

  if (error) return { error: error.message }
  if (count === 0) return { error: 'Not found or already actioned' }

  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
