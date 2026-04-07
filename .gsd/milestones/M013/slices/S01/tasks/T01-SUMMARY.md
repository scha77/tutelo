---
id: T01
parent: S01
milestone: M013
key_files:
  - src/__tests__/admin-dashboard.test.ts
key_decisions:
  - Mock getAuthUser from auth-cache directly instead of mocking createClient — matches the admin layout's actual import chain
duration: 
verification_result: passed
completed_at: 2026-04-07T13:55:22.472Z
blocker_discovered: false
---

# T01: Replaced stale createClient mock with getAuthUser mock in admin layout access gate tests — all 9 tests pass

**Replaced stale createClient mock with getAuthUser mock in admin layout access gate tests — all 9 tests pass**

## What Happened

The admin layout was importing getAuthUser from @/lib/supabase/auth-cache, but the test file was mocking createClient from @/lib/supabase/server. This caused getClaims() to be called on an incomplete mock, producing 6 failures. Fixed by: (1) replacing the vi.mock target from supabase/server to auth-cache, (2) restructuring setupAuth to return the { user, error, supabase } shape getAuthUser produces, (3) updating all 6 test cases to import and mock getAuthUser. The 3 metrics tests were already passing and untouched.

## Verification

npx vitest run src/__tests__/admin-dashboard.test.ts — 9/9 tests passed, 0 failures.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/__tests__/admin-dashboard.test.ts` | 0 | ✅ pass | 6100ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/__tests__/admin-dashboard.test.ts`
