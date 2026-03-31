---
id: T02
parent: S01
milestone: M009
provides: []
requires: []
affects: []
key_files: ["src/app/api/direct-booking/create-recurring/route.ts", "src/lib/schemas/booking.ts", "src/__tests__/create-recurring.test.ts"]
key_decisions: ["Per-row booking insert with 23505 skip instead of batch-insert-all — allows partial success when race conditions claim individual slots", "Stripe Customer created per recurring booking (not reused) — keeps first-session flow simple; customer reuse can be added later for future auto-charges"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Ran npx vitest run create-recurring --reporter=verbose — all 9 tests pass. Ran npx tsc --noEmit — zero type errors."
completed_at: 2026-03-31T13:51:40.268Z
blocker_discovered: false
---

# T02: Built POST /api/direct-booking/create-recurring API route with Zod validation, recurring date generation, conflict checking, batch booking inserts, Stripe Customer + PaymentIntent with setup_future_usage, and 9 integration tests

> Built POST /api/direct-booking/create-recurring API route with Zod validation, recurring date generation, conflict checking, batch booking inserts, Stripe Customer + PaymentIntent with setup_future_usage, and 9 integration tests

## What Happened
---
id: T02
parent: S01
milestone: M009
key_files:
  - src/app/api/direct-booking/create-recurring/route.ts
  - src/lib/schemas/booking.ts
  - src/__tests__/create-recurring.test.ts
key_decisions:
  - Per-row booking insert with 23505 skip instead of batch-insert-all — allows partial success when race conditions claim individual slots
  - Stripe Customer created per recurring booking (not reused) — keeps first-session flow simple; customer reuse can be added later for future auto-charges
duration: ""
verification_result: passed
completed_at: 2026-03-31T13:51:40.269Z
blocker_discovered: false
---

# T02: Built POST /api/direct-booking/create-recurring API route with Zod validation, recurring date generation, conflict checking, batch booking inserts, Stripe Customer + PaymentIntent with setup_future_usage, and 9 integration tests

**Built POST /api/direct-booking/create-recurring API route with Zod validation, recurring date generation, conflict checking, batch booking inserts, Stripe Customer + PaymentIntent with setup_future_usage, and 9 integration tests**

## What Happened

Added RecurringBookingSchema to src/lib/schemas/booking.ts. Created the full API route at src/app/api/direct-booking/create-recurring/route.ts following the create-intent pattern: authenticates parent, validates with Zod, fetches teacher + verifies Stripe, computes session amount, generates recurring dates, checks conflicts, inserts recurring_schedules row, batch-inserts booking rows with recurring_schedule_id and is_recurring_first, handles 23505 per-row, creates Stripe Customer + PaymentIntent with setup_future_usage:'off_session' and capture_method:'manual', cleans up on Stripe failure, returns clientSecret + sessionDates + skippedDates + totalCreated. Wrote 9 integration tests using vi.hoisted/MockStripeClass pattern covering happy path, auth, validation, conflicts, Stripe failures, cleanup, and amount calculation.

## Verification

Ran npx vitest run create-recurring --reporter=verbose — all 9 tests pass. Ran npx tsc --noEmit — zero type errors.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run create-recurring --reporter=verbose` | 0 | ✅ pass | 2100ms |
| 2 | `npx tsc --noEmit` | 0 | ✅ pass | 3000ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/direct-booking/create-recurring/route.ts`
- `src/lib/schemas/booking.ts`
- `src/__tests__/create-recurring.test.ts`


## Deviations
None.

## Known Issues
None.
