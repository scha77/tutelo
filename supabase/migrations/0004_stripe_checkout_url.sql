-- Phase 3: Add Stripe Checkout session URL column to bookings
-- Stores the Stripe Checkout URL so parent's payment link is retrievable
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT;
