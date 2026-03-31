-- ============================================================
-- 0015_payment_failed_status.sql
-- M009/S02 — Add 'payment_failed' to bookings status CHECK
-- Required for recurring auto-charge cron to mark failed charges.
-- ============================================================

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('requested','pending','confirmed','completed','cancelled','payment_failed'));
