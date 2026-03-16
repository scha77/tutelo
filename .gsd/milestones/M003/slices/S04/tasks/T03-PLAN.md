---
estimated_steps: 5
estimated_files: 4
---

# T03: Build verification, test suite, and production deploy

**Slice:** S04 — OG Tags, Email Fix & Deploy
**Milestone:** M003

## Description

Write unit tests for the OG metadata generation and social_email auto-population, verify the full build passes, and deploy the complete M003 milestone to Vercel production. This is the final task — it proves all S04 work is correct and makes it live.

## Steps

1. Create `tests/unit/og-metadata.test.ts`:
   - Test `generateMetadata()` with a valid teacher slug — mock Supabase to return teacher data, assert returned metadata includes teacher name in title, subjects in description, and `openGraph` object
   - Test `generateMetadata()` with an invalid slug — mock Supabase to return null, assert generic Tutelo fallback metadata
   - Test that metadata description includes subjects and location when available
   - Mock pattern: mock `@/lib/supabase/server` createClient to return a chainable query builder that resolves to test data

2. Create `tests/unit/social-email.test.ts`:
   - Test that `saveWizardStep` INSERT branch calls `supabase.auth.getUser()` and includes `social_email` in the insert
   - Test that explicit `social_email` in `data` parameter takes priority over auth email
   - Test that `getUser()` failure falls back gracefully (social_email is null, no error thrown)
   - Mock pattern: mock `@/lib/supabase/server` createClient, mock `supabase.auth.getUser()` return, mock `supabase.auth.getClaims()` return, mock table operations

3. Run the test suite:
   - `npx vitest run tests/unit/og-metadata.test.ts`
   - `npx vitest run tests/unit/social-email.test.ts`
   - All tests must pass

4. Run full build verification:
   - `npm run build` — must succeed with zero errors
   - Verify no TypeScript errors from new files

5. Deploy to Vercel production:
   - Run `vercel deploy --prod` from project root
   - Verify the deploy completes successfully
   - Confirm `https://tutelo.app` loads (basic smoke check)
   - Note: Vercel CLI must be authenticated (`vercel login` or `VERCEL_TOKEN` env var); if auth fails, document what's needed and mark deploy as requiring user action

## Must-Haves

- [ ] `tests/unit/og-metadata.test.ts` exists and passes with valid/invalid slug cases
- [ ] `tests/unit/social-email.test.ts` exists and passes with email auto-population and priority logic
- [ ] `npm run build` succeeds with zero errors
- [ ] Production deploy completes (or deploy requirements documented if auth is needed)

## Verification

- `npx vitest run tests/unit/og-metadata.test.ts` — all tests pass
- `npx vitest run tests/unit/social-email.test.ts` — all tests pass
- `npm run build` — exits 0
- `vercel deploy --prod` — succeeds (or blocked on auth — documented)
- `curl -I https://tutelo.app` — returns 200 (post-deploy)

## Observability Impact

- Signals added/changed: Test files serve as executable documentation of OG metadata and social_email behavior
- How a future agent inspects this: Run `npx vitest run tests/unit/og-metadata.test.ts tests/unit/social-email.test.ts` to verify behavior still holds
- Failure state exposed: Test failures pinpoint which OG metadata field or social_email logic branch is broken

## Inputs

- `src/app/[slug]/page.tsx` — T01 output: generateMetadata() export
- `src/app/[slug]/opengraph-image.tsx` — T01 output: OG image route
- `src/actions/onboarding.ts` — T02 output: social_email auto-population in INSERT branch
- Existing vitest config at `vitest.config.ts` with `@` alias and jsdom environment

## Expected Output

- `tests/unit/og-metadata.test.ts` — new test file with generateMetadata assertions
- `tests/unit/social-email.test.ts` — new test file with social_email auto-population assertions
- Successful `npm run build` output
- Vercel production deployment (or documented auth blocker)
