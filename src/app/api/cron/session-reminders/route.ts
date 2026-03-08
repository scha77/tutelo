// REQUIRES Vercel Pro plan — daily cron (0 9 * * *) is not available on Hobby plan.
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { sendSessionReminderEmail } from '@/lib/email'

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
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Tomorrow's date in UTC (YYYY-MM-DD)
  const tomorrowUtc = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  // Find confirmed sessions tomorrow that have not yet received a reminder
  const { data: sessions } = await supabaseAdmin
    .from('bookings')
    .select('id, parent_email, booking_date, start_time, teachers(full_name, social_email)')
    .eq('booking_date', tomorrowUtc)
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
      // Only email if this run actually set the flag — prevents duplicates on re-run
      await sendSessionReminderEmail(session.id).catch(console.error)
      sent++
    }
  }

  return Response.json({ sent, checked: sessions?.length ?? 0 })
}
