-- ============================================================
-- 0007_availability_overrides.sql
-- M004/S01 — Availability overrides table for date-specific scheduling
-- Additive migration: no existing tables or data modified
-- ============================================================

CREATE TABLE IF NOT EXISTS availability_overrides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  specific_date  DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT availability_overrides_unique UNIQUE (teacher_id, specific_date, start_time)
);

-- Index for efficient lookups by teacher + date
CREATE INDEX idx_availability_overrides_teacher_date
  ON availability_overrides (teacher_id, specific_date);

-- Enable RLS
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies (mirrors availability table pattern)
CREATE POLICY "availability_overrides_public_read"
  ON availability_overrides FOR SELECT
  USING (true);

CREATE POLICY "availability_overrides_teacher_write"
  ON availability_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = availability_overrides.teacher_id
        AND teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = availability_overrides.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );
