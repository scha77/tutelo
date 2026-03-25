# S01: QR Code & Mini-Flyer

**Goal:** Teacher opens /dashboard/promote, sees their QR code preview, downloads high-res PNG, and downloads a styled mini-flyer with their name, subjects, rate, and QR code.
**Demo:** Teacher opens /dashboard/promote, sees their QR code preview, downloads high-res PNG, and downloads a styled mini-flyer with their name, subjects, rate, and QR code.

## Must-Haves

- QR code renders on /dashboard/promote encoding tutelo.app/[slug]
- Download button produces a valid high-res (512px) PNG that scans to the correct URL
- Mini-flyer preview loads from /api/flyer/[slug] showing teacher name, subjects, rate, QR, and CTA
- Flyer download link triggers PNG download
- "Promote" appears in dashboard sidebar and mobile bottom nav
- `npx tsc --noEmit` passes
- `npm run build` passes with no regressions

## Proof Level

- This slice proves: - This slice proves: operational
- Real runtime required: yes (browser verification of QR render + download, flyer API route response)
- Human/UAT required: yes (visual check of flyer design quality, QR scannability)

## Integration Closure

- Upstream surfaces consumed: `src/lib/nav.ts` (navItems array), `src/app/(dashboard)/dashboard/layout.tsx` (auth + layout pattern), `src/app/[slug]/opengraph-image.tsx` (ImageResponse pattern reference)
- New wiring introduced: Promote nav entry, /dashboard/promote page, /api/flyer/[slug] API route
- What remains before the milestone is truly usable end-to-end: S02 (swipe file templates), S03 (OG image verification)

## Verification

- Runtime signals: Flyer API route returns HTTP status (200 success, 404 teacher not found, 500 generation error)
- Inspection surfaces: GET /api/flyer/[slug] in browser shows the flyer PNG directly
- Failure visibility: ImageResponse errors surface as HTTP 500 with error in response body
- Redaction constraints: none (all teacher data used is public profile info)

## Tasks

- [x] **T01: Build promote page with QR code preview and download** `est:1h`
  Install qrcode.react, add Promote nav entry, create the /dashboard/promote RSC page, and build the QRCodeCard client component with canvas-based high-res PNG download. Delivers QR-01 end-to-end.
  - Files: `package.json`, `src/lib/nav.ts`, `src/app/(dashboard)/dashboard/promote/page.tsx`, `src/components/dashboard/QRCodeCard.tsx`
  - Verify: npx tsc --noEmit && npm run build

- [x] **T02: Build flyer API route and FlyerPreview component** `est:1.5h`
  Install qrcode (Node package), create the /api/flyer/[slug] ImageResponse API route mirroring the opengraph-image.tsx pattern, and build the FlyerPreview client component with preview image and download link. Delivers QR-02 end-to-end.
  - Files: `package.json`, `src/app/api/flyer/[slug]/route.ts`, `src/components/dashboard/FlyerPreview.tsx`, `src/app/(dashboard)/dashboard/promote/page.tsx`
  - Verify: npx tsc --noEmit && npm run build

## Files Likely Touched

- package.json
- src/lib/nav.ts
- src/app/(dashboard)/dashboard/promote/page.tsx
- src/components/dashboard/QRCodeCard.tsx
- src/app/api/flyer/[slug]/route.ts
- src/components/dashboard/FlyerPreview.tsx
