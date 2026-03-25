---
id: M006
title: "Growth Tools"
status: complete
completed_at: 2026-03-25T19:35:41.109Z
key_decisions:
  - QR error correction level H chosen for future logo overlay — H allows up to 30% data coverage, enabling a logo overlay without breaking scannability
  - Hidden 512px canvas for high-res QR download — avoids server round-trip, uses client-side toDataURL on user gesture
  - Flyer API route uses Node.js runtime (not edge) — qrcode.toDataURL() requires canvas context unavailable in edge runtime
  - Flyer API route named route.tsx not route.ts — TypeScript enforces .tsx extension when the file contains JSX (ImageResponse layout)
  - og:url hardcoded to https://tutelo.app/${slug} not NEXT_PUBLIC_APP_URL — Facebook uses og:url as canonical deduplication key; must be deterministic across preview and production deployments (D004)
  - SwipeFileSection extracted as separate 'use client' component — promote/page.tsx must remain a pure server component for async Supabase auth; stagger animations require motion client imports which are forbidden in server components
  - Cross-cutting null-leak parametric test suite — 4 templates × 5 fixtures = 20 tests asserting no output contains raw 'null'/'undefined' strings; catches entire classes of interpolation bugs in one sweep
key_files:
  - src/components/dashboard/QRCodeCard.tsx
  - src/components/dashboard/FlyerPreview.tsx
  - src/app/api/flyer/[slug]/route.tsx
  - src/app/(dashboard)/dashboard/promote/page.tsx
  - src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx
  - src/components/dashboard/SwipeFileCard.tsx
  - src/lib/templates.ts
  - src/lib/nav.ts
  - src/app/[slug]/page.tsx
  - tests/unit/templates.test.ts
  - tests/unit/og-metadata.test.ts
lessons_learned:
  - ImageResponse routes with JSX must use .tsx extension — TypeScript will not compile JSX in .ts files. When generating API routes that use ImageResponse layouts, always use route.tsx.
  - Edge runtime incompatibility with canvas-dependent packages — qrcode.toDataURL() requires a canvas context not available in Vercel's edge runtime. Always check runtime constraints before choosing Node vs edge for API routes that use image generation packages.
  - Server/client component boundary for stagger animations — RSC pages with async data fetching (await supabase.auth.getUser()) cannot import motion client components directly. The pattern is: keep page.tsx as async server component, extract animated lists into a sibling 'use client' component that receives serializable props.
  - Pre-writing tests before reading source revealed the source was already implemented — T01 of S02 discovered templates.ts was already built, allowing the task to pivot entirely to test coverage. Scout-first planning prevents redundant implementation.
  - Worktree env file gap — .env.local must be symlinked (or copied) into the worktree for builds to succeed. The main project root .env files are not automatically inherited by git worktrees.
---

# M006: Growth Tools

**Delivered zero-friction teacher promotion toolkit: QR code + printable flyer download, 4 copy-paste announcement templates, and a complete OG metadata contract for professional social link previews — all with 272 passing tests and a clean production build.**

## What Happened

M006 shipped three tightly-scoped growth tools across three slices, each building on the same /dashboard/promote page shell.

**S01 — QR Code & Mini-Flyer:** Installed `qrcode.react`, added a "Promote" nav entry (Megaphone icon, before Settings) to `src/lib/nav.ts`, and created the `/dashboard/promote` RSC page following the standard getUser → query → redirect auth pattern. `QRCodeCard` renders a 192px visible preview with a hidden 512px canvas for high-res PNG download via `toDataURL`. Error correction level H was chosen for future logo overlay compatibility. The `/api/flyer/[slug]/route.tsx` API route (Node.js runtime, not edge, because `qrcode.toDataURL()` needs canvas context) uses ImageResponse to produce a 1200×1600 portrait PNG: sage gradient background, Tutelo branding, teacher name at 56px bold, subject pill tags, hourly rate, QR code, "Scan to book a session" CTA, and profile URL. `FlyerPreview` downloads via Blob URL pattern to avoid browser navigation. A pre-existing TypeScript error in `tests/unit/social-email.test.ts` (empty-tuple index access) was fixed in the closer pass.

