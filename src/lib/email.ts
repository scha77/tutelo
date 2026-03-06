import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { MoneyWaitingEmail } from '@/emails/MoneyWaitingEmail'
import { BookingNotificationEmail } from '@/emails/BookingNotificationEmail'
import { FollowUpEmail } from '@/emails/FollowUpEmail'
import { UrgentFollowUpEmail } from '@/emails/UrgentFollowUpEmail'
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

export async function sendCheckoutLinkEmail(
  parentEmail: string,
  studentName: string,
  checkoutUrl: string
): Promise<void> {
  await resend.emails.send({
    from: 'Tutelo <noreply@tutelo.app>',
    to: parentEmail,
    subject: `You're booked! Complete payment to confirm your session`,
    text: `Hi! Your tutoring session for ${studentName} is almost confirmed. Click the link below to complete your payment:\n\n${checkoutUrl}\n\nThis link is unique to your booking — do not share it. Once payment is complete your session is locked in.\n\nTutelo · tutelo.app`,
  })
}

export async function sendFollowUpEmail(
  teacherEmail: string,
  teacherFirstName: string,
  studentName: string,
  parentEmail: string,
  bookingDate: string,
  connectStripeUrl: string
): Promise<void> {
  await resend.emails.send({
    from: 'Tutelo <noreply@tutelo.app>',
    to: teacherEmail,
    subject: `Reminder: ${parentEmail} is still waiting for you`,
    react: FollowUpEmail({ teacherFirstName, studentName, parentEmail, bookingDate, connectStripeUrl }),
  })
}

export async function sendUrgentFollowUpEmail(
  teacherEmail: string,
  teacherFirstName: string,
  studentName: string,
  parentEmail: string,
  bookingDate: string,
  cancelDeadline: string,
  connectStripeUrl: string
): Promise<void> {
  await resend.emails.send({
    from: 'Tutelo <noreply@tutelo.app>',
    to: teacherEmail,
    subject: `Last chance — this booking cancels at ${cancelDeadline}`,
    react: UrgentFollowUpEmail({ teacherFirstName, studentName, parentEmail, bookingDate, cancelDeadline, connectStripeUrl }),
  })
}

// Stub for Plan 03 — implemented there
export async function sendCancellationEmail(_bookingId: string): Promise<void> {
  console.log(`[email] sendCancellationEmail stub — implemented in Plan 03`)
}
