---
estimated_steps: 13
estimated_files: 9
skills_used: []
---

# T01: Delete pure-stub files and remove stubs from mixed files

Bulk cleanup of 29 it.todo() stubs that describe behavior already covered by existing tests in src/__tests__/ or that describe obsolete/low-value behavior.

**Delete these 7 files entirely** (all stubs, no passing tests):
1. `tests/auth/session.test.ts` (2 todo) — E2E behavior, not unit-testable
2. `tests/onboarding/wizard.test.ts` (4 todo) — component changed substantially, heavy mocking for low ROI
3. `tests/bookings/booking-calendar.test.tsx` (5 todo) — BookingCalendar decomposed in M011, stubs describe old API
4. `tests/stripe/email-confirmation.test.ts` (3 todo) — webhook-capture.test.ts covers the email call path
5. `tests/stripe/email-complete.test.ts` (3 todo) — thin Resend wrapper, low ROI
6. `tests/stripe/email-cancellation.test.ts` (2 todo) — cancel-session.test.ts covers the email call path
7. `tests/stripe/connect-stripe.test.ts` (4 todo) — straightforward server action with no branching bugs

**Remove stubs from these 2 mixed files** (keep passing tests, delete only todo stubs):
1. `tests/bookings/booking-action.test.ts` — remove 3 todo stubs for `submitBookingRequest` (now uses direct-booking API route), keep 5 passing tests for acceptBooking/declineBooking
2. `tests/stripe/checkout-session.test.ts` — remove 3 todo stubs, keep 4 passing tests

Total: 29 stubs removed.

## Inputs

- ``tests/auth/session.test.ts` — pure-stub file to delete`
- ``tests/onboarding/wizard.test.ts` — pure-stub file to delete`
- ``tests/bookings/booking-calendar.test.tsx` — pure-stub file to delete`
- ``tests/bookings/booking-action.test.ts` — mixed file: remove 3 stubs, keep 5 passing`
- ``tests/stripe/email-confirmation.test.ts` — pure-stub file to delete`
- ``tests/stripe/email-complete.test.ts` — pure-stub file to delete`
- ``tests/stripe/email-cancellation.test.ts` — pure-stub file to delete`
- ``tests/stripe/connect-stripe.test.ts` — pure-stub file to delete`
- ``tests/stripe/checkout-session.test.ts` — mixed file: remove 3 stubs, keep 4 passing`

## Expected Output

- ``tests/bookings/booking-action.test.ts` — stubs removed, only passing tests remain`
- ``tests/stripe/checkout-session.test.ts` — stubs removed, only passing tests remain`

## Verification

npx vitest run 2>&1 | tail -5 — expect 470 passed, 16 todo, 4 skipped, 0 failures. Total test files should be 52 (59 - 7 deleted).
