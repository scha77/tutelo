-- Phase 4: Direct Booking + Parent Account
-- Adds reminder_sent_at column to bookings table for 24hr session reminder cron.
-- NULL = reminder not yet sent (cron reads IS NULL to find unsent records).
-- Set to current timestamp when reminder email is dispatched.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Partial index for cron query performance.
-- Only indexes confirmed bookings with unsent reminders — the exact set the cron queries.
CREATE INDEX IF NOT EXISTS idx_bookings_reminder
  ON bookings (booking_date, status, reminder_sent_at)
  WHERE status = 'confirmed' AND reminder_sent_at IS NULL;
