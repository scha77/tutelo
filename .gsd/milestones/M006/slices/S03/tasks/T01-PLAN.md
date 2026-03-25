---
estimated_steps: 6
estimated_files: 2
skills_used: []
---

# T01: Add openGraph.url to generateMetadata and extend OG unit tests

Add the missing `openGraph.url` field to the `generateMetadata` function in `src/app/[slug]/page.tsx` and extend `tests/unit/og-metadata.test.ts` with assertions verifying the new field.

**Context:** Facebook uses `og:url` as the canonical key for its link cache. Without it, the scraper may use the page URL directly (which usually works), but explicit `og:url` is the correct practice and avoids cache confusion on redirects. The research (S03-RESEARCH.md) confirmed this is the only code gap — `opengraph-image.tsx` needs no changes, and `twitter` metadata auto-injection from `opengraph-image.tsx` is working correctly.

**What to change in `src/app/[slug]/page.tsx`:**
In the `generateMetadata` function, the `openGraph` block currently has `title`, `description`, and `type: 'profile'`. Add `url` set to the canonical profile URL using the slug.

**What to change in `tests/unit/og-metadata.test.ts`:**
Add assertions to the existing test cases verifying that `metadata.openGraph.url` is present and correct for valid teacher slugs, and absent for the fallback case.

## Inputs

- `src/app/[slug]/page.tsx`
- `src/app/[slug]/opengraph-image.tsx`
- `src/app/layout.tsx`
- `tests/unit/og-metadata.test.ts`

## Expected Output

- `src/app/[slug]/page.tsx`
- `tests/unit/og-metadata.test.ts`

## Verification

npx vitest run tests/unit/og-metadata.test.ts && npm run build
