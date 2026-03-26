---
estimated_steps: 13
estimated_files: 3
skills_used: []
---

# T01: Migration + capacity check utility

Write the Supabase migration 0011 that adds all M007 schema changes in a single file (per decision D005), then create a server-side capacity check utility and unit tests.

**Migration 0011_capacity_and_session_types.sql must add:**

1. `capacity_limit` nullable INTEGER column on the `teachers` table (null = unlimited)
2. `waitlist` table: `id` UUID PK, `teacher_id` UUID FK→teachers(id) ON DELETE CASCADE, `parent_email` TEXT NOT NULL, `created_at` TIMESTAMPTZ DEFAULT NOW(), `notified_at` TIMESTAMPTZ nullable. Unique constraint on (teacher_id, parent_email). RLS enabled with: anon insert allowed, teacher-gated select (teacher can see their own waitlist), teacher-gated delete.
3. `session_types` table: `id` UUID PK, `teacher_id` UUID FK→teachers(id) ON DELETE CASCADE, `label` TEXT NOT NULL, `price` NUMERIC(10,2) NOT NULL, `duration_minutes` SMALLINT, `sort_order` SMALLINT NOT NULL DEFAULT 0, `created_at` TIMESTAMPTZ DEFAULT NOW(). RLS enabled with: public read, teacher-gated insert/update/delete.

**Capacity check utility (`src/lib/utils/capacity.ts`):**

Export a function `getCapacityStatus(supabase, teacherId, capacityLimit)` that:
- If `capacityLimit` is null/undefined, returns `{ atCapacity: false, activeStudentCount: 0 }`
- Queries bookings where `teacher_id` matches, `status` in ('confirmed', 'completed'), and `booking_date` within last 90 days from today
- Counts distinct `student_name` values (the active student metric)
- Returns `{ atCapacity: boolean, activeStudentCount: number }`

**Unit tests (`tests/unit/capacity.test.ts`):**
Test the pure logic of capacity determination — given a count and a limit, is the teacher at capacity? Also test the null/undefined limit edge case (always not at capacity).

## Inputs

- `supabase/migrations/0001_initial_schema.sql`
- `src/lib/utils/booking.ts`
- `src/lib/supabase/service.ts`

## Expected Output

- `supabase/migrations/0011_capacity_and_session_types.sql`
- `src/lib/utils/capacity.ts`
- `tests/unit/capacity.test.ts`

## Verification

npx vitest run tests/unit/capacity.test.ts && npx tsc --noEmit

## Observability Impact

Migration adds queryable tables (waitlist, session_types) and a column (capacity_limit) that are inspectable via Supabase dashboard. The capacity utility function returns structured data — no side effects or logging needed at this layer.
