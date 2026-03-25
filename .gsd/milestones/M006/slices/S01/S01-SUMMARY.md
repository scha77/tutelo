---
id: S01
parent: M006
milestone: M006
provides:
  - src/app/(dashboard)/dashboard/promote/page.tsx — Dashboard promote page shell (QR + flyer sections) for S02 to add swipe file section
  - src/components/dashboard/QRCodeCard.tsx — QR code preview + download component
  - src/components/dashboard/FlyerPreview.tsx — Mini-flyer preview + download component
  - src/app/api/flyer/[slug]/route.tsx — Flyer API route returning 1200x1600 portrait PNG
  - Promote nav entry in src/lib/nav.ts — appears in sidebar and MobileBottomNav automatically
  - Established pattern for promote section and binary download interactions
requires:
  []
affects:
  - S02
  - S03
key_files:
  - src/lib/nav.ts
  - src/components/dashboard/QRCodeCard.tsx
  - src/components/dashboard/FlyerPreview.tsx
  - src/app/(dashboard)/dashboard/promote/page.tsx
  - src/app/api/flyer/[slug]/route.tsx
  - tests/unit/social-email.test.ts
key_decisions:
  - QR error correction level H (highest) chosen for future logo overlay compatibility — higher redundancy allows up to 30% of QR data to be covered by a logo
  - Hidden 512px canvas approach for high-res QR download — avoids server-side rendering while giving a clean PNG via toDataURL
  - Flyer API route uses Node.js runtime (not edge) because qrcode.toDataURL() requires canvas context unavailable in edge runtime
  - Flyer API route named route.tsx (not route.ts) because ImageResponse layout requires JSX syntax — TypeScript enforces .tsx extension for JSX files
  - Promote nav entry placed before Settings to keep Settings as the last nav item (UX convention)
patterns_established:
  - Dashboard promote page pattern: RSC page fetches teacher by auth user ID, passes slug/profile data to client components — same getUser → query → redirect pattern as other dashboard pages
  - ImageResponse flyer pattern: Node.js runtime API route with JSX layout, anonymous Supabase client, Google Fonts loading via fetch — mirrors opengraph-image.tsx but at Node runtime for qrcode compatibility
  - High-res client-side download pattern: hidden oversized canvas rendered by QRCodeCanvas, extracted via toDataURL on user gesture — no server round-trip needed
  - FlyerPreview download pattern: fetch API route as blob → createObjectURL → programmatic anchor click → revokeObjectURL — works for any binary API response
observability_surfaces:
  - GET /api/flyer/[slug] returns HTTP 200 (success), 404 (unknown teacher), or 500 (ImageResponse generation error) — visible in browser network tab and Vercel logs
  - Flyer API logs ImageResponse errors to stderr — surfaces as HTTP 500 with error detail in Vercel function logs
drill_down_paths:
  - .gsd/milestones/M006/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S01/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-25T12:48:29.772Z
blocker_discovered: false
---

# S01: QR Code & Mini-Flyer

**Added /dashboard/promote with QR code preview + high-res PNG download and /api/flyer/[slug] ImageResponse flyer API with branded portrait preview and download.**

## What Happened

T01 installed `qrcode.react`, added a "Promote" nav entry (Megaphone icon, placed before Settings) to `src/lib/nav.ts`, created the `/dashboard/promote` RSC page following the established getUser → query teachers → redirect auth pattern, and built the `QRCodeCard` client component. QRCodeCard renders a 192px visible preview QR and a hidden 512px canvas for high-res download; the download handler extracts PNG data via `toDataURL` and triggers a browser download named `tutelo-qr-{slug}.png`. Error correction level is set to H (highest) for future logo overlay compatibility. The promote page fetches `slug, full_name, subjects, hourly_rate` anticipating T02's flyer needs.

T02 created the `/api/flyer/[slug]` API route as `route.tsx` (not `.ts` — required because the file contains JSX for ImageResponse). The route uses Node.js runtime (not edge) because `qrcode.toDataURL()` needs canvas context unavailable at the edge. It fetches teacher data via an anonymous Supabase client, generates a QR code data URI with the `qrcode` package, loads Inter bold and regular fonts from Google Fonts (matching the existing OG image pattern), and returns a 1200×1600 portrait PNG. The flyer design uses brand sage gradient background, "Tutelo" branding, teacher name at 56px bold, subject pill tags (up to 5), hourly rate, a QR code with white background and rounded corners, "Scan to book a session" CTA, and the profile URL at bottom. Returns 404 for unknown slugs.

