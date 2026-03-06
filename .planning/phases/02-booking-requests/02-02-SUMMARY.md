---
phase: 02-booking-requests
plan: "02"
subsystem: ui
tags: [dashboard, booking-requests, server-actions, sidebar, react, supabase, stripe-banner]

requires:
  - phase: 02-01
    provides: acceptBooking/declineBooking Server Actions, bookings table with status field, create_booking RPC

provides:
  - /dashboard/requests RSC page with pending booking cards
  - RequestCard client component with inline accept/decline (useTransition)
  - CopyLinkButton client component for empty state
  - Sidebar updated: Requests nav item first, pendingCount badge
  - Dashboard layout: parallel pending count query + Stripe warning banner
  - src/lib/email.ts with Resend sendBookingEmail implementation

affects: [02-03, stripe-connect, email-notifications]

tech-stack:
  added: []
  patterns: [rsc-fetch-then-render, server-action-as-prop, useTransition-for-loading, layout-level-banner]

key-files:
  created:
    - src/app/(dashboard)/dashboard/requests/page.tsx
    - src/app/(dashboard)/dashboard/requests/CopyLinkButton.tsx
    - src/components/dashboard/RequestCard.tsx
    - src/lib/email.ts
  modified:
    - src/components/dashboard/Sidebar.tsx
    - src/app/(dashboard)/dashboard/layout.tsx
    - src/actions/bookings.ts
    - tests/bookings/booking-action.test.ts

key-decisions:
  - "Badge uses href comparison ('/dashboard/requests') not label string for coupling safety"
  - "Stripe warning banner is conditional layout block, not a separate notification system"
  - "pendingCount fetched sequentially after teacher (needs teacher.id), not truly parallel"
  - "email.ts created as real Resend implementation (overwritten from stub by external 02-03 TDD process)"
  - "vi.mock('@/lib/email') in test file prevents Vite import analysis error for dynamic import"
  - "Pre-existing email.test.ts failures (3 tests) from 02-03 RED phase are out of scope — logged to deferred-items"

patterns-established:
  - "Server Actions passed as props from RSC to client components (acceptAction/declineAction)"
  - "useTransition + local pendingAction state for independent per-button loading"
  - "Layout-level data queries (pendingCount + stripe_charges_enabled) fed into Sidebar + conditional banners"

requirements-completed: [BOOK-06, DASH-02, STRIPE-02]

duration: 3min
completed: "2026-03-06"
---

# Phase 2 Plan 2: Teacher-Facing Booking Requests Dashboard Summary

**Teacher dashboard with /dashboard/requests page, RequestCard inline accept/decline, Requests-first Sidebar nav with badge, and layout-level Stripe connection warning banner.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T04:09:11Z
- **Completed:** 2026-03-06T04:12:XX Z
- **Tasks:** 3 of 3 complete (Task 3 human-verify checkpoint approved)
- **Files modified:** 8

## Accomplishments

- Created /dashboard/requests RSC page that fetches pending bookings and renders RequestCard list or empty state
- Built RequestCard client component with independent accept/decline loading states via useTransition
- Updated Sidebar with Requests as first nav item and dynamic badge for pending count
- Updated dashboard layout to fetch pendingCount + stripe_charges_enabled and show Stripe warning banner
- Implemented real acceptBooking/declineBooking unit tests (5 passing, replacing it.todo stubs)

## Task Commits

1. **Task 1: Dashboard requests page + RequestCard component** - `ea1854c` (feat)
2. **Task 2: Sidebar + layout updates** - `c4cfa92` (feat)
3. **Task 3: Human verify — end-to-end booking loop** - APPROVED (full booking loop verified in browser)

## Files Created/Modified

- `src/app/(dashboard)/dashboard/requests/page.tsx` - RSC page: auth check, teacher fetch, pending bookings query, RequestCard list or empty state
- `src/app/(dashboard)/dashboard/requests/CopyLinkButton.tsx` - Client component: copies tutelo.app/slug to clipboard with visual feedback
- `src/components/dashboard/RequestCard.tsx` - Client component: student name, subject badge, formatted date/time (teacher timezone), parent email, submitted-ago, accept/decline buttons with useTransition
- `src/lib/email.ts` - Resend sendBookingEmail: MoneyWaitingEmail (pre-Stripe) + BookingNotificationEmail (post-Stripe)
- `src/components/dashboard/Sidebar.tsx` - Added pendingCount prop, Requests nav item first (Inbox icon), badge when pending > 0
- `src/app/(dashboard)/dashboard/layout.tsx` - Extended teacher select (stripe_charges_enabled), added pending count query, passes pendingCount to Sidebar, renders amber Stripe banner
- `src/actions/bookings.ts` - Removed @ts-expect-error (email module now exists)
- `tests/bookings/booking-action.test.ts` - Real tests for acceptBooking/declineBooking (5 tests passing)

## Decisions Made

