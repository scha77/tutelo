-- ============================================================
-- 0013_page_views.sql
-- M008/S04 — Page view tracking for teacher /[slug] profiles
--
-- Stores one row per visit. is_bot=true rows are excluded from
-- analytics queries. teacher_id FK cascades on teacher delete.
-- ============================================================

CREATE TABLE IF NOT EXISTS page_views (
  id            BIGSERIAL   PRIMARY KEY,
  teacher_id    UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent    TEXT,
  is_bot        BOOLEAN     NOT NULL DEFAULT FALSE
);

-- Fast per-teacher aggregation (most common query pattern)
CREATE INDEX IF NOT EXISTS page_views_teacher_id_idx
  ON page_views(teacher_id, viewed_at DESC);

-- Partial index for non-bot views only (analytics queries filter is_bot=false)
CREATE INDEX IF NOT EXISTS page_views_teacher_human_idx
  ON page_views(teacher_id, viewed_at DESC)
  WHERE is_bot = FALSE;

-- RLS enabled; inserts use service role (supabaseAdmin) from API route or RSC
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Teachers can read their own page views from the dashboard
CREATE POLICY "teachers_read_own_page_views"
  ON page_views
  FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
  );
