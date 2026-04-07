# S03: Dashboard Query Caching

**Goal:** All four dashboard data pages (requests, sessions, students, waitlist) serve cached Supabase responses via `unstable_cache` with 30s TTL, and relevant server actions invalidate caches via `updateTag` so mutations are reflected immediately.
**Demo:** After this: After this: navigating away from /dashboard/sessions and back within 30 seconds returns the cached result instantly; confirming a booking request invalidates the requests cache so the count updates correctly.

## Tasks
- [x] **T01: Wrapped all four dashboard data pages in unstable_cache with 30s TTL and supabaseAdmin, matching the getCachedOverviewData reference pattern** — Each of the four dashboard data pages (requests, sessions, students, waitlist) currently queries Supabase via the cookie-based RLS client from `getTeacher()`. This task wraps each page's data query in a `getCachedXxxData(teacherId)` function using `unstable_cache` + `supabaseAdmin`, following the exact pattern from `getCachedOverviewData` in `dashboard/page.tsx`.

## Steps

1. Open `src/app/(dashboard)/dashboard/requests/page.tsx`. Add `import { unstable_cache } from 'next/cache'` at top. Create `getCachedRequestsData(teacherId: string)` that returns `unstable_cache(async () => { ... }, ['requests-${teacherId}'], { revalidate: 30, tags: ['requests-${teacherId}'] })()`. Inside the callback, dynamically import `supabaseAdmin` as `const { supabaseAdmin: supabase } = await import('@/lib/supabase/service')`, then move the existing bookings query (`.from('bookings').select('id, student_name, subject, booking_date, start_time, parent_email, created_at').eq('teacher_id', teacherId).eq('status', 'requested').order('created_at', { ascending: false })`) inside. Return the data. In `RequestsPage`, call `getCachedRequestsData(teacher.id)` instead of using the page-level `supabase` for data.

2. Open `src/app/(dashboard)/dashboard/sessions/page.tsx`. Add `import { unstable_cache } from 'next/cache'`. Create `getCachedSessionsData(teacherId: string)` wrapping both parallel queries (upcoming: `.in('status', ['confirmed', 'payment_failed'])` and past: `.eq('status', 'completed')`) in a single `unstable_cache` callback. Tag: `sessions-${teacherId}`, TTL: 30s. Use `Promise.all` inside the callback. Return `{ upcomingBookings, pastBookings }`.

3. Open `src/app/(dashboard)/dashboard/students/page.tsx`. Add `import { unstable_cache } from 'next/cache'`. Create `getCachedStudentsData(teacherId: string)`. Move both the Supabase query AND the client-side grouping logic (Map-based dedup) inside the `unstable_cache` callback — the grouping is pure computation and benefits from caching. Tag: `students-${teacherId}`, TTL: 30s. Return the grouped students array.

4. Open `src/app/(dashboard)/dashboard/waitlist/page.tsx`. Add `import { unstable_cache } from 'next/cache'`. Create `getCachedWaitlistData(teacherId: string)` wrapping the waitlist query. Tag: `waitlist-${teacherId}`, TTL: 30s.

5. In each page component, the `supabase` client from `getTeacher()` is no longer used for data queries (only `teacher` is needed for auth redirect and teacher metadata like timezone, stripe_charges_enabled, capacity_limit). Keep the `getTeacher()` call for auth but destructure only what's needed.

6. Run `npx tsc --noEmit` to verify no type errors.

## Key constraints
- Use dynamic import `await import('@/lib/supabase/service')` inside each `unstable_cache` callback (per D057 and the overview reference)
- Cache key array and tags must match: `['<page>-${teacherId}']` for both
- Each callback must filter by `teacher_id` explicitly (RLS equivalence since we're using service role)
- The `getTeacher()` call stays for auth — only data queries move to `unstable_cache`
  - Estimate: 45m
  - Files: src/app/(dashboard)/dashboard/requests/page.tsx, src/app/(dashboard)/dashboard/sessions/page.tsx, src/app/(dashboard)/dashboard/students/page.tsx, src/app/(dashboard)/dashboard/waitlist/page.tsx
  - Verify: npx tsc --noEmit
- [ ] **T02: Wire updateTag invalidation into server actions and verify full build** — Server actions that mutate bookings or waitlist entries must invalidate the corresponding page caches via `updateTag`. This ensures that after a teacher accepts/declines a request, completes/cancels a session, or removes a waitlist entry, the cached data is immediately refreshed.

## Steps

1. Open `src/actions/bookings.ts`. Add `updateTag` calls to these actions (alongside existing `updateTag('overview-${teacher.id}')` calls):
   - `acceptBooking`: add `updateTag(\`requests-${teacher.id}\`)` — request is removed from list (status requested→pending)
   - `declineBooking`: add `updateTag(\`requests-${teacher.id}\`)` — request is removed from list (status requested→cancelled)
   - `markSessionComplete`: add `updateTag(\`sessions-${teacher.id}\`)` and `updateTag(\`students-${teacher.id}\`)` — session status changes, new student may appear in students list
   - `cancelSession`: add `updateTag(\`sessions-${teacher.id}\`)` — session removed from upcoming
   - `cancelSingleRecurringSession`: add `updateTag(\`sessions-${teacher.id}\`)` — session removed
   - `cancelRecurringSeries`: add `updateTag(\`sessions-${teacher.id}\`)` — multiple sessions removed

2. Open `src/actions/waitlist.ts`. Add `import { updateTag } from 'next/cache'` (currently only imports `revalidatePath`). In `removeWaitlistEntry`, add `updateTag(\`waitlist-${teacher.id}\`)` after the delete operation succeeds.

3. Run `npx tsc --noEmit` — verify zero type errors.

4. Run `npx vitest run` — verify all tests pass. The existing test mocks already mock `updateTag` from `next/cache`, so new calls won't break tests. If any test explicitly asserts `updateTag` call count, update the expected count.

5. Run `npm run build` — verify build succeeds with no errors.

## Key constraints
- `updateTag` (not `revalidateTag`) — per research, `revalidateTag` without second argument is deprecated in Next.js 16.1.6
- `updateTag` is already imported in `bookings.ts` — just add new calls
- `waitlist.ts` needs a new import: change `import { revalidatePath } from 'next/cache'` to `import { revalidatePath, updateTag } from 'next/cache'`
- `acceptBooking` does NOT need `sessions-${teacher.id}` tag — status goes to `pending`, not `confirmed`
- Place `updateTag` calls near existing `revalidatePath`/`updateTag` calls for consistency
  - Estimate: 30m
  - Files: src/actions/bookings.ts, src/actions/waitlist.ts
  - Verify: npx tsc --noEmit && npx vitest run && npm run build
