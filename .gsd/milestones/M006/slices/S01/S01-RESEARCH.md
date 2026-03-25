# S01 Research: QR Code & Mini-Flyer

**Slice:** S01 — QR Code & Mini-Flyer
**Milestone:** M006 — Growth Tools
**Gathered:** 2026-03-25
**Depth:** Targeted

---

## Summary

This is well-understood work applying known patterns to a codebase that already has all the scaffolding needed. The main design decision — how to generate the mini-flyer PNG — needs to be resolved before implementation. Everything else is straightforward wiring.

**Recommendation:** Use `qrcode.react` (QRCodeCanvas) for QR code generation + PNG download. Use a Next.js `ImageResponse` API route (`/api/flyer/[slug]`) for mini-flyer generation, mirroring the existing `opengraph-image.tsx` pattern. This keeps the flyer render server-side, font-consistent, and download-simple (direct link to the route).

---

## Requirements Owned

- **QR-01** — Teacher downloads high-res QR code PNG encoding `tutelo.app/[slug]`
- **QR-02** — Teacher downloads a printable mini-flyer (QR + name + subjects + rate + CTA)

---

## Implementation Landscape

### Existing files (read, no changes needed)

| File | Role |
|---|---|
| `src/app/[slug]/opengraph-image.tsx` | Edge `ImageResponse` pattern — flyer API route mirrors this exactly |
| `src/app/(dashboard)/dashboard/requests/CopyLinkButton.tsx` | Copy-to-clipboard pattern (`useState` + `navigator.clipboard`) |
| `src/app/(dashboard)/dashboard/layout.tsx` | Auth + teacher data fetch pattern for dashboard pages |
| `src/app/(dashboard)/dashboard/page.tsx` | RSC page pattern: `getUser()` → teacher query → render |
| `src/lib/nav.ts` | `navItems` array — needs a "Promote" entry added |
| `src/lib/animation.ts` | `fadeSlideUp`, `microPress`, `fastTransition` — reuse for card animations |

### Files to create

| File | What |
|---|---|
| `src/app/(dashboard)/dashboard/promote/page.tsx` | RSC — fetches teacher data, renders `QRCodeCard` + `FlyerPreview` sections |
| `src/components/dashboard/QRCodeCard.tsx` | `'use client'` — renders `QRCodeCanvas` (hidden at 512px) + preview (192px), download button |
| `src/components/dashboard/FlyerPreview.tsx` | `'use client'` — shows flyer preview image (img tag pointing to API route), download button |
| `src/app/api/flyer/[slug]/route.ts` | Node runtime API route — returns `ImageResponse` PNG of the styled flyer |

### Files to modify

| File | Change |
|---|---|
| `src/lib/nav.ts` | Add `{ href: '/dashboard/promote', label: 'Promote', icon: Megaphone }` to `navItems` |

---

## Key Technical Constraints & Findings

### QR Code (QR-01)

- **Library:** `qrcode.react` — install `qrcode.react`. Exports `QRCodeCanvas` and `QRCodeSVG`. **Use `QRCodeCanvas`** — its `toDataURL()` approach enables direct PNG download without a server round-trip.
- **Download pattern:** Attach a `ref` to the hidden `<canvas>` element (render at `size={512}` for high-res). On download click: `canvas.toDataURL('image/png')` → create anchor with `download="qrcode.png"` → `.click()`. The visible preview can be a smaller `QRCodeCanvas` (192px) or the same one scaled via CSS.
- **URL to encode:** `https://tutelo.app/${slug}` — use `NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'` for dev compatibility.
- **Error correction:** Use `level="H"` (highest) — gives room to add a logo center overlay in future without breaking scannability.
- **No new DB columns** — derived purely from `teacher.slug`.

### Mini-Flyer (QR-02)

- **Approach decision:** Server-side `ImageResponse` API route (`/api/flyer/[slug]`) vs. client-side `html2canvas`.
  - **`ImageResponse` wins** — same approach as existing `opengraph-image.tsx`, consistent fonts, no canvas cross-origin issues, returns a downloadable PNG URL directly. The flyer component just renders `<img src="/api/flyer/${slug}" />` for preview and `<a href="/api/flyer/${slug}" download="flyer.png">` for download.
  - `html2canvas` would require a new dependency, has font rendering issues, and creates CORS problems with teacher photos.
