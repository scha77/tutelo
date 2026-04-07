// REQUIRES Vercel Pro plan — hourly cron (0 * * * *) is not available on the Hobby plan.
// Upgrade to Pro ($20/mo) before enabling in production.
import * as Sentry from '@sentry/nextjs'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { sendCancellationEmail } from '@/lib/email'

/**
 * GET /api/cron/auto-cancel
 *
 * Cancels requested bookings that are older than 48 hours where the teacher
 * still has not connected Stripe (stripe_charges_enabled = false).
 *
 * Idempotency: The update is gated on .eq('status', 'requested') — a second run
 * finds 0 rows to update because status was already changed to 'cancelled'.
 * Cancellation email is only sent when the row update succeeds (updated.length > 0).
 *
 * Auth: Requires Authorization: Bearer {CRON_SECRET} header (set by Vercel cron).
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error('[cron/auto-cancel] CRON_SECRET is not configured')
    return new Response('Server misconfiguration', { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // Fetch expired requested bookings — joined with teacher to check Stripe status
  const { data: expired } = await supabaseAdmin
    .from('bookings')
    .select('id, parent_email, teacher_id')
    .eq('status', 'requested')
    .lt('created_at', cutoff)

  let cancelled = 0
  for (const booking of expired ?? []) {
    // Verify teacher still hasn't connected Stripe — guards against race where teacher
    // connects Stripe between our query and this check
    const { data: teacher } = await supabaseAdmin
      .from('teachers')
      .select('stripe_charges_enabled, social_email, full_name')
      .eq('id', booking.teacher_id)
      .maybeSingle()

    if (!teacher?.stripe_charges_enabled) {
      // Idempotent update — .eq('status', 'requested') prevents double-cancel on re-run
      const { data: updated } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', booking.id)
        .eq('status', 'requested')
        .select('id')

      if (updated && updated.length > 0) {
        // Only email if update actually changed a row — updated is [] on re-run because
        // .eq('status', 'requested') no longer matches the already-cancelled booking
        await sendCancellationEmail(booking.id).catch((err) => { Sentry.captureException(err); console.error('[cron/auto-cancel] Cancellation email failed:', err) })
        cancelled++
      }
    }
  }

  return Response.json({ cancelled, total_checked: expired?.length ?? 0 })
}
