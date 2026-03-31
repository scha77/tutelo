# S02: Full-Text Search

**Goal:** Add Postgres tsvector + GIN index on teachers table for full-text search across name, school, subjects, and bio. Wire a search input into the /tutors page. Combined search + filter query via Supabase .textSearch().
**Demo:** After this: Typing 'SAT prep' in /tutors search returns teachers with SAT in their subjects or bio.

## Tasks
- [x] **T01: Migration 0012: tsvector column + GIN index CONCURRENTLY + auto-update trigger on teachers table.** — Create supabase/migrations/0012_teachers_search_vector.sql.

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
  - Estimate: 30m
  - Files: supabase/migrations/0012_teachers_search_vector.sql
  - Verify: File exists. SQL syntax check: cat the file and verify CREATE INDEX CONCURRENTLY is present.
- [x] **T02: Search input wired into /tutors with combined textSearch query. Build passes.** — Add a search text input to DirectoryFilters and a 'q' param to the /tutors page query.

1. In src/components/directory/DirectoryFilters.tsx:
   - Read q = searchParams.get('q') ?? '' at the top alongside subject/grade/city/priceKey
   - Add a SearchInput (same debounce pattern as CityInput) before the Select dropdowns
   - SearchInput props: defaultValue={q}, onCommit={(v) => navigate('q', v || null)}, placeholder='Search tutors...', className='w-52'
   - Show 'q' as an active chip if set (label: `"${q}"`)

2. In src/app/tutors/page.tsx:
   - Add q to the destructured searchParams
   - After building the base query, add:
     ```ts
     if (q && q.trim()) {
       query = query.textSearch('search_vector', q.trim(), { type: 'websearch', config: 'english' })
     }
     ```
   - Add q to filterLabels if set
  - Estimate: 45m
  - Files: src/components/directory/DirectoryFilters.tsx, src/app/tutors/page.tsx
  - Verify: npx tsc --noEmit passes (no new errors). npm run build passes.
