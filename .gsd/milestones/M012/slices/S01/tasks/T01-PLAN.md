---
estimated_steps: 5
estimated_files: 3
skills_used:
  - react-best-practices
---

# T01: Create ViewTracker client component and draft mode API endpoint

**Slice:** S01 — Profile Page ISR + On-Demand Revalidation
**Milestone:** M012

## Description

Create the two prerequisite files that replace the dynamic APIs (`headers()` and `searchParams`) currently blocking ISR on the profile page. The ViewTracker client component replaces inline server-side page-view tracking with a client-side fire-and-forget POST to the existing `/api/track-view` endpoint. The draft mode API endpoint replaces the `?preview=true` query param with Next.js `draftMode()`, allowing unpublished teachers to preview their profile without polluting ISR cache.

Also update WizardStep3 (the onboarding wizard's preview button) to use the new draft mode endpoint instead of the old `?preview=true` URL pattern.

**Important context for executor:**
- The existing `/api/track-view/route.ts` already handles bot filtering server-side via User-Agent — the ViewTracker just needs to POST `{ teacherId }` to it.
- Next.js 16.1.6 `draftMode()` is imported from `next/headers`. Call `(await draftMode()).enable()` to set the draft cookie, then `redirect()` to the target page.
- `DRAFT_MODE_SECRET` is the server-side env var. `NEXT_PUBLIC_DRAFT_MODE_SECRET` is the client-visible one used by WizardStep3 to construct the preview URL.
- WizardStep3 is at `src/components/onboarding/WizardStep3.tsx`, line 173: `window.open(\`/\${slug}?preview=true\`, '_blank')` — change to `window.open(\`/api/draft/\${slug}?token=\${process.env.NEXT_PUBLIC_DRAFT_MODE_SECRET}\`, '_blank')`.

## Steps

1. Create `src/app/[slug]/ViewTracker.tsx` as a `'use client'` component:
   - Accept `{ teacherId: string }` prop
   - In `useEffect`, fire a POST to `/api/track-view` with `{ teacherId }` body
   - Use `.catch(() => {})` — fire-and-forget, never block render
   - Return `null` (invisible component)

2. Create `src/app/api/draft/[slug]/route.ts`:
   - Import `draftMode` from `next/headers` and `redirect` from `next/navigation`
   - Export GET handler that:
     - Extracts `slug` from `params` (Next.js 16 format: `params: Promise<{ slug: string }>`)
     - Reads `token` from URL searchParams
     - If `token !== process.env.DRAFT_MODE_SECRET`, return 401 response
     - Call `(await draftMode()).enable()`
     - Call `redirect(\`/\${slug}\`)`

3. Update `src/components/onboarding/WizardStep3.tsx` line 173:
   - Change `window.open(\`/\${slug}?preview=true\`, '_blank')` to `window.open(\`/api/draft/\${slug}?token=\${process.env.NEXT_PUBLIC_DRAFT_MODE_SECRET}\`, '_blank')`

4. Run `npx tsc --noEmit` to verify no type errors.

5. Verify all three files exist and are correct:
   - ViewTracker exports a named function component
   - Draft route exports a GET handler
   - WizardStep3 references `/api/draft/`

## Must-Haves

- [x] `src/app/[slug]/ViewTracker.tsx` is a `'use client'` component that POSTs to `/api/track-view`
- [x] `src/app/api/draft/[slug]/route.ts` validates token, enables draftMode, and redirects
- [x] WizardStep3 preview URL uses `/api/draft/` endpoint
- [x] TypeScript compiles without errors

## Verification

- `test -f src/app/[slug]/ViewTracker.tsx` — file exists
- `test -f src/app/api/draft/[slug]/route.ts` — file exists
- `grep -q "'use client'" src/app/[slug]/ViewTracker.tsx` — is a client component
- `grep -q 'api/draft' src/components/onboarding/WizardStep3.tsx` — WizardStep3 updated
- `grep -q 'DRAFT_MODE_SECRET' src/app/api/draft/[slug]/route.ts` — token validation present
- `npx tsc --noEmit` — no type errors

## Inputs

- `src/app/api/track-view/route.ts` — existing endpoint that ViewTracker calls (POST with `{ teacherId }`)
- `src/components/onboarding/WizardStep3.tsx` — line 173 needs URL change from `?preview=true` to draft API
- `src/app/[slug]/page.tsx` — reference for understanding how `headers()` and `searchParams` are currently used (T02 modifies this file)

## Expected Output

- `src/app/[slug]/ViewTracker.tsx` — new client component for fire-and-forget page view tracking
- `src/app/api/draft/[slug]/route.ts` — new API route for enabling Next.js draftMode with token validation
- `src/components/onboarding/WizardStep3.tsx` — modified to use draft mode endpoint for preview
