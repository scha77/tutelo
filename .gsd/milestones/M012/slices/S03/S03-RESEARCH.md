# S03 Research — Dashboard Query Caching

**Slice:** Dashboard Query Caching  
**Difficulty:** Light — this is direct application of an established pattern already in the codebase.

---

## Summary

Four dashboard pages (`requests`, `sessions`, `students`, `waitlist`) currently query Supabase on every navigation using the cookie-based RLS client from `getTeacher()`. The fix is to wrap each page's data query in `unstable_cache` using `supabaseAdmin` (no cookie dependency), assign a tag per teacher, and call `updateTag(tag)` in the relevant mutation server actions. The reference implementation (`getCachedOverviewData` in `dashboard/page.tsx`) shows the exact pattern — this is just four repetitions of it.

---

## Recommendation

Apply the `getCachedOverviewData` pattern verbatim to each of the four target pages with 30s TTL. Use `supabaseAdmin` inside every `unstable_cache` callback. Wire `updateTag` calls into the corresponding server actions in `bookings.ts` and `waitlist.ts`.

---

## Implementation Landscape

### Reference Implementation (overview page)

`src/app/(dashboard)/dashboard/page.tsx` — the only dashboard page that already has caching:

```ts
function getCachedOverviewData(teacherId: string) {
  return unstable_cache(
    async () => {
      const { supabaseAdmin: supabase } = await import('@/lib/supabase/service')
      // ... queries using supabase (supabaseAdmin) ...
    },
    [`overview-${teacherId}`],
    { revalidate: 30, tags: [`overview-${teacherId}`] },
  )()
}
```

Key points:
- Dynamic import of `supabaseAdmin` inside the callback (avoids top-level import; same pattern as overview)
- Cache key and tag both use `overview-${teacherId}` — use consistent `<page>-${teacherId}` naming
- `revalidate: 30` (30s TTL)
- `updateTag('overview-${teacher.id}')` already called in all mutation server actions

### `updateTag` vs `revalidateTag` in Next.js 16

In Next.js 16.1.6 (installed version), `revalidateTag(tag)` without a second argument is **deprecated** with a console warning. The correct pattern:
- **Server Actions:** use `updateTag(tag)` — server-action-only, "read-your-own-writes" semantics, no deprecation warning
- **Route Handlers:** use `revalidateTag(tag, 'max')` — the codebase currently has no cache invalidation in route handlers, and none are needed for S03

All new invalidation calls should use `updateTag` (they are all in server actions).

### supabaseAdmin Import in `unstable_cache` Callbacks

Per D057: `createClient()` unconditionally calls `cookies()`, which is a dynamic API that prevents static/cached rendering. All `unstable_cache` callbacks MUST use `supabaseAdmin` (service role), not `supabase` from `getTeacher()`. The data is always filtered by `teacher_id` explicitly for RLS equivalence.

Two supabaseAdmin import patterns exist in the codebase:
1. Dynamic import inside callback: `const { supabaseAdmin: supabase } = await import('@/lib/supabase/service')` — used by overview
2. Top-level module import: `import { supabaseAdmin } from '@/lib/supabase/service'` — used by messages page

**Use the dynamic import pattern** to stay consistent with overview, since `unstable_cache` callbacks run outside request context.

---

## Files to Change

### Pages (4 files)

**`src/app/(dashboard)/dashboard/requests/page.tsx`**  
Currently: Direct `supabase.from('bookings').select(...).eq('status','requested')` call  
Change: Wrap in `getCachedRequestsData(teacherId)` using `unstable_cache` + `supabaseAdmin`  
Tag: `requests-${teacherId}`, TTL: 30s  
Queries: bookings WHERE status='requested', ordered by created_at DESC

**`src/app/(dashboard)/dashboard/sessions/page.tsx`**  
Currently: Two parallel `supabase.from('bookings')` queries (upcoming + past)  
Change: Wrap both queries in `getCachedSessionsData(teacherId)` using `unstable_cache` + `supabaseAdmin`  
Tag: `sessions-${teacherId}`, TTL: 30s  
Queries: upcoming (status IN confirmed/payment_failed), past (status=completed)

**`src/app/(dashboard)/dashboard/students/page.tsx`**  
Currently: `supabase.from('bookings').select(...).eq('status','completed')` then client-side grouping  
Change: Wrap in `getCachedStudentsData(teacherId)` using `unstable_cache` + `supabaseAdmin`  
Tag: `students-${teacherId}`, TTL: 30s  
Queries: bookings WHERE status='completed', select student_name/parent_email/subject  
Note: The client-side grouping logic moves inside the cache callback (all pure computation)

