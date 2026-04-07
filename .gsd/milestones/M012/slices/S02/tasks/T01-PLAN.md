---
estimated_steps: 37
estimated_files: 3
skills_used: []
---

# T01: Apply supabaseAdmin + revalidate to directory pages, wire on-demand revalidation in profile.ts

This single task converts both directory pages from dynamic SSR to ISR and wires on-demand revalidation into profile-mutating server actions.

## Context

Both `/tutors` and `/tutors/[category]` are currently `ƒ (Dynamic)` in the build output. The root cause is identical to D057 from S01: both pages import `createClient` from `@/lib/supabase/server`, which unconditionally calls `cookies()` — a dynamic API that opts the route out of ISR. Since both pages only query public data (`is_published = true`), switching to `supabaseAdmin` is safe.

`/tutors/[category]` already has `export const revalidate = 3600` and `generateStaticParams` (maps `SUBJECT_LIST` to slugs — no DB call). `/tutors` needs `export const revalidate = 300` added (5-minute TTL per D054). The `DirectoryFilters` client component is already wrapped in `<Suspense>` ✓.

Profile-mutating server actions (`updateProfile`, `updatePublishStatus`) currently revalidate `/[slug]` but NOT the directory pages. Since teacher card data (name, photo, subjects, headline, city/state, rate) appears in the directory, these mutations must also revalidate `/tutors`. `updatePublishStatus` additionally needs `/tutors/[category]` revalidation since publishing/unpublishing changes which category pages show the teacher.

## Steps

1. **Edit `src/app/tutors/page.tsx`:**
   - Replace `import { createClient } from '@/lib/supabase/server'` with `import { supabaseAdmin } from '@/lib/supabase/service'`
   - Remove `const supabase = await createClient()` (around line 44)
   - Replace `supabase.from('teachers')` with `supabaseAdmin.from('teachers')` in the query builder
   - Add `export const revalidate = 300` after the metadata export (5-minute TTL per D054)

2. **Edit `src/app/tutors/[category]/page.tsx`:**
   - Replace `import { createClient } from '@/lib/supabase/server'` with `import { supabaseAdmin } from '@/lib/supabase/service'`
   - Remove `const supabase = await createClient()` (around line 83)
   - Replace `supabase.from('teachers')` with `supabaseAdmin.from('teachers')` in the query builder
   - `export const revalidate = 3600` and `generateStaticParams` already exist — no changes needed

3. **Edit `src/actions/profile.ts` — `updateProfile` function:**
   - After the existing `revalidatePath(`/${teacherRow.slug}`)` block (around line 69-73), add: `revalidatePath('/tutors')`
   - This ensures teacher card data changes (name, photo, headline, rate, etc.) propagate to the directory listing

4. **Edit `src/actions/profile.ts` — `updatePublishStatus` function:**
   - After the existing `revalidatePath(`/${teacherRow.slug}`)` block (around line 96-100), add:
     - `revalidatePath('/tutors')`
     - `revalidatePath('/tutors/[category]', 'page')`
   - Publishing/unpublishing affects which teachers appear in directory and category pages

5. **Verify:**
   - Run `npx tsc --noEmit` — must exit 0
   - Run `npm run build` — confirm `/tutors` shows `●` with ISR (not `ƒ Dynamic`) and `/tutors/[category]` shows `●` with ISR
   - Confirm no `createClient` import in either directory page: `grep -r 'createClient' src/app/tutors/`
   - Confirm revalidation wiring: `grep -n 'revalidatePath.*tutors' src/actions/profile.ts`

## Must-Haves

- `supabaseAdmin` used for all data fetching in both directory pages (no `createClient`)
- `export const revalidate = 300` in `/tutors/page.tsx`
- `export const revalidate = 3600` preserved in `/tutors/[category]/page.tsx`
- `revalidatePath('/tutors')` in both `updateProfile` and `updatePublishStatus`
- `revalidatePath('/tutors/[category]', 'page')` in `updatePublishStatus`
- `npx tsc --noEmit` exits 0
- `npm run build` shows both directory routes as `●` ISR (not `ƒ` Dynamic)

## Inputs

- ``src/app/tutors/page.tsx` — current directory page using createClient (must swap to supabaseAdmin)`
- ``src/app/tutors/[category]/page.tsx` — current category page using createClient (must swap to supabaseAdmin)`
- ``src/actions/profile.ts` — server actions that need directory revalidation calls added`
- ``src/lib/supabase/service.ts` — exports supabaseAdmin (the ISR-safe Supabase client)`

## Expected Output

- ``src/app/tutors/page.tsx` — ISR-enabled with supabaseAdmin and revalidate=300`
- ``src/app/tutors/[category]/page.tsx` — ISR-enabled with supabaseAdmin (revalidate=3600 preserved)`
- ``src/actions/profile.ts` — directory revalidation calls added to updateProfile and updatePublishStatus`

## Verification

npx tsc --noEmit && npm run build 2>&1 | grep -E '/tutors' && grep -r 'createClient' src/app/tutors/ | grep -v node_modules; test $? -eq 1 && grep -c 'revalidatePath.*tutors' src/actions/profile.ts
