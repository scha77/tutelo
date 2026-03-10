import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { MoneyWaitingEmail } from '@/emails/MoneyWaitingEmail'
import { BookingNotificationEmail } from '@/emails/BookingNotificationEmail'
import { FollowUpEmail } from '@/emails/FollowUpEmail'
import { UrgentFollowUpEmail } from '@/emails/UrgentFollowUpEmail'
import { BookingConfirmationEmail } from '@/emails/BookingConfirmationEmail'
import { CancellationEmail } from '@/emails/CancellationEmail'
import { SessionCompleteEmail } from '@/emails/SessionCompleteEmail'
import { SessionReminderEmail } from '@/emails/SessionReminderEmail'
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

export async function sendBookingConfirmationEmail(
  bookingId: string,
  options?: { accountUrl?: string }
): Promise<void> {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('parent_email, student_name, subject, booking_date, start_time, teachers(full_name, social_email)')
    .eq('id', bookingId)
    .single()
  if (!data) return

  const teacher = data.teachers as unknown as { full_name: string; social_email: string | null }
  const teacherFirstName = teacher.full_name.split(' ')[0]
  const from = 'Tutelo <noreply@tutelo.app>'

  // Email parent — pass accountUrl so they can find session history at /account (PARENT-02)
  await resend.emails.send({
    from,
    to: data.parent_email,
    subject: `Booking confirmed — ${data.student_name}'s session with ${teacher.full_name}`,
    react: BookingConfirmationEmail({
      recipientFirstName: 'there', // Parent name not collected at MVP
      studentName: data.student_name,
      subject: data.subject,
      bookingDate: data.booking_date,
      startTime: data.start_time,
      teacherName: teacher.full_name,
      isTeacher: false,
      accountUrl: options?.accountUrl, // Only passed for parent-facing email
    }),
  })

  // Email teacher (if social_email set)
  if (teacher.social_email) {
    await resend.emails.send({
      from,
      to: teacher.social_email,
      subject: `Booking confirmed — ${data.student_name} has paid`,
      react: BookingConfirmationEmail({
        recipientFirstName: teacherFirstName,
        studentName: data.student_name,
        subject: data.subject,
        bookingDate: data.booking_date,
        startTime: data.start_time,
        teacherName: teacher.full_name,
        isTeacher: true,
      }),
    })
  }
}

export async function sendCancellationEmail(bookingId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('parent_email, student_name, booking_date, start_time, teachers(full_name, social_email)')
    .eq('id', bookingId)
    .single()
  if (!data) return

  const teacher = data.teachers as unknown as { full_name: string; social_email: string | null }
  const teacherFirstName = teacher.full_name.split(' ')[0]
  const from = 'Tutelo <noreply@tutelo.app>'

  await resend.emails.send({
    from,
    to: data.parent_email,
    subject: `Your booking for ${data.student_name} has been cancelled`,
    react: CancellationEmail({
      recipientFirstName: 'there',
      studentName: data.student_name,
      bookingDate: data.booking_date,
      startTime: data.start_time,
      isTeacher: false,
    }),
  })

  if (teacher.social_email) {
    await resend.emails.send({
      from,
      to: teacher.social_email,
      subject: `Booking for ${data.student_name} was cancelled`,
      react: CancellationEmail({
        recipientFirstName: teacherFirstName,
        studentName: data.student_name,
        bookingDate: data.booking_date,
        startTime: data.start_time,
        isTeacher: true,
      }),
    })
  }
}

export async function sendSessionReminderEmail(bookingId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('parent_email, student_name, subject, booking_date, start_time, teachers(full_name, social_email)')
    .eq('id', bookingId)
    .single()
  if (!data) return

  const teacher = data.teachers as unknown as { full_name: string; social_email: string | null }
  const teacherFirstName = teacher.full_name.split(' ')[0]
  const from = 'Tutelo <noreply@tutelo.app>'

  // Email parent
  await resend.emails.send({
    from,
    to: data.parent_email,
    subject: `Reminder: ${data.student_name}'s session with ${teacher.full_name} is tomorrow`,
    react: SessionReminderEmail({
      recipientFirstName: 'there',
      studentName: data.student_name,
      subject: data.subject,
      bookingDate: data.booking_date,
      startTime: data.start_time.slice(0, 5),
      teacherName: teacher.full_name,
      isTeacher: false,
    }),
  })

  // Email teacher (only if social_email is set)
  if (teacher.social_email) {
    await resend.emails.send({
      from,
      to: teacher.social_email,
      subject: `Reminder: Your session with ${data.student_name} is tomorrow`,
      react: SessionReminderEmail({
        recipientFirstName: teacherFirstName,
        studentName: data.student_name,
        subject: data.subject,
        bookingDate: data.booking_date,
        startTime: data.start_time.slice(0, 5),
        teacherName: teacher.full_name,
        isTeacher: true,
      }),
    })
  }
}

export async function sendSessionCompleteEmail(bookingId: string, reviewToken: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('parent_email, student_name, teachers(full_name)')
    .eq('id', bookingId)
    .single()
  if (!data) return

  const teacher = data.teachers as unknown as { full_name: string }
  const reviewUrl = `${appUrl}/review/${reviewToken}`

  await resend.emails.send({
    from: 'Tutelo <noreply@tutelo.app>',
    to: data.parent_email,
    subject: `How was ${data.student_name}'s session with ${teacher.full_name}?`,
    react: SessionCompleteEmail({
      parentFirstName: 'there',
      studentName: data.student_name,
      teacherName: teacher.full_name,
      reviewUrl,
    }),
  })
}