The `FlyerPreview` client component shows a loading skeleton while the flyer image loads, renders the preview in a 3:4 aspect ratio container, and provides a download button that fetches the image and triggers a PNG download via Blob URL.

The closer agent fixed a pre-existing TypeScript error in `tests/unit/social-email.test.ts` where `mockInsert.mock.calls[0][0]` was typed as accessing index 0 of an empty tuple — fixed by casting through `unknown[]` before accessing the element.

## Verification

TypeScript: `npx tsc --noEmit` exits 0 (no errors). Build: `npm run build` exits 0; route manifest includes `/dashboard/promote` and `/api/flyer/[slug]`. Nav: `grep Megaphone src/lib/nav.ts` confirms Promote entry. Components: `test -f src/components/dashboard/QRCodeCard.tsx` and `test -f src/components/dashboard/FlyerPreview.tsx` both pass. Integration: `grep -q FlyerPreview src/app/(dashboard)/dashboard/promote/page.tsx` passes. Runtime verification (browser) and visual QR scannability require UAT.

## Requirements Advanced

- QR-01 — QRCodeCard renders live QR encoding tutelo.app/[slug] with 512px PNG download — requirement fully implemented
- QR-02 — FlyerPreview + /api/flyer/[slug] deliver styled portrait PNG with QR code, teacher name, subjects, hourly rate, and 'Scan to book a session' CTA — requirement fully implemented

## Requirements Validated

- QR-01 — npx tsc --noEmit and npm run build both pass; /dashboard/promote route and QRCodeCard component verified in build manifest; 512px canvas download confirmed in code
- QR-02 — npx tsc --noEmit and npm run build both pass; /api/flyer/[slug] in route manifest; FlyerPreview integrated in promote page; flyer design confirmed in route.tsx source

## New Requirements Surfaced

- Flyer print quality: 1200x1600px at screen DPI may be insufficient for 300 DPI print — consider a higher-res or PDF variant
- Flyer font caching: Google Fonts loaded per-request adds latency and offline risk; same gap exists in opengraph-image.tsx

## Requirements Invalidated or Re-scoped

None.

## Deviations

1. `route.tsx` extension instead of planned `route.ts` — required because the flyer route contains JSX for ImageResponse. 2. FlyerPreview component and promote page integration were created proactively during T01, so T02 only needed to create the API route. 3. Pre-existing TypeScript errors in `tests/unit/social-email.test.ts` were fixed in the closer pass (not planned in either task). 4. `.env.local` and `.env` were symlinked from main project root into worktree to enable builds (worktree infrastructure gap).

## Known Limitations

1. Flyer design is functional but untested for print quality at 300 DPI — 1200×1600px at screen DPI may look pixelated when printed. A higher-res option or PDF output would improve print fidelity. 2. Flyer font loading uses Google Fonts URLs — this fails in offline or network-restricted environments. 3. QR download uses canvas `toDataURL` which can be blocked by browser security policies in some embedded contexts. 4. FlyerPreview download fetches the image from the API on each download click; no caching. 5. Flyer API is unauthenticated — any slug can be queried anonymously, which is intentional (public profile data only) but worth noting.

## Follow-ups

1. Consider a PDF download option for the flyer (higher print fidelity). 2. Font caching in the flyer API route (currently loads from Google Fonts on every request — same issue as existing OG image route). 3. QR code logo overlay is structurally supported (error correction H) but not yet implemented. 4. Mobile bottom nav "Promote" tab was added in T01 (Promote entry in navItems feeds both sidebar and MobileBottomNav).

## Files Created/Modified

- `src/lib/nav.ts` — Added Promote nav entry with Megaphone icon, placed before Settings
- `src/components/dashboard/QRCodeCard.tsx` — New client component — QR code preview (192px) + hidden 512px canvas for high-res PNG download
- `src/components/dashboard/FlyerPreview.tsx` — New client component — flyer image preview with loading skeleton + PNG download via Blob URL
- `src/app/(dashboard)/dashboard/promote/page.tsx` — New RSC promote page — fetches teacher data, renders QRCodeCard and FlyerPreview
- `src/app/api/flyer/[slug]/route.tsx` — New API route — ImageResponse portrait flyer (1200×1600) with QR code, teacher data, brand styling; Node.js runtime
- `tests/unit/social-email.test.ts` — Fixed pre-existing TypeScript error: cast mock.calls[0] through unknown[] before index access
