-- Migration: 0003_create_booking_fn.sql
-- Creates the atomic create_booking() Postgres function and tightens the
-- bookings_anon_insert RLS policy to require is_published = TRUE on the teacher.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tighten bookings_anon_insert RLS policy
--    Phase 1 used WITH CHECK (true) — permissive placeholder.
--    Phase 2 requires the teacher's page to be published before booking.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "bookings_anon_insert" ON bookings;

CREATE POLICY "bookings_anon_insert"
  ON bookings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_id
        AND teachers.is_published = TRUE
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. create_booking() — atomic insert with duplicate detection
--    SECURITY DEFINER: runs with the privileges of the function owner (postgres)
--    so it can bypass RLS for the INSERT, while still enforcing the unique
--    constraint at the DB level.
--    Returns JSON: { success, booking_id? } on success
--                  { success: false, error: 'slot_taken' } on unique_violation
--                  { success: false, error: <message> } on other errors
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_booking(
  p_teacher_id   UUID,
  p_parent_email TEXT,
  p_student_name TEXT,
  p_subject      TEXT,
  p_booking_date DATE,
  p_start_time   TIME,
  p_end_time     TIME,
  p_notes        TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  -- Verify the teacher's page is published before inserting
  -- (belt-and-suspenders in addition to the RLS policy above)
  IF NOT EXISTS (
    SELECT 1 FROM teachers
    WHERE teachers.id = p_teacher_id
      AND teachers.is_published = TRUE
  ) THEN
    RETURN json_build_object('success', false, 'error', 'teacher_not_published');
  END IF;

  INSERT INTO bookings (
    teacher_id,
    parent_email,
    student_name,
    subject,
    booking_date,
    start_time,
    end_time,
    notes,
    status
  ) VALUES (
    p_teacher_id,
    p_parent_email,
    p_student_name,
    p_subject,
    p_booking_date,
    p_start_time,
    p_end_time,
    p_notes,
    'requested'
  )
  RETURNING id INTO v_booking_id;

  RETURN json_build_object('success', true, 'booking_id', v_booking_id);

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'slot_taken');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execution rights to anon and authenticated roles
GRANT EXECUTE ON FUNCTION create_booking(UUID, TEXT, TEXT, TEXT, DATE, TIME, TIME, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_booking(UUID, TEXT, TEXT, TEXT, DATE, TIME, TIME, TEXT) TO authenticated;
