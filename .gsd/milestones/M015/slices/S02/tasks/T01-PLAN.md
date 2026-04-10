---
estimated_steps: 61
estimated_files: 9
skills_used: []
---

# T01: Wrap all cron routes in Sentry withMonitor and update test mocks

## Description

Add `Sentry.withMonitor()` wrapping to all 4 cron route handlers so Sentry Crons receives heartbeat check-ins on every execution. Fix 3 stale schedule comments. Update all 4 test file Sentry mocks to pass `withMonitor` callbacks through. Write a cron verification runbook.

## Steps

1. Read all 4 cron route files to confirm current structure
2. For each route, wrap the post-auth logic (everything after the `Bearer` check) in `Sentry.withMonitor(slug, async () => { ... }, monitorConfig)`. The auth check (CRON_SECRET validation, 500/401 returns) MUST stay outside the wrapper — unauthorized requests are not cron failures.
   - `auto-cancel/route.ts`: slug `cron-auto-cancel`, schedule `0 9 * * *`
   - `stripe-reminders/route.ts`: slug `cron-stripe-reminders`, schedule `0 10 * * *`
   - `recurring-charges/route.ts`: slug `cron-recurring-charges`, schedule `0 12 * * *`
   - `session-reminders/route.ts`: slug `cron-session-reminders`, schedule `0 14 * * *`
3. Use consistent monitor config across all routes: `{ schedule: { type: 'crontab', value: '<schedule>' }, checkinMargin: 5, maxRuntime: 5, timezone: 'UTC', failureIssueThreshold: 2, recoveryThreshold: 1 }`
4. Fix stale comments:
   - `auto-cancel/route.ts` lines 1-2: Remove 'hourly cron (0 * * * *)' and 'Vercel Pro' mentions. Replace with accurate comment: `// Daily cron — auto-cancels requested bookings older than 48h where teacher hasn't connected Stripe`
   - `stripe-reminders/route.ts` lines 1-2: Remove 'hourly cron (30 * * * *)' mention. Replace with: `// Daily cron — sends Stripe setup reminders to teachers with pending bookings`
   - `session-reminders/route.ts` line 1: Remove 'not available on Hobby plan' mention. Replace with: `// Daily cron — sends session reminder emails and SMS to parents with upcoming bookings`
5. Update Sentry mock in all 4 test files. Add `withMonitor` to the existing `vi.mock('@sentry/nextjs', ...)` factory:
   ```ts
   withMonitor: vi.fn((_slug: string, fn: () => unknown) => fn()),
   ```
   This ensures the wrapped handler logic still executes during tests while mocking away the Sentry check-in side effects.
   - `tests/stripe/auto-cancel.test.ts`
   - `tests/stripe/reminders-cron.test.ts`
   - `src/__tests__/recurring-charges.test.ts`
   - `src/__tests__/reminders.test.ts`
6. Run all cron tests: `npx vitest run tests/stripe/auto-cancel.test.ts tests/stripe/reminders-cron.test.ts src/__tests__/recurring-charges.test.ts src/__tests__/reminders.test.ts`
7. Write verification runbook at `.gsd/milestones/M015/slices/S02/CRON-RUNBOOK.md` documenting:
   - How to manually trigger each cron via curl (with CRON_SECRET bearer token)
   - Expected 200 response shape for each route
   - How to check Sentry Crons dashboard for heartbeat status
   - How to verify vercel.json schedules match route expectations

## Must-Haves

- [ ] All 4 routes wrap post-auth logic in `Sentry.withMonitor()` with unique slugs
- [ ] Auth checks (CRON_SECRET validation) remain outside the monitor wrapper
- [ ] Monitor config uses correct crontab schedule matching vercel.json
- [ ] 3 stale comments fixed with accurate descriptions
- [ ] All 4 test files have `withMonitor` in Sentry mock that passes callback through
- [ ] All 23 existing cron tests pass
- [ ] Runbook exists and covers manual trigger, Sentry dashboard, and vercel.json verification

## Verification

- `npx vitest run tests/stripe/auto-cancel.test.ts tests/stripe/reminders-cron.test.ts src/__tests__/recurring-charges.test.ts src/__tests__/reminders.test.ts` — all 23 tests pass
- `grep -c 'withMonitor' src/app/api/cron/*/route.ts` — each route shows at least 1 match
- `test -f .gsd/milestones/M015/slices/S02/CRON-RUNBOOK.md` — runbook exists

## Inputs

- `src/app/api/cron/auto-cancel/route.ts` — existing cron route to wrap
- `src/app/api/cron/stripe-reminders/route.ts` — existing cron route to wrap
- `src/app/api/cron/session-reminders/route.ts` — existing cron route to wrap
- `src/app/api/cron/recurring-charges/route.ts` — existing cron route to wrap
- `tests/stripe/auto-cancel.test.ts` — test mock to update
- `tests/stripe/reminders-cron.test.ts` — test mock to update
- `src/__tests__/recurring-charges.test.ts` — test mock to update
- `src/__tests__/reminders.test.ts` — test mock to update
- `vercel.json` — reference for correct cron schedules

## Expected Output

- `src/app/api/cron/auto-cancel/route.ts` — wrapped in withMonitor, stale comment fixed
- `src/app/api/cron/stripe-reminders/route.ts` — wrapped in withMonitor, stale comment fixed
- `src/app/api/cron/session-reminders/route.ts` — wrapped in withMonitor, stale comment fixed
- `src/app/api/cron/recurring-charges/route.ts` — wrapped in withMonitor
- `tests/stripe/auto-cancel.test.ts` — Sentry mock updated
- `tests/stripe/reminders-cron.test.ts` — Sentry mock updated
- `src/__tests__/recurring-charges.test.ts` — Sentry mock updated
- `src/__tests__/reminders.test.ts` — Sentry mock updated
- `.gsd/milestones/M015/slices/S02/CRON-RUNBOOK.md` — verification runbook

## Inputs

- `src/app/api/cron/auto-cancel/route.ts`
- `src/app/api/cron/stripe-reminders/route.ts`
- `src/app/api/cron/session-reminders/route.ts`
- `src/app/api/cron/recurring-charges/route.ts`
- `tests/stripe/auto-cancel.test.ts`
- `tests/stripe/reminders-cron.test.ts`
- `src/__tests__/recurring-charges.test.ts`
- `src/__tests__/reminders.test.ts`
- `vercel.json`

## Expected Output

- `src/app/api/cron/auto-cancel/route.ts`
- `src/app/api/cron/stripe-reminders/route.ts`
- `src/app/api/cron/session-reminders/route.ts`
- `src/app/api/cron/recurring-charges/route.ts`
- `tests/stripe/auto-cancel.test.ts`
- `tests/stripe/reminders-cron.test.ts`
- `src/__tests__/recurring-charges.test.ts`
- `src/__tests__/reminders.test.ts`
- `.gsd/milestones/M015/slices/S02/CRON-RUNBOOK.md`

## Verification

npx vitest run tests/stripe/auto-cancel.test.ts tests/stripe/reminders-cron.test.ts src/__tests__/recurring-charges.test.ts src/__tests__/reminders.test.ts && grep -c 'withMonitor' src/app/api/cron/*/route.ts && test -f .gsd/milestones/M015/slices/S02/CRON-RUNBOOK.md
