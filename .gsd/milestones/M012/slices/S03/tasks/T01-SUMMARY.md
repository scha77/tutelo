---
id: T01
parent: S03
milestone: M012
key_files:
  - src/app/(dashboard)/dashboard/requests/page.tsx
  - src/app/(dashboard)/dashboard/sessions/page.tsx
  - src/app/(dashboard)/dashboard/students/page.tsx
  - src/app/(dashboard)/dashboard/waitlist/page.tsx
key_decisions:
  - Dynamic import of supabaseAdmin inside each unstable_cache callback follows D057 / getCachedOverviewData reference pattern
  - Cache key array element and tags array element are identical strings (page-${teacherId}) so revalidateTag in server actions hits both
  - Students page grouping logic moved entirely inside cache callback — pure computation, no downside
duration: 
verification_result: passed
completed_at: 2026-04-07T05:50:21.460Z
blocker_discovered: false
---

# T01: Wrapped all four dashboard data pages in unstable_cache with 30s TTL and supabaseAdmin, matching the getCachedOverviewData reference pattern

**Wrapped all four dashboard data pages in unstable_cache with 30s TTL and supabaseAdmin, matching the getCachedOverviewData reference pattern**

## What Happened

Read the reference getCachedOverviewData implementation in dashboard/page.tsx and all four target pages. Each was using the cookie-based RLS supabase client from getTeacher() for data. Applied unstable_cache + dynamic supabaseAdmin import to requests (single query), sessions (Promise.all of two parallel queries), students (query + Map-based grouping both inside callback, Set converted to Array for serialisability), and waitlist (single query). The getTeacher() call is preserved in all four pages for auth and teacher metadata. All pages now drop the supabase destructure since only teacher is needed.

## Verification

Ran npx tsc --noEmit — zero errors, zero warnings. All four pages compile cleanly with the new unstable_cache wrappers.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 8000ms |

## Deviations

Waitlist page: !entries || entries.length === 0 guard simplified to entries.length === 0 since getCachedWaitlistData always returns an array, never null. Minor cleanup, no behaviour change.

## Known Issues

None.

## Files Created/Modified

- `src/app/(dashboard)/dashboard/requests/page.tsx`
- `src/app/(dashboard)/dashboard/sessions/page.tsx`
- `src/app/(dashboard)/dashboard/students/page.tsx`
- `src/app/(dashboard)/dashboard/waitlist/page.tsx`