**S02 — Copy-Paste Swipe File:** `src/lib/templates.ts` was already implemented with 4 templates (Email Signature, Newsletter Blurb, Social Media Post, Back-to-School Handout) and a `TeacherTemplateData` type. T01 focused entirely on test coverage: 59 Vitest tests including a cross-cutting null-leak parametric suite (4 templates × 5 fixtures = 20 tests) asserting no output ever contains "null", "undefined", or empty label lines. T02 built `SwipeFileCard.tsx` (navigator.clipboard copy + execCommand textarea fallback, 2s "Copied!" state, `microPress` animation) and `SwipeFileSection.tsx` as a separate `'use client'` component — necessary because the promote page is a server component but stagger animations require motion client imports. The server page's `.select()` was expanded to include `school, bio, headline, grade_levels, city, state` to feed the TeacherTemplateData object.

**S03 — OG Image Platform Verification:** Research confirmed the OG infrastructure from M003 was complete (opengraph-image.tsx edge route, twitter:card, og:title, og:description). The only missing piece was `openGraph.url`, which Facebook uses as the canonical deduplication key. Added `url: 'https://tutelo.app/${slug}'` to `generateMetadata` in `src/app/[slug]/page.tsx` — hardcoded to the production canonical rather than `NEXT_PUBLIC_APP_URL` to ensure deterministic caching across deployments. Extended `tests/unit/og-metadata.test.ts` with url assertions across all three valid-teacher test cases.

**Integration:** All three slices targeted the same `/dashboard/promote` page. S01 established the page shell; S02 added the SwipeFileSection below QR/flyer sections; S03 was orthogonal (different file, `src/app/[slug]/page.tsx`). No cross-slice integration issues arose. The full test suite closes at 272 passing (up from ~209 at M005 start), 10 skipped (Stripe/SMS integration tests gated on env vars), 0 failures. The pre-existing timezone timeout from M003 is resolved — it no longer appears in the run.

**Code scope:** 1,378 lines added across 17 files (excluding .gsd/). Net new: 10 source/component files, 2 test files, 1 nav entry. Build manifest includes `/dashboard/promote` and `/api/flyer/[slug]`.

## Success Criteria Results

## Success Criteria Results

**✅ Teacher can download a QR code PNG that scans to their tutelo.app/[slug] URL**
Confirmed: `QRCodeCard.tsx` renders a 512px hidden canvas and downloads via `toDataURL('image/png')` named `tutelo-qr-{slug}.png`. QR encodes `https://tutelo.app/${slug}`. File exists at `src/components/dashboard/QRCodeCard.tsx`.

**✅ Teacher can download a styled mini-flyer with QR code, name, subjects, rate, and CTA**
Confirmed: `/api/flyer/[slug]/route.tsx` returns a 1200×1600 ImageResponse PNG with teacher name, subject pill tags (up to 5), hourly rate, embedded QR code, and "Scan to book a session" CTA. `FlyerPreview.tsx` provides the download button via Blob URL pattern. Build manifest includes `/api/flyer/[slug]`.

**✅ Teacher can copy at least 4 pre-written announcement templates interpolated with their profile data**
Confirmed: `src/lib/templates.ts` exports 4 templates — Email Signature, Newsletter Blurb, Social Media Post, Back-to-School Handout — each interpolating teacher name, subjects, rate, location, and URL. All 4 render in `SwipeFileSection` on the promote page.

**✅ Copy-to-clipboard works with confirmation micro-interaction on all templates**
Confirmed: `SwipeFileCard.tsx` uses `navigator.clipboard.writeText()` with `document.execCommand('copy')` fallback (via textarea for multi-line content), toggles "Copied!" state, and resets after 2 seconds. `microPress` animation applied to the copy button.

**✅ Teacher's Tutelo link unfurls into a professional preview card in iMessage, WhatsApp, and Facebook**
Confirmed at code level: `generateMetadata` in `src/app/[slug]/page.tsx` now emits a complete OG contract: `og:url`, `og:title`, `og:description`, `og:type=profile`, `og:image` (via opengraph-image.tsx edge route), `twitter:card=summary_large_image`. The `og:url` canonical ensures Facebook deduplication. 4 unit tests verify the metadata shape. Live platform unfurl (iMessage/WhatsApp/Facebook Sharing Debugger) requires post-deploy UAT against tutelo.app — this is intentionally a manual step.

**✅ Build passes with no regressions on existing test suite**
Confirmed: `npx tsc --noEmit` exits 0. `npm run build` exits 0, generating all 26 routes including `/dashboard/promote` and `/api/flyer/[slug]`. Full test suite: 272 pass, 0 fail (10 skipped — Stripe/SMS gated on env vars).

## Definition of Done Results

## Definition of Done

