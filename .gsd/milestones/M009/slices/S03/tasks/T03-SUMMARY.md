---
id: T03
parent: S03
milestone: M009
provides: []
requires: []
affects: []
key_files: ["src/app/api/manage/cancel-session/route.ts", "src/app/api/manage/cancel-series/route.ts", "src/app/manage/[token]/page.tsx", "src/app/manage/[token]/CancelSeriesForm.tsx", "src/__tests__/manage-cancel.test.ts"]
key_decisions: ["Token-gated API routes use top-level imports for email helpers since there is no auth context", "CancelSeriesForm uses fetch() for API calls since the page has no auth context — server actions would fail without a session"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Ran all three verification gates: npx vitest run manage-cancel (10/10 pass), npx tsc --noEmit (zero errors), npm run build (all routes compile successfully, /manage/[token] and both API routes in build output)."
completed_at: 2026-03-31T14:49:34.093Z
blocker_discovered: false
---

# T03: Built /manage/[token] parent self-service page with cancel-session and cancel-series API routes, CancelSeriesForm client component, and 10 passing tests

> Built /manage/[token] parent self-service page with cancel-session and cancel-series API routes, CancelSeriesForm client component, and 10 passing tests

## What Happened
---
id: T03
parent: S03
milestone: M009
key_files:
  - src/app/api/manage/cancel-session/route.ts
  - src/app/api/manage/cancel-series/route.ts
  - src/app/manage/[token]/page.tsx
  - src/app/manage/[token]/CancelSeriesForm.tsx
  - src/__tests__/manage-cancel.test.ts
key_decisions:
  - Token-gated API routes use top-level imports for email helpers since there is no auth context
  - CancelSeriesForm uses fetch() for API calls since the page has no auth context — server actions would fail without a session
duration: ""
verification_result: passed
completed_at: 2026-03-31T14:49:34.093Z
blocker_discovered: false
---

# T03: Built /manage/[token] parent self-service page with cancel-session and cancel-series API routes, CancelSeriesForm client component, and 10 passing tests

**Built /manage/[token] parent self-service page with cancel-session and cancel-series API routes, CancelSeriesForm client component, and 10 passing tests**

## What Happened

Created two token-gated POST API routes under /api/manage/ — cancel-session (validates token owns the booking, voids Stripe PI if present, updates status to cancelled, fires cancellation email) and cancel-series (fetches all future non-cancelled bookings for the schedule, voids PIs, batch-updates to cancelled, fires series cancellation email). Both routes require no auth — the cancel_token from the email link IS the authentication. Built the /manage/[token] RSC page following the review/[token] pattern: resolves cancel_token via supabaseAdmin, shows error states for bad tokens or all-cancelled, or renders CancelSeriesForm. The form shows each upcoming session with individual Cancel buttons plus a Cancel All Remaining button, with confirm dialogs, fetch-based API calls, and reactive list updates. Wrote 10 tests covering both routes with all edge cases.

## Verification

Ran all three verification gates: npx vitest run manage-cancel (10/10 pass), npx tsc --noEmit (zero errors), npm run build (all routes compile successfully, /manage/[token] and both API routes in build output).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run manage-cancel --reporter=verbose` | 0 | ✅ pass | 2900ms |
| 2 | `npx tsc --noEmit` | 0 | ✅ pass | 3400ms |
| 3 | `npm run build` | 0 | ✅ pass | 13100ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/manage/cancel-session/route.ts`
- `src/app/api/manage/cancel-series/route.ts`
- `src/app/manage/[token]/page.tsx`
- `src/app/manage/[token]/CancelSeriesForm.tsx`
- `src/__tests__/manage-cancel.test.ts`


## Deviations
None.

## Known Issues
None.
