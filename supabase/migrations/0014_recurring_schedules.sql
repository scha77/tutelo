-- ============================================================
-- 0014_recurring_schedules.sql
-- M009/S01 — Recurring schedules table and bookings link columns
-- Enables weekly/biweekly recurring bookings with individual
-- booking rows linked by recurring_schedule_id.
-- ============================================================

-- ============================================================
-- PART 1: recurring_schedules table
-- ============================================================

CREATE TABLE IF NOT EXISTS recurring_schedules (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id               UUID NOT NULL REFERENCES teachers(id),
  parent_id                UUID REFERENCES auth.users(id),
  parent_email             TEXT NOT NULL,
  frequency                TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly')),
  total_sessions           SMALLINT NOT NULL CHECK (total_sessions BETWEEN 2 AND 26),
  start_date               DATE NOT NULL,
  start_time               TIME NOT NULL,
  end_time                 TIME NOT NULL,
  stripe_customer_id       TEXT,
  stripe_payment_method_id TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for teacher lookup
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_teacher
  ON recurring_schedules (teacher_id);

-- Enable RLS
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Teachers can read their own recurring schedules
CREATE POLICY "recurring_schedules_teacher_read"
  ON recurring_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = recurring_schedules.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );

-- Parents can read their own recurring schedules
CREATE POLICY "recurring_schedules_parent_read"
  ON recurring_schedules FOR SELECT
  USING (parent_id = auth.uid());

-- Authenticated users can insert (API route handles validation)
CREATE POLICY "recurring_schedules_auth_insert"
  ON recurring_schedules FOR INSERT
  WITH CHECK (true);

-- Teachers can update (for Stripe IDs, etc.)
CREATE POLICY "recurring_schedules_teacher_update"
  ON recurring_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = recurring_schedules.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 2: Add recurring columns to bookings
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS recurring_schedule_id UUID REFERENCES recurring_schedules(id);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_recurring_first BOOLEAN DEFAULT FALSE;

-- Index for efficient lookups by recurring_schedule_id (used in S02/S03)
CREATE INDEX IF NOT EXISTS idx_bookings_recurring_schedule
  ON bookings (recurring_schedule_id)
  WHERE recurring_schedule_id IS NOT NULL;
