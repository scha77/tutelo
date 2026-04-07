// REQUIRES Vercel Pro plan — daily cron (0 9 * * *) is not available on Hobby plan.
import * as Sentry from '@sentry/nextjs'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { sendSessionReminderEmail } from '@/lib/email'
import { sendSmsReminder } from '@/lib/sms'

/**
 * GET /api/cron/session-reminders
 *
 * Sends 24-hour reminder emails to teachers and parents for confirmed sessions
 * scheduled for tomorrow (UTC date). Runs daily at 9 AM UTC.
 *
 * Idempotency: The update is gated on .is('reminder_sent_at', null) — a second run
 * finds 0 rows to update because reminder_sent_at was already set on first run.
 * Email is only sent when the row update succeeds (updated.length > 0).
 *
 * Auth: Requires Authorization: Bearer {CRON_SECRET} header (set by Vercel cron).
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error('[cron/session-reminders] CRON_SECRET is not configured')
    return new Response('Server misconfiguration', { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Use a 12–36 hour window from now to cover all timezones (UTC-12 to UTC+14).
  // A PST teacher with a 9 AM session on April 5 won't be missed when the cron
  // runs at 9 AM UTC on April 4 (still April 4 in PST).
  const now = new Date()
  const windowStart = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const windowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Find confirmed sessions within the reminder window that haven't been notified
  const { data: sessions } = await supabaseAdmin
    .from('bookings')
    .select('id, parent_email, booking_date, start_time, teachers(full_name, social_email)')
    .gte('booking_date', windowStart)
    .lte('booking_date', windowEnd)
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)

  let sent = 0
  for (const session of sessions ?? []) {
    // Idempotent update: .is('reminder_sent_at', null) ensures only first cron run sets the flag
    const { data: updated } = await supabaseAdmin
      .from('bookings')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', session.id)
      .is('reminder_sent_at', null)
      .select('id')

    if (updated && updated.length > 0) {
      // Only notify if this run actually set the flag — prevents duplicates on re-run
      await sendSessionReminderEmail(session.id).catch((err) => { Sentry.captureException(err); console.error('[cron/session-reminders] Email send failed:', err) })
      sendSmsReminder(session.id).catch((err) => { Sentry.captureException(err); console.error('[cron/session-reminders] SMS send failed:', err) })
      sent++
    }
  }

  return Response.json({ sent, checked: sessions?.length ?? 0 })
}
