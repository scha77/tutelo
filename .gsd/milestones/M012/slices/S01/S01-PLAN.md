# S01: Profile Page ISR + On-Demand Revalidation

**Goal:** Add ISR to the public teacher profile page so it is served from Vercel's CDN cache, and verify that on-demand revalidation via revalidatePath activates when teachers save profile changes.
**Demo:** After this: visiting any /[slug] URL returns a response with x-vercel-cache: HIT header; npm run build shows the route as ISR; saving a profile change in the dashboard causes the public page to reflect the update within seconds.

## Must-Haves

- Profile page `/[slug]` exports `generateStaticParams` + `export const revalidate = 3600`
- `headers()` import removed from page — replaced by client-side ViewTracker component
- `searchParams` prop removed from page — replaced by `draftMode()` for preview feature
- `npm run build` shows `/[slug]` as ISR (○ or ◐), not ƒ Dynamic
- Existing `revalidatePath('/[slug]', 'page')` calls in actions activate correctly for on-demand revalidation
- Teacher preview-my-page flow (WizardStep3) works via draftMode endpoint instead of `?preview=true` query param

## Threat Surface

- **Abuse**: Draft mode endpoint at `/api/draft/[slug]` accepts a secret token — without it, returns 401. Token is `NEXT_PUBLIC_DRAFT_MODE_SECRET` which is client-visible but only enables viewing unpublished teacher pages (which already show "Page not available" to non-draft visitors). Low risk at current scale.
- **Data exposure**: None — ISR caches only public teacher profile data already visible to anonymous visitors. No PII leaks through ISR cache.
- **Input trust**: Draft mode token is a simple string comparison — no injection vector. `generateStaticParams` queries use `supabaseAdmin` with server-side service role (build-time only).

## Requirement Impact

- **Requirements touched**: PERF-01, PERF-07, PERF-06
- **Re-verify**: Build output must show `/[slug]` as ISR not dynamic. Preview-my-page flow in onboarding wizard must still work. Vercel Hobby ISR write limits not exceeded.
- **Decisions revisited**: D053 (confirms ISR + on-demand revalidation strategy)

## Proof Level

- This slice proves: integration (ISR cache + CDN delivery + on-demand revalidation pipeline)
- Real runtime required: yes (ISR behavior only verifiable in Vercel deployment; locally verified via build output route type)
- Human/UAT required: no (build output + curl check sufficient)

## Verification

- `npm run build 2>&1 | grep '\[slug\]'` — route must show as ○ (Static) or ◐ (ISR), NOT ƒ (Dynamic)
- `grep -q 'generateStaticParams' src/app/\[slug\]/page.tsx` — function exists
- `grep -q "export const revalidate" src/app/\[slug\]/page.tsx` — revalidate config exists
- `! grep -q "from 'next/headers'" src/app/\[slug\]/page.tsx` — headers import removed (only draftMode imported)
- `! grep -q "searchParams" src/app/\[slug\]/page.tsx` — searchParams prop removed
- `test -f src/app/\[slug\]/ViewTracker.tsx` — ViewTracker client component exists
- `test -f src/app/api/draft/\[slug\]/route.ts` — draft mode API endpoint exists
- `grep -q 'draftMode' src/app/\[slug\]/page.tsx` — draftMode used for preview check

## Observability / Diagnostics

- Runtime signals: Vercel `x-vercel-cache` response header indicates HIT/MISS/STALE for ISR cache status. `revalidatePath` calls in actions log no output but trigger background ISR re-render on next visit.
- Inspection surfaces: `curl -I https://tutelo.app/[slug]` to check cache headers post-deploy. `npm run build` output shows route type at build time.
- Failure visibility: If ISR fails to activate, build output shows ƒ (Dynamic) instead of ○/◐ — indicates a dynamic API is still imported. Page view tracking failures logged as `[track-view]` console errors in the API route.
- Redaction constraints: None — all cached data is public teacher profile info.

## Integration Closure

- Upstream surfaces consumed: `src/lib/supabase/service.ts` (supabaseAdmin for generateStaticParams), `src/app/api/track-view/route.ts` (existing endpoint for ViewTracker), `src/actions/profile.ts` + `src/actions/bookings.ts` + `src/actions/availability.ts` (existing revalidatePath calls)
- New wiring introduced in this slice: ViewTracker client component → track-view API; draftMode API endpoint → Next.js draft mode cookie; generateStaticParams → supabaseAdmin build-time query
- What remains before the milestone is truly usable end-to-end: S02 (directory ISR), S03 (dashboard caching), S04 (bundle audit) — all independent of this slice

