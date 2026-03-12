---
id: T01
parent: S04
milestone: M001
provides:
  - reminder_sent_at TIMESTAMPTZ column on bookings table with cron performance index
  - 7 Wave-0 test stub files (booking-routing, payment-intent, webhook-capture, parent-auth, parent-account, rebook, reminders)
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 3min
verification_result: passed
completed_at: 2026-03-08
blocker_discovered: false
---
# T01: 04-direct-booking-parent-account 01

**# Phase 4 Plan 01: Foundation Scaffold Summary**

## What Happened

# Phase 4 Plan 01: Foundation Scaffold Summary

**DB migration adds `reminder_sent_at TIMESTAMPTZ` + cron index to bookings; 7 Wave-0 test stub files scaffold 34 `it.todo()` tests covering all Phase 4 requirements**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T11:13:23Z
- **Completed:** 2026-03-08T11:16:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Migration `0005_phase4_direct_booking.sql` applied via `npx supabase db push` — `reminder_sent_at TIMESTAMPTZ` column live on bookings table
- Partial index `idx_bookings_reminder` created for efficient cron queries (only indexes confirmed + unsent rows)
- All 7 test stub files created in `src/__tests__/` with `it.todo()` stubs — vitest run passes with 34 todos, zero failures

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration — reminder_sent_at column** - `7de316e` (chore)
2. **Task 2: Wave 0 test scaffolds** - `c067efa` (test)

## Files Created/Modified

- `supabase/migrations/0005_phase4_direct_booking.sql` — Additive migration: reminder_sent_at column + cron performance index
- `src/__tests__/booking-routing.test.ts` — 6 stubs for BOOK-05 direct booking conditional routing
- `src/__tests__/payment-intent.test.ts` — 5 stubs for PaymentIntent creation with manual capture
- `src/__tests__/webhook-capture.test.ts` — 5 stubs for payment_intent.amount_capturable_updated handler
- `src/__tests__/parent-auth.test.ts` — 5 stubs for PARENT-01 InlineAuthForm
- `src/__tests__/parent-account.test.ts` — 5 stubs for PARENT-02 /account page session list
- `src/__tests__/rebook.test.ts` — 3 stubs for PARENT-03 URL param pre-fill rebook flow
- `src/__tests__/reminders.test.ts` — 5 stubs for NOTIF-04 session-reminders cron idempotency

## Decisions Made

- `reminder_sent_at NULL = unsent` semantics chosen over a boolean flag — enables timestamp auditing and is natively filterable with `IS NULL` in Postgres
- Partial index scoped to `WHERE status = 'confirmed' AND reminder_sent_at IS NULL` — keeps index small since completed/cancelled bookings never need reminders
- `it.todo()` stubs (not `it.skip()`) — consistent with Phase 1-3 pattern; produces green vitest output without false confidence

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Migration applied automatically via `npx supabase db push`.

## Next Phase Readiness

- Wave 2 plans (04-02, 04-03, 04-04) can run in parallel — no schema or test file gaps
- `reminder_sent_at` column live in the database, ready for cron handler in plan 04-04
- All 7 test stub files in place for TDD implementation in Wave 2 plans

---
*Phase: 04-direct-booking-parent-account*
*Completed: 2026-03-08*
