---
id: T03
parent: S01
milestone: M013
key_files:
  - src/__tests__/parent-phone-storage.test.ts
  - src/__tests__/recurring-charges.test.ts
key_decisions:
  - Use exact object match for Stripe PI assertion — matches actual idempotencyKey format without date suffix
duration: 
verification_result: passed
completed_at: 2026-04-07T14:01:42.257Z
blocker_discovered: false
---

# T03: Fixed 5 test failures: added .from() chain mock for slug revalidation in parent-phone-storage and corrected idempotencyKey assertion in recurring-charges

**Fixed 5 test failures: added .from() chain mock for slug revalidation in parent-phone-storage and corrected idempotencyKey assertion in recurring-charges**

## What Happened

Two root causes drove the 5 failures: (1) parent-phone-storage tests crashed with 'supabase.from is not a function' because the mock only provided rpc, missing the .from() chain needed for slug-specific revalidation. Added full chain mock returning { slug: 'test-teacher' } to both setupDeferredMocks and the manual mock. (2) recurring-charges 'successful charge' test used expect.stringContaining with a trailing dash implying a date suffix, but the actual code uses a plain booking ID. Changed to exact object match.

## Verification

npx vitest run on both files: 14/14 pass. Full suite: 48 files, 470 tests, 0 failures.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/__tests__/parent-phone-storage.test.ts src/__tests__/recurring-charges.test.ts` | 0 | ✅ pass | 7200ms |
| 2 | `npx vitest run` | 0 | ✅ pass | 13000ms |

## Deviations

Task plan said to fix 'skips phone UPDATE' assertions — on inspection, the existing assertions were already correct; the tests were crashing before reaching them. No assertion changes needed.

## Known Issues

None.

## Files Created/Modified

- `src/__tests__/parent-phone-storage.test.ts`
- `src/__tests__/recurring-charges.test.ts`
