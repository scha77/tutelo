import type { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/service'
import { computeSessionAmount } from '@/lib/utils/booking'
import { sendRecurringPaymentFailedEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * GET /api/cron/recurring-charges
 *
 * Daily cron (0 12 * * *) that auto-charges parents' saved cards 24h before
 * each recurring session. Only processes non-first recurring bookings that are
 * still in 'requested' status (first session is paid at booking time).
 *
 * Auth: Requires Authorization: Bearer {CRON_SECRET} header (set by Vercel cron).
 *
 * Idempotency:
 * - Stripe idempotencyKey per booking+date prevents double charges on retry
 * - .eq('status', 'requested') prevents double DB update if already confirmed
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Tomorrow's date in UTC (YYYY-MM-DD)
  const tomorrowUtc = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  // Find non-first recurring sessions for tomorrow that haven't been charged yet
  const { data: sessions, error: queryError } = await supabaseAdmin
    .from('bookings')
    .select(
      'id, teacher_id, start_time, end_time, recurring_schedule_id, recurring_schedules!inner(stripe_customer_id, stripe_payment_method_id, teachers!inner(stripe_account_id, hourly_rate, full_name, social_email))'
    )
    .eq('booking_date', tomorrowUtc)
    .eq('status', 'requested')
    .eq('is_recurring_first', false)
    .not('recurring_schedule_id', 'is', null)

  if (queryError) {
    console.error('[recurring-charges] Failed to query sessions:', queryError)
    return Response.json({ error: 'Query failed' }, { status: 500 })
  }

  let charged = 0
  let failed = 0
  let skipped = 0

  for (const session of sessions ?? []) {
    const bookingId = session.id
    const schedule = session.recurring_schedules as unknown as {
      stripe_customer_id: string | null
      stripe_payment_method_id: string | null
      teachers: {
        stripe_account_id: string
        hourly_rate: number
        full_name: string
        social_email: string | null
      }
    }

    // Skip if no saved payment method
    if (!schedule.stripe_payment_method_id) {
      console.log(`[recurring-charges] Skipped booking ${bookingId} — no payment method`)
      skipped++
      continue
    }

    // Compute amount from session duration × hourly rate
    const amountInCents = computeSessionAmount(
      session.start_time,
      session.end_time,
      schedule.teachers.hourly_rate
    )
    const applicationFeeAmount = Math.round(amountInCents * 0.07)

    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: 'usd',
          customer: schedule.stripe_customer_id!,
          payment_method: schedule.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          capture_method: 'manual',
          transfer_data: { destination: schedule.teachers.stripe_account_id },
          application_fee_amount: applicationFeeAmount,
          metadata: {
            booking_id: bookingId,
            teacher_id: session.teacher_id,
            recurring_schedule_id: session.recurring_schedule_id!,
          },
        },
        { idempotencyKey: `recurring-charge-${bookingId}-${tomorrowUtc}` }
      )

      // Success — update booking to confirmed with PI ID
      await supabaseAdmin
        .from('bookings')
        .update({
          status: 'confirmed',
          stripe_payment_intent: pi.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .eq('status', 'requested')

      console.log(`[recurring-charges] Charged booking ${bookingId}`)
      charged++
    } catch (err) {
      const stripeError = err as Stripe.errors.StripeError
      console.error(
        `[recurring-charges] Payment failed for booking ${bookingId}: ${stripeError.code ?? stripeError.message}`
      )

      // Mark booking as payment_failed
      await supabaseAdmin
        .from('bookings')
        .update({
          status: 'payment_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .eq('status', 'requested')

      // Fire-and-forget email notification
      sendRecurringPaymentFailedEmail({ bookingId }).catch((emailErr) =>
        console.error(`[recurring-charges] Failed to send failure email for ${bookingId}:`, emailErr)
      )

      failed++
    }
  }

  console.log(
    `[recurring-charges] Complete: charged=${charged} failed=${failed} skipped=${skipped} checked=${sessions?.length ?? 0}`
  )

  return Response.json({
    charged,
    failed,
    skipped,
    checked: sessions?.length ?? 0,
  })
}
