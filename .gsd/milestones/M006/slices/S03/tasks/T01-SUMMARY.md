---
id: T01
parent: S03
milestone: M006
key_files:
  - src/app/[slug]/page.tsx
  - tests/unit/og-metadata.test.ts
key_decisions:
  - Used hardcoded 'https://tutelo.app' base URL in og:url to match the metadataBase in layout.tsx and the pattern used across the codebase (api/flyer, dashboard/requests, etc.) rather than reading from NEXT_PUBLIC_APP_URL at runtime — keeps the OG metadata deterministic for crawlers.
duration: ""
verification_result: passed
completed_at: 2026-03-25T19:22:34.346Z
blocker_discovered: false
---

# T01: Add openGraph.url to generateMetadata and extend OG unit tests with url assertions

**Add openGraph.url to generateMetadata and extend OG unit tests with url assertions**

## What Happened

Added the missing `openGraph.url` field to the `generateMetadata` function in `src/app/[slug]/page.tsx`, setting it to `https://tutelo.app/${slug}` — the canonical profile URL. This ensures Facebook and other crawlers that key on `og:url` get an explicit canonical URL rather than inferring it from the request, which avoids cache confusion on redirects.

Extended `tests/unit/og-metadata.test.ts` with `openGraph.url` assertions across three valid-teacher test cases (ms-johnson, mr-smith, ms-davis), verifying the URL is correctly constructed from the slug. The existing fallback test already asserts `openGraph` is `undefined`, implicitly covering the absence of `url` for invalid slugs.

Both verification commands passed: all 4 unit tests pass and the production build completes successfully with no TypeScript errors.

## Verification

Ran `npx vitest run tests/unit/og-metadata.test.ts` — all 4 tests passed (including 3 new `openGraph.url` assertions). Ran `npm run build` — production build completed successfully with no errors.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run tests/unit/og-metadata.test.ts` | 0 | ✅ pass | 3800ms |
| 2 | `npm run build` | 0 | ✅ pass | 22900ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/app/[slug]/page.tsx`
- `tests/unit/og-metadata.test.ts`
