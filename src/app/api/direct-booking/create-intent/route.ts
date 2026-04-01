import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { computeSessionAmount } from '@/lib/utils/booking'

/**
 * POST /api/direct-booking/create-intent
 *
 * Creates a booking row and Stripe PaymentIntent for a parent booking directly
 * with a Stripe-connected teacher. This is the direct booking path (Phase 4).
 *
 * Auth: requires authenticated Supabase session (parent must be logged in)
 * Creates booking row with status='requested', parent_id=user.id BEFORE returning clientSecret
 * PaymentIntent: capture_method:'manual', destination charge via on_behalf_of + transfer_data
 * 7% application_fee_amount included at creation time
 *
 * Pricing fork (S03):
 * - If `sessionTypeId` is provided, fetch session_type, verify it belongs to the teacher,
 *   and use its flat `price` (in dollars, converted to cents).
 * - Otherwise, fall back to hourly_rate proration via computeSessionAmount.
 */
export async function POST(req: Request) {
  // 1. Parse request body (not a webhook — req.json() is correct here)
  const body = await req.json()
  const { teacherId, bookingDate, startTime, endTime, studentName, subject, notes, parentPhone, parentSmsOptIn, sessionTypeId, childId } = body

  // 2. Authenticate the parent
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 3. Fetch teacher and verify Stripe is connected
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('id, stripe_account_id, stripe_charges_enabled, hourly_rate')
    .eq('id', teacherId)
    .single()

  if (!teacher?.stripe_charges_enabled || !teacher.stripe_account_id) {
    return new Response('Teacher not connected', { status: 400 })
  }

  // 4. Determine payment amount — session type flat price or hourly_rate proration
  let amountInCents: number
  let sessionTypeLabel: string | undefined

  if (sessionTypeId) {
    // Fetch session type and verify it belongs to this teacher (security check)
    const { data: sessionType, error: stError } = await supabaseAdmin
      .from('session_types')
      .select('id, teacher_id, label, price')
      .eq('id', sessionTypeId)
      .single()

    if (stError || !sessionType) {
      return new Response('Session type not found', { status: 400 })
    }

    if (sessionType.teacher_id !== teacher.id) {
      return new Response('Session type does not belong to this teacher', { status: 400 })
    }

    // price is stored as dollars (NUMERIC(10,2)), convert to cents
    amountInCents = Math.round(Number(sessionType.price) * 100)
    sessionTypeLabel = sessionType.label
  } else {
    // Fallback: hourly_rate proration (existing behavior)
    amountInCents = computeSessionAmount(startTime, endTime, teacher.hourly_rate ?? 0)
  }

  // Stripe minimum is 50 cents; guard against unset hourly_rate or zero-price session types
  if (amountInCents < 50) {
    console.error('[direct-booking/create-intent] Invalid amount:', amountInCents, 'for teacher:', teacher.id)
    return new Response('Invalid session amount', { status: 400 })
  }

  // 5. Create booking row BEFORE creating PaymentIntent (idempotency — booking exists even if PI fails)
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .insert({
      teacher_id: teacherId,
      parent_id: user.id,
      parent_email: user.email,
      student_name: studentName,
      subject: sessionTypeLabel ?? subject,
      notes: notes ?? null,
      parent_phone: parentPhone ?? null,
      parent_sms_opt_in: parentSmsOptIn ?? false,
      child_id: childId ?? null,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      status: 'requested',
    })
    .select('id')
    .single()

  if (bookingError) {
    // Unique constraint violation = slot already taken
    if (bookingError.code === '23505' || bookingError.message?.includes('unique')) {
      return new Response('Slot taken', { status: 409 })
    }
    console.error('[direct-booking/create-intent] Booking insert failed:', bookingError)
    return new Response('Failed to create booking', { status: 500 })
  }

  const bookingId = booking.id

  // 6. Create PaymentIntent with manual capture (authorize only — captured on session completion)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const applicationFeeAmount = Math.round(amountInCents * 0.07)

  let paymentIntent
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      capture_method: 'manual',
      transfer_data: { destination: teacher.stripe_account_id },
      application_fee_amount: applicationFeeAmount,
      receipt_email: user.email,
      metadata: {
        booking_id: bookingId,
        teacher_id: teacher.id,
        ...(sessionTypeId ? { session_type_id: sessionTypeId } : {}),
      },
    })
  } catch (err) {
    console.error('[direct-booking/create-intent] Stripe PI creation failed:', err)
    // Clean up the orphaned booking row so the slot isn't permanently blocked
    await supabaseAdmin.from('bookings').delete().eq('id', bookingId)
    return new Response('Payment setup failed', { status: 502 })
  }

  return Response.json({ clientSecret: paymentIntent.client_secret })
}
