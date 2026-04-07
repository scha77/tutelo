---
estimated_steps: 13
estimated_files: 4
skills_used: []
---

# T01: Wrap four dashboard pages in unstable_cache with supabaseAdmin

Each of the four dashboard data pages (requests, sessions, students, waitlist) currently queries Supabase via the cookie-based RLS client from `getTeacher()`. This task wraps each page's data query in a `getCachedXxxData(teacherId)` function using `unstable_cache` + `supabaseAdmin`, following the exact pattern from `getCachedOverviewData` in `dashboard/page.tsx`.

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

## Inputs

- ``src/app/(dashboard)/dashboard/requests/page.tsx` — current page with direct supabase query`
- ``src/app/(dashboard)/dashboard/sessions/page.tsx` — current page with two parallel supabase queries`
- ``src/app/(dashboard)/dashboard/students/page.tsx` — current page with supabase query + client-side grouping`
- ``src/app/(dashboard)/dashboard/waitlist/page.tsx` — current page with direct waitlist query`
- ``src/app/(dashboard)/dashboard/page.tsx` — reference implementation of getCachedOverviewData pattern`
- ``src/lib/supabase/service.ts` — supabaseAdmin export used inside unstable_cache callbacks`

## Expected Output

- ``src/app/(dashboard)/dashboard/requests/page.tsx` — updated with getCachedRequestsData using unstable_cache`
- ``src/app/(dashboard)/dashboard/sessions/page.tsx` — updated with getCachedSessionsData using unstable_cache`
- ``src/app/(dashboard)/dashboard/students/page.tsx` — updated with getCachedStudentsData using unstable_cache`
- ``src/app/(dashboard)/dashboard/waitlist/page.tsx` — updated with getCachedWaitlistData using unstable_cache`

## Verification

npx tsc --noEmit
