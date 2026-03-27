---
estimated_steps: 49
estimated_files: 4
skills_used: []
---

# T03: Wire capacity check into profile page and add waitlist signup form

Update the teacher profile page to check capacity status and conditionally render either the booking calendar (under capacity) or a waitlist signup form (at capacity). Create the waitlist signup server action and WaitlistSignup component. Write unit tests for waitlist signup validation.

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

## Inputs

- ``src/lib/utils/capacity.ts` — getCapacityStatus utility from T01`
- ``src/app/[slug]/page.tsx` — existing profile page to modify`
- ``src/components/profile/BookingCalendar.tsx` — component conditionally hidden when at capacity`
- ``src/lib/supabase/service.ts` — supabaseAdmin for anonymous waitlist insert`
- ``supabase/migrations/0011_capacity_and_session_types.sql` — waitlist table schema from T01`

## Expected Output

- ``src/components/profile/WaitlistSignup.tsx` — waitlist signup form component`
- ``src/actions/waitlist.ts` — joinWaitlist server action`
- ``src/app/[slug]/page.tsx` — updated with capacity check and conditional rendering`
- ``tests/unit/waitlist-signup.test.ts` — unit tests for waitlist signup`

## Verification

npx vitest run tests/unit/waitlist-signup.test.ts && npx tsc --noEmit && npm run build
