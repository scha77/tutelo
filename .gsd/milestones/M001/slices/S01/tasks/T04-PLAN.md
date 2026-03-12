# T04: 01-foundation 04

**Slice:** S01 — **Milestone:** M001

## Description

Build the 3-step onboarding wizard: Step 1 (identity), Step 2 (teaching details), Step 3 (availability + slug + publish). Uses React Hook Form with per-step Zod validation, saves progress to DB after each step, generates a unique slug from the teacher's name, and publishes a live page with no Stripe required.

Purpose: This is the core "7 minutes to a live page" flow — the product's headline promise. Completing this means a real teacher can onboard and get a shareable URL.

Output: Fully functional multi-step wizard that creates a teacher record and availability rows in Supabase, ending with a redirect to /dashboard?welcome=true.

## Must-Haves

- [ ] "Teacher can complete Step 1 (name, school, city/state, years experience, photo upload)"
- [ ] "Teacher can complete Step 2 (subjects multi-select, grade range multi-select, hourly rate with benchmark hint)"
- [ ] "Teacher can complete Step 3 (availability weekly grid, slug preview and edit, publish)"
- [ ] "Slug is auto-generated from teacher name and shown editable on Step 3"
- [ ] "Slug collisions are resolved with -2, -3 suffix automatically"
- [ ] "Preview link on Step 3 opens /[slug]?preview=true in new tab before publishing"
- [ ] "Wizard progress is saved to DB after each step so teacher can resume"
- [ ] "On publish, teacher redirects to /dashboard?welcome=true"
- [ ] "Completing onboarding creates teachers record + availability rows in Supabase"

## Files

- `src/app/onboarding/page.tsx`
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/onboarding/WizardStep1.tsx`
- `src/components/onboarding/WizardStep2.tsx`
- `src/components/onboarding/WizardStep3.tsx`
- `src/lib/schemas/onboarding.ts`
- `src/lib/utils/slugify.ts`
- `src/actions/onboarding.ts`
