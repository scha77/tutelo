---
id: T04
parent: S01
milestone: M001
provides:
  - "3-step onboarding wizard (identity, teaching details, availability + publish)"
  - "Zod schemas for all three wizard steps + FullOnboardingSchema"
  - "slugify utility with collision resolution (-2, -3 suffix)"
  - "Server Actions: saveWizardStep, generateSlugAction, publishProfile"
  - "Photo upload to Supabase Storage (profile-images bucket)"
  - "Wizard progress persistence — teacher can resume at correct step after browser close"
  - "Redirect to /dashboard?welcome=true on publish"
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: ~60min
verification_result: passed
completed_at: 2026-03-04
blocker_discovered: false
---
# T04: 01-foundation 04

**# Phase 1 Plan 04: Onboarding Wizard Summary**

## What Happened

# Phase 1 Plan 04: Onboarding Wizard Summary

**3-step React Hook Form wizard (identity + teaching details + availability/slug/publish) with Zod validation, Supabase Storage photo upload, slug collision resolution, and per-step DB persistence via Server Actions**

## Performance

- **Duration:** ~60 min
- **Started:** 2026-03-04T12:28:02Z
- **Completed:** 2026-03-04T13:15:39Z (human verification approved)
- **Tasks:** 2 (+ 3 auto-fix deviations)
- **Files modified:** 12

## Accomplishments

- Complete 3-step onboarding wizard: identity (name, school, location, photo), teaching details (subjects, grade levels, hourly rate), and availability + slug + publish
- Zod per-step validation prevents advancing until fields are valid; progress saved to `teachers` table after each step for resume support
- Slug auto-generated from teacher name on Step 3 mount with `-2`/`-3` collision resolution; editable by teacher before publishing
- Photo upload to Supabase Storage (`profile-images/{userId}/{filename}`), URL stored in `teachers.photo_url`
- On publish: teacher row marked `is_published=true`, `availability` rows written, redirects to `/dashboard?welcome=true`
- Verified end-to-end: wizard completes successfully with redirect to `/dashboard?welcome=true`

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing slugify tests** — `78e8fc8` (test)
2. **Task 1 GREEN: Zod schemas, slugify, Server Actions** — `2ef7b0b` (feat)
3. **Task 2: 3-step wizard + onboarding page** — `91b028c` (feat)
4. **Fix: teachers.user_id unique constraint + Toaster** — `1278d58` (fix)
5. **Fix: Smart signIn routing + auto-slug on insert** — `05df9a0` (fix)
6. **Fix: insert/update instead of upsert** — `ce010ff` (fix)

## Files Created/Modified

- `src/lib/schemas/onboarding.ts` — Step1/Step2/Step3/FullOnboardingSchema and FullOnboardingData type
- `src/lib/utils/slugify.ts` — generateSlug (slugify lib) and findUniqueSlug (collision resolution)
- `src/actions/onboarding.ts` — saveWizardStep, generateSlugAction, publishProfile Server Actions
- `src/app/onboarding/page.tsx` — RSC: auth guard, loads saved teacher row for resume, redirects published teachers
- `src/components/onboarding/OnboardingWizard.tsx` — FormProvider multi-step wizard, per-step validation, step advance logic
- `src/components/onboarding/WizardStep1.tsx` — name, school, city, state (US Select), years experience, photo upload
- `src/components/onboarding/WizardStep2.tsx` — subjects multi-select (badge chips), grade levels, hourly rate with benchmark hint
- `src/components/onboarding/WizardStep3.tsx` — slug field with auto-generation, timezone Select, availability grid, preview button, publish button
- `src/actions/auth.ts` — Updated signIn to route returning users by wizard_step and is_published status
- `src/app/layout.tsx` — Added Sonner Toaster component for Server Action error toasts
- `supabase/migrations/0002_teachers_user_id_unique.sql` — UNIQUE constraint on teachers.user_id
- `tests/utils/slugify.test.ts` — Real assertions for generateSlug (name, accent, apostrophe cases)

## Decisions Made

