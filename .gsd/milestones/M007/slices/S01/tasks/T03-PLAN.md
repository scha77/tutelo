---
estimated_steps: 33
estimated_files: 4
skills_used: []
---

# T03: Profile at-capacity state + waitlist signup form

Modify the teacher profile page to check capacity and conditionally render an at-capacity state with a waitlist signup form. Create the necessary client components and a waitlist API route.

**Profile page changes (`src/app/[slug]/page.tsx`):**

In the `TeacherProfilePage` RSC, after fetching the teacher:
1. Read `teacher.capacity_limit` — if null, skip capacity check entirely (no DB query needed)
2. If capacity_limit is set, query bookings to count distinct `student_name` where `teacher_id` matches, `status` in ('confirmed', 'completed'), and `booking_date` >= 90 days ago. Compare count to capacity_limit.
3. If at capacity: render `<AtCapacitySection>` with a `<WaitlistForm>` instead of `<BookingCalendar>`. Keep HeroSection, CredentialsBar, AboutSection, ReviewsSection, and SocialLinks visible.
4. If not at capacity: render everything as before (no changes to existing flow).

Use a simple inline query rather than importing the utility from T01 — the profile page RSC already has a Supabase client and this keeps the dependency minimal. The utility from T01 is for server actions and API routes.

**AtCapacitySection component (`src/components/profile/AtCapacitySection.tsx`):**

A server-safe wrapper component (no 'use client' needed — can be a plain function component) that displays:
- A styled section matching the booking calendar's outer container (same `max-w-3xl`, `px-4 py-8` pattern)
- Heading: "Book a Session" (same as BookingCalendar heading for layout consistency)
- A visually distinct "Currently at capacity" message
- Teacher name reference: "{firstName} is currently at full capacity."
- A brief note: "Leave your email below to be notified when a spot opens up."
- Renders the `<WaitlistForm>` client component below the message

Props: `teacherName: string`, `teacherId: string`, `accentColor: string`

**WaitlistForm component (`src/components/profile/WaitlistForm.tsx`):**

A 'use client' component with:
- An email input field + submit button styled with the teacher's accent color
- Client-side email validation
- On submit: POST to `/api/waitlist` with `{ teacherId, email }`
- Success state: "You're on the list! We'll email you when a spot opens."
- Error state: show error message (e.g., "Already on waitlist" or generic error)
- Duplicate detection: if parent_email already exists for this teacher, show "You're already on the waitlist" as a friendly message, not an error

**Waitlist API route (`src/app/api/waitlist/route.ts`):**

POST handler that:
1. Reads `teacherId` and `email` from request body
2. Validates email format (basic regex or zod)
3. Inserts into `waitlist` table using the service role client (since parents may not be authenticated). The RLS policy allows anon insert but we use service role for simplicity.
4. On unique constraint violation (duplicate email for teacher): return 409 with `{ error: 'already_on_waitlist' }`
5. On success: return 201 with `{ success: true }`
6. No authentication required — this is a public-facing form for unauthenticated parents

## Inputs

- `src/app/[slug]/page.tsx`
- `src/components/profile/BookingCalendar.tsx`
- `src/lib/utils/capacity.ts`
- `supabase/migrations/0011_capacity_and_session_types.sql`
- `src/lib/supabase/service.ts`

## Expected Output

- `src/app/[slug]/page.tsx`
- `src/components/profile/AtCapacitySection.tsx`
- `src/components/profile/WaitlistForm.tsx`
- `src/app/api/waitlist/route.ts`

## Verification

npx tsc --noEmit && npm run build

## Observability Impact

- Signals added: console.error on waitlist insert failure in API route with teacher_id context (no PII)
- Failure visibility: waitlist form shows user-facing error message; capacity check failure defaults to showing booking calendar (safe fallback — better to show calendar than wrongly hide it)
