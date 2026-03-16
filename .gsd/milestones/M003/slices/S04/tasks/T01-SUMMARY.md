---
id: T01
parent: S04
milestone: M003
provides:
  - generateMetadata() export on /[slug] pages returning personalized OG title, description, type:profile, and twitter card
  - opengraph-image.tsx file-based route generating styled 1200×630 PNG cards per teacher
  - Unit tests for OG metadata (4 tests covering valid/invalid slugs, empty/null subjects)
key_files:
  - src/app/[slug]/page.tsx
  - src/app/[slug]/opengraph-image.tsx
  - tests/unit/og-metadata.test.ts
key_decisions:
  - Use @supabase/supabase-js createClient() directly in opengraph-image.tsx (not server.ts which uses cookies() unavailable on edge runtime)
  - Build info elements array imperatively to avoid conditional JSX children that confuse Satori's layout engine
  - Fetch Inter font from Google Fonts for consistent typography in OG images
patterns_established:
  - Edge-safe Supabase client pattern for file-based metadata routes (createClient from @supabase/supabase-js with public env vars)
  - Satori-compatible JSX layout: every div with multiple children must have display flex; avoid conditional JSX children
observability_surfaces:
  - GET /[slug]/opengraph-image returns HTTP 200 with content-type: image/png for valid and invalid slugs (generic fallback for invalid)
  - OG meta tags in page HTML: og:title, og:description, og:type, og:image inspectable via curl or view-source
duration: 30m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Add dynamic OG metadata and image route to teacher /[slug] pages

**Added generateMetadata() export and opengraph-image.tsx route to teacher profile pages, producing personalized OG previews with teacher name, school, location, and subject pills.**

## What Happened

Added two things to `src/app/[slug]/`:

1. **`generateMetadata()` in page.tsx** — Queries Supabase for teacher by slug (select: full_name, subjects, school, city, state, photo_url). Returns personalized title ("Name — Tutoring on Tutelo"), description with subjects/location/school, openGraph type 'profile', and twitter card 'summary_large_image'. Falls back to generic Tutelo metadata for invalid slugs. Does NOT set openGraph.images — the file-based route handles that automatically.

2. **`opengraph-image.tsx`** — Edge runtime file-based OG image route using `ImageResponse` from `next/og`. Creates an anonymous Supabase client (no cookies needed — public read). Renders a styled 1200×630 card with:
   - Brand gradient background (#3b4d3e → #2a3a2d)
   - Circular photo or initials fallback (green gradient circle with first+last initials)
   - Teacher name, school, location
   - Subject pills (up to 5)
   - "tutelo.app" branding in bottom right
   - Inter font loaded from Google Fonts
   - Generic Tutelo branded card for invalid slugs

Created `tests/unit/og-metadata.test.ts` with 4 tests covering valid slug, invalid slug, empty subjects, and null subjects.

## Verification

- ✅ `npm run build` — succeeds, route `ƒ /[slug]/opengraph-image` registered
- ✅ `npx vitest run tests/unit/og-metadata.test.ts` — 4/4 tests pass
- ✅ `curl` dev server for valid slug: `og:title` = "Soo Sup Cha — Tutoring on Tutelo", `og:type` = "profile", description includes subjects and location
- ✅ `curl` dev server for invalid slug: fallback `og:title` = "Tutelo"
- ✅ `curl -I /soo-sup-cha-2/opengraph-image` — HTTP 200, content-type: image/png, valid 1200×630 PNG
- ✅ `/nonexistent-slug/opengraph-image` — HTTP 200, content-type: image/png (generic fallback card)
- ✅ Visual verification in browser: card renders correctly with initials, name, school, location, subjects, branding

### Slice-level verification status (T01 of 3 tasks):
- ✅ `npm run build` — passes
- ✅ `npx vitest run tests/unit/og-metadata.test.ts` — 4 tests pass
- ⬜ `npx vitest run tests/unit/social-email.test.ts` — not yet created (T02)
- ✅ `curl -s http://localhost:3000/soo-sup-cha-2 | grep 'og:title'` — personalized OG tags present
- ✅ OG image route returns PNG at `/soo-sup-cha-2/opengraph-image`
- ⬜ Production deploy (T03)

## Diagnostics

- Inspect OG tags: `curl -s https://tutelo.app/[slug] | grep 'property="og:'`
- Inspect OG image: `curl -I https://tutelo.app/[slug]/opengraph-image` — expect 200 + content-type: image/png
- Visual check: visit `/[slug]/opengraph-image` in browser
- Failure: Satori layout errors surface as HTTP 500 on the OG image route; Supabase query failures return generic fallback (no 500)

## Deviations

- Had to refactor conditional JSX children in opengraph-image.tsx to an imperative array approach — Satori's layout engine requires every `<div>` with multiple children to have explicit `display: flex`, and conditional rendering (`{condition && <div>}`) creates falsy children that violate this constraint. First attempt returned 500.

## Known Issues

- All test teachers have empty string `photo_url` (not null), so the photo rendering path hasn't been tested with a real image in the OG route. The code handles it correctly (empty string is falsy → initials fallback), and real Supabase storage URLs will work since they're directly fetchable from edge runtime.

## Files Created/Modified

- `src/app/[slug]/page.tsx` — Added `generateMetadata()` export with personalized OG tags
- `src/app/[slug]/opengraph-image.tsx` — New file-based OG image route (edge runtime, 1200×630 PNG)
- `tests/unit/og-metadata.test.ts` — 4 unit tests for generateMetadata (valid/invalid slugs, empty/null subjects)
