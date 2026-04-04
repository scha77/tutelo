-- ============================================================
-- 0020_predeploy_hardening.sql
-- Pre-deploy hardening: FK cascades, missing indexes, updated_at triggers
-- ============================================================

-- ============================================================
-- PART 1: Fix FK cascade on bookings.recurring_schedule_id
-- ============================================================

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_recurring_schedule_id_fkey,
  ADD CONSTRAINT bookings_recurring_schedule_id_fkey
    FOREIGN KEY (recurring_schedule_id) REFERENCES recurring_schedules(id)
    ON DELETE CASCADE;

-- ============================================================
-- PART 2: Fix FK cascade on bookings.child_id
-- ============================================================

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_child_id_fkey,
  ADD CONSTRAINT bookings_child_id_fkey
    FOREIGN KEY (child_id) REFERENCES children(id)
    ON DELETE SET NULL;

-- ============================================================
-- PART 3: Add missing indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bookings_parent_id ON bookings (parent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_teachers_is_published ON teachers (is_published);
CREATE INDEX IF NOT EXISTS idx_reviews_teacher_id ON reviews (teacher_id);

-- ============================================================
-- PART 4: Add updated_at columns and triggers to tables missing them
-- ============================================================

-- availability
ALTER TABLE availability ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- availability_overrides
ALTER TABLE availability_overrides ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER availability_overrides_updated_at
  BEFORE UPDATE ON availability_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- session_types
ALTER TABLE session_types ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER session_types_updated_at
  BEFORE UPDATE ON session_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- waitlist
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- children
ALTER TABLE children ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- parent_profiles (already has updated_at column, just needs trigger)
CREATE TRIGGER parent_profiles_updated_at
  BEFORE UPDATE ON parent_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
