# S02: Sentry Integration & Error Handling Audit

**Goal:** Integrate Sentry error tracking SDK and audit all server-side catch blocks for proper error reporting, satisfying R002 (operability) and R003 (failure-visibility).
**Demo:** After this: Trigger a deliberate error in dev → appears in Sentry dashboard with stack trace and request context. All catch blocks either re-throw, report to Sentry, or log with structured context.

## Tasks
- [x] **T01: Installed @sentry/nextjs, created client/server/edge/instrumentation config files, wrapped next.config.ts with withSentryConfig, and wired Sentry.captureException into both error boundaries** — ## Description

Bootstrap the Sentry Next.js SDK. Install the package, create the four required config files at the project root, wrap `next.config.ts` with `withSentryConfig`, and wire `Sentry.captureException` into both error boundary files.

**Important:** `src/app/global-error.tsx` does NOT have a `useEffect` — you must add one (import `useEffect` from React, wrap the `Sentry.captureException(error)` call in `useEffect(() => { ... }, [error])`).

`src/app/error.tsx` already has `useEffect(() => { console.error(...) }, [error])` — add `Sentry.captureException(error)` inside the existing `useEffect` callback, before or after the `console.error` call.

Env vars (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) are referenced via `process.env` but may not be set in all environments. The SDK gracefully no-ops when DSN is undefined. Source map upload must use `errorHandler` to warn-not-fail so builds succeed without `SENTRY_AUTH_TOKEN`.

## Steps

1. Run `npm install @sentry/nextjs` to add the package.
2. Create `sentry.client.config.ts` at project root with `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, sendDefaultPii: false })`.
3. Create `sentry.server.config.ts` at project root with `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1, sendDefaultPii: false })`.
4. Create `sentry.edge.config.ts` at project root with minimal `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1, sendDefaultPii: false })`.
5. Create `src/instrumentation.ts` with `register()` function that conditionally imports server/edge configs based on `process.env.NEXT_RUNTIME`, and exports `onRequestError = Sentry.captureRequestError`.
6. Wrap `next.config.ts`: import `withSentryConfig` from `@sentry/nextjs`, wrap `export default nextConfig` with `withSentryConfig(nextConfig, { org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, authToken: process.env.SENTRY_AUTH_TOKEN, silent: !process.env.CI, tunnelRoute: '/monitoring', errorHandler: (err) => { console.warn('[sentry] Source map upload skipped:', err.message) } })`.
7. Read `src/app/error.tsx`. Add `import * as Sentry from '@sentry/nextjs'` at top. Add `Sentry.captureException(error)` inside the existing `useEffect` callback.
8. Read `src/app/global-error.tsx`. Add `import { useEffect } from 'react'` and `import * as Sentry from '@sentry/nextjs'`. Add `useEffect(() => { Sentry.captureException(error) }, [error])` inside the component body before the return statement.
9. Run `npx next build` to verify the build succeeds with the Sentry wrapper.

## Must-Haves

- [ ] `@sentry/nextjs` installed in package.json
- [ ] 4 config files created (sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts, src/instrumentation.ts)
- [ ] next.config.ts wrapped with withSentryConfig
- [ ] error.tsx calls Sentry.captureException in useEffect
- [ ] global-error.tsx has useEffect added and calls Sentry.captureException
- [ ] Build succeeds even without SENTRY_AUTH_TOKEN (errorHandler prevents build failure)
- [ ] sendDefaultPii is false (student data protection)

## Verification

- `npx next build` completes without errors
- `grep -q 'captureException' src/app/error.tsx` returns 0
- `grep -q 'captureException' src/app/global-error.tsx` returns 0
- `grep -q 'useEffect' src/app/global-error.tsx` returns 0

## Observability Impact

- Signals added: Sentry SDK initialization on client, server, and edge runtimes. `onRequestError` hook captures unhandled request errors automatically.
- How a future agent inspects this: Check Sentry dashboard for incoming errors. Locally, `console.warn('[sentry]')` messages indicate source map upload status.
- Failure state exposed: Error boundaries now report to Sentry before rendering fallback UI — previously errors were only in browser console.
  - Estimate: 45m
  - Files: package.json, sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts, src/instrumentation.ts, next.config.ts, src/app/error.tsx, src/app/global-error.tsx
  - Verify: npx next build && grep -q 'captureException' src/app/error.tsx && grep -q 'captureException' src/app/global-error.tsx && grep -q 'useEffect' src/app/global-error.tsx
- [x] **T02: Added Sentry.captureException to 44 catch blocks across 18 production files covering webhooks, crons, manage routes, booking routes, actions, and utilities** — ## Description

Audit and instrument all server-side catch blocks that handle real errors (not expected failures like JSON parse or redirect throws). Add `import * as Sentry from '@sentry/nextjs'` and `Sentry.captureException(error)` to each file's catch blocks.

The research already classified every catch block. Apply `Sentry.captureException(error)` in catch blocks that currently use `console.error` for real errors. Place the Sentry call BEFORE the existing `console.error` (so Sentry captures even if the console.error line changes later). Do NOT modify catches that are: JSON parse guards returning 400, timezone/Intl fallbacks, clipboard API fallbacks, Supabase SSR cookie read-only catches, redirect throws, or client-side `setError()` patterns.

For fire-and-forget `.catch(console.error)` patterns on email/SMS sends, upgrade to `.catch((err) => { Sentry.captureException(err); console.error(...) })` — these are real errors worth tracking even if the primary action succeeded.

## Files to instrument (18 production files):

