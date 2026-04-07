---
id: T04
parent: S03
milestone: M013
key_files:
  - tests/unit/og-metadata.test.ts
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-04-07T15:17:41.717Z
blocker_discovered: false
---

# T04: Fixed Supabase mock return shape in og-metadata.test.ts — all 4 skipped tests now pass, full suite at 490 tests with 0 todo and 0 skip

**Fixed Supabase mock return shape in og-metadata.test.ts — all 4 skipped tests now pass, full suite at 490 tests with 0 todo and 0 skip**

## What Happened

The 4 it.skip() tests in og-metadata.test.ts failed because mockAdminSingle returned raw teacher data instead of the { data, error } envelope that Supabase .single() returns. Production code destructures { data } from the result, so raw data yielded undefined and generateMetadata always hit the fallback branch. Fixed by wrapping each mock return in { data: {...}, error: null } and removing all 4 skip markers. Confirmed zero it.todo() and zero it.skip() remain across the entire codebase.

## Verification

1. npx vitest run tests/unit/og-metadata.test.ts — 4 tests pass. 2. npx vitest run — 52 files, 490 tests, all pass, 0 todo, 0 skip. 3. rg 'it\.(todo|skip)\(' — zero matches across entire codebase.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run tests/unit/og-metadata.test.ts` | 0 | ✅ pass | 6300ms |
| 2 | `npx vitest run` | 0 | ✅ pass | 9300ms |
| 3 | `rg 'it\.(todo|skip)\(' tests/ src/` | 1 | ✅ pass (0 matches) | 100ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `tests/unit/og-metadata.test.ts`
