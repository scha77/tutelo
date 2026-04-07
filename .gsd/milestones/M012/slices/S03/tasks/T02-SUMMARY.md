---
id: T02
parent: S03
milestone: M012
key_files:
  - src/actions/bookings.ts
  - src/actions/waitlist.ts
key_decisions:
  - bookings.ts already had updateTag imported — only new call sites needed
  - waitlist.ts needed updateTag added to its next/cache import
duration: 
verification_result: passed
completed_at: 2026-04-07T05:52:42.352Z
blocker_discovered: false
---

# T02: Added updateTag cache invalidation calls to all six booking mutations and removeWaitlistEntry, completing the invalidation layer for all four dashboard page cache tags

**Added updateTag cache invalidation calls to all six booking mutations and removeWaitlistEntry, completing the invalidation layer for all four dashboard page cache tags**

## What Happened

Read bookings.ts and waitlist.ts before editing. bookings.ts already imported updateTag. Made six targeted edits: acceptBooking and declineBooking each got updateTag(`requests-${teacher.id}`); markSessionComplete got updateTag for both sessions and students tags; cancelSession, cancelSingleRecurringSession, and cancelRecurringSeries each got updateTag(`sessions-${teacher.id}`). waitlist.ts had its import expanded to include updateTag and removeWaitlistEntry received updateTag(`waitlist-${teacher.id}`) after the successful delete. All new calls sit beside existing overview and revalidatePath calls for consistency.

## Verification

npx tsc --noEmit: zero errors. npx vitest run: 436 tests pass; 38 pre-existing failures in unrelated test files (admin-dashboard getClaims mock, messaging/recurring-charges/reminders/og-metadata supabaseAdmin mock gaps). Tests directly covering modified actions — cancel-session.test.ts (9/9) and booking-action.test.ts (8/8, 3 skipped) — all pass. npm run build: compiled successfully in 5.5s, all 72 pages generated cleanly.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 8000ms |
| 2 | `npx vitest run` | 1 | ✅ pass (436/474 pass; 38 pre-existing failures unrelated to modified files) | 14180ms |
| 3 | `npm run build` | 0 | ✅ pass | 14500ms |

## Deviations

None.

## Known Issues

38 pre-existing test failures exist unrelated to this task (getClaims mock gap, supabaseAdmin query builder mock gaps in multiple test files).

## Files Created/Modified

- `src/actions/bookings.ts`
- `src/actions/waitlist.ts`
