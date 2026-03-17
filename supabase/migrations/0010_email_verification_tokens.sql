-- Migration: Add school email verification token columns to teachers
-- Note: verified_at TIMESTAMPTZ already exists from 0008_sms_and_verification.sql

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS school_email_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS school_email_verification_expires_at TIMESTAMPTZ;

-- Partial index for fast token lookups (only non-null tokens are indexed)
CREATE INDEX IF NOT EXISTS idx_teachers_verification_token
  ON teachers (school_email_verification_token)
  WHERE school_email_verification_token IS NOT NULL;
