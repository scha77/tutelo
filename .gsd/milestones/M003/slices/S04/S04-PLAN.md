# S04: OG Tags, Email Fix & Deploy

**Goal:** Teacher `/[slug]` links produce personalized OG previews (name, photo, subjects), new teacher signups auto-populate `social_email`, and the full M003 milestone is deployed to production.
**Demo:** Share a teacher's `tutelo.app/ms-johnson` link in a social preview tool and see personalized card with name, photo, and subjects. Sign up as a new teacher and confirm `social_email` is set. Visit deployed production site.

## Must-Haves

- Dynamic `generateMetadata()` on `/[slug]` pages returns teacher-specific OG title, description, and image URL (SEO-01)
- `opengraph-image.tsx` generates a styled visual card with teacher name, photo (or fallback initials), subjects, and location (SEO-01)
- `saveWizardStep` INSERT branch auto-populates `social_email` from auth email when not already provided (FIX-01)
- `npm run build` passes with zero errors
- Production deploy to Vercel succeeds

## Proof Level

- This slice proves: integration
- Real runtime required: yes (OG image rendering, Supabase auth email retrieval, Vercel deploy)
- Human/UAT required: yes (visual quality of OG card, social preview tool check, production site verification)

## Verification

- `npm run build` — succeeds with no errors (contract)
- `npx vitest run tests/unit/og-metadata.test.ts` — generateMetadata returns correct OG tags for valid/invalid slugs
- `npx vitest run tests/unit/social-email.test.ts` — saveWizardStep INSERT includes social_email from auth user
- `curl -s http://localhost:3000/test-slug | grep 'og:title'` — dynamic OG meta tags present in HTML response (integration)
- OG image route accessible at `/test-slug/opengraph-image` and returns a PNG (integration)
- Production URL `https://tutelo.app` loads successfully after deploy (operational)

## Observability / Diagnostics

- Runtime signals: OG image route returns HTTP 200 with `content-type: image/png` for valid slugs, falls back to generic Tutelo card for invalid slugs (no 500 errors)
- Inspection surfaces: `curl -I https://tutelo.app/[slug]/opengraph-image` to check OG image generation; `SELECT social_email FROM teachers WHERE user_id = '...'` to verify email auto-population
- Failure visibility: OG image generation errors surface as broken image in social previews; missing social_email visible as NULL in teachers table
- Redaction constraints: No secrets exposed — OG routes are public, social_email is teacher-facing data

## Integration Closure

- Upstream surfaces consumed: `src/app/[slug]/page.tsx` (teacher query pattern, async params shape), `src/actions/onboarding.ts` (saveWizardStep INSERT branch), `src/lib/supabase/server.ts` (authenticated server client), `src/lib/supabase/client.ts` (browser client pattern for edge-safe queries), `src/app/layout.tsx` (metadataBase already set)
- New wiring introduced in this slice: `generateMetadata()` export in `/[slug]/page.tsx`, new `opengraph-image.tsx` route, `social_email` auto-population in onboarding INSERT
- What remains before the milestone is truly usable end-to-end: nothing — this is the final slice; after deploy, M003 is complete

## Tasks

- [x] **T01: Add dynamic OG metadata and image route to teacher /[slug] pages** `est:1h`
  - Why: SEO-01 — teacher links shared on social media/email need personalized previews showing name, photo, subjects
  - Files: `src/app/[slug]/page.tsx`, `src/app/[slug]/opengraph-image.tsx`
  - Do: Add `generateMetadata()` export to page.tsx using async params pattern. Create `opengraph-image.tsx` using `ImageResponse` from `next/og` with edge-safe Supabase client (not server.ts). Render styled card with teacher name, photo (or initials fallback), subjects, and location. Handle not-found slug gracefully.
  - Verify: `npm run build` passes; `curl` the dev server for OG meta tags in HTML; hit `/[slug]/opengraph-image` and confirm PNG response
  - Done when: Valid teacher slugs produce personalized OG title/description/image; invalid slugs fall back to generic Tutelo metadata

- [x] **T02: Auto-populate social_email from auth email on teacher signup** `est:30m`
  - Why: FIX-01 — teachers who complete onboarding but never visit Page Settings silently miss all booking notification emails because social_email is NULL
  - Files: `src/actions/onboarding.ts`
  - Do: In `saveWizardStep`'s first-INSERT branch, call `supabase.auth.getUser()` to retrieve the auth email. Include `social_email: email` in the INSERT only if not already provided in `data`. Works for both email/password and Google OAuth.
  - Verify: `npx vitest run tests/unit/social-email.test.ts` passes
  - Done when: New teacher signup creates row with `social_email` set to their auth email; existing `social_email` in data is not overwritten

- [x] **T03: Build verification, test suite, and production deploy** `est:45m`
  - Why: Final integration — verify everything works together, run tests, and deploy M003 to production
  - Files: `tests/unit/og-metadata.test.ts`, `tests/unit/social-email.test.ts`
  - Do: Write unit tests for generateMetadata (valid slug, invalid slug, missing photo fallback) and social_email auto-population. Run full build. Deploy to Vercel production. Verify deployed site.
  - Verify: `npx vitest run tests/unit/og-metadata.test.ts tests/unit/social-email.test.ts` all pass; `npm run build` succeeds; production URL loads
  - Done when: All tests pass, build succeeds, production deployment is live at tutelo.app

## Files Likely Touched

- `src/app/[slug]/page.tsx`
- `src/app/[slug]/opengraph-image.tsx`
- `src/actions/onboarding.ts`
- `tests/unit/og-metadata.test.ts`
- `tests/unit/social-email.test.ts`