- **Insert-then-update instead of upsert:** Supabase upsert with partial wizard data hits NOT NULL constraints on columns not yet filled. Step 1 inserts the row; Steps 2 and 3 update it. This matches the "partial save" reality of a multi-step wizard.
- **Auto-slug on signIn:** Slug is inserted when the teacher row is first created (inside `signIn` action after OAuth callback), not on Step 3. This ensures a slug exists for collision resolution even if a user quits the wizard early and returns.
- **teachers.user_id UNIQUE constraint:** Required for the insert-then-update pattern — without it, a second wizard attempt by the same user would create a duplicate row.
- **Zod v4 .issues not .errors:** Zod v4 changed the ZodError API. zodResolver needed a cast for the coerce type mismatch between Zod v4 and RHF's expected Zod v3 API surface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] teachers.user_id missing UNIQUE constraint**
- **Found during:** Task 2 (testing wizard submit flow)
- **Issue:** Without a UNIQUE constraint on `teachers.user_id`, the insert-on-step-1 / update-on-steps-2-3 pattern creates duplicate rows on re-entry. Also caused upsert ambiguity.
- **Fix:** Added migration `0002_teachers_user_id_unique.sql` with `ALTER TABLE teachers ADD CONSTRAINT teachers_user_id_unique UNIQUE (user_id);`
- **Files modified:** `supabase/migrations/0002_teachers_user_id_unique.sql`, `src/app/layout.tsx` (Toaster added in same commit)
- **Committed in:** `1278d58`

**2. [Rule 1 - Bug] signIn action sent all users to /onboarding regardless of wizard progress**
- **Found during:** Post-wizard testing (sign out, sign back in)
- **Issue:** `signIn` always redirected to `/onboarding`. Returning teachers who had already published were dumped back to the wizard.
- **Fix:** Updated `signIn` to query `teachers` table: if `is_published=true` → `/dashboard`, if wizard in progress → `/onboarding`, if no row → `/onboarding` with auto-slug insert.
- **Files modified:** `src/actions/auth.ts`, `src/actions/onboarding.ts`
- **Committed in:** `05df9a0`

**3. [Rule 1 - Bug] Upsert caused NOT NULL constraint violations on partial wizard saves**
- **Found during:** Task 2 (Step 1 save attempt)
- **Issue:** `saveWizardStep` used Supabase upsert. Upserting with only Step 1 fields triggers NOT NULL violations on `subjects`, `grade_levels`, `hourly_rate`, etc. — columns required in the schema but not yet filled.
- **Fix:** Replaced upsert with conditional insert-then-update: check if teacher row exists; if not, INSERT with available fields; if yes, UPDATE only the fields provided.
- **Files modified:** `src/actions/onboarding.ts`
- **Committed in:** `ce010ff`

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug)
**Impact on plan:** All three fixes were required for the wizard to function correctly. No scope creep — fixes address direct consequences of the multi-step partial-save architecture not accounted for in the plan.

## Issues Encountered

- Zod v4 changed `ZodError.errors` to `ZodError.issues` — required a cast in the zodResolver wrapper to reconcile Zod v4's coerce type output with RHF's expected Zod v3 API surface. Build passed after cast applied.
- Supabase upsert with ON CONFLICT requires the conflicting column to be explicitly specified or a unique index to exist — this intersected with the missing unique constraint (fixed in deviation 1 + 3).

## User Setup Required

None - no new external service configuration required. Supabase Storage `profile-images` bucket must be created with public read access (covered in 01-03 schema setup or Supabase dashboard).

## Next Phase Readiness

- Teachers table has all required columns: `slug`, `is_published`, `wizard_step`, `timezone`, `photo_url`, `subjects`, `grade_levels`, `hourly_rate`
- Availability rows written on publish: `{teacher_id, day_of_week, start_time, end_time}`
- Teachers redirect to `/dashboard?welcome=true` after publish — Plan 01-05 (public profile) and the dashboard shell are the logical next steps
- 01-05 can immediately read teachers and availability rows from Supabase to render the public `/[slug]` page

---
*Phase: 01-foundation*
*Completed: 2026-03-04*
