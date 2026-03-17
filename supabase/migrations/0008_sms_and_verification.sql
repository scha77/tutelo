-- ============================================================
-- 0008_sms_and_verification.sql
-- M005/S01 — SMS phone fields + teacher verification timestamp
-- Additive migration: no existing tables or data modified
-- ============================================================

-- Teacher phone number for SMS notifications (E.164 format, e.g. +12135551234)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Explicit SMS opt-in consent (TCPA compliance)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT FALSE;

-- School email verification timestamp (NULL = unverified, set by S03 verification flow)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Parent phone number on booking (per-booking, no persistent parent account needed)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- Parent SMS opt-in consent per booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS parent_sms_opt_in BOOLEAN DEFAULT FALSE;
