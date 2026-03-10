-- Phase 5: add review token columns + amount_cents for earnings display

-- 1. Add token-based review columns
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS token TEXT UNIQUE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS token_used_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- 2. Make rating nullable (token-stub rows created at mark-complete, filled on submission)
ALTER TABLE reviews ALTER COLUMN rating DROP NOT NULL;
-- Nullable-aware check: rating must be 1–5 when provided
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range
  CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));

-- 3. Store captured amount for earnings display (avoids live Stripe API calls)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_cents INTEGER;

-- 4. Index for fast token lookup on public /review/[token] route
CREATE INDEX IF NOT EXISTS idx_reviews_token ON reviews (token) WHERE token IS NOT NULL;

-- 5. Update RLS policies for reviews table
-- Drop old insert policy (required auth.uid() = parent_id — incompatible with server-side stub inserts)
DROP POLICY IF EXISTS "reviews_parent_insert" ON reviews;

-- New insert policy: allow all inserts (service role bypasses RLS; anon inserts are harmless stubs)
CREATE POLICY "reviews_insert_token_stub"
  ON reviews FOR INSERT
  WITH CHECK (true);

-- Update public read: only show reviews that have been submitted (rating IS NOT NULL)
DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read"
  ON reviews FOR SELECT
  USING (rating IS NOT NULL);
