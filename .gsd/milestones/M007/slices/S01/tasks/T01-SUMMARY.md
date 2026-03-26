---
id: T01
parent: S01
milestone: M007
key_files:
  - supabase/migrations/0011_capacity_and_session_types.sql
  - src/lib/utils/capacity.ts
  - tests/unit/capacity.test.ts
key_decisions:
  - Split capacity utility into pure isAtCapacity() and async getCapacityStatus() for testability
  - Safe default on query error: return not-at-capacity so booking calendar still shows (per slice plan's failure visibility spec)
  - Active student metric: distinct student_name from bookings with status confirmed/completed in last 90 days
duration: ""
verification_result: passed
completed_at: 2026-03-26T02:16:16.963Z
blocker_discovered: false
---

# T01: Add migration 0011 (capacity_limit, waitlist, session_types) and capacity check utility with 15 passing unit tests

**Add migration 0011 (capacity_limit, waitlist, session_types) and capacity check utility with 15 passing unit tests**

## What Happened

Created three deliverables for the capacity limits foundation:

**Migration 0011_capacity_and_session_types.sql** — Single migration file (per D005) adding:
1. `capacity_limit` nullable INTEGER on `teachers` table (null = unlimited)
2. `waitlist` table with UUID PK, teacher_id FK (CASCADE), parent_email, created_at, notified_at. Unique constraint on (teacher_id, parent_email). RLS: anon insert, teacher-gated select/delete.
3. `session_types` table with UUID PK, teacher_id FK (CASCADE), label, price, duration_minutes, sort_order, created_at. RLS: public read, teacher-gated insert/update/delete.

All tables have indexes on teacher_id and RLS enabled.

**Capacity check utility (src/lib/utils/capacity.ts)** — Two exports:
- `isAtCapacity(count, limit)` — pure logic: null/undefined limit = never at capacity; otherwise count >= limit.
- `getCapacityStatus(supabase, teacherId, capacityLimit)` — queries bookings for distinct student_name values with status confirmed/completed in last 90 days. Short-circuits without DB query when limit is null. On query error, logs with teacher_id context and returns safe default (not at capacity).

**Unit tests (tests/unit/capacity.test.ts)** — 15 tests covering:
- Pure logic: null limit, undefined limit, under/at/over capacity, edge cases (0/0, 0/positive)
- DB integration with mocked Supabase: short-circuit behavior, distinct counting, error handling with safe default, empty results

## Verification

1. `npx vitest run tests/unit/capacity.test.ts` — 15 tests pass (4ms test time)
2. `npx tsc --noEmit` — exit code 2, but only from pre-existing TS2307 errors for qrcode/qrcode.react modules. Verified by running tsc on clean working tree — identical errors. No new TypeScript errors introduced by this task's files.
3. Confirmed migration file SQL syntax matches existing migration conventions (IF NOT EXISTS, RLS policies, index naming).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run tests/unit/capacity.test.ts` | 0 | ✅ pass | 9700ms |
| 2 | `npx tsc --noEmit` | 2 | ✅ pass (pre-existing qrcode type errors only, no new errors) | 13300ms |


## Deviations

Split capacity.ts into two exports (isAtCapacity pure function + getCapacityStatus async function) instead of a single function. This enables clean unit testing of the pure logic without Supabase mocking, while the async function handles the DB query layer. The plan's interface contract is preserved — getCapacityStatus has the exact signature specified.

## Known Issues

Pre-existing TS2307 errors for qrcode and qrcode.react type declarations (not related to this task). These cause tsc --noEmit to exit with code 2.

## Files Created/Modified

- `supabase/migrations/0011_capacity_and_session_types.sql`
- `src/lib/utils/capacity.ts`
- `tests/unit/capacity.test.ts`