## Tasks

- [ ] **T01: Create ViewTracker client component and draft mode API endpoint** `est:30m`
  - Why: These two new files replace the dynamic APIs (`headers()` and `searchParams`) that block ISR. They must exist before the page can be converted.
  - Files: `src/app/[slug]/ViewTracker.tsx`, `src/app/api/draft/[slug]/route.ts`, `src/components/onboarding/WizardStep3.tsx`
  - Do: Create ViewTracker as a `'use client'` component that fires a POST to `/api/track-view` on mount. Create the draft mode API route that validates a secret token, enables draftMode, and redirects to `/${slug}`. Update WizardStep3 line 173 to use `/api/draft/${slug}?token=...` instead of `/${slug}?preview=true`. Add `NEXT_PUBLIC_DRAFT_MODE_SECRET` env var reference.
  - Verify: `test -f src/app/[slug]/ViewTracker.tsx && test -f src/app/api/draft/[slug]/route.ts && grep -q 'api/draft' src/components/onboarding/WizardStep3.tsx`
  - Done when: Both new files exist, WizardStep3 uses the draft endpoint, and `npx tsc --noEmit` passes

- [ ] **T02: Convert profile page to ISR — remove dynamic APIs, add generateStaticParams** `est:45m`
  - Why: This is the core ISR conversion that delivers PERF-01. Removes `headers()` and `searchParams` from the page, adds `generateStaticParams` + `revalidate`, wires ViewTracker and draftMode into the page component.
  - Files: `src/app/[slug]/page.tsx`
  - Do: (1) Remove `import { headers } from 'next/headers'` and the `isBot` import. (2) Add `import { draftMode } from 'next/headers'`. (3) Add `export const revalidate = 3600` near the top. (4) Add `generateStaticParams()` querying published teacher slugs via supabaseAdmin. (5) Remove `searchParams` from the page component signature. (6) Replace the inline bot-tracking block (lines 163-166) with `<ViewTracker teacherId={teacher.id} />` in the JSX. (7) Replace `const isPreview = preview === 'true'` with `const { isEnabled: isDraftMode } = await draftMode()`, and use `isDraftMode` in the unpublished check.
  - Verify: `npm run build 2>&1 | grep '\[slug\]'` shows ISR route type (not ƒ Dynamic)
  - Done when: Build succeeds, `/[slug]` route shown as ISR in build output, no TypeScript errors

- [ ] **T03: Tighten revalidation to slug-specific paths in server actions** `est:25m`
  - Why: Delivers PERF-07 precision. The broad `revalidatePath('/[slug]', 'page')` works but revalidates ALL teacher profiles. Slug-specific paths only invalidate the affected teacher's cache. Also serves as the final verification task.
  - Files: `src/actions/profile.ts`, `src/actions/bookings.ts`, `src/actions/availability.ts`
  - Do: In `profile.ts`: after DB update, query `teachers.slug` by `user_id` and call `revalidatePath('/${slug}')` instead of the broad pattern (keep broad as fallback). In `bookings.ts`: derive slug from `teacherId` in `submitBookingRequest` and use slug-specific revalidation. In `availability.ts`: derive slug from `userId` via teachers table and use slug-specific revalidation. All three keep broad `revalidatePath('/[slug]', 'page')` as a fallback if slug lookup fails.
  - Verify: `npm run build` passes; `grep -c 'revalidatePath' src/actions/profile.ts src/actions/bookings.ts src/actions/availability.ts` shows revalidation calls present; `npx tsc --noEmit` passes
  - Done when: All three action files use slug-specific revalidation with fallback, build passes, TypeScript checks pass

## Files Likely Touched

- `src/app/[slug]/page.tsx`
- `src/app/[slug]/ViewTracker.tsx`
- `src/app/api/draft/[slug]/route.ts`
- `src/components/onboarding/WizardStep3.tsx`
- `src/actions/profile.ts`
- `src/actions/bookings.ts`
- `src/actions/availability.ts`