- **Flyer API route:** `src/app/api/flyer/[slug]/route.ts` — **Node runtime** (not edge) because it needs to fetch teacher data via the server Supabase client. Actually: can use `createClient` from `@supabase/supabase-js` directly (same as `opengraph-image.tsx` uses anonymous client) — keeping it edge-compatible is possible and preferred.
  - Use `export const runtime = 'edge'` + anonymous Supabase client (same as OG image).
  - Return `ImageResponse` at a print-friendly size: **1200×1600** (portrait A5-ish ratio).
- **Flyer contents:** Teacher name (large), subjects (tags), hourly rate, QR code as PNG `<img>` — but `ImageResponse` (Satori) cannot render a `<canvas>`, so the QR code in the flyer must be a **URL pointing to a rasterized QR**. Use the `qrcode` npm package (Node-compatible, not React) server-side to generate a data URI for the QR code inside the flyer.
  - **OR simpler:** Embed QR as an SVG using `qrcode` package's `toString()` method → inline SVG in `ImageResponse`. But Satori has limited SVG support.
  - **Best approach:** In the flyer route, use `qrcode` package's `toDataURL()` (Node canvas API) to produce a PNG data URI, then embed as `<img src={dataUri} />` inside `ImageResponse`.
  - Install `qrcode` (Node package, not `qrcode.react`) for server-side QR generation inside the flyer route. OR: redirect approach — the flyer download link calls an API route that returns a composed PNG.

**Actually the simplest working approach:**
  - Flyer API route uses `qrcode` package (`qrcode.toDataURL(url)`) to generate a base64 QR PNG data URI, then passes it as `src` to an `<img>` inside `ImageResponse`. This is clean and guaranteed to work in edge runtime (qrcode is pure JS, no native deps).

### Teacher Data Available

From `teachers` table (existing schema, no migrations needed):
- `full_name`, `slug`, `subjects` (TEXT[]), `hourly_rate` (NUMERIC), `photo_url`, `school`, `city`, `state`

Dashboard promote page should select: `slug, full_name, subjects, hourly_rate`

### Navigation

The `navItems` array in `src/lib/nav.ts` drives both `Sidebar` and `MobileBottomNav`. Adding `/dashboard/promote` there automatically adds it to both surfaces. Current nav has 7 items — mobile already uses icon-only layout (per Decision log). Adding an 8th item pushes it to ~47px per tab — still workable but tight. Consider icon only; `Megaphone` from `lucide-react` is the right icon.

### Auth Pattern (Dashboard Page)

All dashboard pages use the same RSC pattern:
```ts
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
const { data: teacher } = await supabase.from('teachers').select('...').eq('user_id', userId).maybeSingle()
if (!teacher) redirect('/onboarding')
```
The promote page follows this exactly.

### Flyer API Route Auth

The flyer route at `/api/flyer/[slug]` is **public** (no auth needed) — same as OG image. The slug is the teacher's public URL identifier. Any teacher can share their flyer URL.

---

## Suggested Build Order

1. **Install libraries** — `npm install qrcode.react qrcode @types/qrcode`
2. **Nav entry** — add Promote to `navItems` in `nav.ts`
3. **Promote page** — RSC at `src/app/(dashboard)/dashboard/promote/page.tsx`
4. **QRCodeCard component** — canvas-based download
5. **Flyer API route** — edge ImageResponse at `/api/flyer/[slug]/route.ts`
6. **FlyerPreview component** — img tag pointing to flyer API route + download link

Task 1+2 are trivial and can be combined. Tasks 4+5 can be built in parallel (independent). Task 6 depends on Task 5.

---

## Verification

```bash
# Type-check
npx tsc --noEmit

# Build
npm run build

# Manual: visit /dashboard/promote, verify:
#   - QR code renders correctly
#   - QR download produces a valid PNG that scans to tutelo.app/[slug]
#   - Flyer preview loads from /api/flyer/[slug]
#   - Flyer download link triggers PNG download
```

---

## Skill Discovery

- **`frontend-design`** — relevant for the promote page UI and flyer visual design. Available in system prompt.
- **`make-interfaces-feel-better`** — relevant for QR card and flyer preview polish. Available in system prompt.

No external skill installation needed — work uses established React/Next.js patterns already in the codebase.

---

## Open Questions Resolved

- **Mini-flyer rendering approach** (flagged in context as open question): Use `ImageResponse` API route — consistent with existing OG image pattern, avoids html2canvas CORS/font issues, produces a direct download URL.
- **QR inside the flyer**: Use `qrcode` (Node/pure-JS package) in the flyer API route to produce a base64 PNG data URI, embed as `<img>` in `ImageResponse`.
