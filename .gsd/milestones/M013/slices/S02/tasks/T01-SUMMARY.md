---
id: T01
parent: S02
milestone: M013
key_files:
  - sentry.client.config.ts
  - sentry.server.config.ts
  - sentry.edge.config.ts
  - src/instrumentation.ts
  - next.config.ts
  - src/app/error.tsx
  - src/app/global-error.tsx
key_decisions:
  - tunnelRoute /monitoring for ad-blocker bypass
  - errorHandler warns instead of failing build without SENTRY_AUTH_TOKEN
  - replays disabled (both session and error sample rates 0)
duration: 
verification_result: passed
completed_at: 2026-04-07T14:20:29.659Z
blocker_discovered: false
---

# T01: Installed @sentry/nextjs, created client/server/edge/instrumentation config files, wrapped next.config.ts with withSentryConfig, and wired Sentry.captureException into both error boundaries

**Installed @sentry/nextjs, created client/server/edge/instrumentation config files, wrapped next.config.ts with withSentryConfig, and wired Sentry.captureException into both error boundaries**

## What Happened

Installed @sentry/nextjs via npm. Created three Sentry init config files at the project root (client, server, edge) with sendDefaultPii: false and appropriate trace sample rates. Created src/instrumentation.ts with register() that conditionally imports the correct config per runtime, plus exports onRequestError for automatic server error capture. Wrapped next.config.ts with withSentryConfig including tunnelRoute for ad-blocker bypass and errorHandler that warns instead of failing builds without SENTRY_AUTH_TOKEN. Wired Sentry.captureException into error.tsx (inside existing useEffect) and global-error.tsx (added new useEffect). Build passes clean.

## Verification

npx next build completed without errors (41s). All four slice-level grep checks pass: captureException in error.tsx, captureException in global-error.tsx, useEffect in global-error.tsx. All must-have items confirmed: package installed, 4 config files created, next.config wrapped, both error boundaries wired, build succeeds without auth token, sendDefaultPii false.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx next build` | 0 | ✅ pass | 41000ms |
| 2 | `grep -q 'captureException' src/app/error.tsx` | 0 | ✅ pass | 100ms |
| 3 | `grep -q 'captureException' src/app/global-error.tsx` | 0 | ✅ pass | 100ms |
| 4 | `grep -q 'useEffect' src/app/global-error.tsx` | 0 | ✅ pass | 100ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `src/instrumentation.ts`
- `next.config.ts`
- `src/app/error.tsx`
- `src/app/global-error.tsx`
