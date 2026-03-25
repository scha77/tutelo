---
estimated_steps: 21
estimated_files: 4
skills_used: []
---

# T01: Build promote page with QR code preview and download

Install `qrcode.react`, add "Promote" to the dashboard nav, create the `/dashboard/promote` RSC page following the established auth pattern, and build the `QRCodeCard` client component with canvas-based high-res PNG download. This delivers requirement QR-01 (teacher downloads high-res QR code PNG encoding tutelo.app/[slug]).

**Key patterns to follow:**
- Auth pattern: `const supabase = await createClient()` → `supabase.auth.getUser()` → redirect if no user → query teachers table → redirect if no teacher. See `src/app/(dashboard)/dashboard/page.tsx` for the exact pattern.
- Nav: add `{ href: '/dashboard/promote', label: 'Promote', icon: Megaphone }` to the `navItems` array in `src/lib/nav.ts`. Import `Megaphone` from `lucide-react`. This auto-adds to both Sidebar and MobileBottomNav.
- Animation: import `fadeSlideUp`, `microPress` from `src/lib/animation.ts` for card animations.

**QRCodeCard component (`'use client'`):**
- Uses `QRCodeCanvas` from `qrcode.react`
- Renders a visible preview QR at size 192px
- Renders a hidden QR canvas at size 512px (ref-based) for high-res download
- QR encodes: `` `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'}/${slug}` ``
- Error correction: `level="H"` (highest — future logo overlay compatibility)
- Download handler: `canvas.toDataURL('image/png')` → create temporary `<a>` with `download` attribute → `.click()`
- Download filename: `tutelo-qr-${slug}.png`
- Uses `motion` from `motion/react-client` for card wrapper with `fadeSlideUp`
- Download button styled consistently with existing dashboard buttons (border, rounded-md, hover:bg-muted)

**Promote page (RSC):**
- Fetches: `slug, full_name, subjects, hourly_rate` from teachers table
- Renders page heading "Promote Your Page"
- Renders `<QRCodeCard slug={teacher.slug} />`
- Leave space below QR section for FlyerPreview (T02 will add it)
- Layout: `p-6 max-w-3xl space-y-8` (matches other dashboard pages)

## Inputs

- `src/lib/nav.ts`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/layout.tsx`
- `src/lib/animation.ts`

## Expected Output

- `src/lib/nav.ts`
- `src/app/(dashboard)/dashboard/promote/page.tsx`
- `src/components/dashboard/QRCodeCard.tsx`

## Verification

```bash
npx tsc --noEmit && npm run build
```
- TypeScript compiles with no errors
- Next.js build succeeds with /dashboard/promote in the route manifest
- `grep -q "Megaphone" src/lib/nav.ts` confirms Promote nav entry
- `grep -q "QRCodeCard" src/app/\\(dashboard\\)/dashboard/promote/page.tsx` confirms QR component render
