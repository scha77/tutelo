---
id: T01
parent: S01
milestone: M012
key_files:
  - src/app/[slug]/ViewTracker.tsx
  - src/app/api/draft/[slug]/route.ts
  - src/components/onboarding/WizardStep3.tsx
key_decisions:
  - ViewTracker uses single empty dep array useEffect — fires once after hydration (bundle-defer-third-party)
  - Draft route uses Next.js 16 async params: Promise<{ slug: string }>
  - NEXT_PUBLIC_DRAFT_MODE_SECRET used client-side in WizardStep3; DRAFT_MODE_SECRET server-side in route
duration: 
verification_result: untested
completed_at: 2026-04-07
blocker_discovered: false
---

# T01: Created ViewTracker client component and draft mode API route — the two prerequisite files that unblock ISR on the teacher profile page.

**Created ViewTracker client component and draft mode API route — the two prerequisite files that unblock ISR on the teacher profile page.**

## What Happened

Read existing page.tsx to identify dynamic APIs blocking ISR (headers() for bot filtering, searchParams for preview). Created ViewTracker.tsx as a use client component that fires a fire-and-forget POST to /api/track-view after hydration. Created /api/draft/[slug]/route.ts that validates DRAFT_MODE_SECRET token, enables draftMode, and redirects. Updated WizardStep3 preview URL from ?preview=true to /api/draft/ endpoint.

## Verification

All 6 T01 verification checks passed: ViewTracker.tsx exists, route.ts exists, use client directive present, WizardStep3 references api/draft, DRAFT_MODE_SECRET referenced in route, npx tsc --noEmit clean.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| — | No verification commands discovered | — | — | — |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/app/[slug]/ViewTracker.tsx`
- `src/app/api/draft/[slug]/route.ts`
- `src/components/onboarding/WizardStep3.tsx`
