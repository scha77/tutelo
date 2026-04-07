# S01: Profile Page ISR + On-Demand Revalidation

**Goal:** Add ISR to the public teacher profile page so it is served from Vercel's CDN cache, and verify that on-demand revalidation via revalidatePath activates when teachers save profile changes.
**Demo:** After this: After this: visiting any /[slug] URL returns a response with x-vercel-cache: HIT header; npm run build shows the route as ISR; saving a profile change in the dashboard causes the public page to reflect the update within seconds.

## Tasks
- [x] **T01: Create ViewTracker client component and draft mode API endpoint** — Create the two prerequisite files that replace dynamic APIs blocking ISR. ViewTracker replaces inline server-side page-view tracking. Draft mode API replaces ?preview=true query param. Update WizardStep3 preview URL.
  - Estimate: 30m
  - Files: src/app/[slug]/ViewTracker.tsx, src/app/api/draft/[slug]/route.ts, src/components/onboarding/WizardStep3.tsx
  - Verify: test -f src/app/[slug]/ViewTracker.tsx && test -f src/app/api/draft/[slug]/route.ts && grep -q api/draft src/components/onboarding/WizardStep3.tsx && npx tsc --noEmit
- [x] **T02: Convert profile page to ISR — remove dynamic APIs, add generateStaticParams** — Core ISR conversion delivering PERF-01. Remove headers() and searchParams, add generateStaticParams + revalidate, wire ViewTracker and draftMode.
  - Estimate: 45m
  - Files: src/app/[slug]/page.tsx
  - Verify: npm run build 2>&1 | grep [slug] shows ISR route type && npx tsc --noEmit
- [x] **T03: Tighten revalidation to slug-specific paths in server actions** — Refine broad revalidatePath calls to slug-specific for PERF-07 precision. Modify profile.ts, bookings.ts, availability.ts with slug lookup and fallback.
  - Estimate: 25m
  - Files: src/actions/profile.ts, src/actions/bookings.ts, src/actions/availability.ts
  - Verify: npm run build && npx tsc --noEmit && grep -c teacherRow src/actions/profile.ts src/actions/bookings.ts src/actions/availability.ts
