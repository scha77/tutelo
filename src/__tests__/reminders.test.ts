import { describe, it } from 'vitest'

describe('session-reminders cron', () => {
  it.todo('returns 401 when Authorization header is missing or incorrect')
  it.todo('sends reminder email only to bookings with booking_date = tomorrow and reminder_sent_at IS NULL')
  it.todo('idempotent: second cron run skips bookings where reminder_sent_at is already set')
  it.todo('increments sent count only when conditional update succeeds')
  it.todo('does not send reminder for cancelled or completed bookings')
})
