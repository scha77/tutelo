---
id: T03
parent: S02
milestone: M013
key_files:
  - tests/stripe/checkout-session.test.ts
  - src/__tests__/webhook-capture.test.ts
  - src/__tests__/recurring-charges.test.ts
  - src/__tests__/manage-cancel.test.ts
  - src/__tests__/cancel-session.test.ts
  - src/__tests__/cancel-recurring.test.ts
  - src/__tests__/payment-intent.test.ts
  - src/__tests__/create-recurring.test.ts
  - src/__tests__/messaging.test.ts
  - src/__tests__/sms.test.ts
  - tests/bookings/booking-action.test.ts
  - src/__tests__/saved-payment-methods.test.ts
  - src/__tests__/reminders.test.ts
  - tests/stripe/reminders-cron.test.ts
  - tests/stripe/auto-cancel.test.ts
  - tests/unit/session-type-pricing.test.ts
  - src/__tests__/parent-phone-storage.test.ts
  - src/__tests__/booking-routing.test.ts
  - src/__tests__/verification.test.ts
  - tests/unit/waitlist-notify.test.ts
key_decisions:
  - Uniform vi.mock factory pattern across all 20 files (captureException, init, captureRequestError) — keeps mocks consistent and covers all Sentry exports used in production
duration: 
verification_result: passed
completed_at: 2026-04-07T14:36:31.438Z
blocker_discovered: false
---

# T03: Added vi.mock('@sentry/nextjs') to all 20 test files affected by T02's Sentry imports; all 470 tests pass, build and type check clean

**Added vi.mock('@sentry/nextjs') to all 20 test files affected by T02's Sentry imports; all 470 tests pass, build and type check clean**

## What Happened

After T02 added `import * as Sentry from '@sentry/nextjs'` to 18 production files, every test importing those modules would fail because @sentry/nextjs isn't available in the test environment. Added a uniform vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), init: vi.fn(), captureRequestError: vi.fn() })) to all 20 test files. Each file was read to identify placement of existing vi.mock calls, and the Sentry mock was inserted alongside them. Ran catch block coverage audit — all server-side catches accounted for with Sentry.captureException, console.error with context, or known-safe categories.

## Verification

npx vitest run: 470 passed, 0 failures (exit 0). npx next build: compiled successfully (exit 0). npx tsc --noEmit: 0 errors (exit 0). All 4 slice-level grep checks pass. Catch block coverage audit confirms full coverage.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run` | 0 | ✅ pass | 19600ms |
| 2 | `npx next build` | 0 | ✅ pass | 61900ms |
| 3 | `npx tsc --noEmit` | 0 | ✅ pass | 58100ms |
| 4 | `grep -q 'captureException' src/app/error.tsx` | 0 | ✅ pass | 100ms |
| 5 | `grep -q 'captureException' src/app/global-error.tsx` | 0 | ✅ pass | 100ms |
| 6 | `grep -q 'useEffect' src/app/global-error.tsx` | 0 | ✅ pass | 100ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `tests/stripe/checkout-session.test.ts`
- `src/__tests__/webhook-capture.test.ts`
- `src/__tests__/recurring-charges.test.ts`
- `src/__tests__/manage-cancel.test.ts`
- `src/__tests__/cancel-session.test.ts`
- `src/__tests__/cancel-recurring.test.ts`
- `src/__tests__/payment-intent.test.ts`
- `src/__tests__/create-recurring.test.ts`
- `src/__tests__/messaging.test.ts`
- `src/__tests__/sms.test.ts`
- `tests/bookings/booking-action.test.ts`
- `src/__tests__/saved-payment-methods.test.ts`
- `src/__tests__/reminders.test.ts`
- `tests/stripe/reminders-cron.test.ts`
- `tests/stripe/auto-cancel.test.ts`
- `tests/unit/session-type-pricing.test.ts`
- `src/__tests__/parent-phone-storage.test.ts`
- `src/__tests__/booking-routing.test.ts`
- `src/__tests__/verification.test.ts`
- `tests/unit/waitlist-notify.test.ts`