**✅ All slices are [x]**
S01, S02, S03 all marked complete in M006-ROADMAP.md.

**✅ All slice summaries exist**
- `.gsd/milestones/M006/slices/S01/S01-SUMMARY.md` ✓
- `.gsd/milestones/M006/slices/S02/S02-SUMMARY.md` ✓
- `.gsd/milestones/M006/slices/S03/S03-SUMMARY.md` ✓

**✅ Cross-slice integration points work correctly**
S01 established `/dashboard/promote` page shell. S02 extended it with SwipeFileSection (imports confirmed in `promote/page.tsx`: QRCodeCard, FlyerPreview, SwipeFileSection all imported and rendered). S03 was orthogonal. No integration issues.

**✅ Code changes verified**
`git diff --stat main HEAD -- ':!.gsd/'` shows 1,378 insertions across 17 files. All 10 new source files present on disk.

**✅ TypeScript clean**
`npx tsc --noEmit` exits 0.

**✅ Build clean**
`npm run build` exits 0 with 26 routes, including all M006 routes.

**✅ Tests pass**
272/272 tests pass (excluding 10 skipped integration tests). 63 new tests added in M006 (59 template unit tests + 4 OG metadata tests).

## Requirement Outcomes

## Requirement Outcomes

### QR-01 — Teacher can download a high-res QR code PNG of their profile URL from dashboard
- **from_status:** active → **to_status:** validated
- **proof:** `QRCodeCard.tsx` hidden 512px canvas download confirmed; `npx tsc --noEmit` exits 0; `npm run build` passes; `/dashboard/promote` in build route manifest.

### QR-02 — Teacher can download a printable mini-flyer (QR + name + subjects + CTA)
- **from_status:** active → **to_status:** validated
- **proof:** `/api/flyer/[slug]/route.tsx` returns 1200×1600 ImageResponse PNG with all required fields; "Scan to book a session" CTA confirmed in source; `/api/flyer/[slug]` in build route manifest; `npm run build` passes.

### SWIPE-01 — Dashboard shows pre-written announcement templates interpolated with teacher data
- **from_status:** active → **to_status:** validated
- **proof:** 4 templates (Email Signature, Newsletter Blurb, Social Media Post, Back-to-School Handout) in `src/lib/templates.ts`; 59 unit tests pass covering all interpolation edge cases including null fields, empty arrays, and all-fields-present; `npm run build` passes.

### SWIPE-02 — One-click copy-to-clipboard for each template
- **from_status:** active → **to_status:** validated
- **proof:** `SwipeFileCard.tsx` implements `navigator.clipboard` + execCommand fallback with 2s "Copied!" feedback and `microPress` animation; build passes; pattern mirrors existing `CopyLinkButton`.

### OG-01 — OG image renders correctly across major platforms
- **from_status:** active → **to_status:** validated
- **proof:** `openGraph.url` added to `generateMetadata` in `src/app/[slug]/page.tsx`; 4 unit tests pass verifying `og:url`, `og:title`, `og:type=profile`, `twitter:card=summary_large_image`; `npm run build` passes. Live platform unfurl (iMessage/WhatsApp/Facebook) is a post-deploy UAT step.

## Deviations

route.tsx extension instead of planned route.ts in the flyer API route (required for JSX). FlyerPreview component and promote page integration were created proactively in S01/T01 rather than split between T01 and T02. SwipeFileSection extracted as a separate client component rather than inlining into the server page (required for server/client boundary). Expanded .select() fields in S02 were school/bio/headline/grade_levels/city/state rather than social_email/social_website/social_instagram — matched actual TeacherTemplateData needs. Pre-existing TypeScript error in tests/unit/social-email.test.ts (empty tuple index access) was fixed in S01 closer pass as an unplanned fix.

## Follow-ups

1. Flyer print quality: 1200×1600px at screen DPI may be insufficient for 300 DPI print — consider a higher-res variant or PDF download option. 2. Font caching in /api/flyer/[slug]: Google Fonts loaded per-request adds latency and offline risk — same gap exists in opengraph-image.tsx. 3. QR code logo overlay: structurally supported (error correction H) but not implemented. 4. Live platform unfurl UAT: iMessage/WhatsApp/Facebook Sharing Debugger/Slack/Discord verification requires manual testing against deployed tutelo.app URL. 5. AUTH-03 (Google SSO) and AUTH-04 (school email OTP post-Google-login) surfaced as future requirements during S02 — unmapped pending M007+ planning.
