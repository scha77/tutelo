import * as Sentry from '@sentry/nextjs'
import Twilio from 'twilio'
import { parsePhoneNumber } from 'libphonenumber-js'
import { supabaseAdmin } from '@/lib/supabase/service'

const twilio = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER!

/**
 * Format a phone number to E.164. Returns null if invalid.
 */
function toE164(phone: string): string | null {
  try {
    const parsed = parsePhoneNumber(phone, 'US')
    return parsed && parsed.isValid() ? parsed.format('E.164') : null
  } catch {
    return null
  }
}

/**
 * Send an SMS message. Logs errors but never throws.
 */
async function sendSms(to: string, body: string): Promise<void> {
  try {
    await twilio.messages.create({ to, from: FROM_NUMBER, body })
  } catch (err) {
    Sentry.captureException(err)
    console.error(`[sms] Failed to send SMS:`, err)
  }
}

/**
 * Send SMS session reminder to both teacher (if opted-in) and parent (if opted-in).
 * Called by the session-reminders cron after email dispatch.
 */
export async function sendSmsReminder(bookingId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select(
      'student_name, subject, booking_date, start_time, parent_phone, parent_sms_opt_in, teachers(full_name, phone_number, sms_opt_in)'
    )
    .eq('id', bookingId)
    .single()

  if (!data) {
    console.warn(`[sms] Booking ${bookingId} not found — skipping reminder SMS`)
    return
  }

  const teacher = data.teachers as unknown as {
    full_name: string
    phone_number: string | null
    sms_opt_in: boolean
  }

  // Teacher SMS
  if (teacher.phone_number && teacher.sms_opt_in) {
    const e164 = toE164(teacher.phone_number)
    if (e164) {
      await sendSms(
        e164,
        `Tutelo reminder: You have a session with ${data.student_name} for ${data.subject} tomorrow at ${data.start_time.slice(0, 5)}.`
      )
    } else {
      console.warn(`[sms] Invalid teacher phone for booking ${bookingId} — skipping teacher SMS`)
    }
  } else {
    console.warn(`[sms] Teacher not opted in for booking ${bookingId} — skipping teacher SMS`)
  }

  // Parent SMS
  if (data.parent_phone && data.parent_sms_opt_in) {
    const e164 = toE164(data.parent_phone)
    if (e164) {
      await sendSms(
        e164,
        `Tutelo reminder: ${data.student_name}'s session with ${teacher.full_name} for ${data.subject} is tomorrow at ${data.start_time.slice(0, 5)}.`
      )
    } else {
      console.warn(`[sms] Invalid parent phone for booking ${bookingId} — skipping parent SMS`)
    }
  }
}

/**
 * Send SMS cancellation alert to both teacher (if opted-in) and parent (if opted-in).
 * Called by cancelSession action after email dispatch. Fire-and-forget.
 */
export async function sendSmsCancellation(bookingId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select(
      'student_name, booking_date, start_time, parent_phone, parent_sms_opt_in, teachers(full_name, phone_number, sms_opt_in)'
    )
    .eq('id', bookingId)
    .single()

  if (!data) {
    console.warn(`[sms] Booking ${bookingId} not found — skipping cancellation SMS`)
    return
  }

  const teacher = data.teachers as unknown as {
    full_name: string
    phone_number: string | null
    sms_opt_in: boolean
  }

  // Parent SMS
  if (data.parent_phone && data.parent_sms_opt_in) {
    const e164 = toE164(data.parent_phone)
    if (e164) {
      await sendSms(
        e164,
        `Tutelo: ${data.student_name}'s session with ${teacher.full_name} on ${data.booking_date} at ${data.start_time.slice(0, 5)} has been cancelled.`
      )
    }
  }

  // Teacher SMS
  if (teacher.phone_number && teacher.sms_opt_in) {
    const e164 = toE164(teacher.phone_number)
    if (e164) {
      await sendSms(
        e164,
        `Tutelo: Your session with ${data.student_name} on ${data.booking_date} at ${data.start_time.slice(0, 5)} has been cancelled.`
      )
    }
  }
}
