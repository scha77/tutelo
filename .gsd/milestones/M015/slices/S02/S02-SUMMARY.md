---
id: S02
parent: M015
milestone: M015
provides:
  - Sentry Crons heartbeat monitoring for all 4 cron routes
  - Cron verification runbook for production operations
requires:
  []
affects:
  []
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
  - Auth checks (CRON_SECRET validation) remain outside Sentry.withMonitor — unauthorized requests are not cron failures
  - Monitor config uses failureIssueThreshold:2 / recoveryThreshold:1 to avoid noisy alerts from transient one-off errors
patterns_established:
  - Sentry.withMonitor wrapping pattern for cron routes: auth outside, business logic inside
  - Consistent monitor config across all cron routes for uniform alerting behavior
  - withMonitor test mock pattern: vi.fn((_slug, fn) => fn()) passes callback through
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-10T04:38:45.192Z
blocker_discovered: false
---

# S02: Cron Job Verification & Monitoring

**Wrapped all 4 cron routes in Sentry.withMonitor heartbeat monitoring, fixed 3 stale schedule comments, updated test mocks, and wrote a production cron verification runbook.**

## What Happened

All four cron routes (auto-cancel, stripe-reminders, recurring-charges, session-reminders) now report heartbeat check-ins to Sentry Crons on every execution via `Sentry.withMonitor()`. Each route uses a unique slug and crontab schedule matching vercel.json. The auth gate (CRON_SECRET bearer token validation) remains outside the monitor wrapper — unauthorized requests should not register as cron failures or trigger false-positive alerts.

Monitor config is consistent across all 4 routes: `checkinMargin: 5` (5-min late tolerance), `maxRuntime: 5` (5-min max), `failureIssueThreshold: 2` (alert after 2 consecutive failures), `recoveryThreshold: 1` (clear after 1 success). This avoids noisy alerts from one-off transient errors.

Three stale comments were corrected: auto-cancel referenced "hourly cron (0 * * * *)" and "Vercel Pro" (both wrong — it's daily on Hobby), stripe-reminders referenced "hourly cron (30 * * * *)", and session-reminders said "9 AM UTC" when the actual schedule is 2 PM UTC.

All 4 test files had their Sentry mock updated to include `withMonitor: vi.fn((_slug, fn) => fn())` — the mock passes the callback through so existing test logic executes normally while mocking away the Sentry side effects.

A cron verification runbook was written covering manual curl triggers with expected response shapes, Sentry Crons dashboard verification steps, vercel.json schedule cross-reference, and troubleshooting for common failure modes (missing CRON_SECRET, Sentry DSN, DB connection issues).

## Verification

All 23 cron tests pass across 4 test files (auto-cancel: 5, reminders-cron: 5, recurring-charges: 8, reminders: 5). `grep -c withMonitor` confirms exactly 1 call per route file. Runbook exists at expected path. Auth checks verified to remain outside the withMonitor wrapper via code inspection.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Session-reminders JSDoc comment also updated to say '2 PM UTC' instead of '9 AM UTC' to match the actual vercel.json schedule — the task plan only mentioned the top-line comment.

## Known Limitations

Sentry.withMonitor only reports heartbeats — it does not alert on business-logic errors within the handler (e.g., a cron that returns 200 but processes 0 bookings due to a query bug). Business-logic anomaly detection would require separate metric-based monitoring.

## Follow-ups

After deploying to production: manually trigger each cron route once to confirm Sentry Crons dashboard shows the first check-in. Then monitor over 48 hours to verify heartbeats arrive on schedule.

## Files Created/Modified

- `src/app/api/cron/auto-cancel/route.ts` — Wrapped in Sentry.withMonitor('cron-auto-cancel'), fixed stale hourly/Pro comment
- `src/app/api/cron/stripe-reminders/route.ts` — Wrapped in Sentry.withMonitor('cron-stripe-reminders'), fixed stale hourly comment
- `src/app/api/cron/session-reminders/route.ts` — Wrapped in Sentry.withMonitor('cron-session-reminders'), fixed stale schedule comment
- `src/app/api/cron/recurring-charges/route.ts` — Wrapped in Sentry.withMonitor('cron-recurring-charges')
- `tests/stripe/auto-cancel.test.ts` — Added withMonitor to Sentry mock
- `tests/stripe/reminders-cron.test.ts` — Added withMonitor to Sentry mock
- `src/__tests__/recurring-charges.test.ts` — Added withMonitor to Sentry mock
- `src/__tests__/reminders.test.ts` — Added withMonitor to Sentry mock
- `.gsd/milestones/M015/slices/S02/CRON-RUNBOOK.md` — New file — production cron verification runbook
