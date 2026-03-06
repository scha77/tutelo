---
phase: 03-stripe-connect-deferred-payment
plan: 04
subsystem: api
tags: [supabase, stripe, cron, email, resend]

# Dependency graph
requires:
  - phase: 03-stripe-connect-deferred-payment
    provides: auto-cancel cron route with supabase update and sendCancellationEmail call
provides:
  - Working 48hr auto-cancel cron that actually dispatches cancellation emails via .select('id') pattern
affects:
  - Phase 04 (direct booking) — auto-cancel cron correctness is a prerequisite for any cancellation flow
  - STRIPE-04 and NOTIF-05 requirements now fully satisfied

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase JS v2 .select('id') after .update() to get affected rows (count is always null without explicit count preference)"
    - "Idempotency via .eq('status', 'requested') filter — second run returns empty updated array, no duplicate email"

key-files:
  created: []
  modified:
    - src/app/api/cron/auto-cancel/route.ts

key-decisions:
  - "Chain .select('id') on Supabase JS v2 .update() calls to get affected rows — count property is always null without { count: 'exact' } option"

patterns-established:
  - "Pattern: check updated && updated.length > 0 instead of count && count > 0 for Supabase JS v2 update operations"

requirements-completed:
  - STRIPE-04
  - NOTIF-05

# Metrics
duration: 5min
completed: 2026-03-06
---

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
