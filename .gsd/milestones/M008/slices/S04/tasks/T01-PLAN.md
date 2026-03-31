---
estimated_steps: 21
estimated_files: 1
skills_used: []
---

# T01: Migration: page_views table

Create supabase/migrations/0013_page_views.sql.

Table definition:
```sql
CREATE TABLE IF NOT EXISTS page_views (
  id            BIGSERIAL PRIMARY KEY,
  teacher_id    UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent    TEXT,
  is_bot        BOOLEAN     NOT NULL DEFAULT FALSE
);

-- Index for fast per-teacher aggregation (most common query)
CREATE INDEX IF NOT EXISTS page_views_teacher_id_idx
  ON page_views(teacher_id, viewed_at DESC);

-- RLS: only service role can insert (track-view API uses supabaseAdmin)
-- No need for user-facing RLS policies on this table at MVP
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
```

Also add a booking_form_opens column concept: we don't track this server-side yet (that needs a client-side event). For MVP the funnel shows:
- Views: COUNT(*) from page_views WHERE is_bot = false
- Booking form opens: deferred (tracked client-side in a future milestone)
- Completed bookings: COUNT(*) from bookings WHERE teacher_id = ? AND status = 'completed'

## Inputs

- `supabase/migrations/0012_teachers_search_vector.sql`

## Expected Output

- `supabase/migrations/0013_page_views.sql`

## Verification

File exists. grep for CREATE TABLE page_views.
