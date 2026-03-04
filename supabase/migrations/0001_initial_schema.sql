-- ============================================================
-- 0001_initial_schema.sql
-- Phase 1 — Foundation: complete database schema
-- Tables: teachers, availability, bookings, reviews
-- All timestamps: TIMESTAMPTZ (never bare TIMESTAMP)
-- All RLS enabled with correct policies
-- ============================================================

-- ============================================================
-- PART 1: TEACHERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS teachers (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug                   TEXT NOT NULL,
  full_name              TEXT NOT NULL,
  school                 TEXT,
  city                   TEXT,
  state                  CHAR(2),
  years_experience       SMALLINT,
  subjects               TEXT[]    NOT NULL DEFAULT '{}',
  grade_levels           TEXT[]    NOT NULL DEFAULT '{}',
  hourly_rate            NUMERIC(10,2),
  bio                    TEXT,
  photo_url              TEXT,
  banner_url             TEXT,
  headline               TEXT,
  accent_color           TEXT      NOT NULL DEFAULT '#3B82F6',
  social_instagram       TEXT,
  social_email           TEXT,
  social_website         TEXT,
  is_published           BOOLEAN   NOT NULL DEFAULT FALSE,
  timezone               TEXT      NOT NULL DEFAULT 'America/New_York',
  wizard_step            SMALLINT  NOT NULL DEFAULT 1,
  stripe_account_id      TEXT,
  stripe_charges_enabled BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teachers_slug_unique UNIQUE (slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teachers_slug    ON teachers (slug);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers (user_id);

-- Enable RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "teachers_public_read"
  ON teachers FOR SELECT
  USING (true);

CREATE POLICY "teachers_insert_own"
  ON teachers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "teachers_update_own"
  ON teachers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "teachers_no_delete"
  ON teachers FOR DELETE
  USING (false);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teachers_updated_at
  BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- PART 2: AVAILABILITY TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0 = Sunday, 6 = Saturday
  -- Interpreted relative to teacher's IANA timezone (teachers.timezone)
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  CONSTRAINT availability_unique UNIQUE (teacher_id, day_of_week, start_time)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_availability_teacher ON availability (teacher_id);

-- Enable RLS
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "availability_public_read"
  ON availability FOR SELECT
  USING (true);

CREATE POLICY "availability_teacher_write"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = availability.teacher_id
        AND teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = availability.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );


-- ============================================================
-- PART 3: BOOKINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id            UUID NOT NULL REFERENCES teachers(id),
  -- No CASCADE: preserve booking history if teacher account deleted
  parent_id             UUID REFERENCES auth.users(id),
  -- Nullable: guest bookings allowed (Phase 2)
  parent_email          TEXT NOT NULL,
  student_name          TEXT NOT NULL,
  subject               TEXT NOT NULL,
  booking_date          DATE NOT NULL,
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  status                TEXT NOT NULL DEFAULT 'requested'
                          CHECK (status IN ('requested','pending','confirmed','completed','cancelled')),
  stripe_payment_intent TEXT,
  -- Phase 3: Stripe PaymentIntent ID
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- BOOK-04: prevent double-booking
  CONSTRAINT bookings_unique_slot UNIQUE (teacher_id, booking_date, start_time)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_teacher_date ON bookings (teacher_id, booking_date);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "bookings_teacher_read"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = bookings.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_parent_read"
  ON bookings FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "bookings_anon_insert"
  ON bookings FOR INSERT
  WITH CHECK (true);
  -- Phase 2 guest booking; tighten in Phase 2 to validate teacher is published, slot is free

CREATE POLICY "bookings_teacher_update"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = bookings.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );

-- updated_at trigger for bookings
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- PART 4: REVIEWS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  parent_id  UUID REFERENCES auth.users(id),
  -- Nullable: guest reviewers possible
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "reviews_public_read"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "reviews_parent_insert"
  ON reviews FOR INSERT
  WITH CHECK (parent_id = auth.uid());


-- ============================================================
-- PART 5: STORAGE BUCKET — profile-images
-- ============================================================
-- Storage buckets cannot be created via SQL migrations in Supabase.
-- Use one of the following methods:
--
-- A) Supabase CLI:
--   supabase storage create profile-images --public
--
-- B) Supabase Dashboard:
--   Storage > New bucket > Name: "profile-images" > Toggle "Public bucket" ON > Create
--
-- After creating the bucket, add these Storage RLS policies
-- (Dashboard > Storage > profile-images > Policies):
--
--   Policy 1 — Public read (SELECT):
--     Name: "profile_images_public_read"
--     Allowed operation: SELECT
--     Policy: true
--
--   Policy 2 — Authenticated upload (INSERT):
--     Name: "profile_images_auth_insert"
--     Allowed operation: INSERT
--     Policy: (auth.uid()::text) = (storage.foldername(name))[1]
--
--   Policy 3 — Owner update (UPDATE):
--     Name: "profile_images_owner_update"
--     Allowed operation: UPDATE
--     Policy: (auth.uid()::text) = (storage.foldername(name))[1]
--
--   Policy 4 — Owner delete (DELETE):
--     Name: "profile_images_owner_delete"
--     Allowed operation: DELETE
--     Policy: (auth.uid()::text) = (storage.foldername(name))[1]
--
-- Storage path convention: profile-images/{user_id}/{filename}
-- This ensures RLS path-based ownership enforcement works correctly.
-- ============================================================
