---
estimated_steps: 31
estimated_files: 3
skills_used: []
---

# T01: Add capacity + waitlist migration and capacity status utility

Create the DB migration adding `capacity_limit` to teachers and the `waitlist` table with RLS policies. Implement `getCapacityStatus()` utility that queries active students. Write unit tests for the capacity utility.

## Steps

1. Create `supabase/migrations/0011_capacity_and_session_types.sql` with:
   - `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS capacity_limit INTEGER;` (nullable, null = unlimited)
   - `CREATE TABLE waitlist` with columns: id (UUID PK), teacher_id (UUID FK→teachers), parent_email (TEXT NOT NULL), created_at (TIMESTAMPTZ DEFAULT NOW()), notified_at (TIMESTAMPTZ nullable)
   - Unique constraint on (teacher_id, parent_email) to prevent duplicate signups
   - RLS enabled on waitlist with policies: anonymous insert (WITH CHECK true), teacher-gated select (teacher's user_id = auth.uid()), teacher-gated delete
   - Index on waitlist(teacher_id)
2. Create `src/lib/utils/capacity.ts` with `getCapacityStatus(teacherId: string)` function:
   - Uses `supabaseAdmin` to query bookings: `SELECT DISTINCT student_name FROM bookings WHERE teacher_id = $1 AND status IN ('confirmed', 'completed') AND booking_date >= NOW() - INTERVAL '90 days'`
   - Fetches teacher's `capacity_limit` from teachers table
   - Returns `{ isAtCapacity: boolean, activeStudentCount: number, capacityLimit: number | null }`
   - When `capacityLimit` is null, `isAtCapacity` is always false (unlimited)
   - When `activeStudentCount >= capacityLimit`, `isAtCapacity` is true
3. Create `tests/unit/capacity-status.test.ts` with unit tests:
   - Mock supabaseAdmin with vi.mock
   - Test cases: null limit → never at capacity; limit=3 with 2 students → not at capacity; limit=3 with 3 students → at capacity; limit=3 with 4 students → at capacity; no bookings → 0 active students; duplicate student_name counted once (DISTINCT)

## Must-Haves

- [ ] Migration file creates capacity_limit column and waitlist table with correct RLS
- [ ] getCapacityStatus returns correct isAtCapacity for null limit, under limit, at limit, over limit
- [ ] Waitlist table has unique constraint on (teacher_id, parent_email)
- [ ] Unit tests pass

## Verification

- `npx vitest run tests/unit/capacity-status.test.ts` passes
- `npx tsc --noEmit` exits 0

## Negative Tests

- **Boundary conditions**: capacity_limit=0 (at capacity with 0 students), capacity_limit=1 with exactly 1 student, null limit with many students (never at capacity)
- **Error paths**: supabaseAdmin query failure returns safe default (not at capacity)

## Observability Impact

- Signals added: getCapacityStatus returns structured result object, no logging in happy path
- Failure state: query failures caught and logged via console.error, returns `{ isAtCapacity: false }` as safe default

## Inputs

- ``supabase/migrations/0010_email_verification_tokens.sql` — latest existing migration, naming convention reference`
- ``src/lib/supabase/service.ts` — supabaseAdmin client used by capacity utility`
- ``src/app/(dashboard)/dashboard/students/page.tsx` — existing student grouping logic as pattern reference for active student counting`

## Expected Output

- ``supabase/migrations/0011_capacity_and_session_types.sql` — migration adding capacity_limit column and waitlist table`
- ``src/lib/utils/capacity.ts` — getCapacityStatus utility function`
- ``tests/unit/capacity-status.test.ts` — unit tests for capacity status utility`

## Verification

npx vitest run tests/unit/capacity-status.test.ts && npx tsc --noEmit
