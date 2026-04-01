---
id: T01
parent: S03
milestone: M010
provides: []
requires: []
affects: []
key_files: ["supabase/migrations/0018_parent_profiles.sql", "src/app/api/direct-booking/create-intent/route.ts", "src/app/api/direct-booking/create-recurring/route.ts", "src/app/api/stripe/webhook/route.ts", "src/__tests__/payment-intent.test.ts", "src/__tests__/booking-routing.test.ts", "src/__tests__/parent-phone-storage.test.ts", "src/__tests__/create-recurring.test.ts", "tests/unit/session-type-pricing.test.ts"]
key_decisions: ["parent_profiles uses user_id as PK (1:1 with auth.users)", "Customer resolution error in create-intent returns 502 with booking cleanup (same pattern as PI failure)", "PM upsert in webhook is non-critical — wrapped in try/catch so booking confirmation still succeeds"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 8 verification checks pass: npx tsc --noEmit (exit 0), migration file exists, setup_future_usage in create-intent, parent_profiles in create-intent, parent_profiles in create-recurring, paymentMethods.retrieve in webhook, parent_profiles in webhook, npx vitest run (426 passed, 0 failed)."
completed_at: 2026-04-01T13:42:07.285Z
blocker_discovered: false
---

# T01: Created parent_profiles table, wired Stripe Customer creation/reuse into both booking routes, and added PM card detail upsert to webhook handler

> Created parent_profiles table, wired Stripe Customer creation/reuse into both booking routes, and added PM card detail upsert to webhook handler

## What Happened
---
id: T01
parent: S03
milestone: M010
key_files:
  - supabase/migrations/0018_parent_profiles.sql
  - src/app/api/direct-booking/create-intent/route.ts
  - src/app/api/direct-booking/create-recurring/route.ts
  - src/app/api/stripe/webhook/route.ts
  - src/__tests__/payment-intent.test.ts
  - src/__tests__/booking-routing.test.ts
  - src/__tests__/parent-phone-storage.test.ts
  - src/__tests__/create-recurring.test.ts
  - tests/unit/session-type-pricing.test.ts
key_decisions:
  - parent_profiles uses user_id as PK (1:1 with auth.users)
  - Customer resolution error in create-intent returns 502 with booking cleanup (same pattern as PI failure)
  - PM upsert in webhook is non-critical — wrapped in try/catch so booking confirmation still succeeds
duration: ""
verification_result: passed
completed_at: 2026-04-01T13:42:07.285Z
blocker_discovered: false
---

# T01: Created parent_profiles table, wired Stripe Customer creation/reuse into both booking routes, and added PM card detail upsert to webhook handler

**Created parent_profiles table, wired Stripe Customer creation/reuse into both booking routes, and added PM card detail upsert to webhook handler**

## What Happened

Created migration 0018 with the parent_profiles table (PK user_id, Stripe Customer/PM fields, card details, RLS owner-all policy). Modified create-intent to resolve or create a parent-level Stripe Customer before PI creation, attaching customer, setup_future_usage: 'off_session', and parent_id to the PI metadata. Modified create-recurring to check parent_profiles for an existing Customer before creating a new one (reuses via stripe.customers.retrieve), and upserts the new Customer to parent_profiles when creating. Modified the webhook's payment_intent.amount_capturable_updated handler to retrieve PM card details via stripe.paymentMethods.retrieve() and upsert them to parent_profiles when parent_id, customer, and payment_method are all present on the PI. Updated 5 existing test files to add parent_profiles mock handling — all 426 tests pass with no regressions.

## Verification

All 8 verification checks pass: npx tsc --noEmit (exit 0), migration file exists, setup_future_usage in create-intent, parent_profiles in create-intent, parent_profiles in create-recurring, paymentMethods.retrieve in webhook, parent_profiles in webhook, npx vitest run (426 passed, 0 failed).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 4200ms |
| 2 | `test -f supabase/migrations/0018_parent_profiles.sql` | 0 | ✅ pass | 50ms |
| 3 | `grep -q 'setup_future_usage' src/app/api/direct-booking/create-intent/route.ts` | 0 | ✅ pass | 50ms |
| 4 | `grep -q 'parent_profiles' src/app/api/direct-booking/create-intent/route.ts` | 0 | ✅ pass | 50ms |
| 5 | `grep -q 'parent_profiles' src/app/api/direct-booking/create-recurring/route.ts` | 0 | ✅ pass | 50ms |
| 6 | `grep -q 'paymentMethods.retrieve' src/app/api/stripe/webhook/route.ts` | 0 | ✅ pass | 50ms |
| 7 | `grep -q 'parent_profiles' src/app/api/stripe/webhook/route.ts` | 0 | ✅ pass | 50ms |
| 8 | `npx vitest run` | 0 | ✅ pass | 10500ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `supabase/migrations/0018_parent_profiles.sql`
- `src/app/api/direct-booking/create-intent/route.ts`
- `src/app/api/direct-booking/create-recurring/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/__tests__/payment-intent.test.ts`
- `src/__tests__/booking-routing.test.ts`
- `src/__tests__/parent-phone-storage.test.ts`
- `src/__tests__/create-recurring.test.ts`
- `tests/unit/session-type-pricing.test.ts`


## Deviations
None.

## Known Issues
None.
