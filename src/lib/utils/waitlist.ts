import * as Sentry from '@sentry/nextjs'
import { supabaseAdmin } from '@/lib/supabase/service'
import { getCapacityStatus } from '@/lib/utils/capacity'
import { sendWaitlistNotificationEmail } from '@/lib/email'

/**
 * After a booking cancellation, re-check if the teacher now has capacity.
 * If a spot freed up, notify all unnotified waitlisted parents via email
 * and stamp their notified_at timestamp.
 *
 * Fire-and-forget safe — all errors are caught and logged.
 */
export async function checkAndNotifyWaitlist(teacherId: string): Promise<void> {
  try {
    // Fetch teacher details
    const { data: teacher } = await supabaseAdmin
      .from('teachers')
      .select('capacity_limit, slug, full_name')
      .eq('id', teacherId)
      .single()

    if (!teacher || teacher.capacity_limit == null) return

    // Re-check capacity after cancellation
    const { atCapacity } = await getCapacityStatus(
      supabaseAdmin,
      teacherId,
      teacher.capacity_limit
    )
    if (atCapacity) return // Still full — no spot freed

    // Fetch unnotified waitlist entries
    const { data: entries } = await supabaseAdmin
      .from('waitlist')
      .select('id, parent_email')
      .eq('teacher_id', teacherId)
      .is('notified_at', null)

    if (!entries || entries.length === 0) return

    const notifiedIds: string[] = []

    for (const entry of entries) {
      try {
        await sendWaitlistNotificationEmail(
          entry.parent_email,
          teacher.full_name,
          teacher.slug
        )
        notifiedIds.push(entry.id)
      } catch (error) {
        Sentry.captureException(error)
        console.error('[waitlist] Failed to send notification', {
          teacher_id: teacherId,
          parent_email: entry.parent_email,
          error,
        })
      }
    }

    // Batch-stamp notified_at for successfully-sent entries
    if (notifiedIds.length > 0) {
      await supabaseAdmin
        .from('waitlist')
        .update({ notified_at: new Date().toISOString() })
        .in('id', notifiedIds)
    }
  } catch (error) {
    Sentry.captureException(error)
    console.error('[waitlist] checkAndNotifyWaitlist failed', {
      teacher_id: teacherId,
      error,
    })
  }
}