- Badge uses `href === '/dashboard/requests'` not label string to avoid fragile string coupling
- Stripe warning banner is a conditional block in the layout, not a separate component or notification system (per CONTEXT.md locked decision)
- pendingCount is fetched sequentially after teacher (requires teacher.id) — not truly parallel, but minimal latency cost
- Pre-existing email.test.ts failures from Plan 02-03 TDD RED phase logged to deferred-items.md (out of scope)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vite import analysis error for dynamic @/lib/email import**
- **Found during:** Task 1 (booking-action.test.ts RED phase)
- **Issue:** `import('@/lib/email')` inside bookings.ts caused Vite to fail resolving the module at transform time even with `@ts-expect-error`. The mock in the test file runs at runtime, too late for Vite's static import analysis.
- **Fix:** Created `src/lib/email.ts` (initially a no-op stub, later overwritten by 02-03 TDD process with real Resend implementation). Added `vi.mock('@/lib/email')` to test file. Removed `@ts-expect-error` from bookings.ts.
- **Files modified:** src/lib/email.ts, tests/bookings/booking-action.test.ts, src/actions/bookings.ts
- **Verification:** All 5 booking-action tests pass; TypeScript clean
- **Committed in:** ea1854c (Task 1 commit)

**2. [Rule 1 - Note] email.ts overwritten by external 02-03 TDD process**
- **Found during:** Task 1 post-commit
- **Issue:** The stub email.ts I created was silently overwritten by an automated linter/tool process with the full Resend + react-email implementation (the Plan 02-03 GREEN phase content). This is not a bug — it's the intended 02-03 implementation landing early.
- **Fix:** No action required. The real implementation is correct and TypeScript compiles clean.
- **Files modified:** src/lib/email.ts (external modification)
- **Verification:** TypeScript clean; tests pass

**3. [Post-checkpoint] Sidebar badge redesigned from red to green pulsing dot**
- **Found during:** Human-verify checkpoint (Task 3 — user-requested improvement)
- **Issue:** The red badge on the Requests nav item was visually heavy and read as an error state rather than a positive "new activity" signal.
- **Fix:** Replaced red `bg-destructive` count badge with: (a) small green `animate-pulse` dot overlaying the Inbox icon, and (b) green `bg-green-500` count badge. Both convey "new booking" warmly rather than urgently.
- **Files modified:** `src/components/dashboard/Sidebar.tsx`
- **Committed in:** User-applied after checkpoint approval (on main)

**4. [Post-checkpoint] Stripe banner now shows whenever stripe_charges_enabled is false**
- **Found during:** Human-verify checkpoint (Task 3 — user-requested improvement)
- **Issue:** Plan spec only showed the banner when `pendingCount > 0 && !stripe_charges_enabled`. Teachers who haven't connected Stripe but have no pending requests see no prompt to activate payments.
- **Fix:** Banner now renders whenever `!stripe_charges_enabled` with two message variants: urgent "You have N pending request(s)! Connect Stripe to confirm them." when pending > 0, and general "Connect Stripe to start accepting payments from parents." when no pending requests.
- **Files modified:** `src/app/(dashboard)/dashboard/layout.tsx`
- **Committed in:** User-applied after checkpoint approval (on main)

---

**Total deviations:** 4 (1 blocking auto-fix, 1 informational note, 2 post-checkpoint UX improvements)
**Impact on plan:** Auto-fix was necessary to unblock tests. Email module landing early is a net positive for Plan 02-03. Post-checkpoint changes are incremental UX improvements on existing plan artifacts.

## Issues Encountered

- Pre-existing test failures: `tests/bookings/email.test.ts` has 3 failing tests from Plan 02-03 TDD RED phase (Resend constructor mock pattern incorrect). Logged to deferred-items.md. Fix belongs in Plan 02-03 GREEN phase.

## User Setup Required

None — no external service configuration required for this plan's UI changes. Stripe and Resend setup handled in Plans 02-03+.

## Next Phase Readiness

- Booking request UI complete: teachers can see, accept, and decline requests
- Stripe warning banner wired to /dashboard/connect-stripe (placeholder link ready for Phase 3)
- email.ts is production-ready once RESEND_API_KEY + email templates are configured (Plan 02-03)
- Human checkpoint (Task 3) approved — full booking loop verified end-to-end

## Self-Check: PASSED

### Files Exist
- FOUND: src/app/(dashboard)/dashboard/requests/page.tsx
- FOUND: src/app/(dashboard)/dashboard/requests/CopyLinkButton.tsx
- FOUND: src/components/dashboard/RequestCard.tsx
- FOUND: src/lib/email.ts
- FOUND: .planning/phases/02-booking-requests/02-02-SUMMARY.md

### Commits Exist
- FOUND: ea1854c (Task 1: requests page + RequestCard)
- FOUND: c4cfa92 (Task 2: Sidebar + layout)

---
*Phase: 02-booking-requests*
*Completed: 2026-03-06*
