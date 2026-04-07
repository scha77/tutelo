---
estimated_steps: 56
estimated_files: 20
skills_used: []
---

# T03: Wire Sentry Mocks in Test Files & Run Full Verification

## Description

After T02 added `import * as Sentry from '@sentry/nextjs'` to 18 production files, every test file that imports those modules will fail because `@sentry/nextjs` isn't available in the test environment. Add `vi.mock('@sentry/nextjs')` to all affected test files, then run the full verification suite.

The mock pattern is simple and consistent:
```ts
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))
```

Place this near the top of each test file, alongside other `vi.mock()` calls.

## Test files that need the mock (~20 files):

**Webhook/checkout tests:**
- `tests/stripe/checkout-session.test.ts`
- `src/__tests__/webhook-capture.test.ts`
- `src/__tests__/saved-payment-methods.test.ts`

**Cron tests:**
- `src/__tests__/recurring-charges.test.ts`
- `src/__tests__/reminders.test.ts`
- `tests/stripe/reminders-cron.test.ts`
- `tests/stripe/auto-cancel.test.ts`

**Manage route tests:**
- `src/__tests__/manage-cancel.test.ts`
- `src/__tests__/cancel-session.test.ts`
- `src/__tests__/cancel-recurring.test.ts`

**Booking route tests:**
- `src/__tests__/payment-intent.test.ts`
- `tests/unit/session-type-pricing.test.ts`
- `src/__tests__/create-recurring.test.ts`

**Other route tests:**
- `src/__tests__/messaging.test.ts`

**Action/utility tests:**
- `src/__tests__/parent-phone-storage.test.ts`
- `src/__tests__/booking-routing.test.ts`
- `tests/bookings/booking-action.test.ts`
- `src/__tests__/verification.test.ts`
- `src/__tests__/sms.test.ts`
- `tests/unit/waitlist-notify.test.ts`

**Note:** Some test files may not need the mock if they fully mock the module that imports Sentry (so the Sentry import never executes). For each file: check if it imports the production module directly — if yes, add the mock. If the test file completely replaces the module with vi.mock, the Sentry mock is unnecessary. When in doubt, add it — the mock is harmless.

## Steps

1. For each test file listed above: read the file, identify where other `vi.mock()` calls are located, and add `vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), init: vi.fn(), captureRequestError: vi.fn() }))` in the same area.
2. Run `npx vitest run` and check for any remaining test failures related to Sentry imports.
3. If any test files NOT in the list above fail due to missing Sentry mock, add the mock to those files too.
4. Run `npx next build` to confirm the full build still passes.
5. Run `npx tsc --noEmit` for final type check.
6. Run the catch block coverage audit: `rg 'catch' src/actions/ src/app/api/ src/lib/ -g '*.ts' -g '*.tsx'` and verify every server-side catch either has `captureException`, `console.error` with context, or is in the known-safe list (JSON parse, timezone fallback, cookie read-only, redirect throw).

## Must-Haves

- [ ] All affected test files have vi.mock('@sentry/nextjs')
- [ ] `npx vitest run` passes with 0 failures
- [ ] `npx next build` succeeds
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] Catch block coverage audit confirms no unhandled catches

## Verification

- `npx vitest run` exits 0 with all tests passing
- `npx next build` exits 0
- `npx tsc --noEmit` exits 0

## Inputs

- ``src/app/api/stripe/webhook/route.ts` — T02 output, now imports @sentry/nextjs`
- ``src/actions/bookings.ts` — T02 output, now imports @sentry/nextjs`
- ``tests/stripe/checkout-session.test.ts` — test file importing webhook route`
- ``src/__tests__/webhook-capture.test.ts` — test file importing webhook route`
- ``src/__tests__/saved-payment-methods.test.ts` — test file importing webhook + PM routes`
- ``src/__tests__/recurring-charges.test.ts` — test file importing recurring-charges cron`
- ``src/__tests__/reminders.test.ts` — test file importing reminder crons`
- ``tests/stripe/reminders-cron.test.ts` — test file importing stripe-reminders cron`
- ``tests/stripe/auto-cancel.test.ts` — test file importing auto-cancel cron`
- ``src/__tests__/manage-cancel.test.ts` — test file importing manage routes`
- ``src/__tests__/cancel-session.test.ts` — test file importing cancel-session + bookings`
- ``src/__tests__/cancel-recurring.test.ts` — test file importing cancel-series + bookings`
- ``src/__tests__/payment-intent.test.ts` — test file importing create-intent route`
- ``tests/unit/session-type-pricing.test.ts` — test file importing create-intent route`
- ``src/__tests__/create-recurring.test.ts` — test file importing create-recurring route`
- ``src/__tests__/messaging.test.ts` — test file importing messages route`
- ``src/__tests__/parent-phone-storage.test.ts` — test file importing bookings action`
- ``src/__tests__/booking-routing.test.ts` — test file importing bookings action`
- ``tests/bookings/booking-action.test.ts` — test file importing bookings action`
- ``src/__tests__/verification.test.ts` — test file importing verification action`
- ``src/__tests__/sms.test.ts` — test file importing sms utility`
- ``tests/unit/waitlist-notify.test.ts` — test file importing waitlist utility`

## Expected Output

- ``tests/stripe/checkout-session.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/webhook-capture.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/saved-payment-methods.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/recurring-charges.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/reminders.test.ts` — vi.mock('@sentry/nextjs') added`
- ``tests/stripe/reminders-cron.test.ts` — vi.mock('@sentry/nextjs') added`
- ``tests/stripe/auto-cancel.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/manage-cancel.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/cancel-session.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/cancel-recurring.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/payment-intent.test.ts` — vi.mock('@sentry/nextjs') added`
- ``tests/unit/session-type-pricing.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/create-recurring.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/messaging.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/parent-phone-storage.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/booking-routing.test.ts` — vi.mock('@sentry/nextjs') added`
- ``tests/bookings/booking-action.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/verification.test.ts` — vi.mock('@sentry/nextjs') added`
- ``src/__tests__/sms.test.ts` — vi.mock('@sentry/nextjs') added`
- ``tests/unit/waitlist-notify.test.ts` — vi.mock('@sentry/nextjs') added`

## Verification

npx vitest run && npx next build && npx tsc --noEmit
