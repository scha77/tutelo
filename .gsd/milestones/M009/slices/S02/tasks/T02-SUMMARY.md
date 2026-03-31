---
id: T02
parent: S02
milestone: M009
provides: []
requires: []
affects: []
key_files: ["src/app/api/cron/recurring-charges/route.ts", "src/emails/RecurringPaymentFailedEmail.tsx", "src/lib/email.ts", "src/__tests__/recurring-charges.test.ts", "vercel.json", "vitest.config.ts"]
key_decisions: ["Use computeSessionAmount for pricing since bookings has no session_type_id FK", "Added .gsd/** to vitest exclude to prevent stale worktree tests from polluting results"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "All 4 verification checks pass: `npx vitest run recurring-charges` (8/8 tests), `npx vitest run webhook-capture` (8/8 tests), `npx tsc --noEmit` (0 errors), `npm run build` (success, route in manifest)."
completed_at: 2026-03-31T14:24:34.260Z
blocker_discovered: false
---

# T02: Built daily cron route that auto-charges parents' saved cards 24h before recurring sessions, with payment-failed email notification and 8 passing integration tests

> Built daily cron route that auto-charges parents' saved cards 24h before recurring sessions, with payment-failed email notification and 8 passing integration tests

## What Happened
---
id: T02
parent: S02
milestone: M009
key_files:
  - src/app/api/cron/recurring-charges/route.ts
  - src/emails/RecurringPaymentFailedEmail.tsx
  - src/lib/email.ts
  - src/__tests__/recurring-charges.test.ts
  - vercel.json
  - vitest.config.ts
key_decisions:
  - Use computeSessionAmount for pricing since bookings has no session_type_id FK
  - Added .gsd/** to vitest exclude to prevent stale worktree tests from polluting results
duration: ""
verification_result: passed
completed_at: 2026-03-31T14:24:34.261Z
blocker_discovered: false
---

# T02: Built daily cron route that auto-charges parents' saved cards 24h before recurring sessions, with payment-failed email notification and 8 passing integration tests

**Built daily cron route that auto-charges parents' saved cards 24h before recurring sessions, with payment-failed email notification and 8 passing integration tests**

## What Happened

Created the complete recurring auto-charge pipeline: RecurringPaymentFailedEmail.tsx React Email template with parent (CTA to update payment method) and teacher (informational) variants; sendRecurringPaymentFailedEmail in email.ts following sendCancellationEmail pattern; cron route at /api/cron/recurring-charges auth-gated on CRON_SECRET that queries non-first recurring bookings for tomorrow, creates Stripe PIs with off_session:true, confirm:true, capture_method:'manual', 7% application fee, and idempotencyKey, updates booking status on success/failure, and fires notification emails on failure; vercel.json updated with 4th cron entry; 8 integration tests covering auth, no-op, success, failure, skip, idempotency, fee calculation, and mixed results. Also fixed vitest config to exclude .gsd/** preventing stale worktree test pollution.

## Verification

All 4 verification checks pass: `npx vitest run recurring-charges` (8/8 tests), `npx vitest run webhook-capture` (8/8 tests), `npx tsc --noEmit` (0 errors), `npm run build` (success, route in manifest).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run recurring-charges --reporter=verbose` | 0 | ✅ pass | 6100ms |
| 2 | `npx vitest run webhook-capture --reporter=verbose` | 0 | ✅ pass | 3100ms |
| 3 | `npx tsc --noEmit` | 0 | ✅ pass | 3500ms |
| 4 | `npm run build` | 0 | ✅ pass | 13000ms |


## Deviations

Removed session_types(price) join — bookings has no session_type_id FK, price computed via computeSessionAmount instead. Added .gsd/** to vitest exclude to fix stale worktree test pollution.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/cron/recurring-charges/route.ts`
- `src/emails/RecurringPaymentFailedEmail.tsx`
- `src/lib/email.ts`
- `src/__tests__/recurring-charges.test.ts`
- `vercel.json`
- `vitest.config.ts`


## Deviations
Removed session_types(price) join — bookings has no session_type_id FK, price computed via computeSessionAmount instead. Added .gsd/** to vitest exclude to fix stale worktree test pollution.

## Known Issues
None.
