---
id: T02
parent: S01
milestone: M006
key_files:
  - src/app/api/flyer/[slug]/route.tsx
  - src/components/dashboard/FlyerPreview.tsx
  - src/app/(dashboard)/dashboard/promote/page.tsx
key_decisions:
  - Flyer API route uses .tsx extension (not .ts) because ImageResponse requires JSX syntax
  - Node.js runtime chosen over edge for qrcode package canvas compatibility
duration: ""
verification_result: passed
completed_at: 2026-03-25T12:45:52.433Z
blocker_discovered: false
---

# T02: Build flyer API route (/api/flyer/[slug]) with ImageResponse and integrate FlyerPreview component on promote page

**Build flyer API route (/api/flyer/[slug]) with ImageResponse and integrate FlyerPreview component on promote page**

## What Happened

Created the `/api/flyer/[slug]` API route using `ImageResponse` from `next/og` with Node.js runtime. The route fetches teacher data (full_name, slug, subjects, hourly_rate) via an anonymous Supabase client, generates a QR code data URI using the `qrcode` package's `toDataURL()`, loads Inter bold and regular fonts from Google Fonts (same URLs as the existing OG image), and returns a 1200×1600 portrait PNG flyer.

The flyer layout features a brand sage gradient background, "Tutelo" branding at top, teacher name (56px bold), subject pill tags (up to 5), hourly rate, a QR code with white background and rounded corners, "Scan to book a session" CTA, and the profile URL at bottom. Returns 404 for unknown slugs.

The FlyerPreview component and promote page integration were already in place from T01 (proactively created). The FlyerPreview shows a loading skeleton while the flyer image loads, renders the preview in a 3:4 aspect ratio container, and provides a download button that triggers a PNG download.

The file was named `route.tsx` instead of `route.ts` because it contains JSX for the ImageResponse layout — TypeScript requires the `.tsx` extension for files with JSX syntax.

## Verification

TypeScript compiles with no errors. Next.js build succeeds with /api/flyer/[slug] in the route manifest. API route file exists at route.tsx. FlyerPreview component exists. FlyerPreview is integrated in the promote page.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 6200ms |
| 2 | `npm run build` | 0 | ✅ pass | 18400ms |
| 3 | `test -f src/app/api/flyer/[slug]/route.tsx` | 0 | ✅ pass | 50ms |
| 4 | `test -f src/components/dashboard/FlyerPreview.tsx` | 0 | ✅ pass | 50ms |
| 5 | `grep -q FlyerPreview src/app/(dashboard)/dashboard/promote/page.tsx` | 0 | ✅ pass | 50ms |


## Deviations

File named route.tsx instead of route.ts — required because the file contains JSX for ImageResponse, and TypeScript needs the .tsx extension for JSX syntax. FlyerPreview component and promote page integration were already created during T01, so this task only needed to create the API route.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/flyer/[slug]/route.tsx`
- `src/components/dashboard/FlyerPreview.tsx`
- `src/app/(dashboard)/dashboard/promote/page.tsx`
