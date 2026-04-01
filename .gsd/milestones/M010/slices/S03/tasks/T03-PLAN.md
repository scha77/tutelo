---
estimated_steps: 48
estimated_files: 1
skills_used: []
---

# T03: Add comprehensive test coverage for saved payment method flows

## Description

Creates `src/__tests__/saved-payment-methods.test.ts` with 15+ unit tests covering all new and modified code paths from T01 and T02. Tests follow the established mock patterns from `payment-intent.test.ts` and `parent-children.test.ts` — vi.hoisted for Stripe mocks, vi.mock for supabase server/service.

This is the verification task that proves the slice works correctly at the unit level.

## Negative Tests

- Unauthenticated requests to GET/DELETE payment-method → 401
- DELETE when no saved card exists → 404
- Webhook PI with no parent_id metadata → skips PM upsert without error
- Webhook PI with no payment_method → skips PM upsert without error
- create-intent with existing parent_profiles Customer → reuses, doesn't create new

## Steps

1. Create `src/__tests__/saved-payment-methods.test.ts` with the following test groups:

   **create-intent Customer attachment (4-5 tests):**
   - When parent has no parent_profiles row → creates Stripe Customer, upserts to parent_profiles, PI includes `customer` + `setup_future_usage: 'off_session'`
   - When parent has existing stripe_customer_id in parent_profiles → reuses Customer, no `stripe.customers.create()` call
   - PI metadata includes `parent_id: user.id`
   - Backward compat: existing PI creation params (capture_method, transfer_data, etc.) still present

   **create-recurring Customer reuse (3-4 tests):**
   - When parent has existing parent_profiles Customer → reuses it, no new Customer created
   - When parent has no parent_profiles row → creates Customer, upserts to parent_profiles AND recurring_schedules
   - Still stores customer on recurring_schedules for cron backward compat

   **Webhook PM upsert (3-4 tests):**
   - PI with customer + payment_method + parent_id metadata → calls paymentMethods.retrieve, upserts card details to parent_profiles
   - PI with no parent_id in metadata (pre-S03 booking) → skips PM upsert, no error
   - PI with no payment_method → skips PM upsert
   - Idempotent: second webhook delivery with same PM data → upsert succeeds without error

   **GET /api/parent/payment-method (3 tests):**
   - Authenticated parent with saved card → returns card_brand, card_last4, card_exp_month, card_exp_year
   - Authenticated parent with no parent_profiles row → returns { card: null }
   - Unauthenticated → 401

   **DELETE /api/parent/payment-method (3 tests):**
   - Authenticated with saved card → calls stripe.paymentMethods.detach, clears card fields on parent_profiles, returns 200
   - Authenticated with no saved card → 404
   - Unauthenticated → 401

2. Use the established mock patterns:
   - `vi.hoisted()` for Stripe mock class with `customers.create`, `paymentIntents.create`, `paymentMethods.retrieve`, `paymentMethods.detach`
   - `vi.mock('@/lib/supabase/server')` for `createClient` returning mock auth
   - `vi.mock('@/lib/supabase/service')` for `supabaseAdmin` with chainable `.from().select().eq().maybeSingle()` etc.
   - Use `vi.mock('@/lib/utils/booking')` and `vi.mock('@/lib/email')` to stub non-Stripe dependencies in route tests

3. Run the full test suite to verify no regressions.

## Must-Haves

- [ ] 15+ tests covering all test groups above
- [ ] All tests pass: `npx vitest run src/__tests__/saved-payment-methods.test.ts`
- [ ] Full suite passes: `npx vitest run` with zero regressions
- [ ] Tests use established vi.hoisted + vi.mock patterns (no novel mock approaches)

## Verification

- `npx vitest run src/__tests__/saved-payment-methods.test.ts` — all tests pass
- `npx vitest run` — full suite passes with zero regressions
- `grep -c 'it(' src/__tests__/saved-payment-methods.test.ts` returns >= 15

## Inputs

- ``src/app/api/direct-booking/create-intent/route.ts` — modified route with Customer attach (from T01)`
- ``src/app/api/direct-booking/create-recurring/route.ts` — modified route with Customer reuse (from T01)`
- ``src/app/api/stripe/webhook/route.ts` — modified webhook with PM upsert (from T01)`
- ``src/app/api/parent/payment-method/route.ts` — new GET/DELETE API route (from T02)`
- ``src/__tests__/payment-intent.test.ts` — reference for Stripe mock patterns`
- ``src/__tests__/parent-children.test.ts` — reference for parent API route test patterns`

## Expected Output

- ``src/__tests__/saved-payment-methods.test.ts` — 15+ unit tests covering create-intent Customer, create-recurring reuse, webhook PM upsert, GET/DELETE payment-method API`

## Verification

npx vitest run src/__tests__/saved-payment-methods.test.ts && npx vitest run
