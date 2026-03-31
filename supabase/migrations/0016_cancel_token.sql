-- ============================================================
-- 0016_cancel_token.sql
-- M009/S03 — Add cancel_token column to recurring_schedules
-- Enables parent self-service cancellation via /manage/[token]
-- ============================================================

ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS cancel_token TEXT UNIQUE;

ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS cancel_token_created_at TIMESTAMPTZ;

-- Partial index for fast token lookups (only non-null tokens)
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_cancel_token
  ON recurring_schedules (cancel_token)
  WHERE cancel_token IS NOT NULL;
