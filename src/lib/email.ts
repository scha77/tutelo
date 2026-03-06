import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { MoneyWaitingEmail } from '@/emails/MoneyWaitingEmail'
import { BookingNotificationEmail } from '@/emails/BookingNotificationEmail'
import type { BookingRequestData } from '@/lib/schemas/booking'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingEmail(
  teacherId: string,
  bookingId: string,
  bookingData: BookingRequestData
): Promise<void> {
  const supabase = await createClient()
  const { data: teacher } = await supabase
    .from('teachers')
    .select('full_name, social_email, stripe_charges_enabled')
    .eq('id', teacherId)
    .single()

  // NOTIF-01 pitfall: social_email is optional — silently skip if not set
  if (!teacher?.social_email) {
    console.warn(`[email] Teacher ${teacherId} has no social_email — skipping notification`)
    return
  }

  const teacherFirstName = teacher.full_name.split(' ')[0]
  const from = 'Tutelo <noreply@tutelo.app>'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'

  if (!teacher.stripe_charges_enabled) {
    // "Money waiting" email — urgent + warm (STRIPE-02)
    await resend.emails.send({
      from,
      to: teacher.social_email,
      subject: 'A parent wants to book you — connect Stripe to confirm',
      react: MoneyWaitingEmail({
        teacherFirstName,
        studentName: bookingData.studentName,
        subject: bookingData.subject,
        bookingDate: bookingData.bookingDate,
        startTime: bookingData.startTime,
        parentEmail: bookingData.email,
        connectStripeUrl: `${appUrl}/dashboard/connect-stripe`,
      }),
    })
  } else {
    // Standard booking notification (NOTIF-01 for Stripe-connected teachers)
    await resend.emails.send({
      from,
      to: teacher.social_email,
      subject: `New booking request from ${bookingData.studentName}'s parent`,
      react: BookingNotificationEmail({
        teacherFirstName,
        studentName: bookingData.studentName,
        subject: bookingData.subject,
        bookingDate: bookingData.bookingDate,
        startTime: bookingData.startTime,
        parentEmail: bookingData.email,
        dashboardUrl: `${appUrl}/dashboard/requests`,
      }),
    })
  }
}
