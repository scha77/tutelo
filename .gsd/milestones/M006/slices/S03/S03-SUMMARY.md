---
id: S03
parent: M006
milestone: M006
provides:
  - Complete OG metadata contract on teacher /[slug] pages: og:url, og:title, og:description, og:type=profile, og:image (auto-injected from opengraph-image.tsx), twitter:card=summary_large_image
  - 4-test OG metadata test suite as regression guard for any future generateMetadata changes
requires:
  - slice: S01
    provides: Dashboard promote page shell at /dashboard/promote
  - slice: S02
    provides: Copy-paste swipe file section confirming M006 slice structure
affects:
  []
key_files:
  - src/app/[slug]/page.tsx
  - tests/unit/og-metadata.test.ts
key_decisions:
  - Hardcoded 'https://tutelo.app' as og:url base — not NEXT_PUBLIC_APP_URL — to keep OG metadata deterministic for crawlers across preview and production deployments (see D004)
  - No new files, routes, or dependencies needed — the OG infrastructure from M003 was complete; only the url field was missing
patterns_established:
  - generateMetadata for [slug] pages now emits a complete OG contract: title, description, og:type, og:url, og:image (via opengraph-image.tsx), twitter:card — all present
  - OG unit tests in og-metadata.test.ts cover both the valid-teacher shape (including url) and the invalid-slug fallback (openGraph: undefined)
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M006/slices/S03/tasks/T01-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-25T19:30:31.903Z
blocker_discovered: false
---

# S03: OG Image Platform Verification

**Added openGraph.url to generateMetadata to complete the OG metadata contract for Facebook deduplication, with 4 passing unit tests and a clean production build.**

## What Happened

S03 targeted one precise gap in the existing OG metadata infrastructure: the missing `og:url` field. Research established that the opengraph-image.tsx edge route, twitter:card, og:title, og:description, and og:image were all already correct from M003. The only missing piece was `openGraph.url`, which Facebook and other crawlers use as the canonical deduplication/caching key. Without it, pasting the same tutelo.app link in multiple places risks serving stale previews when the URL has been redirected.

T01 added `url: 'https://tutelo.app/${slug}'` to the openGraph object in `generateMetadata` in `src/app/[slug]/page.tsx`, and extended `tests/unit/og-metadata.test.ts` with `openGraph.url` assertions across all three valid-teacher test cases (ms-johnson, mr-smith, ms-davis). The fallback (invalid slug) path was already covered — it returns `openGraph: undefined`, so the absence of `url` is implicitly asserted.

The base URL was hardcoded to `https://tutelo.app` rather than read from `NEXT_PUBLIC_APP_URL` at runtime — this keeps OG metadata deterministic for crawlers regardless of which deployment (preview vs production) serves the request. This matches metadataBase in layout.tsx and the URL patterns used in /api/flyer and other server-side routes.

All 4 OG unit tests pass. The full test suite passes (271/272 — the one failure is a pre-existing timezone timeout in tests/availability/timezone.test.ts, introduced in the original profile build, unrelated to this slice). Build passes with no TypeScript errors.

## Verification

Ran `npx vitest run tests/unit/og-metadata.test.ts` — all 4 tests pass, including 3 new `openGraph.url` assertions verifying the canonical URL is correctly constructed from the slug. Ran `npm run build` — production build completed successfully with no errors. Ran `npx vitest run` (full suite) — 271 pass, 1 pre-existing timeout failure in timezone test unrelated to S03.

## Requirements Advanced

None.

## Requirements Validated

- OG-01 — openGraph.url added to generateMetadata; 4 unit tests pass verifying og:url, og:title, og:type=profile, twitter:card=summary_large_image; npm run build passes. Manual platform UAT remains as post-deploy step.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. The slice plan called for exactly one field addition and extended test assertions — both delivered as specified.

## Known Limitations

Live platform unfurl verification (iMessage, WhatsApp, Facebook Sharing Debugger, Slack, Discord) requires manual testing against the deployed tutelo.app URL. This is intentionally a UAT step — unit tests verify the metadata object shape, but actual platform scraping behavior can only be confirmed post-deploy.

## Follow-ups

None. S03 completes M006 — all three slices (QR/Flyer, Swipe File, OG Verification) are done.

## Files Created/Modified

- `src/app/[slug]/page.tsx` — Added openGraph.url field (https://tutelo.app/${slug}) to the generateMetadata return object
- `tests/unit/og-metadata.test.ts` — Extended with openGraph.url assertions across 3 valid-teacher test cases (ms-johnson, mr-smith, ms-davis)
