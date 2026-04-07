# S02 Research: Sentry Integration & Error Handling Audit

## Summary

This is a medium-complexity integration slice. The Sentry Next.js SDK (`@sentry/nextjs@10.47.0`) has first-class support for Next.js 16 (`^16.0.0-0` peer dep). The codebase is clean — no prior Sentry or error monitoring. 80 `try/catch` blocks + 22 `.catch()` chains exist across production code. Most already have structured `console.error` logging with context tags. The work decomposes into three natural phases: SDK bootstrap, error boundary wiring, and catch block audit.

## Recommendation

**SDK Setup:** Install `@sentry/nextjs`, create the four config files (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation.ts`), wrap `next.config.ts` with `withSentryConfig`. Use `tunnelRoute: "/monitoring"` to bypass ad blockers. Use `NEXT_PUBLIC_SENTRY_DSN` for the client DSN.

**Error Boundaries:** Add `Sentry.captureException(error)` to the existing `src/app/error.tsx` and `src/app/global-error.tsx` — both already have the right shape (`useEffect` + error prop), just need the import and call.

**Catch Block Audit:** Classify catches into tiers:
1. **Report to Sentry** — server-side errors in API routes, cron jobs, webhook handlers, and server actions where exceptions indicate bugs or integration failures (Stripe failures, DB errors, email send failures). ~30 sites.
2. **Leave as console.error** — fire-and-forget `.catch(console.error)` for non-critical side effects (email notifications, SMS, waitlist pings). These already log context. The Sentry error boundary + `onRequestError` hook will catch truly unhandled ones.
3. **Appropriate no-op** — JSON parse catches returning 400, Intl/timezone fallbacks, clipboard API fallbacks, Supabase SSR cookie read-only. ~25 sites. No change needed.

**Do NOT hand-roll:** A `captureError()` wrapper utility. Just import `* as Sentry from '@sentry/nextjs'` and call `Sentry.captureException(error)` directly. The SDK is designed for direct use. A wrapper adds indirection without benefit.

## Implementation Landscape

### Files to Create (4)

| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Client-side SDK init (DSN, tracesSampleRate, replay) — project root |
| `sentry.server.config.ts` | Server-side SDK init (DSN, tracesSampleRate) — project root |
| `sentry.edge.config.ts` | Edge runtime SDK init (minimal, for completeness — no edge routes today) — project root |
| `src/instrumentation.ts` | Next.js instrumentation hook — imports server/edge configs, exports `onRequestError = Sentry.captureRequestError` |

### Files to Modify

| File | Change |
|------|--------|
| `next.config.ts` | Wrap with `withSentryConfig()` — add org, project, authToken, tunnelRoute, silent, source maps |
| `src/app/error.tsx` | Add `import * as Sentry from '@sentry/nextjs'` + `Sentry.captureException(error)` in useEffect |
| `src/app/global-error.tsx` | Same as error.tsx — Sentry.captureException in useEffect |
| `.env.local` | Add `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` |

### Catch Block Audit — Files Requiring Sentry.captureException

Server-side files where catch blocks handle **real errors** (not expected failures like JSON parse or redirect throws):

| File | Catch Count | Notes |
|------|-------------|-------|
| `src/actions/bookings.ts` | 11 | Stripe PI cancellation failures, phone storage, email module errors |
| `src/app/api/stripe/webhook/route.ts` | 6 | Sig verify, checkout session, PM retrieval, confirmation email |
| `src/app/api/cron/recurring-charges/route.ts` | 2 | Stripe charge failures — critical |
| `src/app/api/cron/session-reminders/route.ts` | 2 | Email/SMS send failures |
| `src/app/api/cron/stripe-reminders/route.ts` | 2 | Reminder email failures |
| `src/app/api/cron/auto-cancel/route.ts` | 1 | Cancellation email |
| `src/app/api/manage/cancel-session/route.ts` | 2 | Token validation + cancellation |
| `src/app/api/manage/cancel-series/route.ts` | 2 | Token validation + series cancel |
| `src/app/api/direct-booking/create-intent/route.ts` | 2 | Stripe PI creation |
| `src/app/api/direct-booking/create-recurring/route.ts` | 2 | Recurring booking creation |
| `src/app/api/messages/route.ts` | 1 | Email notification failure |
| `src/app/api/parent/payment-method/route.ts` | 1 | Stripe PM detach |
| `src/app/api/stripe-connect/webhook/route.ts` | 1 | Sig verification |
| `src/app/api/track-view/route.ts` | 2 | View tracking errors |
| `src/app/api/waitlist/route.ts` | 1 | Waitlist POST error |
| `src/lib/utils/waitlist.ts` | 2 | Notification send failures |
| `src/lib/sms.ts` | 1 | SMS send failure |
| `src/actions/verification.ts` | 1 | Email send failure |

### Catch Blocks That Should NOT Change

| Pattern | Files | Why Leave Alone |
|---------|-------|-----------------|
| `} catch { return 'UTC' }` | timezone.ts, BookingCalendar.tsx, AvailabilityGrid.tsx | Intl API fallback — expected |
| `} catch { /* Server Component read-only */ }` | supabase/server.ts | Next.js SSR cookie pattern — expected |
| `} catch { return new Response('Invalid JSON', { status: 400 }) }` | 6 API routes | JSON parse guard — expected |
| `} catch { // redirect throws }` | LoginForm.tsx | Next.js redirect throw — expected |
| `} catch { setError('...') }` | parent pages, CancelSeriesForm, etc. | Client-side user feedback — error boundary covers unhandled |
| `.catch(() => {})` | ViewTracker.tsx | Non-critical analytics ping — debatable but acceptable |
| `} catch { // clipboard fallback }` | SwipeFileCard.tsx, CopyLinkButton.tsx | Browser clipboard API fallback — expected |
| `} catch { // Silently fall through }` | booking-confirmed/page.tsx | Non-critical decoration — booking already confirmed |
| `.catch(console.error)` on fire-and-forget emails | bookings.ts, webhook, crons | These already log. Adding Sentry would be a nice upgrade but not required by R003 — the error IS logged. Could upgrade in the audit pass. |

### Env Vars Required

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | `.env.local` + Vercel | Client + server DSN (same value, public) |
| `SENTRY_AUTH_TOKEN` | `.env.local` + Vercel | Source map upload during build |
| `SENTRY_ORG` | `next.config.ts` or env | Org slug for source map upload |
| `SENTRY_PROJECT` | `next.config.ts` or env | Project slug for source map upload |

Note: `SENTRY_ORG` and `SENTRY_PROJECT` can be hardcoded in `next.config.ts` (they're not secrets). Only `SENTRY_AUTH_TOKEN` is sensitive.

### SDK Configuration Decisions

| Setting | Recommended Value | Rationale |
|---------|-------------------|-----------|
| `tracesSampleRate` | `process.env.NODE_ENV === 'development' ? 1.0 : 0.1` | Full traces in dev, 10% in prod (free tier budget) |
| `replaysSessionSampleRate` | `0` | Skip replay — adds bundle size, not needed for error tracking |
| `replaysOnErrorSampleRate` | `0` | Skip replay — focus on errors only |
| `tunnelRoute` | `"/monitoring"` | Bypass ad blockers that block sentry.io requests |
| `silent` | `!process.env.CI` | Only print source map upload logs in CI |
| `treeshake.removeDebugLogging` | `true` | Reduce bundle size |
| `sendDefaultPii` | `false` | Don't send PII by default — Tutelo has student data |

### Integration Risk

**Low.** `withSentryConfig` is a well-tested wrapper used by thousands of Next.js projects. The only risk vector is source map upload failing during build if `SENTRY_AUTH_TOKEN` is missing — handle with the `errorHandler` option to warn-not-fail:

```ts
errorHandler: (err) => {
  console.warn('[sentry] Source map upload failed:', err.message)
}
```

### Existing Test Impact

**Minimal.** The error boundary files (`error.tsx`, `global-error.tsx`) are not imported by any test. The `next.config.ts` wrapper is transparent to tests. Adding `import * as Sentry from '@sentry/nextjs'` in catch blocks of tested files will require `vi.mock('@sentry/nextjs')` in those test files — but the existing test files that import API routes or actions already mock external modules (Stripe, Resend, Supabase). Add this pattern:

```ts
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))
```

### Verification Strategy

1. `npx tsc --noEmit` — no type errors after adding Sentry imports
2. `npx next build` — build succeeds with `withSentryConfig` wrapper
3. `npx vitest run` — all tests pass (Sentry mocked in test files that import Sentry-instrumented modules)
4. **Manual dev verification:** Start dev server, trigger a client-side error (throw in a component), confirm it appears in Sentry dashboard with stack trace. Trigger a server-side error (throw in an API route), confirm same.
5. **Catch block audit:** `rg 'catch' | grep -v Sentry` to verify all server-side catch blocks either have Sentry.captureException, console.error with context, or are in the "leave alone" list

### Natural Task Decomposition

1. **T01: SDK Bootstrap** — Install package, create 4 config files, wrap next.config.ts, create instrumentation.ts. Verify: `npx next build` succeeds.
2. **T02: Error Boundary Wiring** — Add Sentry.captureException to error.tsx and global-error.tsx. Verify: `npx tsc --noEmit` clean.
3. **T03: Catch Block Audit** — Walk the ~30 server-side catch sites, add Sentry.captureException where appropriate. Add `vi.mock('@sentry/nextjs')` to affected test files. Verify: `npx vitest run` all green, `npx tsc --noEmit` clean.

T01 unblocks T02 and T03 (they import from `@sentry/nextjs` which must be installed first). T02 and T03 are independent and can proceed in parallel or sequence.

### Skills Discovered

No new skills installed. The `getsentry/sentry-agent-skills@sentry-react-setup` skill was investigated but did not install successfully via `npx skills add`. The Sentry SDK documentation from Context7 (`/getsentry/sentry-docs`) provided comprehensive coverage of all setup patterns needed.
