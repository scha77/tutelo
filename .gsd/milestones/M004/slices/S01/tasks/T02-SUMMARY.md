---
id: T02
parent: S01
milestone: M004
provides:
  - availability_overrides table schema (migration 0007) — ready for S02 override editor
  - end_time > start_time Zod validation on AvailabilitySlotSchema in updateAvailability server action
key_files:
  - supabase/migrations/0007_availability_overrides.sql
  - src/actions/availability.ts
key_decisions:
  - availability_overrides migration shipped in S01 (additive, zero-risk) to get schema work done before S02 editor
patterns_established:
  - Zod .refine() on AvailabilitySlotSchema for cross-field time validation; error surfaced via parsed.error.issues[0]?.message
observability_surfaces:
  - Server action returns "End time must be after start time" for invalid ranges (previously accepted silently)
duration: ~8 min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Add availability_overrides migration and update server action validation

**Created `availability_overrides` table migration with RLS and added `end_time > start_time` Zod refinement to the `updateAvailability` server action.**

## What Happened

1. Created `supabase/migrations/0007_availability_overrides.sql` with:
   - `availability_overrides` table: `id`, `teacher_id` (FK → teachers with CASCADE), `specific_date`, `start_time`, `end_time`, `created_at`
   - UNIQUE constraint on `(teacher_id, specific_date, start_time)`
   - Composite index on `(teacher_id, specific_date)`
   - RLS enabled with two policies mirroring the `availability` table: public read + teacher write via `auth.uid()`

2. Added `.refine(s => s.end_time > s.start_time, { message: 'End time must be after start time' })` to `AvailabilitySlotSchema` in `src/actions/availability.ts`. Lexicographic HH:MM string comparison works correctly (same pattern as T01 time utilities). The existing `parsed.error.issues[0]?.message` path surfaces the refinement error.

## Verification

- `npm run build` — zero errors ✓
- `npx vitest run tests/unit/time-utils.test.ts` — all 25 tests pass ✓
- Migration SQL manually verified: column types, constraints, index, RLS policies all match the `availability` table pattern from `0001_initial_schema.sql`
- Server action code reviewed: refinement correctly placed after `.object()`, `UpdateAvailabilitySchema = z.array(...)` wrapping works with refined schema

## Diagnostics

- To test the Zod refinement: call `updateAvailability([{day_of_week: 0, start_time: "10:00", end_time: "09:00"}])` — returns `{ error: "End time must be after start time" }`
- Migration runs at deploy time via `supabase db push` — no local runtime verification needed
- Equal times (`start_time: "10:00", end_time: "10:00"`) also rejected (strict greater-than)

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `supabase/migrations/0007_availability_overrides.sql` — new migration for availability_overrides table with RLS
- `src/actions/availability.ts` — added `.refine()` for end_time > start_time validation on AvailabilitySlotSchema
