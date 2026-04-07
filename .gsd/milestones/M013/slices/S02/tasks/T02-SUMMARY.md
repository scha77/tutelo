---
id: T02
parent: S02
milestone: M013
key_files:
  - src/app/api/stripe/webhook/route.ts
  - src/app/api/cron/recurring-charges/route.ts
  - src/actions/bookings.ts
  - src/lib/sms.ts
  - src/lib/utils/waitlist.ts
key_decisions:
  - Fire-and-forget .catch(console.error) patterns upgraded to include Sentry before console.error
  - JSON parse guards and timezone fallbacks left untouched
duration: 
verification_result: passed
completed_at: 2026-04-07T14:29:58.487Z
blocker_discovered: false
---

# T02: Added Sentry.captureException to 44 catch blocks across 18 production files covering webhooks, crons, manage routes, booking routes, actions, and utilities

**Added Sentry.captureException to 44 catch blocks across 18 production files covering webhooks, crons, manage routes, booking routes, actions, and utilities**

## What Happened

Read all 18 server-side files listed in the task plan, identified every catch block handling real errors, and added `import * as Sentry from '@sentry/nextjs'` plus `Sentry.captureException(error)` before existing console.error calls. Fire-and-forget `.catch(console.error)` patterns on email/SMS sends were upgraded to include Sentry. JSON parse guards, timezone fallbacks, and cookie read-only catches were correctly left untouched. One bare `catch {}` in the waitlist route was given a named variable to enable the Sentry call.

## Verification

npx tsc --noEmit passes clean (0 errors). rg captureException count is 44 (≥30 threshold). All 18 files confirmed to have Sentry import. All 4 slice-level grep checks pass.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 4400ms |
| 2 | `rg 'captureException' src/actions/ src/app/api/ src/lib/ -g '*.ts' | wc -l (44 >= 30)` | 0 | ✅ pass | 100ms |
| 3 | `grep -q 'captureException' src/app/error.tsx` | 0 | ✅ pass | 100ms |
| 4 | `grep -q 'captureException' src/app/global-error.tsx` | 0 | ✅ pass | 100ms |
| 5 | `grep -q 'useEffect' src/app/global-error.tsx` | 0 | ✅ pass | 100ms |

## Deviations

Waitlist route bare catch {} changed to catch (err) for Sentry variable access — minor improvement, not a plan deviation.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/cron/recurring-charges/route.ts`
- `src/actions/bookings.ts`
- `src/lib/sms.ts`
- `src/lib/utils/waitlist.ts`
