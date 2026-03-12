---
id: T04
parent: S03
milestone: M001
provides:
  - Working 48hr auto-cancel cron that actually dispatches cancellation emails via .select('id') pattern
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 5min
verification_result: passed
completed_at: 2026-03-06
blocker_discovered: false
---
# T04: 03-stripe-connect-deferred-payment 04

**# Phase 3 Plan 04: Gap Closure — Auto-Cancel Email Dispatch Summary**

## What Happened

# Phase 3 Plan 04: Gap Closure — Auto-Cancel Email Dispatch Summary

**Fixed Supabase JS v2 silent null count bug so auto-cancel cron now correctly dispatches cancellation emails via .select('id') chained on the update call.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-06T14:46:00Z
- **Completed:** 2026-03-06T14:51:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced `const { count }` with `const { data: updated }` and chained `.select('id')` on the Supabase update query
- Updated idempotency guard from `count && count > 0` to `updated && updated.length > 0`
- Cancellation emails now fire correctly when a booking's status transitions to `cancelled`
- Second cron run for the same booking returns `updated = []` (not a falsy count) — no duplicate emails
- TypeScript compiles clean, all 5 test todos pass with zero failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Supabase update count bug in auto-cancel cron** - `6c0837a` (fix)

**Plan metadata:** (final docs commit — see below)

## Files Created/Modified
- `src/app/api/cron/auto-cancel/route.ts` - Fixed .select('id') chain and updated && updated.length > 0 guard

## Decisions Made
- Chain `.select('id')` on Supabase JS v2 `.update()` to get affected rows — the `count` property is always `null` in Supabase JS v2 unless `{ count: 'exact' }` is explicitly passed as a query option. Using `.select('id')` is the idiomatic workaround that also preserves the idempotency guarantee: a re-run returns `[]` because `.eq('status', 'requested')` no longer matches an already-cancelled booking.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- STRIPE-04 (48hr auto-cancel) and NOTIF-05 (cancellation email) are fully satisfied
- Phase 3 complete — ready for Phase 4 (Direct Booking + Parent Account)

---
*Phase: 03-stripe-connect-deferred-payment*
*Completed: 2026-03-06*
