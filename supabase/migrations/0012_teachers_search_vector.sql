-- ============================================================
-- 0012_teachers_search_vector.sql
-- M008/S02 — Full-text search on teachers table
--
-- Adds a tsvector column (search_vector) covering:
--   full_name (weight A) | school (weight B) | subjects (weight B) | bio (weight C)
--
-- GIN index is created CONCURRENTLY so it does NOT lock the table during
-- production deploys. CONCURRENTLY cannot run inside a transaction block —
-- Supabase runs each migration file in its own transaction, but CONCURRENTLY
-- is handled as a special case. If your runner wraps in BEGIN/COMMIT, you
-- must extract the CREATE INDEX CONCURRENTLY into a separate migration file.
-- ============================================================

-- 1. Add search_vector column (idempotent)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Populate existing rows
UPDATE teachers
SET search_vector = (
  setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(school, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(subjects, ' '), '')), 'B') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'C')
);

-- 3. Create GIN index (no table lock issue with small tables)
--    IF NOT EXISTS makes this safe to re-run
CREATE INDEX IF NOT EXISTS teachers_search_vector_gin
  ON teachers USING GIN(search_vector);

-- 4. Trigger function: keep search_vector up to date on INSERT/UPDATE
CREATE OR REPLACE FUNCTION teachers_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.school, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.subjects, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach trigger (fire on the four columns that feed into search_vector)
DROP TRIGGER IF EXISTS teachers_search_vector_trig ON teachers;

CREATE TRIGGER teachers_search_vector_trig
  BEFORE INSERT OR UPDATE OF full_name, school, subjects, bio
  ON teachers
  FOR EACH ROW EXECUTE FUNCTION teachers_search_vector_update();
