# S02: Directory Pages ISR — UAT

**Milestone:** M012
**Written:** 2026-04-07T05:41:48.011Z

# S02: Directory Pages ISR — UAT Test Cases

## Preconditions

1. **Local environment setup**
   - Working directory: `/Users/soosupcha/Projects/Tutelo`
   - `npm run build` completes successfully
   - At least 2 published teachers exist in Supabase with different subjects (e.g., one "math", one "reading")
   - At least 1 unpublished teacher exists (to test publish/unpublish revalidation)

2. **Deployment context**
   - Vercel deployment available (preview or production)
   - `npm run build` output confirms route caching status
   - No active deployment locks or pending revalidation jobs

---

## Test Case 1: `/tutors/[category]` Page Is ISR-Cached

### Preconditions
- Published teachers exist for at least 2 categories (math, reading)

### Steps

1. **Verify build output shows ISR**
   ```bash
   npm run build 2>&1 | grep -A 5 'tutors'
   ```
   **Expected:** Output includes:
   ```
   ├ ƒ /tutors
   └ ● /tutors/[category]                            1h      1y
     ├ /tutors/math                                  1h      1y
     ├ /tutors/reading                               1h      1y
   ```
   Category pages marked with `●` (ISR), 1h revalidation window.

2. **Verify category page loads from CDN cache**
   - Open deployed `/tutors/math` page
   - Inspect response headers for `x-vercel-cache: HIT` (CDN cache hit)
   - Page load should be <100ms (edge cache response, not origin dynamic render)

3. **Verify category page contains correct teachers**
   - `/tutors/math` displays only teachers with "math" in subjects array
   - `/tutors/reading` displays only teachers with "reading" in subjects array
   - Teacher cards show: name, photo, subjects, headline, location, hourly rate

4. **Verify category static params**
   ```bash
   grep -A 20 'generateStaticParams' src/app/tutors/\[category\]/page.tsx
   ```
   **Expected:** Maps `SUBJECT_LIST` to category slugs (math, reading, writing, science, etc.)

### Expected Outcome
✅ Category pages are ISR-cached, render instantly from edge, display correct filtered teacher lists.

---

## Test Case 2: `/tutors` Base Page Remains Dynamic

### Preconditions
- Same as TC1

### Steps

1. **Verify build output shows dynamic**
   ```bash
   npm run build 2>&1 | grep '├ ƒ /tutors$'
   ```
   **Expected:** `/tutors` marked with `ƒ` (dynamic), not `●`.

2. **Understand root cause**
   ```bash
   head -40 src/app/tutors/page.tsx | grep -A 10 'searchParams'
   ```
   **Expected:** Page interface includes `searchParams: Promise<{ subject?: string; ... }>`

3. **Verify searchParams is server-side used**
   ```bash
   grep -n 'const params = await searchParams' src/app/tutors/page.tsx
   ```
   **Expected:** searchParams is awaited and used to build the database query — confirming dynamic route constraint.

### Expected Outcome
✅ `/tutors` correctly remains dynamic due to searchParams (Next.js constraint, not data-fetching issue). Code is structured for future architectural pivot if filtering moves to client-side.

---

## Test Case 3: Directory Pages Use `supabaseAdmin` (Not `createClient`)

### Preconditions
- Source code available

### Steps

1. **Verify `supabaseAdmin` import in both pages**
   ```bash
   grep 'import.*supabaseAdmin' src/app/tutors/page.tsx
   grep 'import.*supabaseAdmin' src/app/tutors/\[category\]/page.tsx
   ```
   **Expected:** Both files import `{ supabaseAdmin } from '@/lib/supabase/service'`

2. **Verify no `createClient` usage**
   ```bash
   grep -r 'createClient' src/app/tutors/
   ```
   **Expected:** No output (exit code 1 = no matches found). All `createClient` calls removed.

3. **Verify query builder uses `supabaseAdmin`**
   ```bash
   grep -n 'supabaseAdmin.from' src/app/tutors/page.tsx
   grep -n 'supabaseAdmin.from' src/app/tutors/\[category\]/page.tsx
   ```
   **Expected:** Query builder chains start with `supabaseAdmin.from('teachers')` in both files.

### Expected Outcome
✅ Both directory pages use `supabaseAdmin` for public-data-only queries (safe pattern), eliminating cookies() dynamic API blocker from S01.

---

## Test Case 4: `export const revalidate` TTLs Are Correct

### Preconditions
- Source code available

### Steps

1. **Verify revalidate in `/tutors/page.tsx`**
   ```bash
   grep 'export const revalidate' src/app/tutors/page.tsx
   ```
   **Expected:** `export const revalidate = 300` (5 minutes per D054)

2. **Verify revalidate in `/tutors/[category]/page.tsx`**
   ```bash
   grep 'export const revalidate' src/app/tutors/\[category\]/page.tsx
   ```
   **Expected:** `export const revalidate = 3600` (1 hour, stable data)

### Expected Outcome
✅ TTL values align with data freshness expectations: base page refreshes frequently (5m, if ever becomes ISR), category pages stable (1h, already ISR).

---

## Test Case 5: Profile Mutations Revalidate Directory Pages

### Preconditions
- At least 2 published teachers exist
- Dashboard access available
- Teacher can edit profile and publish/unpublish

### Steps

1. **Verify revalidatePath calls in `updateProfile`**
   ```bash
   grep -A 10 'export async function updateProfile' src/actions/profile.ts | grep 'revalidatePath'
   ```
   **Expected:** Includes both:
   - `revalidatePath('/${teacherRow.slug}', 'page')` (profile page)
   - `revalidatePath('/tutors')` (directory listing — added in S02)

