---
id: T01
parent: S02
milestone: M015
key_files:
  - src/app/api/cron/auto-cancel/route.ts
  - src/app/api/cron/stripe-reminders/route.ts
  - src/app/api/cron/session-reminders/route.ts
  - src/app/api/cron/recurring-charges/route.ts
  - tests/stripe/auto-cancel.test.ts
  - tests/stripe/reminders-cron.test.ts
  - src/__tests__/recurring-charges.test.ts
  - src/__tests__/reminders.test.ts
  - .gsd/milestones/M015/slices/S02/CRON-RUNBOOK.md
key_decisions:
  - Auth checks remain outside withMonitor wrapper — unauthorized requests are not cron failures
  - Monitor config uses failureIssueThreshold:2 / recoveryThreshold:1 to avoid noisy alerts
duration: 
verification_result: passed
completed_at: 2026-04-10T04:36:42.300Z
blocker_discovered: false
---

# T01: Wrapped all 4 cron routes in Sentry.withMonitor with correct schedules, fixed 3 stale comments, updated test mocks, and wrote cron verification runbook

**Wrapped all 4 cron routes in Sentry.withMonitor with correct schedules, fixed 3 stale comments, updated test mocks, and wrote cron verification runbook**

## What Happened

Wrapped post-auth logic in all 4 cron routes (auto-cancel, stripe-reminders, recurring-charges, session-reminders) with Sentry.withMonitor using unique slugs and crontab schedules matching vercel.json. Auth checks remain outside the wrapper so unauthorized requests don't trigger check-ins. Fixed 3 stale comments referencing Vercel Pro/hourly schedules. Updated all 4 test files with withMonitor mock that passes callbacks through. Wrote cron verification runbook covering manual triggers, expected responses, Sentry dashboard verification, and troubleshooting.

## Verification

All 23 cron tests pass across 4 test files. grep confirms each route has exactly 1 withMonitor call. Runbook file exists at expected path.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run tests/stripe/auto-cancel.test.ts tests/stripe/reminders-cron.test.ts src/__tests__/recurring-charges.test.ts src/__tests__/reminders.test.ts` | 0 | ✅ pass | 37000ms |
| 2 | `grep -c 'withMonitor' src/app/api/cron/*/route.ts` | 0 | ✅ pass | 100ms |
| 3 | `test -f .gsd/milestones/M015/slices/S02/CRON-RUNBOOK.md` | 0 | ✅ pass | 50ms |

## Deviations

Session-reminders JSDoc comment also updated to say '2 PM UTC' instead of '9 AM UTC' to match the actual vercel.json schedule (0 14 * * *). The task plan only mentioned the top-line comment.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/cron/auto-cancel/route.ts`
- `src/app/api/cron/stripe-reminders/route.ts`
- `src/app/api/cron/session-reminders/route.ts`
- `src/app/api/cron/recurring-charges/route.ts`
- `tests/stripe/auto-cancel.test.ts`
- `tests/stripe/reminders-cron.test.ts`
- `src/__tests__/recurring-charges.test.ts`
- `src/__tests__/reminders.test.ts`
- `.gsd/milestones/M015/slices/S02/CRON-RUNBOOK.md`
