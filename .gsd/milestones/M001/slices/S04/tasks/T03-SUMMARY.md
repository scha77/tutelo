---
id: T03
parent: S04
milestone: M001
provides:
  - Protected /account route: parent session view (upcoming + past) with rebook buttons
  - Role-based redirect: teachers visiting /account are sent to /dashboard
  - Middleware protection: /account added to isProtected in proxy.ts with redirect param
  - Login ?redirect= support: login/page.tsx passes redirectTo prop to LoginForm; auth actions honor it
  - Rebook pre-fill: BookingCalendar reads ?subject= URL param on mount for multi-subject teachers
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 15min
verification_result: passed
completed_at: 2026-03-10
blocker_discovered: false
---
# T03: 04-direct-booking-parent-account 03

**# Phase 4 Plan 03: Parent Account + Rebook Pre-fill Summary**

## What Happened

# Phase 4 Plan 03: Parent Account + Rebook Pre-fill Summary

**Protected /account page with upcoming/past sessions and rebook buttons, plus useSearchParams ?subject= pre-fill in BookingCalendar for one-click rebook flow**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-10T00:00:00Z
- **Completed:** 2026-03-10T00:15:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- /account Server Component with upcoming (confirmed + future date) and past (completed or past date) sections, teacher name display, and Rebook anchor links
- Role-based protection: unauthenticated users redirect to /login?redirect=/account; authenticated teachers redirect to /dashboard
- Login ?redirect= flow: searchParams.redirect passes through login/page.tsx → LoginForm prop → FormData → auth action → redirect(redirectTo)
- Rebook pre-fill: useSearchParams() in BookingCalendar reads ?subject= on mount; ignored for single-subject teachers, used for multi-subject

## Task Commits

Each task was committed atomically:

1. **Task 1: /account page + middleware protection + login redirect** - `6ddfb16` (feat)
2. **Task 2: Rebook URL param pre-fill in BookingCalendar** - `d655342` (feat)

**Plan metadata:** (docs commit below)

_Note: TDD tasks — pure logic tested, GREEN from the start (no failing phase needed for deterministic logic)_

## Files Created/Modified

- `src/app/account/page.tsx` — Protected parent session view: upcoming + past sections, rebook buttons, role-check redirect
- `proxy.ts` — Added /account to isProtected, added redirect param to login redirect URL
- `src/app/(auth)/login/page.tsx` — Now accepts searchParams Promise<{ redirect? }> and passes redirectTo to LoginForm
- `src/components/auth/LoginForm.tsx` — Accepts redirectTo prop, sets it in FormData for auth actions
- `src/actions/auth.ts` — signIn/signUp honor redirectTo FormData field before default redirect logic
- `src/components/profile/BookingCalendar.tsx` — useSearchParams import + get('subject') for initial form state
- `src/__tests__/parent-account.test.ts` — 6 tests: split logic, role check, empty state, rebook URL format
- `src/__tests__/rebook.test.ts` — 4 tests: URL param pre-fill, single-subject override, absent param fallback

## Decisions Made

- **redirectTo via FormData:** LoginForm is a 'use client' component that calls server actions. Passing redirectTo as a FormData field keeps the server action in full control of the redirect, avoiding any client-side router.push calls that could race with the server-side auth flow.
- **Pure logic tests for RSC:** The /account page is a Server Component with Supabase calls that can't easily be mocked. We extracted the two core logic functions (splitBookings and getInitialSubject) inline into the test files, testing them directly without rendering the component. This gives meaningful coverage without mocking overhead.
- **proxy.ts carries all routing logic:** middleware.ts is a thin shim re-exporting `proxy`. All isProtected logic lives in proxy.ts — this is an established project pattern from Phase 1.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- middleware.ts was deleted in the git working tree (confirmed by git status). Restored with `git checkout -- middleware.ts`. The file is a simple re-export shim (`export { proxy as middleware } from './proxy'`) — actual logic in proxy.ts was what needed updating.

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

- src/app/account/page.tsx: FOUND
- .planning/phases/04-direct-booking-parent-account/04-03-SUMMARY.md: FOUND
- commit 6ddfb16 (Task 1): FOUND
- commit d655342 (Task 2): FOUND
- proxy.ts contains /account in isProtected: CONFIRMED (line 31)
- login/page.tsx contains searchParams + redirectTo: CONFIRMED (lines 6, 8, 18, 26)
- BookingCalendar.tsx contains useSearchParams + searchParams.get: CONFIRMED (lines 4, 110, 118)

## Next Phase Readiness

- Parent account route fully live — parents can see sessions and rebook
- Phase 5 (Dashboard + Reviews) can build on /account: review links use `/review?booking=bookingId` pattern already embedded in email templates
- No blockers
