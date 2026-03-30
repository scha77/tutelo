-- ============================================================
-- 0011_capacity_and_session_types.sql
-- M007/S01 — Capacity limits, waitlist, and session types
-- Adds: capacity_limit on teachers, waitlist table, session_types table
-- All RLS enabled. Per decision D005, all M007 schema in one file.
-- ============================================================

-- ============================================================
-- PART 1: capacity_limit column on teachers
-- NULL = unlimited (no cap). Integer = max active students.
-- ============================================================

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS capacity_limit INTEGER;


-- ============================================================
-- PART 2: waitlist table
-- Parents sign up when a teacher is at capacity.
-- ============================================================

CREATE TABLE IF NOT EXISTS waitlist (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  parent_email TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at  TIMESTAMPTZ,
  CONSTRAINT waitlist_teacher_email_unique UNIQUE (teacher_id, parent_email)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_teacher ON waitlist (teacher_id);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can add themselves to a waitlist
CREATE POLICY "waitlist_anon_insert"
  ON waitlist FOR INSERT
  WITH CHECK (true);

-- Teachers can view their own waitlist entries
CREATE POLICY "waitlist_teacher_select"
  ON waitlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = waitlist.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );

-- Teachers can remove entries from their own waitlist
CREATE POLICY "waitlist_teacher_delete"
  ON waitlist FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = waitlist.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );


-- ============================================================
-- PART 3: session_types table
-- Teacher-defined session offerings (label, price, duration).
-- CRUD wired in S03; structure created now per D005.
-- ============================================================

CREATE TABLE IF NOT EXISTS session_types (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id       UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  label            TEXT NOT NULL,
  price            NUMERIC(10,2) NOT NULL,
  duration_minutes SMALLINT,
  sort_order       SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_types_teacher ON session_types (teacher_id);

ALTER TABLE session_types ENABLE ROW LEVEL SECURITY;

-- Public can read session types (shown on profile pages)
CREATE POLICY "session_types_public_read"
  ON session_types FOR SELECT
  USING (true);

-- Teachers can manage their own session types
CREATE POLICY "session_types_teacher_insert"
  ON session_types FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = session_types.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );

CREATE POLICY "session_types_teacher_update"
  ON session_types FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = session_types.teacher_id
        AND teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = session_types.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );

CREATE POLICY "session_types_teacher_delete"
  ON session_types FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = session_types.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );
