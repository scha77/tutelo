---
id: S02
parent: M013
milestone: M013
provides:
  - Sentry SDK initialized on all three runtimes (client/server/edge)
  - 44 server-side catch blocks reporting to Sentry
  - vi.mock('@sentry/nextjs') pattern established for all test files
requires:
  []
affects:
  []
key_files:
  - sentry.client.config.ts
  - sentry.server.config.ts
  - sentry.edge.config.ts
  - src/instrumentation.ts
  - next.config.ts
  - src/app/error.tsx
  - src/app/global-error.tsx
  - src/app/api/stripe/webhook/route.ts
  - src/app/api/cron/recurring-charges/route.ts
  - src/actions/bookings.ts
  - src/lib/sms.ts
  - src/lib/utils/waitlist.ts
key_decisions:
  - tunnelRoute /monitoring for ad-blocker bypass
  - errorHandler warns instead of failing build without SENTRY_AUTH_TOKEN
  - Replays disabled (session and error sample rates 0)
  - Fire-and-forget .catch(console.error) patterns upgraded to include Sentry before console.error
  - JSON parse guards and timezone/Intl fallbacks correctly left untouched
  - Uniform vi.mock factory pattern across all 20 test files
patterns_established:
  - Sentry init pattern: sendDefaultPii: false, tracesSampleRate conditional on NODE_ENV, replays disabled
  - Error boundary Sentry pattern: captureException inside useEffect([error])
  - Catch block instrumentation: Sentry.captureException before console.error, never in JSON parse guards or timezone fallbacks
  - Fire-and-forget upgrade: .catch(console.error) → .catch((err) => { Sentry.captureException(err); console.error(...) })
  - Test mock pattern: vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), init: vi.fn(), captureRequestError: vi.fn() }))
observability_surfaces:
  - Sentry SDK on client/server/edge runtimes captures unhandled errors automatically
  - onRequestError hook in instrumentation.ts captures server request errors
  - 44 catch blocks now report to Sentry with stack traces and request context
  - tunnelRoute /monitoring bypasses ad-blockers for reliable error delivery
  - Error boundaries report to Sentry before rendering fallback UI
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-07T14:39:37.041Z
blocker_discovered: false
---

# S02: Sentry Integration & Error Handling Audit

**Integrated @sentry/nextjs across client/server/edge runtimes and instrumented 44 catch blocks in 18 production files with Sentry.captureException, with all 470 tests passing via uniform vi.mock pattern.**

## What Happened

This slice delivered full Sentry error tracking integration for the Tutelo codebase in three tasks.

**T01 — SDK Bootstrap:** Installed `@sentry/nextjs` and created four configuration files: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `src/instrumentation.ts`. The instrumentation file exports `onRequestError = Sentry.captureRequestError` for automatic server error capture. `next.config.ts` was wrapped with `withSentryConfig` including `tunnelRoute: '/monitoring'` (ad-blocker bypass) and an `errorHandler` that warns instead of failing builds when `SENTRY_AUTH_TOKEN` is not set. Both error boundary files were wired: `src/app/error.tsx` got `Sentry.captureException` added to its existing `useEffect`, and `src/app/global-error.tsx` got a new `useEffect` added. All configs set `sendDefaultPii: false` for student data protection.

**T02 — Catch Block Instrumentation:** All 18 server-side production files were audited and instrumented. 44 catch blocks received `Sentry.captureException` calls placed before existing `console.error` lines. Fire-and-forget `.catch(console.error)` patterns on email/SMS sends were upgraded to `.catch((err) => { Sentry.captureException(err); console.error(...) })`. Known-safe catches were correctly excluded: JSON parse guards returning 400, timezone/Intl fallbacks, clipboard API fallbacks, Supabase SSR cookie read-only catches, and redirect throws. One bare `catch {}` in the waitlist route was given a named variable for Sentry access.

**T03 — Test Mock Layer:** Added `vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), init: vi.fn(), captureRequestError: vi.fn() }))` to all 20 affected test files. Used a uniform factory pattern across every file for consistency. Final catch block coverage audit confirmed no unhandled server-side catches remain.

## Verification

All slice-level checks pass:
- `grep -q 'captureException' src/app/error.tsx` → exit 0
- `grep -q 'captureException' src/app/global-error.tsx` → exit 0
- `grep -q 'useEffect' src/app/global-error.tsx` → exit 0
- `rg 'captureException' src/actions/ src/app/api/ src/lib/ -g '*.ts'` → 44 occurrences (≥30 threshold)
- `npx vitest run` → 470 passed, 0 failures
- `npx tsc --noEmit` → 0 errors
- All 4 Sentry config files exist at expected paths
- `next.config.ts` contains `withSentryConfig`
- All 3 config files have `sendDefaultPii: false`

## Requirements Advanced

None.

## Requirements Validated

- R002 — Sentry SDK initialized on client/server/edge. Error boundaries call captureException. Source maps configured with errorHandler fallback. sendDefaultPii: false.
- R003 — 44 catch blocks instrumented across 18 files. Catch block audit confirms no silent catch-and-ignore patterns. Fire-and-forget patterns upgraded.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. All three tasks executed as planned.

## Known Limitations

Sentry is integrated but not yet connected to a live Sentry project. Env vars (NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT) must be configured in production before errors start appearing in the Sentry dashboard. Without DSN, the SDK no-ops gracefully — no runtime impact.

## Follow-ups

Set NEXT_PUBLIC_SENTRY_DSN and SENTRY_AUTH_TOKEN in Vercel production environment. Create a Sentry project and configure alert rules. Consider adding Sentry.setUser() with non-PII identifier (user ID, role) after auth for richer error context.

## Files Created/Modified

- `sentry.client.config.ts` — New: Sentry client-side init with DSN, trace sampling, PII disabled
- `sentry.server.config.ts` — New: Sentry server-side init
- `sentry.edge.config.ts` — New: Sentry edge runtime init
- `src/instrumentation.ts` — New: Next.js instrumentation hook, conditional server/edge config import, onRequestError export
- `next.config.ts` — Wrapped with withSentryConfig, tunnelRoute /monitoring, errorHandler for graceful source map upload
- `src/app/error.tsx` — Added Sentry.captureException in existing useEffect
- `src/app/global-error.tsx` — Added useEffect with Sentry.captureException
- `src/app/api/stripe/webhook/route.ts` — Added Sentry import + captureException in 6 catch blocks
- `src/app/api/stripe-connect/webhook/route.ts` — Added Sentry import + captureException in 1 catch block
- `src/app/api/cron/recurring-charges/route.ts` — Added Sentry import + captureException in 2 catch blocks
- `src/app/api/cron/session-reminders/route.ts` — Added Sentry import + captureException in 2 catch blocks
- `src/app/api/cron/stripe-reminders/route.ts` — Added Sentry import + captureException in 2 catch blocks
- `src/app/api/cron/auto-cancel/route.ts` — Added Sentry import + captureException in 1 catch block
- `src/app/api/manage/cancel-session/route.ts` — Added Sentry import + captureException in 2 catch blocks
- `src/app/api/manage/cancel-series/route.ts` — Added Sentry import + captureException in 2 catch blocks
- `src/app/api/direct-booking/create-intent/route.ts` — Added Sentry import + captureException in 2 catch blocks
- `src/app/api/direct-booking/create-recurring/route.ts` — Added Sentry import + captureException in 2 catch blocks
- `src/app/api/messages/route.ts` — Added Sentry import + captureException in 1 catch block
- `src/app/api/parent/payment-method/route.ts` — Added Sentry import + captureException in 1 catch block
- `src/app/api/track-view/route.ts` — Added Sentry import + captureException in 2 catch blocks
- `src/app/api/waitlist/route.ts` — Added Sentry import + captureException in 1 catch block, bare catch {} given named variable
- `src/actions/bookings.ts` — Added Sentry import + captureException in 11 catch blocks, fire-and-forget patterns upgraded
- `src/actions/verification.ts` — Added Sentry import + captureException in 1 catch block
- `src/lib/sms.ts` — Added Sentry import + captureException in 1 catch block
- `src/lib/utils/waitlist.ts` — Added Sentry import + captureException in 2 catch blocks
