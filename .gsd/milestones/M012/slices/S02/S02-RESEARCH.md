# S02 Research: Directory Pages ISR

**Slice:** M012/S02 — Directory Pages ISR
**Requirement:** PERF-02
**Risk:** Low
**Calibration:** Light — direct application of the D057 pattern established in S01.

---

## Summary

Both `/tutors` and `/tutors/[category]` are currently `ƒ (Dynamic)` in the build output. The fix is identical to S01's D057 finding: both pages import `createClient` from `@/lib/supabase/server`, which unconditionally calls `cookies()` from `next/headers` — a dynamic API that opts the entire route out of ISR. Since both pages query only public data (`is_published = true`), replacing `createClient` with `supabaseAdmin` is safe and sufficient.

The `/tutors/[category]` page already has `export const revalidate = 3600` and `generateStaticParams` (no DB call — purely maps `SUBJECT_LIST` to slugs). `/tutors` needs `export const revalidate = 300` added per D054. No structural changes to filtering UX are needed.

---

## Current Build State

```
ƒ /tutors
ƒ /tutors/[category]
```

Both show `ƒ (Dynamic)` despite `/tutors/[category]` already declaring `export const revalidate = 3600`.

**Root cause (D057):** `createClient()` calls `await cookies()` on every invocation. Next.js detects the `cookies()` dependency at the route level and opts the entire route out of Full Route Cache, making `revalidate` a no-op.

---

## Implementation Landscape

### File 1: `src/app/tutors/page.tsx`

**Current state:**
- Imports `createClient` from `@/lib/supabase/server` (line 3)
- Uses `const supabase = await createClient()` (line 44)
- No `export const revalidate` — fully dynamic by default
- Reads `searchParams` server-side for filtering (subject, grade, city, price, q)
- `DirectoryFilters` is already wrapped in `<Suspense>` ✓

**Required changes:**
1. Replace `import { createClient }` with `import { supabaseAdmin } from '@/lib/supabase/service'`
2. Remove `const supabase = await createClient()` — use `supabaseAdmin` directly in the query
3. Add `export const revalidate = 300` (5-minute TTL per D054)

**Note on searchParams + ISR:** Reading `searchParams` server-side is fine with ISR. Vercel caches each unique URL (including query string) as a separate ISR entry. `?subject=Math` and `?subject=Reading` get their own cache slots, each revalidating on the 300s TTL. The `cookies()` call is the actual blocker — once removed, `revalidate=300` becomes effective.

### File 2: `src/app/tutors/[category]/page.tsx`

**Current state:**
- Imports `createClient` from `@/lib/supabase/server` (line 4)
- Uses `const supabase = await createClient()` (line 83) — in the page body only
- `generateStaticParams` uses `SUBJECT_LIST.map(...)` — **no DB call, no cookies** ✓
- Already has `export const revalidate = 3600` (line 9)

**Required changes:**
1. Replace `import { createClient }` with `import { supabaseAdmin } from '@/lib/supabase/service'`
2. Remove `const supabase = await createClient()` — use `supabaseAdmin` directly
3. No change to `revalidate` or `generateStaticParams`

### File 3: `src/actions/profile.ts` — On-demand revalidation

**Current state:**
- `updatePublishStatus`: revalidates `/[slug]` but NOT `/tutors` or `/tutors/[category]`
- `updateProfile`: revalidates `/[slug]` but NOT `/tutors` or `/tutors/[category]`
- Both mutations change data that appears in `TeacherCard` (name, photo, subjects, headline, city/state, rate, school)

**Required changes — `updatePublishStatus`:**
- Add `revalidatePath('/tutors')` — teacher appears/disappears from directory
- Add `revalidatePath('/tutors/[category]', 'page')` — appears/disappears from subject category pages

**Required changes — `updateProfile`:**
- Add `revalidatePath('/tutors')` — TeacherCard shows name, photo, headline, city, subjects, rate
- (Optional) Add `revalidatePath('/tutors/[category]', 'page')` — subject changes affect category pages

**PERF-06 write budget check:** `updateProfile` ~100 saves/day adds ~100 more ISR writes for `/tutors`. Total still well under 1,000/day Hobby limit. `updatePublishStatus` is rare (a few per day max).

---

## Verification

After changes, run `npm run build` and confirm:

```
● /tutors                  5m      (ISR with 5-minute TTL)
● /tutors/[category]       1h      (ISR with 1-hour TTL, pre-rendered for all subjects)
```

Both must show `●` (SSG/ISR) instead of `ƒ` (Dynamic).

Also verify `generateStaticParams` for `/tutors/[category]` pre-renders all 19 subject categories at build time.

---

## Patterns to Follow (from S01)

- `supabaseAdmin` import: `import { supabaseAdmin } from '@/lib/supabase/service'`
- Direct query: `supabaseAdmin.from('teachers').select(...)` (no intermediate variable needed, or `const { data } = await supabaseAdmin.from(...)`)
- S01 established: ISR public pages must use `supabaseAdmin`, not `createClient`

---

## Scope Boundaries

- **In scope:** `/tutors/page.tsx`, `/tutors/[category]/page.tsx`, `src/actions/profile.ts` (revalidation wiring)
- **Not in scope:** `src/app/sitemap.ts` (already dynamic, intentionally so — sitemap endpoint is `ƒ Dynamic`, acceptable)
- **Not in scope:** Filter UX changes — `DirectoryFilters` is already a client component with `useSearchParams`, already wrapped in `<Suspense>`, no structural changes needed
- **Not in scope:** Adding `generateStaticParams` to `/tutors/page.tsx` — the base directory with search params is NOT fully statically generated; only the base URL gets the 300s TTL ISR entry

---

## Task Decomposition Recommendation

This is a single-task slice — all three file changes are tightly coupled (the ISR activation and its revalidation wiring should be verified together in one build check). One task:

**T01: Apply supabaseAdmin + revalidate to /tutors and /tutors/[category], wire on-demand revalidation in profile.ts**

Steps:
1. Edit `src/app/tutors/page.tsx`: swap `createClient` → `supabaseAdmin`, add `export const revalidate = 300`
2. Edit `src/app/tutors/[category]/page.tsx`: swap `createClient` → `supabaseAdmin`
3. Edit `src/actions/profile.ts`: add `revalidatePath('/tutors')` in `updatePublishStatus` and `updateProfile`; add `revalidatePath('/tutors/[category]', 'page')` in `updatePublishStatus`
4. Verify: `npm run build` shows `● /tutors` and `● /tutors/[category]`
5. Verify: `npx tsc --noEmit` exits 0
