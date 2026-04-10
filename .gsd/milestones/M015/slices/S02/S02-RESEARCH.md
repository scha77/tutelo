# S02 Research: Cron Job Verification & Monitoring

## Summary

Four cron routes exist, all daily, all using the same auth/query/response pattern. Sentry `withMonitor` is available in the installed SDK (v10.47.0) and is the right integration — wraps the async handler body, auto-sends in_progress/ok/error check-ins. `automaticVercelMonitors` does NOT work for App Router routes (Pages Router only per Sentry docs), so manual `withMonitor` calls are required.

## Recommendation

Wrap each cron route's core logic in `Sentry.withMonitor(slug, callback, monitorConfig)`. Extract a shared `cronMonitorConfig(schedule)` helper to DRY the config object. Fix stale source comments. Update Sentry mock in test files to pass `withMonitor` through to the real callback.

---

## Implementation Landscape

### Existing Cron Routes

| Route | Schedule | Lines | Test File | Tests |
|---|---|---|---|---|
| `/api/cron/auto-cancel` | `0 9 * * *` | 69 | `tests/stripe/auto-cancel.test.ts` | 4 |
| `/api/cron/stripe-reminders` | `0 10 * * *` | 99 | `tests/stripe/reminders-cron.test.ts` | 4 |
| `/api/cron/recurring-charges` | `0 12 * * *` | 159 | `src/__tests__/recurring-charges.test.ts` | 8 |
| `/api/cron/session-reminders` | `0 14 * * *` | 66 | `src/__tests__/reminders.test.ts` | 5 |

All 23 tests pass as of research time.

### Shared Pattern Across All Routes

Every cron route follows identical structure:
1. Check `CRON_SECRET` env var exists → 500 if missing
2. Validate `Authorization: Bearer {CRON_SECRET}` header → 401 if wrong
3. Query `supabaseAdmin` for eligible records
4. Loop: idempotent update → side effect (email/SMS/Stripe) only on successful update
5. Return `Response.json({ counts })` with 200

### Sentry Integration (Current)

- `import * as Sentry from '@sentry/nextjs'` in all 4 routes
- `Sentry.captureException(err)` in catch blocks
- No `captureCheckIn`, no `withMonitor`, no cron monitoring at all
- `sentry.server.config.ts` has basic `Sentry.init()` with `tracesSampleRate: 0.1` in prod
- No `automaticVercelMonitors` in `next.config.ts` (and it wouldn't work for App Router anyway)

### Sentry Crons API

SDK v10.47.0 exports both `captureCheckIn` and `withMonitor`. Confirmed via runtime check.

**`withMonitor`** is the preferred pattern — it wraps an async callback and automatically:
- Sends `in_progress` check-in on entry
- Sends `ok` check-in on successful return
- Sends `error` check-in on thrown exception
- Upserts the monitor config on first call (no Sentry dashboard setup needed)

```ts
const result = await Sentry.withMonitor('cron-slug', async () => {
  // ... handler logic
  return Response.json({ ... })
}, {
  schedule: { type: 'crontab', value: '0 9 * * *' },
  checkinMargin: 5,    // 5 min grace before "missed"
  maxRuntime: 5,       // 5 min max before "timed out"
  timezone: 'UTC',
  failureIssueThreshold: 2,  // alert after 2 consecutive failures
  recoveryThreshold: 1,
})
```

### Stale Comments to Fix

- `auto-cancel/route.ts` line 1-2: Says "hourly cron (0 * * * *) not available on Hobby plan". Actual schedule: `0 9 * * *` (daily).
- `stripe-reminders/route.ts` line 1-2: Same stale "hourly cron (30 * * * *)" comment. Actual schedule: `0 10 * * *` (daily).
- `session-reminders/route.ts` line 1: Says "daily cron not available on Hobby plan". Schedule `0 14 * * *` is daily — one cron per day is within Hobby limits (2 crons max on Hobby). But all 4 routes exceed Hobby limit.

### Test Mock Update Required

All 4 test files mock `@sentry/nextjs` as:
```ts
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))
```

After adding `withMonitor`, the mock must pass through to the real callback:
```ts
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
  withMonitor: vi.fn((_slug: string, fn: () => unknown) => fn()),
}))
```

This ensures the wrapped handler logic still executes during tests. The monitor check-in side effects are mocked away.

### `vercel.json` — Confirmed Correct

```json
{
  "crons": [
    { "path": "/api/cron/auto-cancel", "schedule": "0 9 * * *" },
    { "path": "/api/cron/stripe-reminders", "schedule": "0 10 * * *" },
    { "path": "/api/cron/session-reminders", "schedule": "0 14 * * *" },
    { "path": "/api/cron/recurring-charges", "schedule": "0 12 * * *" }
  ]
}
```

All four paths match existing App Router route files. Schedules are staggered daily (9, 10, 12, 14 UTC).

### Env Vars

- `CRON_SECRET` — set in `.env.local`, must be set in Vercel production (verified present in local env)
- `NEXT_PUBLIC_SENTRY_DSN` — set in both local and Vercel
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` — all set locally

---

## Key Constraints

1. **`automaticVercelMonitors` is Pages Router only** — manual `withMonitor` wrapping is required for App Router cron routes.
2. **Auth check must stay outside `withMonitor`** — the 401 response for bad tokens should NOT trigger an "error" check-in (that's not a cron failure, it's an unauthorized request). Only the core business logic should be monitored.
3. **`withMonitor` returns the callback's return value** — the route handler can `return Sentry.withMonitor(...)` directly as long as the callback returns a `Response`.
4. **Monitor slugs must be stable identifiers** — use `cron-auto-cancel`, `cron-stripe-reminders`, `cron-session-reminders`, `cron-recurring-charges`.
5. **Sentry mock in tests must execute the callback** — `withMonitor: vi.fn((_slug, fn) => fn())` is the correct pattern. If the mock swallows the callback, all handler tests break.

---

## Natural Task Decomposition

1. **T01: Add `withMonitor` to all 4 cron routes + update tests** — Create a shared monitor config helper, wrap each route's core logic in `withMonitor`, fix stale comments, update Sentry mock in all 4 test files. Verify all 23 tests still pass.

2. **T02: Manual verification documentation** — Create a runbook documenting: how to manually trigger each cron via `curl`, how to verify cron schedules in Vercel dashboard, how to check Sentry Crons dashboard for heartbeats. This is a `.md` doc, not code.

These could be one task since the code change is small (~20 lines per route, ~1 line mock update per test file), but splitting lets T01 be verified by `vitest run` while T02 is a documentation artifact.

---

## Files to Modify

| File | Change |
|---|---|
| `src/app/api/cron/auto-cancel/route.ts` | Wrap core logic in `withMonitor`, fix stale comment |
| `src/app/api/cron/stripe-reminders/route.ts` | Wrap core logic in `withMonitor`, fix stale comment |
| `src/app/api/cron/session-reminders/route.ts` | Wrap core logic in `withMonitor`, fix stale comment |
| `src/app/api/cron/recurring-charges/route.ts` | Wrap core logic in `withMonitor` |
| `tests/stripe/auto-cancel.test.ts` | Add `withMonitor` to Sentry mock |
| `tests/stripe/reminders-cron.test.ts` | Add `withMonitor` to Sentry mock |
| `src/__tests__/recurring-charges.test.ts` | Add `withMonitor` to Sentry mock |
| `src/__tests__/reminders.test.ts` | Add `withMonitor` to Sentry mock |

Optionally a new `src/lib/cron-monitor.ts` helper for DRY monitor config — but given each route has a unique schedule, inline config objects may be simpler (4 lines each).
