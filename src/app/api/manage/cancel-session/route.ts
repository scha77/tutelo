import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/service'
import { sendCancellationEmail } from '@/lib/email'

// POST /api/manage/cancel-session
// Token-gated — no auth required. The cancel_token IS the authentication.
export async function POST(request: NextRequest) {
  let body: { bookingId?: string; token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { bookingId, token } = body
  if (!bookingId || !token) {
    return NextResponse.json(
      { error: 'Missing required fields: bookingId, token' },
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

  // Verify the booking belongs to this schedule AND is in a cancellable state
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, stripe_payment_intent, status')
    .eq('id', bookingId)
    .eq('recurring_schedule_id', schedule.id)
    .in('status', ['requested', 'confirmed', 'payment_failed'])
    .maybeSingle()

  if (!booking) {
    return NextResponse.json(
      { error: 'Booking not found or not in cancellable state' },
      { status: 404 }
    )
  }

  // Void the Stripe PaymentIntent if present (non-blocking on failure)
  if (booking.stripe_payment_intent) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      await stripe.paymentIntents.cancel(booking.stripe_payment_intent)
    } catch (err) {
      Sentry.captureException(err)
      console.error(
        `[cancel-session] Failed to cancel Stripe PI ${booking.stripe_payment_intent}:`,
        err
      )
    }
  }

  // Update booking status to cancelled
  await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  // Send cancellation email — fire and forget
  sendCancellationEmail(bookingId).catch((err) => { Sentry.captureException(err); console.error('[cancel-session] Cancellation email failed:', err) })

  return NextResponse.json({ success: true })
}
