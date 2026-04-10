import * as Sentry from '@sentry/nextjs'
import Twilio from 'twilio'
import { parsePhoneNumber } from 'libphonenumber-js'
import { supabaseAdmin } from '@/lib/supabase/service'

/**
 * Twilio is optional. If credentials are not set (e.g. pre-A2P 10DLC launch),
 * all SMS calls become silent no-ops rather than crashing at module import.
 * This keeps the booking/cron flows unaffected when SMS is disabled.
 */
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER

const SMS_ENABLED = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && FROM_NUMBER)

const twilio = SMS_ENABLED
  ? Twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!)
  : null

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
 * No-op when Twilio credentials are not configured.
 */
async function sendSms(to: string, body: string): Promise<void> {
  if (!twilio || !FROM_NUMBER) {
    console.info(`[sms] Skipped (Twilio not configured): to=${to}`)
    return
  }
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
  if (!SMS_ENABLED) {
    console.info(`[sms] sendSmsReminder skipped for ${bookingId} — Twilio not configured`)
    return
  }
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
  if (!SMS_ENABLED) {
    console.info(`[sms] sendSmsCancellation skipped for ${bookingId} — Twilio not configured`)
    return
  }
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
