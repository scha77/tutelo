---
phase: 06-profile-account-fixes
plan: 01
subsystem: auth, ui
tags: [supabase, next-auth, react, tdd, vitest]

# Dependency graph
requires:
  - phase: 05-dashboard-reviews
    provides: Public profile page, /account parent page, signIn server action
provides:
  - BookNowCTA rendered on public teacher profile (sticky mobile CTA)
  - Correct rebook URL format with query param before hash fragment
  - signIn redirects any teacher (draft or published) to /dashboard
  - Full test suite green with new draft-teacher redirect test case
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD red-green for auth behavior verification, surgical one-line fixes with test coverage]

key-files:
  created: []
  modified:
    - src/actions/auth.ts
    - src/app/account/page.tsx
    - src/app/[slug]/page.tsx
    - tests/auth/signup.test.ts
    - src/__tests__/parent-account.test.ts

key-decisions:
  - ".select('id') + if (teacher) check existence not publication status — any teacher row redirects to /dashboard"
  - "Query param must precede hash fragment in URL: ?subject=X#booking not #booking?subject=X"
  - "BookNowCTA import was already present — only JSX render insertion needed"

patterns-established:
  - "Pattern: Test existence of DB row (select id) not a status column when checking role membership"
  - "Pattern: URL construction — search params (?key=val) always before fragment (#section)"

requirements-completed: [PAGE-05, PAGE-06, PARENT-03, AUTH-02]

# Metrics
duration: 8min
completed: 2026-03-10
---

# Phase 6 Plan 01: Profile and Account Fixes Summary

**Five v1.0 audit gaps closed with surgical one-to-three-line fixes: BookNowCTA on profile, correct rebook URL format, and signIn redirecting draft teachers — all backed by TDD**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-10T20:29:51Z
- **Completed:** 2026-03-10T20:37:00Z
- **Tasks:** 3 automated (Task 4 is human-verify checkpoint)
- **Files modified:** 5

## Accomplishments
- Fixed signIn server action to redirect any teacher (draft or published) to /dashboard using TDD — RED test confirmed existing bug, GREEN fixed it
- Fixed rebook URL from `/{slug}#booking?subject=...` to `/{slug}?subject=...#booking` so `useSearchParams().get('subject')` receives the value correctly
- Rendered `<BookNowCTA />` between BookingCalendar and ReviewsSection on `[slug]/page.tsx` — sticky mobile bar now visible on public profile
- Full test suite: 101 passing, 0 failing

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — Add draft-teacher signIn test + fix signIn action** - `b42bf5e` (feat/test)
2. **Task 2: Fix rebook URL in account/page.tsx + update parent-account test assertion** - `e882fd7` (fix)
3. **Task 3: Render BookNowCTA in [slug]/page.tsx + full suite verification** - `a311a5b` (feat)

**Plan metadata:** (pending final commit after human-verify)

_Note: Task 1 uses TDD: RED commit then GREEN fix in same atomic commit._

## Files Created/Modified
- `src/actions/auth.ts` - Changed .select('is_published') to .select('id'), if (teacher?.is_published) to if (teacher)
- `src/app/account/page.tsx` - Fixed rebookUrl: query param before hash fragment
- `src/app/[slug]/page.tsx` - Added `<BookNowCTA />` between BookingCalendar and ReviewsSection
- `tests/auth/signup.test.ts` - Added draft-teacher redirect test case
- `src/__tests__/parent-account.test.ts` - Updated rebook URL assertion to corrected format

## Decisions Made
- `.select('id')` + `if (teacher)` checks existence not publication status — any teacher row redirects to /dashboard regardless of draft/published state
- URL format: `?subject=X#booking` — browser URL parsing terminates search string at `#`, so query params must precede the fragment
- BookNowCTA import was already on line 8 of [slug]/page.tsx — only JSX render call was missing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All five v1.0 audit gaps addressed in automated tasks
- Task 4 (human-verify checkpoint) requires browser verification of: sticky CTA at 375px, $X/hr in CredentialsBar, rebook pre-fill, /account redirect to /login, draft teacher redirect to /dashboard
- Full test suite green — ready for checkpoint verification

---
*Phase: 06-profile-account-fixes*
*Completed: 2026-03-10*
