---
id: S01
parent: M013
milestone: M013
provides:
  - Green test baseline for S03 (Test Stub Audit)
  - Verified mock patterns for getAuthUser, batch .select().or(), and slug revalidation chains
requires:
  []
affects:
  []
key_files:
  - src/__tests__/admin-dashboard.test.ts
  - src/__tests__/messaging.test.ts
  - src/__tests__/parent-phone-storage.test.ts
  - src/__tests__/recurring-charges.test.ts
key_decisions:
  - Mock getAuthUser from auth-cache directly instead of mocking createClient — matches the admin layout's actual import chain
  - Mock .select().or() returning data array with conversation_id field to match batch message-fetch pattern
  - Use exact object match for Stripe PI idempotencyKey assertion — matches actual format without date suffix
patterns_established:
  - Mock realignment checklist: when production code changes an import path or query shape, the corresponding test mock must be updated in the same PR
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-07T14:03:29.940Z
blocker_discovered: false
---

# S01: Fix Broken Tests

**Resolved all 14 test failures across 4 files by realigning stale mocks to current production code — test suite is fully green (48 files, 470 tests, 0 failures).**

## What Happened

The test suite had 14 failures across 4 test files, all caused by mock drift from M010–M012 code changes that updated production imports and query patterns without updating the corresponding test mocks.

**T01 — admin-dashboard.test.ts (6 failures → 0):** The admin layout switched from importing `createClient` from `@/lib/supabase/server` to importing `getAuthUser` from `@/lib/supabase/auth-cache`. The test was still mocking the old import. Fixed by replacing the mock target and restructuring `setupAuth` to return the `{ user, error, supabase }` shape that `getAuthUser` produces.

**T02 — messaging.test.ts (3 failures → 0):** The conversations API route was refactored to batch-fetch last messages using `.select().or()` instead of querying each conversation individually. Three GET tests still mocked the old per-conversation chain (`.select().eq().order().limit().maybeSingle()`), causing `TypeError: .or is not a function`. Replaced the mock shape with `.select().or()` returning a data array keyed by `conversation_id`.

**T03 — parent-phone-storage.test.ts + recurring-charges.test.ts (5 failures → 0):** Two root causes: (1) parent-phone-storage tests crashed because the mock supabase lacked `.from()`, which was needed for slug-specific revalidation added in a later milestone. Added the full chain mock. (2) recurring-charges test used `expect.stringContaining` with a trailing dash implying a date suffix in the idempotencyKey, but the actual code uses a plain booking ID. Changed to exact object match.

All fixes were mock-only changes — no production code was modified. The test suite now runs clean: 48 files pass, 470 tests pass, 0 failures.

## Verification

Ran `npx vitest run` — full suite: 48 files passed, 470 tests passed, 0 failures. Each task was individually verified against its target test file(s) before the final full-suite run.

## Requirements Advanced

None.

## Requirements Validated

- R001 — npx vitest run: 48 files, 470 tests, 0 failures — all 14 mock-drift failures resolved

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

T03 planned to fix 'skips phone UPDATE' assertions, but they were already correct — the tests were crashing before reaching assertions due to missing .from() mock.

## Known Limitations

45 it.todo() stubs remain across tests/ directory — deferred to S03 (Test Stub Audit & Cleanup).

## Follow-ups

S03 depends on S01 — test stub audit can now proceed with a green baseline.

## Files Created/Modified

- `src/__tests__/admin-dashboard.test.ts` — Replaced createClient mock with getAuthUser mock from @/lib/supabase/auth-cache
- `src/__tests__/messaging.test.ts` — Updated 3 GET /api/conversations test mocks from per-conversation chain to batch .select().or() pattern
- `src/__tests__/parent-phone-storage.test.ts` — Added .from() chain mock for slug revalidation
- `src/__tests__/recurring-charges.test.ts` — Corrected idempotencyKey assertion to exact match format