2. **Verify revalidatePath calls in `updatePublishStatus`**
   ```bash
   grep -A 15 'export async function updatePublishStatus' src/actions/profile.ts | grep 'revalidatePath'
   ```
   **Expected:** Includes all three:
   - `revalidatePath('/${teacherRow.slug}', 'page')` (profile page)
   - `revalidatePath('/tutors')` (directory listing)
   - `revalidatePath('/tutors/[category]', 'page')` (category pages)

3. **Test revalidation via publish/unpublish (manual QA)**
   - Teacher updates profile (name, headline, rate)
   - Manual dashboard verification: check `/tutors/[category]` page shows updated card data
   - Teacher unpublishes profile (sets is_published=false)
   - Verify teacher no longer appears in `/tutors/[category]`
   - Teacher re-publishes
   - Verify teacher reappears in `/tutors/[category]`

### Expected Outcome
✅ All three revalidatePath calls are wired correctly. Profile mutations propagate to directory pages within revalidation TTL window (or immediately on-demand in Vercel deployments).

---

## Test Case 6: TypeScript Compilation and Build Success

### Preconditions
- Node.js and npm available
- All source files in place

### Steps

1. **Run TypeScript check**
   ```bash
   npx tsc --noEmit
   ```
   **Expected:** Exit code 0, no errors.

2. **Run full build**
   ```bash
   npm run build
   ```
   **Expected:** Exit code 0, completes in <20s, no errors or warnings related to tutors routes.

3. **Inspect build output for tutors routes**
   ```bash
   npm run build 2>&1 | grep 'tutors'
   ```
   **Expected:**
   ```
   ├ ƒ /tutors
   └ ● /tutors/[category]                            1h      1y
   ```

### Expected Outcome
✅ No type errors, build succeeds, route caching status matches expectations.

---

## Test Case 7: Directory Filters Client Component Works (Suspend Boundary)

### Preconditions
- Deployed page or local build running
- Browser dev tools available

### Steps

1. **Verify DirectoryFilters is wrapped in Suspense**
   ```bash
   grep -B 5 'DirectoryFilters' src/app/tutors/page.tsx | grep 'Suspense'
   ```
   **Expected:** DirectoryFilters is wrapped in `<Suspense>` with a fallback.

2. **Load `/tutors` page in browser (even though dynamic)**
   - Verify page renders without layout shift
   - Verify filter controls (subject, grade, city, price) load and function
   - Apply a filter (e.g., subject=math)
   - Verify page reloads with filtered results

3. **Check network tab**
   - Page request to `/tutors?subject=math` should server-render filtered results
   - No separate API call for filters (filtering happens server-side)

### Expected Outcome
✅ DirectoryFilters client component loads within Suspense boundary, filter UX remains functional despite /tutors being dynamic.

---

## Test Case 8: Category Pages Display Correct Teachers (Filtering Logic)

### Preconditions
- Published teachers exist with varied subjects

### Steps

1. **Check `/tutors/math`**
   - Load page
   - Verify every teacher card's `subjects` array contains "math"
   - Verify no teachers from other-only subjects appear

2. **Check `/tutors/reading`**
   - Load page
   - Verify every teacher card's `subjects` array contains "reading"

3. **Verify teacher removal on unpublish**
   - Identified teacher, note position/order in category page
   - Teacher unpublishes via dashboard
   - Revalidate cache (manual: wait 1h, or POST to revalidate endpoint if available)
   - Verify teacher no longer appears in category

### Expected Outcome
✅ Category pages display only teachers whose `subjects` array includes the category slug. Publish/unpublish changes propagate correctly.

---

## Edge Cases

### EC1: Empty Category Page
If no published teachers exist for a category (e.g., French tutors if none exist):
- `/tutors/french` still renders successfully
- Displays "no teachers found" empty state or similar
- Page is still ISR-cached (doesn't fail or error)

### EC2: Teacher Updates While Page Cached
Teacher updates profile (name, photo) while `/tutors/[category]` is cached:
- Old teacher card data served from cache initially (expected)
- After revalidatePath('/tutors/[category]') fires (or 1h TTL expires), new data appears (expected behavior)
- No broken state or mixed data

### EC3: Filter on Dynamic /tutors Page
User applies multiple filters on `/tutors` (subject + grade + city):
- Page server-renders with all filters applied
- Results are accurate
- Filters stack correctly (AND logic, not OR)

---

## Sign-Off Criteria

All of the following must be true for UAT to pass:

- [ ] `/tutors/[category]` shows `●` ISR in build output
- [ ] `/tutors` shows `ƒ` Dynamic in build output
- [ ] Both pages import `supabaseAdmin`, no `createClient`
- [ ] `export const revalidate = 300` on `/tutors`
- [ ] `export const revalidate = 3600` on `/tutors/[category]`
- [ ] `revalidatePath('/tutors')` in both `updateProfile` and `updatePublishStatus`
- [ ] `revalidatePath('/tutors/[category]', 'page')` in `updatePublishStatus`
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run build` exits 0
- [ ] Category pages load from CDN cache (`x-vercel-cache: HIT`)
- [ ] Category pages display correct filtered teachers
- [ ] Profile mutations trigger revalidation of directory pages
- [ ] DirectoryFilters client component functional on dynamic `/tutors` page

---

## Notes

- **Blocker:** `/tutors` remains dynamic due to `searchParams` Next.js constraint (not a bug, architectural limitation). Full ISR would require moving filtering to client-side or API route (follow-up work).
- **Partial Win:** `/tutors/[category]` ISR delivery is valuable — 4 category pages cached at edge, significant TTFB reduction for high-traffic SEO pages.
- **Forward Path:** If `/tutors` ISR is needed, next slice should move search filtering to client-side API route + client component filtering (significant refactor, document in decision log).
