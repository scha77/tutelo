# S01: Capacity + Waitlist Signup

**Goal:** Teacher sets a capacity limit in dashboard settings. When at capacity, the profile page shows "Currently at capacity" with a waitlist signup form instead of the booking calendar. Parents can join the waitlist by entering their email. Teacher info and reviews remain visible.
**Demo:** After this: Teacher sets capacity_limit=3 in dashboard settings. With 3 active students, their profile page shows 'Currently at capacity' with a waitlist signup form instead of the booking calendar. A parent enters their email and joins the waitlist. Teacher info and reviews remain visible.

## Tasks
- [x] **T01: Add capacity + waitlist migration and capacity status utility** — Create the DB migration adding `capacity_limit` to teachers and the `waitlist` table with RLS policies. Implement `getCapacityStatus()` utility that queries active students. Write unit tests for the capacity utility.

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
  - Estimate: 45m
  - Files: supabase/migrations/0011_capacity_and_session_types.sql, src/lib/utils/capacity.ts, tests/unit/capacity-status.test.ts
  - Verify: npx vitest run tests/unit/capacity-status.test.ts && npx tsc --noEmit
- [x] **T02: Add capacity limit setting to dashboard settings page** — Add a CapacitySettings component to the dashboard settings page that lets teachers set their capacity limit (nullable integer). The setting persists to the teachers.capacity_limit column.

## Steps

1. Create `src/components/dashboard/CapacitySettings.tsx` as a 'use client' component:
   - Props: `currentLimit: number | null`
   - Shows a card with title 'Student Capacity' and description explaining what capacity limits do
   - Input field for capacity limit (number input, min=1, placeholder 'No limit')
   - Toggle or clear button to switch between 'limited' and 'unlimited' (null)
   - Save button that calls `updateCapacityLimit` server action
   - Shows success toast on save (use sonner, already in the project)
   - Pending state while saving
2. Create `src/actions/capacity.ts` with `updateCapacityLimit(limit: number | null)` server action:
   - Auth check: get user via `supabase.auth.getUser()`, find teacher by user_id
   - Validate: if limit is not null, must be a positive integer
   - Update `teachers.capacity_limit` via supabase update
   - Revalidate `/dashboard/settings` path
   - Return `{ success: true }` or `{ success: false, error: string }`
3. Update `src/app/(dashboard)/dashboard/settings/page.tsx`:
   - Add `capacity_limit` to the teacher select query
   - Import and render `<CapacitySettings currentLimit={teacher.capacity_limit} />` between AccountSettings and SchoolEmailVerification

## Must-Haves

- [ ] CapacitySettings component renders with current limit value
- [ ] Teacher can set a numeric limit (positive integer) or clear to unlimited (null)
- [ ] Server action validates input and persists to DB
- [ ] Settings page renders without TypeScript errors

## Verification

- `npx tsc --noEmit` exits 0
- `npm run build` passes
  - Estimate: 45m
  - Files: src/components/dashboard/CapacitySettings.tsx, src/actions/capacity.ts, src/app/(dashboard)/dashboard/settings/page.tsx
  - Verify: npx tsc --noEmit && npm run build
- [x] **T03: Wire capacity check into profile page and add waitlist signup form** — Update the teacher profile page to check capacity status and conditionally render either the booking calendar (under capacity) or a waitlist signup form (at capacity). Create the waitlist signup server action and WaitlistSignup component. Write unit tests for waitlist signup validation.

## Steps

1. Create `src/components/profile/WaitlistSignup.tsx` as a 'use client' component:
   - Props: `teacherId: string, teacherName: string, accentColor: string`
   - Shows 'Currently at capacity' heading with explanation text: '{teacherName} is not accepting new students right now. Leave your email to be notified when a spot opens.'
   - Email input field with validation (basic email format check client-side)
   - Submit button styled with the teacher's accent color
   - On submit, calls `joinWaitlist` server action
   - Shows success state: 'You're on the list! We'll email you when a spot opens.'
   - Shows error state for duplicate emails: 'You're already on the waitlist.'
   - Pending state while submitting
2. Create `src/actions/waitlist.ts` with `joinWaitlist(teacherId: string, email: string)` server action:
   - Validate email format (basic regex, no auth required — anonymous parents)
   - Use `supabaseAdmin` to insert into waitlist table (bypasses RLS since parent is anonymous)
   - Handle unique constraint violation (duplicate email for same teacher) → return specific error
   - Return `{ success: true }` or `{ success: false, error: 'duplicate' | 'validation' | 'server' }`
3. Update `src/app/[slug]/page.tsx`:
   - Import `getCapacityStatus` from `@/lib/utils/capacity`
   - After fetching teacher data, call `getCapacityStatus(teacher.id)` 
   - Pass `isAtCapacity` to the rendering logic
   - When `isAtCapacity` is true: hide `<BookingCalendar>` and `<BookNowCTA>`, render `<WaitlistSignup>` in their place
   - Keep HeroSection, CredentialsBar, AboutSection, ReviewsSection, SocialLinks visible regardless of capacity
4. Create `tests/unit/waitlist-signup.test.ts` with unit tests:
   - Mock supabaseAdmin
   - Test: valid email inserts successfully
   - Test: duplicate email returns 'duplicate' error
   - Test: invalid email format returns 'validation' error
   - Test: empty email returns 'validation' error
   - Test: DB insert failure returns 'server' error

## Must-Haves

- [ ] WaitlistSignup component renders at-capacity message with email form
- [ ] joinWaitlist server action validates email and inserts via supabaseAdmin
- [ ] Duplicate email returns specific 'duplicate' error (not generic)
- [ ] Profile page conditionally renders BookingCalendar vs WaitlistSignup based on capacity
- [ ] Teacher info (hero, credentials, about, reviews) remains visible when at capacity
- [ ] Unit tests pass for waitlist signup validation

## Verification

- `npx vitest run tests/unit/waitlist-signup.test.ts` passes
- `npx tsc --noEmit` exits 0
- `npm run build` passes

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| supabaseAdmin insert | Return { success: false, error: 'server' } | Same — supabase client has internal timeout | Log + return server error |
| getCapacityStatus | Return isAtCapacity: false (safe default — show calendar) | Same | Same |

## Negative Tests

- **Malformed inputs**: empty string email, email without @, email with spaces, null teacherId
- **Error paths**: DB unique constraint violation (duplicate), DB connection failure
- **Boundary conditions**: teacher with no capacity limit (always show calendar), teacher with limit=0 (always at capacity)
  - Estimate: 1h
  - Files: src/components/profile/WaitlistSignup.tsx, src/actions/waitlist.ts, src/app/[slug]/page.tsx, tests/unit/waitlist-signup.test.ts
  - Verify: npx vitest run tests/unit/waitlist-signup.test.ts && npx tsc --noEmit && npm run build
