import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/service'
import { sendRecurringCancellationEmail } from '@/lib/email'

// POST /api/manage/cancel-series
// Token-gated — no auth required. The cancel_token IS the authentication.
export async function POST(request: NextRequest) {
  let body: { token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { token } = body
  if (!token) {
    return NextResponse.json(
      { error: 'Missing required field: token' },
      { status: 400 }
    )
  }

  // Look up schedule by cancel_token
  const { data: schedule } = await supabaseAdmin
    .from('recurring_schedules')
    .select('id')
    .eq('cancel_token', token)
    .maybeSingle()

  if (!schedule) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }

  const todayStr = new Date().toISOString().split('T')[0]

  // Fetch all future non-cancelled bookings for this schedule
  const { data: futureBookings } = await supabaseAdmin
    .from('bookings')
    .select('id, stripe_payment_intent')
    .eq('recurring_schedule_id', schedule.id)
    .gte('booking_date', todayStr)
    .in('status', ['requested', 'confirmed', 'payment_failed'])

  const bookings = futureBookings ?? []

  if (bookings.length === 0) {
    return NextResponse.json({ success: true, cancelledCount: 0 })
  }

  // Void Stripe PIs for each booking (non-blocking on errors)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  for (const booking of bookings) {
    if (booking.stripe_payment_intent) {
      try {
        await stripe.paymentIntents.cancel(booking.stripe_payment_intent)
      } catch (err) {
        Sentry.captureException(err)
        console.error(
          `[cancel-series] Failed to cancel Stripe PI ${booking.stripe_payment_intent}:`,
          err
        )
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
  sendRecurringCancellationEmail({ scheduleId: schedule.id }).catch((err) => { Sentry.captureException(err); console.error('[cancel-series] Series cancellation email failed:', err) })

  return NextResponse.json({ success: true, cancelledCount: bookings.length })
}
