'use server'

import { createClient } from '@/lib/supabase/server'
import { BookingRequestSchema } from '@/lib/schemas/booking'
import { revalidatePath, updateTag } from 'next/cache'

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

  // Store parent phone (post-insert — create_booking RPC doesn't accept phone params)
  if (parsed.data.parent_phone?.trim()) {
    try {
      const { supabaseAdmin } = await import('@/lib/supabase/service')
      await supabaseAdmin
        .from('bookings')
        .update({
          parent_phone: parsed.data.parent_phone.trim(),
          parent_sms_opt_in: parsed.data.parent_sms_opt_in ?? false,
        })
        .eq('id', result.booking_id!)
    } catch (err) {
      console.warn('[submitBookingRequest] Failed to store parent phone for booking', result.booking_id, err)
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

  updateTag(`overview-${teacher.id}`)
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
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent)
  const amountToCapture = paymentIntent.amount_capturable ?? paymentIntent.amount
  const applicationFee = Math.round(amountToCapture * 0.07) // STRIPE-07: 7% platform fee

  // Capture payment with platform fee
  await stripe.paymentIntents.capture(booking.stripe_payment_intent, {
    amount_to_capture: amountToCapture,
    application_fee_amount: applicationFee,
  })

  // Generate review token (DASH-05)
  const reviewToken = Array.from(
    crypto.getRandomValues(new Uint8Array(32)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('')

  // Update booking status + write amount_cents
  await supabase
    .from('bookings')
    .update({ status: 'completed', updated_at: new Date().toISOString(), amount_cents: amountToCapture })
    .eq('id', bookingId)

  // Insert review stub — service role bypasses RLS (reviews_insert_token_stub policy)
  const { supabaseAdmin } = await import('@/lib/supabase/service')
  await supabaseAdmin
    .from('reviews')
    .insert({
      booking_id: bookingId,
      teacher_id: teacher.id,
      token: reviewToken,
    })

  // Send session-complete email to parent (NOTIF-06) — fire and forget
  const { sendSessionCompleteEmail } = await import('@/lib/email')
  sendSessionCompleteEmail(bookingId, reviewToken).catch(console.error)

  updateTag(`overview-${teacher.id}`)
  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/dashboard/sessions')
  return { success: true }
}

export async function cancelSession(
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

  // Void the Stripe PaymentIntent if present (releases hold on parent's card)
  if (booking.stripe_payment_intent) {
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      await stripe.paymentIntents.cancel(booking.stripe_payment_intent)
    } catch (err) {
      console.error(`[cancelSession] Failed to cancel Stripe PI ${booking.stripe_payment_intent}:`, err)
      // Non-blocking: PI authorization will auto-expire; proceed with DB update
    }
  } else {
    console.warn(`[cancelSession] Booking ${bookingId} has no stripe_payment_intent — skipping Stripe void`)
  }

  // Update booking status
  await supabase
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  // Send cancellation email to parent (and teacher) — fire and forget
  const { sendCancellationEmail } = await import('@/lib/email')
  sendCancellationEmail(bookingId).catch(console.error)

  // Send cancellation SMS to opted-in recipients — fire and forget
  const { sendSmsCancellation } = await import('@/lib/sms')
  sendSmsCancellation(bookingId).catch(console.error)

  // Notify waitlisted parents if capacity freed — fire and forget
  const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist')
  checkAndNotifyWaitlist(teacher.id).catch(console.error)

  updateTag(`overview-${teacher.id}`)
  revalidatePath('/dashboard/sessions')
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

  updateTag(`overview-${teacher.id}`)
  revalidatePath('/dashboard/requests')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function cancelSingleRecurringSession(
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

  // Fetch booking — supports confirmed, requested, and payment_failed statuses
  const { supabaseAdmin } = await import('@/lib/supabase/service')
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, stripe_payment_intent, status')
    .eq('id', bookingId)
    .eq('teacher_id', teacher.id)
    .in('status', ['requested', 'confirmed', 'payment_failed'])
    .maybeSingle()

  if (!booking) return { error: 'Booking not found or not in cancellable state' }

  // Void the Stripe PaymentIntent if present
  if (booking.stripe_payment_intent) {
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      await stripe.paymentIntents.cancel(booking.stripe_payment_intent)
    } catch (err) {
      console.error(`[cancelSingleRecurringSession] Failed to cancel Stripe PI ${booking.stripe_payment_intent}:`, err)
    }
  }

  // Update booking status
  await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  // Send cancellation email — fire and forget
  const { sendCancellationEmail } = await import('@/lib/email')
  sendCancellationEmail(bookingId).catch(console.error)

  updateTag(`overview-${teacher.id}`)
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function cancelRecurringSeries(
  scheduleId: string
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

  // Verify schedule belongs to this teacher
  const { supabaseAdmin } = await import('@/lib/supabase/service')
  const { data: schedule } = await supabaseAdmin
    .from('recurring_schedules')
    .select('id, teacher_id')
    .eq('id', scheduleId)
    .eq('teacher_id', teacher.id)
    .maybeSingle()

  if (!schedule) return { error: 'Schedule not found or not owned by teacher' }

  const todayStr = new Date().toISOString().split('T')[0]

  // Fetch all future non-cancelled bookings
  const { data: futureBookings } = await supabaseAdmin
    .from('bookings')
    .select('id, stripe_payment_intent')
    .eq('recurring_schedule_id', scheduleId)
    .gte('booking_date', todayStr)
    .in('status', ['requested', 'confirmed', 'payment_failed'])

  const bookings = futureBookings ?? []

  if (bookings.length === 0) {
    return { success: true } // Nothing to cancel
  }

  // Void Stripe PIs for each booking (non-blocking on errors)
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  for (const booking of bookings) {
    if (booking.stripe_payment_intent) {
      try {
        await stripe.paymentIntents.cancel(booking.stripe_payment_intent)
      } catch (err) {
        console.error(`[cancelRecurringSeries] Failed to cancel Stripe PI ${booking.stripe_payment_intent}:`, err)
      }
    }
  }

  // Batch update all matched bookings to cancelled
  const bookingIds = bookings.map((b) => b.id)
  await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .in('id', bookingIds)

  // Send series cancellation email — fire and forget
  const { sendRecurringCancellationEmail } = await import('@/lib/email')
  sendRecurringCancellationEmail({ scheduleId }).catch(console.error)

  updateTag(`overview-${teacher.id}`)
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
