---
estimated_steps: 38
estimated_files: 1
skills_used: []
---

# T01: Migration: tsvector column + GIN index + trigger

Create supabase/migrations/0012_teachers_search_vector.sql.

1. Add search_vector column:
```sql
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS search_vector tsvector;
```

2. Populate existing rows:
```sql
UPDATE teachers SET search_vector = (
  setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(school, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(subjects, ' '), '')), 'B') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'C')
);
```

3. Create GIN index CONCURRENTLY (no table lock):
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS teachers_search_vector_gin
  ON teachers USING GIN(search_vector);
```

4. Create trigger function to keep search_vector up to date on INSERT/UPDATE:
```sql
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

CREATE TRIGGER teachers_search_vector_trig
  BEFORE INSERT OR UPDATE OF full_name, school, subjects, bio
  ON teachers
  FOR EACH ROW EXECUTE FUNCTION teachers_search_vector_update();
```

Note: CONCURRENTLY cannot be run inside a transaction block. Add a comment explaining this.

## Inputs

- `supabase/migrations/0011_capacity_and_session_types.sql (pattern reference)`

## Expected Output

- `supabase/migrations/0012_teachers_search_vector.sql`

## Verification

File exists. SQL syntax check: cat the file and verify CREATE INDEX CONCURRENTLY is present.
