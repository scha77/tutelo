-- Add unique constraint on teachers.user_id
-- Required for upsert ON CONFLICT (user_id) in onboarding wizard
ALTER TABLE teachers ADD CONSTRAINT teachers_user_id_unique UNIQUE (user_id);
