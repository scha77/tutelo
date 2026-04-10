---
id: T02
parent: S04
milestone: M015
key_files:
  - tests/unit/rate-limit-wiring.test.ts
  - tests/auth/signup.test.ts
  - src/__tests__/parent-dashboard.test.ts
key_decisions:
  - Fixed mock drift in 2 pre-existing test files caused by T01 adding next/headers and @/lib/rate-limit imports to auth actions
duration: 
verification_result: passed
completed_at: 2026-04-10T05:18:37.357Z
blocker_discovered: false
---

# T02: Add 10 rate-limit wiring tests for all four endpoints and fix 9 pre-existing mock-drift failures in auth tests

**Add 10 rate-limit wiring tests for all four endpoints and fix 9 pre-existing mock-drift failures in auth tests**

## What Happened

Created tests/unit/rate-limit-wiring.test.ts with four describe blocks covering waitlist (2 tests), track-view (2 tests), verify-email (2 tests), and auth actions (4 tests). Each block verifies allowed → normal response and blocked → 429. Auth action tests also confirm that supabase auth methods are never called when rate-limited. Fixed 9 pre-existing test failures in signup.test.ts and parent-dashboard.test.ts caused by T01 adding headers() and checkLimit() without updating dependent test mocks.

## Verification

npx vitest run tests/unit/rate-limit-wiring.test.ts: 10/10 pass. npx vitest run: 55 files, 514 tests, all pass. npm run build: exits 0. grep -q checkLimit in waitlist route: confirmed.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run tests/unit/rate-limit-wiring.test.ts` | 0 | ✅ pass | 6200ms |
| 2 | `npx vitest run` | 0 | ✅ pass | 9500ms |
| 3 | `npm run build` | 0 | ✅ pass | 28000ms |
| 4 | `grep -q 'checkLimit' src/app/api/waitlist/route.ts` | 0 | ✅ pass | 100ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `tests/unit/rate-limit-wiring.test.ts`
- `tests/auth/signup.test.ts`
- `src/__tests__/parent-dashboard.test.ts`
