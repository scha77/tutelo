---
id: T03
parent: S02
milestone: M001
provides:
  - sendBookingEmail() function with conditional template branching on stripe_charges_enabled
  - MoneyWaitingEmail react-email template (urgent Stripe activation CTA)
  - BookingNotificationEmail react-email template (standard dashboard link CTA)
  - email.test.ts: 3 passing unit tests covering all branching logic
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 4min
verification_result: passed
completed_at: 2026-03-06
blocker_discovered: false
---
# T03: 02-booking-requests 03

**# Phase 2 Plan 3: Email Notification — Resend + react-email Templates Summary**

## What Happened

# Phase 2 Plan 3: Email Notification — Resend + react-email Templates Summary

**Resend + react-email wired to booking submission: MoneyWaitingEmail (urgent Stripe CTA for unconnected teachers) and BookingNotificationEmail (dashboard link for connected teachers), with silent skip when social_email is null.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T04:09:08Z
- **Completed:** 2026-03-06T04:13:25Z
- **Tasks:** 2 (Task 0: install packages, Task 1: TDD email implementation)
- **Files modified:** 7

## Accomplishments

- Installed resend + @react-email/components; both verified importable in Node
- Created MoneyWaitingEmail: warm, urgent tone, "Activate Payments →" CTA linking to `/dashboard/connect-stripe`
- Created BookingNotificationEmail: standard notification, "View Requests →" CTA linking to `/dashboard/requests`
- Implemented sendBookingEmail() with full conditional branching: money-waiting (Stripe not connected) vs standard notification (connected) vs silent skip (null social_email)
- 3 email branching tests pass; full suite: 41 tests pass, 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 0: Install packages** - `1d4a950` (chore)
2. **Task 1 RED: Failing tests** - `c913477` (test)
3. **Task 1 GREEN: Email implementation** - `1317cbc` (feat)

_Note: TDD task has 2 commits (test RED → feat GREEN)_

## Files Created/Modified

- `src/lib/email.ts` - sendBookingEmail() with Resend API + conditional template branching
- `src/emails/MoneyWaitingEmail.tsx` - react-email template for unconnected-Stripe teachers
- `src/emails/BookingNotificationEmail.tsx` - react-email template for Stripe-connected teachers
- `tests/bookings/email.test.ts` - 3 unit tests covering all branching cases
- `package.json` - added resend, @react-email/components
- `package-lock.json` - lockfile updated
- `.env.local` - RESEND_API_KEY placeholder documented

## Decisions Made

- **vi.hoisted() + class-based mock pattern:** `vi.fn().mockImplementation()` throws "not a constructor" in Vitest's ESM/SSR transform when production code uses `new Resend()`. Solution: `vi.hoisted()` to capture mock reference before hoisting, then `class MockResend { constructor() {} emails = { send: sendEmailMock } }` in mock factory.
- **Module-level resend instantiation:** No lazy-init needed — the class-based mock intercepts `new Resend()` correctly at module evaluation time. Simpler code.
- **RESEND_API_KEY as placeholder:** Value documented in .env.local as `re_...` — actual key must be provisioned from Resend dashboard before email delivery works in production.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vitest ESM constructor mock pattern**
- **Found during:** Task 1 GREEN phase (tests failing after implementation)
- **Issue:** `vi.fn().mockImplementation(() => ({...}))` and `vi.fn(() => ({...}))` both threw "() => ({...}) is not a constructor" when production code called `new Resend()` — Vitest's SSR transform does not make arrow functions constructable
- **Fix:** Changed to `vi.hoisted()` for pre-hoisting the sendEmailMock variable, and used a real class declaration (`class MockResend`) in the `vi.mock()` factory so `new Resend()` works correctly
- **Files modified:** `tests/bookings/email.test.ts`
- **Verification:** All 3 email tests pass, full suite 41 passed
- **Committed in:** 1317cbc (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in test mock pattern)
**Impact on plan:** Auto-fix necessary for test infrastructure correctness. Established a reusable mock pattern for any future tests that mock classes. No scope creep.

## Issues Encountered

None beyond the mock pattern issue documented above.

## User Setup Required

Before email delivery works, the following must be configured:

**Environment variables:**
- `RESEND_API_KEY` — get from resend.com → API Keys → Create API Key
- `NEXT_PUBLIC_APP_URL` — already set to `http://localhost:3000` in .env.local; set to `https://tutelo.app` in Vercel

**Optional Resend Dashboard:**
- Verify sender domain for production (`noreply@tutelo.app`). For testing, `onboarding@resend.dev` works without domain verification.

## Next Phase Readiness

- Email notification loop is complete: booking submission → sendBookingEmail → Resend API → teacher inbox
- The fire-and-forget import in `submitBookingRequest` now resolves correctly (no module-not-found, no @ts-expect-error needed)
- Phase 3 (Stripe Connect) will build on the `stripe_charges_enabled` flag this plan already reads

---
*Phase: 02-booking-requests*
*Completed: 2026-03-06*

## Self-Check: PASSED

### Files Exist
- FOUND: src/emails/MoneyWaitingEmail.tsx
- FOUND: src/emails/BookingNotificationEmail.tsx
- FOUND: src/lib/email.ts
- FOUND: tests/bookings/email.test.ts

### Commits Exist
- FOUND: 1d4a950 (Task 0: install packages)
- FOUND: c913477 (Task 1 RED: failing tests)
- FOUND: 1317cbc (Task 1 GREEN: implementation)
