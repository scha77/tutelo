---
estimated_steps: 32
estimated_files: 4
skills_used: []
---

# T02: Build flyer API route and FlyerPreview component

Install `qrcode` (pure-JS Node package) and `@types/qrcode`, create the `/api/flyer/[slug]` API route using `ImageResponse`, and build the `FlyerPreview` client component. Then integrate `FlyerPreview` into the promote page below the QR section. This delivers requirement QR-02 (teacher downloads printable mini-flyer with QR + name + subjects + rate + CTA).

**Flyer API route (`src/app/api/flyer/[slug]/route.ts`):**
- Use `export const runtime = 'nodejs'` — NOT edge. The `qrcode` package's `toDataURL()` needs a canvas context that is only reliably available in Node runtime. This route is for downloads, not latency-sensitive. (The existing `opengraph-image.tsx` uses edge, but it doesn't need qrcode generation.)
- Anonymous Supabase client: `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)` from `@supabase/supabase-js` — same pattern as opengraph-image.tsx but without edge constraint.
- Export a GET handler that:
  1. Extracts `slug` from route params: `const { slug } = await params`
  2. Fetches teacher: `full_name, slug, subjects, hourly_rate` from teachers table by slug via `.single()`
  3. Returns `new Response('Not found', { status: 404 })` for unknown slugs
  4. Uses `import QRCode from 'qrcode'` then `await QRCode.toDataURL(url, { width: 200, margin: 1 })` to generate a base64 PNG data URI
  5. Loads Inter bold + regular fonts from Google Fonts (copy the exact URLs from `src/app/[slug]/opengraph-image.tsx`)
  6. Returns `new ImageResponse(jsx, { width: 1200, height: 1600, fonts })` — portrait, print-friendly
- Flyer layout (JSX inside ImageResponse):
  - Background: `linear-gradient(135deg, #3b4d3e 0%, #2a3a2d 100%)` — brand sage gradient, same as OG image
  - Top center: "Tutelo" branding (24px, white, semi-transparent)
  - Center block: teacher `full_name` (large, 56px, bold, white), subjects as white pill tags (up to 5), hourly rate as "$XX/hr" (32px)
  - QR code: `<img src={qrDataUri} width={280} height={280} style={{ borderRadius: 16, background: '#fff', padding: 16 }} />`
  - Below QR: "Scan to book a session" CTA (24px, light gray)
  - Bottom: `tutelo.app/${slug}` URL (20px, semi-transparent white)
  - All text: fontFamily 'Inter'
  - Use `display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'` for centering

**FlyerPreview component (`'use client'`, `src/components/dashboard/FlyerPreview.tsx`):**
- Props: `{ slug: string }`
- Shows flyer preview via `<img src={/api/flyer/${slug}} alt="Mini-flyer preview" />` 
- Preview container: max-w-sm with 3:4 aspect ratio, rounded-lg overflow-hidden, border, shadow-sm
- Download button: `<a href={/api/flyer/${slug}} download={tutelo-flyer-${slug}.png}>` styled as primary action button with Download icon from `lucide-react`
- Use `motion` from `motion/react-client` with `fadeSlideUp` from `src/lib/animation.ts`
- Loading state: `useState(false)` for loaded, show skeleton bg-muted animate-pulse while loading, onLoad sets loaded
- Card wrapper: border rounded-lg bg-card p-6 space-y-4

**Promote page update (`src/app/(dashboard)/dashboard/promote/page.tsx`):**
- Import `FlyerPreview` and render below QRCodeCard
- Add section with heading "Mini-Flyer" and subtitle "Download a print-ready flyer with your QR code, name, subjects, and rate."
- The page should have two clear sections: QR Code and Mini-Flyer

## Inputs

- `src/app/(dashboard)/dashboard/promote/page.tsx`
- `src/components/dashboard/QRCodeCard.tsx`
- `src/app/[slug]/opengraph-image.tsx`
- `src/lib/animation.ts`

## Expected Output

- `src/app/api/flyer/[slug]/route.ts`
- `src/components/dashboard/FlyerPreview.tsx`
- `src/app/(dashboard)/dashboard/promote/page.tsx`

## Verification

```bash
npx tsc --noEmit && npm run build
```
- TypeScript compiles with no errors
- Next.js build succeeds with /api/flyer/[slug] in the route manifest
- `test -f src/app/api/flyer/\\[slug\\]/route.ts` confirms API route file exists
- `test -f src/components/dashboard/FlyerPreview.tsx` confirms component exists
- `grep -q "FlyerPreview" src/app/\\(dashboard\\)/dashboard/promote/page.tsx` confirms integration
