-- ============================================================
-- 0021_publish_profile_fn.sql
-- Atomic publish_profile() function — upserts teacher row,
-- deletes old availability, inserts new availability in a
-- single transaction so a failed insert can't orphan data.
-- ============================================================

CREATE OR REPLACE FUNCTION publish_profile(
  p_user_id      UUID,
  p_teacher_data JSONB,
  p_availability JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
BEGIN
  -- 1. Upsert teacher row with is_published = true
  INSERT INTO teachers (
    user_id, full_name, school, city, state, years_experience,
    photo_url, phone_number, sms_opt_in,
    subjects, grade_levels, hourly_rate,
    slug, timezone, is_published, wizard_step
  ) VALUES (
    p_user_id,
    p_teacher_data->>'full_name',
    p_teacher_data->>'school',
    p_teacher_data->>'city',
    p_teacher_data->>'state',
    (p_teacher_data->>'years_experience')::smallint,
    NULLIF(p_teacher_data->>'photo_url', ''),
    NULLIF(p_teacher_data->>'phone_number', ''),
    COALESCE((p_teacher_data->>'sms_opt_in')::boolean, false),
    ARRAY(SELECT jsonb_array_elements_text(p_teacher_data->'subjects')),
    ARRAY(SELECT jsonb_array_elements_text(p_teacher_data->'grade_levels')),
    (p_teacher_data->>'hourly_rate')::numeric(10,2),
    p_teacher_data->>'slug',
    p_teacher_data->>'timezone',
    true,
    3
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name        = EXCLUDED.full_name,
    school           = EXCLUDED.school,
    city             = EXCLUDED.city,
    state            = EXCLUDED.state,
    years_experience = EXCLUDED.years_experience,
    photo_url        = EXCLUDED.photo_url,
    phone_number     = EXCLUDED.phone_number,
    sms_opt_in       = EXCLUDED.sms_opt_in,
    subjects         = EXCLUDED.subjects,
    grade_levels     = EXCLUDED.grade_levels,
    hourly_rate      = EXCLUDED.hourly_rate,
    slug             = EXCLUDED.slug,
    timezone         = EXCLUDED.timezone,
    is_published     = true,
    wizard_step      = 3
  RETURNING id INTO v_teacher_id;

  -- 2. Delete existing availability for this teacher
  DELETE FROM availability WHERE teacher_id = v_teacher_id;

  -- 3. Insert new availability rows
  INSERT INTO availability (teacher_id, day_of_week, start_time, end_time)
  SELECT
    v_teacher_id,
    (slot->>'day_of_week')::smallint,
    (slot->>'start_time')::time,
    (slot->>'end_time')::time
  FROM jsonb_array_elements(p_availability) AS slot;

  RETURN json_build_object('success', true, 'teacher_id', v_teacher_id);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Only authenticated users can call this (they publish their own profile)
GRANT EXECUTE ON FUNCTION publish_profile(UUID, JSONB, JSONB) TO authenticated;
