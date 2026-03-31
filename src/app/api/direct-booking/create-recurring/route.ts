import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { computeSessionAmount } from '@/lib/utils/booking'
import { generateRecurringDates, checkDateConflicts } from '@/lib/utils/recurring'
import { RecurringBookingSchema } from '@/lib/schemas/booking'

import { sendRecurringBookingConfirmationEmail } from '@/lib/email'

/**
 * POST /api/direct-booking/create-recurring
 *
 * Creates a recurring booking series: validates input, generates date series,
 * checks for conflicts, inserts a recurring_schedules row + individual booking
 * rows, creates a Stripe Customer + PaymentIntent with setup_future_usage
 * for the first session, and returns the client secret + session summary.
 *
 * Auth: requires authenticated Supabase session (parent must be logged in)
 * PaymentIntent: capture_method:'manual', setup_future_usage:'off_session',
 *   destination charge via transfer_data, 7% application_fee
 */
export async function POST(req: Request) {
  // 1. Parse and validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const parsed = RecurringBookingSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const {
    teacherId,
    bookingDate,
    startTime,
    endTime,
    studentName,
    subject,
    notes,
    parentPhone,
    parentSmsOptIn,
    sessionTypeId,
    frequency,
    totalSessions,
  } = parsed.data

  // 2. Authenticate the parent
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 3. Fetch teacher and verify Stripe is connected
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('id, stripe_account_id, stripe_charges_enabled, hourly_rate, full_name, social_email')
    .eq('id', teacherId)
    .single()

  if (!teacher?.stripe_charges_enabled || !teacher.stripe_account_id) {
    return new Response('Teacher not connected to Stripe', { status: 400 })
  }

  // 4. Determine payment amount per session — session type flat price or hourly proration
  let amountInCents: number
  let sessionTypeLabel: string | undefined

  if (sessionTypeId) {
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

    amountInCents = Math.round(Number(sessionType.price) * 100)
    sessionTypeLabel = sessionType.label
  } else {
    amountInCents = computeSessionAmount(startTime, endTime, teacher.hourly_rate ?? 0)
  }

  if (amountInCents < 50) {
    console.error('[create-recurring] Invalid amount:', amountInCents, 'for teacher:', teacher.id)
    return new Response('Invalid session amount', { status: 400 })
  }

  // 5. Generate date series and check for conflicts
  const dates = generateRecurringDates(bookingDate, frequency, totalSessions)
  const { available, skipped } = await checkDateConflicts(
    teacherId,
    dates,
    startTime,
    endTime,
    supabaseAdmin
  )

  if (available.length === 0) {
    return Response.json(
      { error: 'No available dates — all sessions conflict with existing bookings or availability' },
      { status: 409 }
    )
  }

  // 6. Insert recurring_schedules row
  const { data: schedule, error: scheduleError } = await supabaseAdmin
    .from('recurring_schedules')
    .insert({
      teacher_id: teacherId,
      parent_id: user.id,
      parent_email: user.email,
      frequency,
      total_sessions: totalSessions,
      start_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
    })
    .select('id')
    .single()

  if (scheduleError) {
    console.error('[create-recurring] Schedule insert failed:', scheduleError)
    return new Response('Failed to create recurring schedule', { status: 500 })
  }

  const recurringScheduleId = schedule.id

  // 7. Batch-insert booking rows for each available date
  const insertedBookingIds: string[] = []
  const additionalSkipped: { date: string; reason: string }[] = []
  const sessionDates: string[] = []

  for (let i = 0; i < available.length; i++) {
    const date = available[i]
    const isFirst = i === 0

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
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        status: 'requested',
        recurring_schedule_id: recurringScheduleId,
        is_recurring_first: isFirst,
      })
      .select('id')
      .single()

    if (bookingError) {
      // Unique constraint violation — slot was taken between conflict check and insert
      if (bookingError.code === '23505' || bookingError.message?.includes('unique')) {
        additionalSkipped.push({ date, reason: 'slot taken (race condition)' })
        continue
      }
      console.error('[create-recurring] Booking insert failed for', date, bookingError)
      additionalSkipped.push({ date, reason: 'insert failed' })
      continue
    }

    insertedBookingIds.push(booking.id)
    sessionDates.push(date)
  }

  // Combine conflict-check skipped + insert-time skipped
  const allSkipped = [...skipped, ...additionalSkipped]

  // Guard: if all inserts failed, clean up schedule and return 409
  if (insertedBookingIds.length === 0) {
    await supabaseAdmin.from('recurring_schedules').delete().eq('id', recurringScheduleId)
    return Response.json(
      { error: 'No sessions could be created — all dates had conflicts' },
      { status: 409 }
    )
  }

  const firstBookingId = insertedBookingIds[0]

  // 8. Create Stripe Customer + PaymentIntent for the first session
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const applicationFeeAmount = Math.round(amountInCents * 0.07)

  let customer: Stripe.Customer
  let paymentIntent: Stripe.PaymentIntent

  try {
    customer = await stripe.customers.create({
      email: user.email!,
      metadata: { tutelo_user_id: user.id },
    })

    paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      capture_method: 'manual',
      setup_future_usage: 'off_session',
      customer: customer.id,
      transfer_data: { destination: teacher.stripe_account_id },
      application_fee_amount: applicationFeeAmount,
      receipt_email: user.email!,
      metadata: {
        booking_id: firstBookingId,
        teacher_id: teacher.id,
        recurring_schedule_id: recurringScheduleId,
      },
    })
  } catch (err) {
    console.error('[create-recurring] Stripe operation failed:', err)
    // Clean up: delete all inserted bookings + schedule row
    if (insertedBookingIds.length > 0) {
      await supabaseAdmin
        .from('bookings')
        .delete()
        .in('id', insertedBookingIds)
    }
    await supabaseAdmin.from('recurring_schedules').delete().eq('id', recurringScheduleId)
    return new Response('Payment setup failed', { status: 502 })
  }

  // 9. Update recurring_schedules with Stripe customer ID
  await supabaseAdmin
    .from('recurring_schedules')
    .update({ stripe_customer_id: customer.id })
    .eq('id', recurringScheduleId)

  // 10. Fire-and-forget confirmation emails (don't fail the booking if email fails)
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'
    await sendRecurringBookingConfirmationEmail({
      parentEmail: user.email!,
      teacherName: teacher.full_name,
      teacherEmail: teacher.social_email,
      studentName,
      subject: sessionTypeLabel ?? subject,
      frequency,
      sessionDates,
      skippedDates: allSkipped,
      startTime,
      accountUrl: `${appUrl}/account`,
    })
  } catch (emailErr) {
    console.error('[create-recurring] Email sending failed (non-fatal):', emailErr)
  }

  // 11. Return response
  return Response.json({
    clientSecret: paymentIntent.client_secret,
    recurringScheduleId,
    sessionDates,
    skippedDates: allSkipped,
    totalCreated: insertedBookingIds.length,
  })
}
