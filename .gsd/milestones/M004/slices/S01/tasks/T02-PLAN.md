---
estimated_steps: 4
estimated_files: 2
---

# T02: Add availability_overrides migration and update server action validation

**Slice:** S01 — Recurring Availability Editor with 5-Min Granularity
**Milestone:** M004

## Description

Create the Supabase migration for the `availability_overrides` table (additive, S02-ready — no existing data touched) and add `end_time > start_time` Zod validation to the `updateAvailability` server action. This ships the schema work early while the S02 override editor isn't built yet, and tightens the server action contract to match the new time-range paradigm.

## Steps

1. Create `supabase/migrations/0007_availability_overrides.sql`:
   - `CREATE TABLE availability_overrides` with columns:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE`
     - `specific_date DATE NOT NULL`
     - `start_time TIME NOT NULL`
     - `end_time TIME NOT NULL`
     - `created_at TIMESTAMPTZ DEFAULT now()`
   - `CONSTRAINT availability_overrides_unique UNIQUE (teacher_id, specific_date, start_time)`
   - `CREATE INDEX idx_availability_overrides_teacher_date ON availability_overrides (teacher_id, specific_date)`
   - Enable RLS: `ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY`
   - RLS policies mirroring `availability` table:
     - `availability_overrides_public_read` — `FOR SELECT USING (true)`
     - `availability_overrides_teacher_write` — `FOR ALL USING (EXISTS (SELECT 1 FROM teachers WHERE teachers.id = availability_overrides.teacher_id AND teachers.user_id = auth.uid()))`
2. Update `src/actions/availability.ts`:
   - Add `.refine()` to `AvailabilitySlotSchema`: `.refine(s => s.end_time > s.start_time, { message: 'End time must be after start time' })`
   - Verify the existing `UpdateAvailabilitySchema = z.array(...)` wrapping still works with the refined schema
   - Ensure `parsed.error.issues[0]?.message` correctly surfaces the refinement message (Zod v4 `.issues` pattern per DECISIONS.md)
3. Verify `npm run build` passes with the updated server action.
4. Manually verify the SQL syntax is valid (no runtime check needed — migration runs at deploy time; Supabase CLI `db push` would be the full check but is out of scope for local dev).

## Must-Haves

- [ ] `availability_overrides` table migration with correct schema, constraints, index, and RLS
- [ ] RLS policies match `availability` table pattern (public read, teacher write via `auth.uid()`)
- [ ] `AvailabilitySlotSchema` Zod refinement rejects `end_time <= start_time`
- [ ] Existing `updateAvailability` flow unchanged for valid inputs
- [ ] `npm run build` passes

## Verification

- `npm run build` — zero errors
- Read the migration file and confirm SQL structure matches the plan
- Read the server action and confirm Zod refinement is correctly placed

## Observability Impact

- Signals added/changed: Server action now returns a clear "End time must be after start time" error message for invalid ranges (previously accepted silently)
- How a future agent inspects this: Call `updateAvailability([{day_of_week: 0, start_time: "10:00", end_time: "09:00"}])` — should return `{error: "End time must be after start time"}`
- Failure state exposed: Zod validation error surfaced in `result.error` string

## Inputs

- `supabase/migrations/0001_initial_schema.sql` — `availability` table schema and RLS pattern to mirror
- `src/actions/availability.ts` — existing server action to add Zod refinement to
- `.gsd/DECISIONS.md` — Zod v4 uses `.issues`, `getClaims()` auth, separate `availability_overrides` table decision

## Expected Output

- `supabase/migrations/0007_availability_overrides.sql` — complete migration file
- `src/actions/availability.ts` — updated with `end_time > start_time` Zod refinement