**Webhooks:**
- `src/app/api/stripe/webhook/route.ts` — 6 catch blocks for sig verify, checkout, PM, confirmation
- `src/app/api/stripe-connect/webhook/route.ts` — 1 catch for sig verification

**Cron jobs:**
- `src/app/api/cron/recurring-charges/route.ts` — 2 catches for Stripe charge failures (critical)
- `src/app/api/cron/session-reminders/route.ts` — 2 catches for email/SMS send failures
- `src/app/api/cron/stripe-reminders/route.ts` — 2 catches for reminder email failures
- `src/app/api/cron/auto-cancel/route.ts` — 1 catch for cancellation email

**Manage routes:**
- `src/app/api/manage/cancel-session/route.ts` — 2 catches for token validation + cancellation
- `src/app/api/manage/cancel-series/route.ts` — 2 catches for token validation + series cancel

**Booking routes:**
- `src/app/api/direct-booking/create-intent/route.ts` — 2 catches for Stripe PI creation
- `src/app/api/direct-booking/create-recurring/route.ts` — 2 catches for recurring booking creation

**Other API routes:**
- `src/app/api/messages/route.ts` — 1 catch for email notification failure
- `src/app/api/parent/payment-method/route.ts` — 1 catch for Stripe PM detach
- `src/app/api/track-view/route.ts` — 2 catches for view tracking errors
- `src/app/api/waitlist/route.ts` — 1 catch for waitlist POST error

**Actions & utilities:**
- `src/actions/bookings.ts` — 11 catch blocks (Stripe PI cancellation, phone storage, email errors; some are fire-and-forget .catch(console.error) — upgrade those too)
- `src/actions/verification.ts` — 1 catch for email send failure
- `src/lib/sms.ts` — 1 catch for SMS send failure
- `src/lib/utils/waitlist.ts` — 2 catches for notification send failures

## Pattern to apply per file:

```ts
// At top of file, add:
import * as Sentry from '@sentry/nextjs'

// In each catch block, add before console.error:
Sentry.captureException(error)
```

## Steps

1. For each of the 18 files listed above: read the file, add `import * as Sentry from '@sentry/nextjs'`, and add `Sentry.captureException(error)` (or `Sentry.captureException(err)` matching the catch variable name) in each relevant catch block.
2. For `src/actions/bookings.ts`, pay special attention to the fire-and-forget patterns like `.catch(console.error)` on email/SMS sends — upgrade to `.catch((err) => { Sentry.captureException(err); console.error('context:', err) })`.
3. Do NOT touch catch blocks that are: JSON parse guards (`catch { return new Response('Invalid JSON', { status: 400 }) }`), timezone fallbacks (`catch { return 'UTC' }`), or cookie read-only patterns.
4. Run `npx tsc --noEmit` to verify all imports resolve and types are correct.

## Must-Haves

- [ ] All 18 production files have `import * as Sentry from '@sentry/nextjs'`
- [ ] Every server-side catch block handling real errors calls `Sentry.captureException`
- [ ] Fire-and-forget `.catch(console.error)` patterns upgraded to include Sentry
- [ ] No changes to JSON parse guards, timezone fallbacks, clipboard fallbacks, or redirect catches
- [ ] `npx tsc --noEmit` passes

## Verification

- `npx tsc --noEmit` exits 0 (all Sentry imports resolve, no type errors)
- `rg 'captureException' src/actions/ src/app/api/ src/lib/ -g '*.ts' | wc -l` returns >= 30 (confirming broad coverage)
  - Estimate: 1h30m
  - Files: src/app/api/stripe/webhook/route.ts, src/app/api/stripe-connect/webhook/route.ts, src/app/api/cron/recurring-charges/route.ts, src/app/api/cron/session-reminders/route.ts, src/app/api/cron/stripe-reminders/route.ts, src/app/api/cron/auto-cancel/route.ts, src/app/api/manage/cancel-session/route.ts, src/app/api/manage/cancel-series/route.ts, src/app/api/direct-booking/create-intent/route.ts, src/app/api/direct-booking/create-recurring/route.ts, src/app/api/messages/route.ts, src/app/api/parent/payment-method/route.ts, src/app/api/track-view/route.ts, src/app/api/waitlist/route.ts, src/actions/bookings.ts, src/actions/verification.ts, src/lib/sms.ts, src/lib/utils/waitlist.ts
  - Verify: npx tsc --noEmit && test $(rg 'captureException' src/actions/ src/app/api/ src/lib/ -g '*.ts' | wc -l) -ge 30
- [x] **T03: Added vi.mock('@sentry/nextjs') to all 20 test files affected by T02's Sentry imports; all 470 tests pass, build and type check clean** — ## Description

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
  - Estimate: 1h
  - Files: tests/stripe/checkout-session.test.ts, src/__tests__/webhook-capture.test.ts, src/__tests__/saved-payment-methods.test.ts, src/__tests__/recurring-charges.test.ts, src/__tests__/reminders.test.ts, tests/stripe/reminders-cron.test.ts, tests/stripe/auto-cancel.test.ts, src/__tests__/manage-cancel.test.ts, src/__tests__/cancel-session.test.ts, src/__tests__/cancel-recurring.test.ts, src/__tests__/payment-intent.test.ts, tests/unit/session-type-pricing.test.ts, src/__tests__/create-recurring.test.ts, src/__tests__/messaging.test.ts, src/__tests__/parent-phone-storage.test.ts, src/__tests__/booking-routing.test.ts, tests/bookings/booking-action.test.ts, src/__tests__/verification.test.ts, src/__tests__/sms.test.ts, tests/unit/waitlist-notify.test.ts
  - Verify: npx vitest run && npx next build && npx tsc --noEmit
