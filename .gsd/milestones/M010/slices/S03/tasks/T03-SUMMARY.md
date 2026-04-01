---
id: T03
parent: S03
milestone: M010
provides: []
requires: []
affects: []
key_files: ["src/__tests__/saved-payment-methods.test.ts"]
key_decisions: ["Used any type for mock PI objects in webhook tests rather than importing Stripe namespace (avoids TS2702 with vi.mock'd stripe module)", "Webhook route tests use stripeWebhooksConstructEventMock to bypass signature verification and inject custom event payloads"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All verification checks pass: npx vitest run src/__tests__/saved-payment-methods.test.ts (18 pass), npx vitest run (444 pass, 0 fail), npx tsc --noEmit (exit 0), grep -c returns 18 (≥15), all 7 slice-level grep checks pass."
completed_at: 2026-04-01T13:50:03.370Z
blocker_discovered: false
---

# T03: Created saved-payment-methods.test.ts with 18 tests covering create-intent Customer attachment, create-recurring Customer reuse, webhook PM upsert, and GET/DELETE payment-method API routes

> Created saved-payment-methods.test.ts with 18 tests covering create-intent Customer attachment, create-recurring Customer reuse, webhook PM upsert, and GET/DELETE payment-method API routes

## What Happened
---
id: T03
parent: S03
milestone: M010
key_files:
  - src/__tests__/saved-payment-methods.test.ts
key_decisions:
  - Used any type for mock PI objects in webhook tests rather than importing Stripe namespace (avoids TS2702 with vi.mock'd stripe module)
  - Webhook route tests use stripeWebhooksConstructEventMock to bypass signature verification and inject custom event payloads
duration: ""
verification_result: passed
completed_at: 2026-04-01T13:50:03.370Z
blocker_discovered: false
---

# T03: Created saved-payment-methods.test.ts with 18 tests covering create-intent Customer attachment, create-recurring Customer reuse, webhook PM upsert, and GET/DELETE payment-method API routes

**Created saved-payment-methods.test.ts with 18 tests covering create-intent Customer attachment, create-recurring Customer reuse, webhook PM upsert, and GET/DELETE payment-method API routes**

## What Happened

Created src/__tests__/saved-payment-methods.test.ts with 5 test groups (18 total tests) following the established vi.hoisted + vi.mock patterns. Tests cover: create-intent Customer attachment (5 tests: new Customer creation, setup_future_usage/customer on PI, Customer reuse, parent_id metadata, backward-compat params), create-recurring Customer reuse (3 tests: existing Customer reuse via retrieve, new Customer creation, recurring_schedules update), webhook PM upsert (4 tests: paymentMethods.retrieve + parent_profiles upsert, skip when no parent_id, skip when no payment_method, idempotent re-delivery), GET payment-method (3 tests: card details, null card, 401), DELETE payment-method (3 tests: detach + clear, 404, 401). Fixed initial TS2702 error by using any type for mock PI objects in webhook tests.

## Verification

All verification checks pass: npx vitest run src/__tests__/saved-payment-methods.test.ts (18 pass), npx vitest run (444 pass, 0 fail), npx tsc --noEmit (exit 0), grep -c returns 18 (≥15), all 7 slice-level grep checks pass.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/__tests__/saved-payment-methods.test.ts` | 0 | ✅ pass | 850ms |
| 2 | `npx vitest run` | 0 | ✅ pass | 11520ms |
| 3 | `npx tsc --noEmit` | 0 | ✅ pass | 4000ms |
| 4 | `grep -c 'it(' src/__tests__/saved-payment-methods.test.ts` | 0 | ✅ pass | 50ms |
| 5 | `test -f supabase/migrations/0018_parent_profiles.sql` | 0 | ✅ pass | 50ms |
| 6 | `grep -q 'setup_future_usage' src/app/api/direct-booking/create-intent/route.ts` | 0 | ✅ pass | 50ms |
| 7 | `grep -q 'parent_profiles' src/app/api/direct-booking/create-intent/route.ts` | 0 | ✅ pass | 50ms |
| 8 | `grep -q 'parent_profiles' src/app/api/direct-booking/create-recurring/route.ts` | 0 | ✅ pass | 50ms |
| 9 | `grep -q 'paymentMethods.retrieve' src/app/api/stripe/webhook/route.ts` | 0 | ✅ pass | 50ms |
| 10 | `grep -q 'parent_profiles' src/app/api/stripe/webhook/route.ts` | 0 | ✅ pass | 50ms |


## Deviations

Used any type for mock PaymentIntent objects in webhook tests instead of Stripe.PaymentIntent to avoid TS2702 with vi.mock'd stripe module.

## Known Issues

Non-fatal stderr warnings about sendRecurringBookingConfirmationEmail in create-recurring tests (route wraps email in try/catch, so tests still pass).

## Files Created/Modified

- `src/__tests__/saved-payment-methods.test.ts`


## Deviations
Used any type for mock PaymentIntent objects in webhook tests instead of Stripe.PaymentIntent to avoid TS2702 with vi.mock'd stripe module.

## Known Issues
Non-fatal stderr warnings about sendRecurringBookingConfirmationEmail in create-recurring tests (route wraps email in try/catch, so tests still pass).
