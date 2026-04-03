-- Migration: parent_profiles
-- Stores parent-level Stripe Customer and saved payment method info.
-- Enables "Pay with saved card" flow across all booking types.

CREATE TABLE IF NOT EXISTS parent_profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id        TEXT,
  stripe_payment_method_id  TEXT,
  card_brand     TEXT,
  card_last4     TEXT,
  card_exp_month SMALLINT,
  card_exp_year  SMALLINT,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: parents can read/update only their own row
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all" ON parent_profiles;
CREATE POLICY "owner_all" ON parent_profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