**`src/app/(dashboard)/dashboard/waitlist/page.tsx`**  
Currently: `supabase.from('waitlist').select(...)` direct call  
Change: Wrap in `getCachedWaitlistData(teacherId)` using `unstable_cache` + `supabaseAdmin`  
Tag: `waitlist-${teacherId}`, TTL: 30s  
Queries: waitlist WHERE teacher_id=teacherId, ordered by created_at ASC

### Server Actions (2 files)

**`src/actions/bookings.ts`** — Add `updateTag` calls:

| Action | New tag to invalidate | Reason |
|--------|----------------------|--------|
| `acceptBooking` | `updateTag(\`requests-${teacher.id}\`)` | Request removed from requests list (status→pending) |
| `declineBooking` | `updateTag(\`requests-${teacher.id}\`)` | Request removed from requests list (status→cancelled) |
| `markSessionComplete` | `updateTag(\`sessions-${teacher.id}\`)`, `updateTag(\`students-${teacher.id}\`)` | Session status changes; new student may appear |
| `cancelSession` | `updateTag(\`sessions-${teacher.id}\`)` | Session removed from upcoming list |
| `cancelSingleRecurringSession` | `updateTag(\`sessions-${teacher.id}\`)` | Session removed |
| `cancelRecurringSeries` | `updateTag(\`sessions-${teacher.id}\`)` | Multiple sessions removed |

Note: `acceptBooking` does NOT need to invalidate `sessions-${teacher.id}` because it changes status from `requested` → `pending` (not `confirmed`). Sessions page shows `confirmed` and `payment_failed` — pending is not displayed there.

**`src/actions/waitlist.ts`** — Add `updateTag` call:

| Action | New tag to invalidate | Reason |
|--------|----------------------|--------|
| `removeWaitlistEntry` | `updateTag(\`waitlist-${teacher.id}\`)` | Entry removed from waitlist |

Note: `checkAndNotifyWaitlist` runs fire-and-forget from `cancelSession` and stamps `notified_at` on entries, which affects the "Notified" badge in `WaitlistEntryRow`. This is acceptable — the 30s TTL will self-correct within the cache window. No explicit invalidation needed from this path.

---

## What's NOT in S03 Scope

- **Analytics page** (`analytics/page.tsx`): Not mentioned in the scope. Page_views increment automatically; booking count changes are low-frequency. Acceptable to leave dynamic.
- **Stripe webhook** (`/api/stripe/webhook/route.ts`): Does `pending→confirmed` transition but has no cache invalidation today. With 30s TTL this is acceptable (session appears in sessions page within 30s). Route Handlers cannot use `updateTag` and adding `revalidateTag` is out of scope.
- **Cron routes**: Similarly no cache invalidation needed — TTL handles it.
- **`submitBookingRequest`** (parent-facing): New requests will appear in teacher's requests page after 30s TTL expiry. The action doesn't have a convenient `teacher.id` value and is parent-initiated. This is explicitly acceptable: the milestone "after this" only mentions that _confirming_ a request invalidates the cache.

---

## Invalidation Matrix (complete)

| Tag | Invalidated by |
|-----|----------------|
| `requests-{id}` | `acceptBooking`, `declineBooking` |
| `sessions-{id}` | `markSessionComplete`, `cancelSession`, `cancelSingleRecurringSession`, `cancelRecurringSeries` |
| `students-{id}` | `markSessionComplete` |
| `waitlist-{id}` | `removeWaitlistEntry` |

---

## Existing Patterns to Follow

- `src/lib/supabase/auth-cache.ts` — `getCachedTeacherData`: canonical `unstable_cache` + `supabaseAdmin` pattern  
- `src/app/(dashboard)/dashboard/page.tsx` — `getCachedOverviewData`: reference for dashboard page data caching  
- `src/actions/bookings.ts` — already imports `{ revalidatePath, updateTag }` from `next/cache`; just add new `updateTag` calls alongside existing ones  
- `src/actions/waitlist.ts` — currently only imports `revalidatePath`; add `updateTag` import

---

## Verification

```bash
# 1. TypeScript build — no errors introduced
npx tsc --noEmit

# 2. Unit tests pass (bookings + waitlist actions mocked in tests)
npx vitest run src/__tests__/cancel-session.test.ts
npx vitest run src/__tests__/cancel-recurring.test.ts

# 3. Full test suite
npx vitest run

# 4. Build succeeds
npm run build
```

Manual verification (from milestone "after this"):
- Navigate to `/dashboard/sessions`, note data, navigate to `/dashboard/page`, return within 30s — should be instant (cache HIT, no Supabase call)
- Confirm a booking request → requests page should update immediately (cache invalidated)

---

## Skills Discovered

No new skills required. This is a standard Next.js `unstable_cache` application with an established in-codebase reference.
