---
id: T01
parent: S01
milestone: M012
provides:
  - ViewTracker client component (src/app/[slug]/ViewTracker.tsx)
  - Draft mode API endpoint (src/app/api/draft/[slug]/route.ts)
  - WizardStep3 preview URL updated to draft mode endpoint
key_files:
  - src/app/[slug]/ViewTracker.tsx
  - src/app/api/draft/[slug]/route.ts
  - src/components/onboarding/WizardStep3.tsx
key_decisions:
  - ViewTracker uses useEffect with a single empty dep array so it fires once after hydration (bundle-defer-third-party pattern)
  - Draft route uses Next.js 16 async params pattern: params: Promise<{ slug: string }>
  - teacherId is the only POST body field — bot filtering and UA header reading stay server-side in /api/track-view
patterns_established:
  - Fire-and-forget client fetch with .catch(() => {}) — never awaited, never blocks render
  - Draft mode token validation: compare request.nextUrl.searchParams.get('token') against process.env.DRAFT_MODE_SECRET before calling (await draftMode()).enable()
observability_surfaces:
  - /api/track-view logs [track-view] insert error and [track-view] unexpected error to console on failure
  - Draft route returns 401 JSON on bad token; redirects on success
duration: ~5 min
verification_result: passed
completed_at: 2026-04-07
blocker_discovered: false
---

# T01: Create ViewTracker client component and draft mode API endpoint

**Created ViewTracker client component and draft mode API route — the two prerequisite files that unblock ISR on the teacher profile page.**

## What Happened

Read the existing `src/app/[slug]/page.tsx` to understand the two dynamic APIs blocking ISR:
1. `headers()` — used server-side for bot filtering before inserting a page view
2. `searchParams` — used to read `?preview=true` for draft previewing

Created three artifacts to replace these:

**`src/app/[slug]/ViewTracker.tsx`** — A `'use client'` component that POSTs `{ teacherId }` to the existing `/api/track-view` endpoint inside a `useEffect` with an empty dependency array. This fires once after hydration, is fire-and-forget (`.catch(() => {})`), returns `null`, and never blocks render. Bot filtering remains server-side in `/api/track-view/route.ts` where it has access to request headers.

**`src/app/api/draft/[slug]/route.ts`** — A GET handler that validates a `token` query param against `process.env.DRAFT_MODE_SECRET`, calls `(await draftMode()).enable()` to set the Next.js draft cookie, then redirects to `/${slug}`. Uses Next.js 16 async params signature (`params: Promise<{ slug: string }>`). Returns 401 JSON on invalid/missing token.

**`src/components/onboarding/WizardStep3.tsx`** — Updated `handlePreview()` from `window.open(\`/${slug}?preview=true\`, '_blank')` to `window.open(\`/api/draft/${slug}?token=${process.env.NEXT_PUBLIC_DRAFT_MODE_SECRET}\`, '_blank')`. Uses `NEXT_PUBLIC_DRAFT_MODE_SECRET` (client-visible) to construct the draft URL.

## Verification

Ran all T01 verification commands:

```
test -f src/app/[slug]/ViewTracker.tsx                    ✅
test -f src/app/api/draft/[slug]/route.ts                 ✅
grep -q "'use client'" src/app/[slug]/ViewTracker.tsx     ✅
grep -q 'api/draft' src/components/onboarding/WizardStep3.tsx  ✅
grep -q 'DRAFT_MODE_SECRET' src/app/api/draft/[slug]/route.ts  ✅
npx tsc --noEmit                                          ✅ (zero errors, 14.9s)
```

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `test -f src/app/[slug]/ViewTracker.tsx` | 0 | ✅ pass | <1s |
| 2 | `test -f src/app/api/draft/[slug]/route.ts` | 0 | ✅ pass | <1s |
| 3 | `grep -q "'use client'" src/app/[slug]/ViewTracker.tsx` | 0 | ✅ pass | <1s |
| 4 | `grep -q 'api/draft' src/components/onboarding/WizardStep3.tsx` | 0 | ✅ pass | <1s |
| 5 | `grep -q 'DRAFT_MODE_SECRET' src/app/api/draft/[slug]/route.ts` | 0 | ✅ pass | <1s |
| 6 | `npx tsc --noEmit` | 0 | ✅ pass | 14.9s |

Slice-level checks: ViewTracker.tsx ✅, draft route ✅. Remaining slice checks (generateStaticParams, revalidate config, headers removal, searchParams removal, draftMode in page.tsx) are all T02's responsibility and expected to be ❌ at this stage.

## Diagnostics

- `/api/track-view` logs `[track-view] insert error` / `[track-view] unexpected error` to console on failure
- `/api/draft/[slug]?token=<invalid>` returns `{"error":"Invalid token"}` with HTTP 401
- `/api/draft/[slug]?token=<valid>` sets the `__prerender_bypass` cookie and redirects to `/${slug}`
- Check Next.js draft mode cookie in browser DevTools → Application → Cookies → `__prerender_bypass`

## Deviations

None. Implementation matched the plan exactly.

## Known Issues

None. `NEXT_PUBLIC_DRAFT_MODE_SECRET` env var must be set in `.env.local` and in Vercel for the WizardStep3 preview button to work, but this is a deployment concern, not a code issue.

## Files Created/Modified

- `src/app/[slug]/ViewTracker.tsx` — new `'use client'` component for client-side fire-and-forget page view tracking
- `src/app/api/draft/[slug]/route.ts` — new GET API route enabling Next.js draftMode with token validation
- `src/components/onboarding/WizardStep3.tsx` — updated preview URL from `?preview=true` to `/api/draft/` endpoint
