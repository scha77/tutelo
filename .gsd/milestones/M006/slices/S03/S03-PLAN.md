# S03: OG Image Platform Verification

**Goal:** Teacher's Tutelo profile link produces correct OG meta tags (og:url, og:image, twitter:card, twitter:image) so that pasting the link into iMessage, WhatsApp, Facebook, Slack, and Discord shows a professional preview card with name, photo, subjects, and Tutelo branding.
**Demo:** Teacher's Tutelo link pasted into iMessage, WhatsApp, and Facebook shows a professional preview card with their name, photo, subjects, and Tutelo branding.

## Must-Haves

- `generateMetadata` in `src/app/[slug]/page.tsx` includes `openGraph.url` set to the canonical profile URL
- Existing OG tests continue passing (no regressions)
- New test assertions verify `openGraph.url` is present and correct
- `npm run build` passes with no errors
- `npx vitest run` passes with no regressions

## Proof Level

- This slice proves: - This slice proves: contract (metadata object shape) + operational (build passes)
- Real runtime required: no (unit tests verify metadata shape; live platform verification is manual post-deploy)
- Human/UAT required: yes (live platform unfurl in iMessage/WhatsApp/Facebook requires manual testing against deployed URL)

## Integration Closure

- Upstream surfaces consumed: `src/app/[slug]/opengraph-image.tsx` (image generation, unchanged), `src/app/layout.tsx` (`metadataBase` config, unchanged)
- New wiring introduced: `openGraph.url` field added to `generateMetadata` return object
- What remains before the milestone is truly usable end-to-end: manual platform verification against deployed tutelo.app URL (Facebook Sharing Debugger, WhatsApp paste, iMessage paste)

## Verification

- None — this is a metadata-only change with no runtime signals, async flows, or error paths.

## Tasks

- [x] **T01: Add openGraph.url to generateMetadata and extend OG unit tests** `est:20m`
  Add the missing `openGraph.url` field to the `generateMetadata` function in `src/app/[slug]/page.tsx` and extend `tests/unit/og-metadata.test.ts` with assertions verifying the new field. This closes the only code gap identified by research: Facebook uses `og:url` for deduplication/caching, and omitting it can cause stale previews.

The `opengraph-image.tsx` file is unchanged — Next.js auto-injects `og:image` and `twitter:image` from it. The `twitter` metadata block already has `card: 'summary_large_image'` which is correct. No new files, routes, or dependencies needed.
  - Files: `src/app/[slug]/page.tsx`, `tests/unit/og-metadata.test.ts`
  - Verify: npx vitest run tests/unit/og-metadata.test.ts && npm run build

## Files Likely Touched

- src/app/[slug]/page.tsx
- tests/unit/og-metadata.test.ts
