// REQUIRES Vercel Pro plan — hourly cron (30 * * * *) is not available on the Hobby plan.
// Upgrade to Pro ($20/mo) before enabling in production.
import * as Sentry from '@sentry/nextjs'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { sendFollowUpEmail, sendUrgentFollowUpEmail } from '@/lib/email'

/**
 * GET /api/cron/stripe-reminders
 *
 * Sends reminder emails to teachers who have pending (requested) bookings but
 * have not yet connected Stripe:
 *   - 24–48hr old booking: warm 24hr reminder (FollowUpEmail)
 *   - 48hr+ old booking: urgent email with auto-cancel deadline (UrgentFollowUpEmail)
 *   - <24hr old: no email (too soon)
 *
 * Bookings where teacher.stripe_charges_enabled = true are skipped — teacher connected.
 * Bookings where teacher.social_email is null are skipped — no email address to send to.
 *
 * Auth: Requires Authorization: Bearer {CRON_SECRET} header (set by Vercel cron).
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error('[cron/stripe-reminders] CRON_SECRET is not configured')
    return new Response('Server misconfiguration', { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const now = Date.now()
  const hr24 = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const hr48 = new Date(now - 48 * 60 * 60 * 1000).toISOString()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'

  // Fetch all requested bookings older than 24hr, joined with teacher
  const { data: pending } = await supabaseAdmin
    .from('bookings')
    .select(
      'id, student_name, parent_email, booking_date, created_at, teacher_id, teachers(full_name, social_email, stripe_charges_enabled)'
    )
    .eq('status', 'requested')
    .lt('created_at', hr24)

  let sent24 = 0
  let sent48 = 0

  for (const booking of pending ?? []) {
    const teacher = (
      booking as unknown as {
        teachers: {
          full_name: string
          social_email: string | null
          stripe_charges_enabled: boolean
        }
      }
    ).teachers

    // Skip if teacher connected or has no email — nothing to do
    if (!teacher || teacher.stripe_charges_enabled || !teacher.social_email) continue

    const teacherFirstName = teacher.full_name.split(' ')[0]
    const connectUrl = `${appUrl}/dashboard/connect-stripe`
    const bookingCreatedAt = new Date(booking.created_at).getTime()

    if (bookingCreatedAt < new Date(hr48).getTime()) {
      // Booking is 48hr+ old — urgent email with explicit auto-cancel deadline
      const cancelDeadline = new Date(bookingCreatedAt + 48 * 60 * 60 * 1000).toLocaleString(
        'en-US',
        { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }
      ) + ' UTC'
      await sendUrgentFollowUpEmail(
        teacher.social_email,
        teacherFirstName,
        booking.student_name,
        booking.parent_email,
        booking.booking_date,
        cancelDeadline,
        connectUrl
      ).catch((err) => { Sentry.captureException(err); console.error('[cron/stripe-reminders] Urgent follow-up email failed:', err) })
      sent48++
    } else {
      // Booking is 24–48hr old — gentle reminder
      await sendFollowUpEmail(
        teacher.social_email,
        teacherFirstName,
        booking.student_name,
        booking.parent_email,
        booking.booking_date,
        connectUrl
      ).catch((err) => { Sentry.captureException(err); console.error('[cron/stripe-reminders] Follow-up email failed:', err) })
      sent24++
    }
  }

  return Response.json({ sent_24hr: sent24, sent_48hr: sent48 })
}
