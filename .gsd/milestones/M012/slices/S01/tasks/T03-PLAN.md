---
estimated_steps: 4
estimated_files: 3
skills_used: []
---

# T03: Tighten revalidation to slug-specific paths in server actions

**Slice:** S01 — Profile Page ISR + On-Demand Revalidation
**Milestone:** M012

## Description

Refine the broad `revalidatePath('/[slug]', 'page')` calls in the three action files to use slug-specific paths. Currently these calls revalidate ALL teacher profile ISR caches — with slug-specific paths, only the affected teacher's cache is invalidated. This delivers PERF-07 with precision while keeping the broad pattern as a fallback.

The three action files to modify:
- `src/actions/profile.ts` — `updateProfile` and `updatePublishStatus` (lines 63, 85)
- `src/actions/bookings.ts` — `submitBookingRequest` (line 65)
- `src/actions/availability.ts` — three functions (lines 84, 156, 190)

**Pattern for each:** After the DB mutation succeeds, look up the teacher's slug, then call `revalidatePath(\`/\${slug}\`)` instead of the broad `revalidatePath('/[slug]', 'page')`. If slug lookup fails, fall back to the broad pattern.

**`profile.ts` context:** The `updateProfile` and `updatePublishStatus` functions have `userId` from `getAuthUserId()`. Query: `supabase.from('teachers').select('slug').eq('user_id', userId).single()`.

**`bookings.ts` context:** `submitBookingRequest` has `parsed.data.teacherId`. Query: `supabaseAdmin.from('teachers').select('slug').eq('id', parsed.data.teacherId).single()`. Note: `supabaseAdmin` is already imported dynamically in this function.

**`availability.ts` context:** The three functions have `userId` from `getClaims()`. Query: `supabase.from('teachers').select('slug').eq('user_id', userId).single()`. The `supabase` client is already created in each function.

## Steps

1. **Modify `src/actions/profile.ts`** — In both `updateProfile` (around line 63) and `updatePublishStatus` (around line 85):
   - After the DB update succeeds (before the return statement), add a slug lookup:
     ```ts
     const { data: teacherRow } = await supabase
       .from('teachers')
       .select('slug')
       .eq('user_id', userId)
       .single()
     if (teacherRow?.slug) {
       revalidatePath(`/${teacherRow.slug}`)
     } else {
       revalidatePath('/[slug]', 'page')
     }
     ```
   - Replace the existing `revalidatePath('/[slug]', 'page')` line with this block.

2. **Modify `src/actions/bookings.ts`** — In `submitBookingRequest` (around line 65):
   - After the booking insert succeeds, add slug lookup using the existing `supabaseAdmin`:
     ```ts
     const { data: teacherRow } = await supabaseAdmin
       .from('teachers')
       .select('slug')
       .eq('id', parsed.data.teacherId)
       .single()
     if (teacherRow?.slug) {
       revalidatePath(`/${teacherRow.slug}`)
     } else {
       revalidatePath('/[slug]', 'page')
     }
     ```
   - Note: `supabaseAdmin` is imported via `const { supabaseAdmin } = await import(...)` at the top of the function. Make sure the slug lookup uses the same import.

3. **Modify `src/actions/availability.ts`** — In the three functions that call `revalidatePath('/[slug]', 'page')` (lines 84, 156, 190):
   - Each function already has `supabase` client and `userId`. Add slug lookup:
     ```ts
     const { data: teacherRow } = await supabase
       .from('teachers')
       .select('slug')
       .eq('user_id', userId)
       .single()
     if (teacherRow?.slug) {
       revalidatePath(`/${teacherRow.slug}`)
     } else {
       revalidatePath('/[slug]', 'page')
     }
     ```
   - Replace each existing `revalidatePath('/[slug]', 'page')` line with this block.

4. **Run build and type check** to verify everything compiles:
   - `npx tsc --noEmit`
   - `npm run build`

## Must-Haves

- [ ] `profile.ts` uses slug-specific revalidation with fallback in both functions
- [ ] `bookings.ts` uses slug-specific revalidation with fallback in `submitBookingRequest`
- [ ] `availability.ts` uses slug-specific revalidation with fallback in all three functions
- [ ] All revalidation calls have a broad `revalidatePath('/[slug]', 'page')` fallback if slug lookup fails
- [ ] Build passes and TypeScript compiles

## Verification

- `npm run build` — succeeds without errors
- `npx tsc --noEmit` — no type errors
- `grep -c 'teacherRow?.slug' src/actions/profile.ts` — returns 2 (both functions)
- `grep -c 'teacherRow?.slug' src/actions/bookings.ts` — returns at least 1
- `grep -c 'teacherRow?.slug' src/actions/availability.ts` — returns at least 3

## Inputs

- `src/actions/profile.ts` — lines 63, 85 need slug-specific revalidation
- `src/actions/bookings.ts` — line 65 needs slug-specific revalidation
- `src/actions/availability.ts` — lines 84, 156, 190 need slug-specific revalidation
- `src/app/[slug]/page.tsx` — must already be ISR-configured (T02 output) for revalidation to be meaningful

## Expected Output

- `src/actions/profile.ts` — modified with slug-specific revalidatePath in updateProfile and updatePublishStatus
- `src/actions/bookings.ts` — modified with slug-specific revalidatePath in submitBookingRequest
- `src/actions/availability.ts` — modified with slug-specific revalidatePath in three availability functions
