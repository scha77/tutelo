-- ============================================================
-- 0017_children_and_parent_dashboard.sql
-- M010/S01 — Children table + child_id FK on bookings
-- Enables parent dashboard with multi-child management
-- ============================================================

-- Children table: each parent can have multiple children
CREATE TABLE IF NOT EXISTS children (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  grade      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by parent
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children (parent_id);

-- Enable RLS
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- Parents can only see/manage their own children
CREATE POLICY children_owner_all ON children
  FOR ALL
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- Add child_id FK to bookings (nullable — existing bookings have no child)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id);
