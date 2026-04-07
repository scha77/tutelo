---
estimated_steps: 50
estimated_files: 18
skills_used: []
---

# T02: Add Sentry.captureException to All Server-Side Catch Blocks

## Description

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

## Inputs

- ``sentry.client.config.ts` — T01 output, confirms @sentry/nextjs is installed`
- ``src/app/api/stripe/webhook/route.ts` — webhook handler with 6 catch blocks`
- ``src/app/api/stripe-connect/webhook/route.ts` — connect webhook with 1 catch`
- ``src/app/api/cron/recurring-charges/route.ts` — cron with 2 catches`
- ``src/app/api/cron/session-reminders/route.ts` — cron with 2 catches`
- ``src/app/api/cron/stripe-reminders/route.ts` — cron with 2 catches`
- ``src/app/api/cron/auto-cancel/route.ts` — cron with 1 catch`
- ``src/app/api/manage/cancel-session/route.ts` — manage route with 2 catches`
- ``src/app/api/manage/cancel-series/route.ts` — manage route with 2 catches`
- ``src/app/api/direct-booking/create-intent/route.ts` — booking route with 2 catches`
- ``src/app/api/direct-booking/create-recurring/route.ts` — booking route with 2 catches`
- ``src/app/api/messages/route.ts` — messaging route with 1 catch`
- ``src/app/api/parent/payment-method/route.ts` — PM route with 1 catch`
- ``src/app/api/track-view/route.ts` — analytics route with 2 catches`
- ``src/app/api/waitlist/route.ts` — waitlist route with 1 catch`
- ``src/actions/bookings.ts` — booking actions with 11 catches`
- ``src/actions/verification.ts` — verification action with 1 catch`
- ``src/lib/sms.ts` — SMS utility with 1 catch`
- ``src/lib/utils/waitlist.ts` — waitlist utility with 2 catches`

## Expected Output

- ``src/app/api/stripe/webhook/route.ts` — Sentry.captureException added to catch blocks`
- ``src/app/api/stripe-connect/webhook/route.ts` — Sentry.captureException added`
- ``src/app/api/cron/recurring-charges/route.ts` — Sentry.captureException added`
- ``src/app/api/cron/session-reminders/route.ts` — Sentry.captureException added`
- ``src/app/api/cron/stripe-reminders/route.ts` — Sentry.captureException added`
- ``src/app/api/cron/auto-cancel/route.ts` — Sentry.captureException added`
- ``src/app/api/manage/cancel-session/route.ts` — Sentry.captureException added`
- ``src/app/api/manage/cancel-series/route.ts` — Sentry.captureException added`
- ``src/app/api/direct-booking/create-intent/route.ts` — Sentry.captureException added`
- ``src/app/api/direct-booking/create-recurring/route.ts` — Sentry.captureException added`
- ``src/app/api/messages/route.ts` — Sentry.captureException added`
- ``src/app/api/parent/payment-method/route.ts` — Sentry.captureException added`
- ``src/app/api/track-view/route.ts` — Sentry.captureException added`
- ``src/app/api/waitlist/route.ts` — Sentry.captureException added`
- ``src/actions/bookings.ts` — Sentry.captureException added to all relevant catches`
- ``src/actions/verification.ts` — Sentry.captureException added`
- ``src/lib/sms.ts` — Sentry.captureException added`
- ``src/lib/utils/waitlist.ts` — Sentry.captureException added`

## Verification

npx tsc --noEmit && test $(rg 'captureException' src/actions/ src/app/api/ src/lib/ -g '*.ts' | wc -l) -ge 30
