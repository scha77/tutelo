---
id: T01
parent: S01
milestone: M003
provides:
  - Brand CSS variables (--primary, --primary-foreground, --brand-primary, --brand-secondary) in :root
  - metadataBase and updated description in root layout
  - Branded favicon (32x32) and apple-touch-icon (180x180)
  - Tutelo logo in dashboard Sidebar header
key_files:
  - src/app/globals.css
  - src/app/layout.tsx
  - src/components/dashboard/Sidebar.tsx
  - public/favicon-32.png
  - public/apple-touch-icon.png
  - scripts/generate-favicon.mjs
key_decisions:
  - Used lighter sage #6b8f72 for dark mode --primary to maintain contrast on dark backgrounds
  - --accent left completely untouched in both :root and .dark blocks to preserve teacher profile isolation
patterns_established:
  - Brand colors via --brand-primary / --brand-secondary custom properties for explicit brand references
  - --primary / --sidebar-primary overridden to sage green for all shadcn/ui component theming
observability_surfaces:
  - Browser DevTools → Computed Styles → :root shows --primary, --brand-primary values
  - <head> inspection for favicon-32.png and apple-touch-icon.png links
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Apply brand CSS variables, update root layout metadata, and add logo to Sidebar

**Applied Tutelo brand palette (#3b4d3e sage green, #f6f5f0 warm off-white) globally via CSS custom properties, added metadataBase, generated branded favicon, and integrated logo into Sidebar.**

## What Happened

1. Overrode `:root` CSS variables: `--primary` → `#3b4d3e`, `--primary-foreground` → `#f6f5f0`, `--sidebar-primary` → `#3b4d3e`, `--sidebar-primary-foreground` → `#f6f5f0`. Added `--brand-primary: #3b4d3e` and `--brand-secondary: #f6f5f0` as named properties. `.dark` block updated with lighter sage `#6b8f72` for adequate contrast. `--accent` was NOT modified in either block.

2. Updated `src/app/layout.tsx` metadata: added `metadataBase: new URL('https://tutelo.app')`, polished description, and `icons` field pointing to `favicon-32.png` and `apple-touch-icon.png`.

3. Created `scripts/generate-favicon.mjs` using Sharp to resize `public/logo.png` to 32×32 and 180×180. Ran it — generated `public/favicon-32.png` and `public/apple-touch-icon.png`.

4. Added `next/image` import and `<Image src="/logo.png" width={28} height={28} />` to Sidebar header, positioned alongside teacher name in a flex row.

## Verification

- `npm run build` — passed with zero errors
- `grep -q "brand-primary" src/app/globals.css` — ✓ present
- `grep -q "metadataBase" src/app/layout.tsx` — ✓ present
- `test -f public/favicon-32.png` — ✓ exists (32×32 PNG)
- `test -f public/apple-touch-icon.png` — ✓ exists (180×180 PNG)
- `src/app/[slug]/page.tsx` unchanged (git diff empty) — accent isolation preserved
- Browser DevTools: `--primary` = `#3b4d3e`, `--accent` = untouched oklch value
- Browser: login page "Sign in" button renders in sage green
- Browser: `<head>` contains `<link rel="icon" href="/favicon-32.png">` and `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- Browser: description meta tag updated to marketing copy

### Slice-level checks (partial — T01 is task 1 of 2)

- ✅ `npm run build` succeeds with zero errors
- ⏳ Dev server at `localhost:3000/` renders landing page — not yet (landing page is T02)
- ⏳ All 6 landing page sections visible — T02
- ⏳ "Start your page" CTA links to `/login` — T02
- ⏳ OG tags present in page `<head>` — T02
- ✅ `metadataBase` set in root layout
- ⏳ Logo visible in landing page navbar — T02; ✅ logo in dashboard Sidebar
- ✅ `--primary` overridden to `#3b4d3e` in `:root`, teacher `--accent` isolation preserved
- ✅ Dashboard buttons render with sage green (brand primary), not near-black
- ⏳ Landing page components exist in `src/components/landing/` — T02
- ⏳ Interactive teacher mock has CSS hover/transition effects — T02

## Diagnostics

- Inspect `:root` CSS variables in Browser DevTools → Computed Styles panel
- Check `<head>` for favicon and apple-touch-icon links
- Build output surfaces any CSS syntax or import errors immediately

## Deviations

- Also generated 180×180 apple-touch-icon.png (not in plan but low-cost and standard practice)

## Known Issues

None.

## Files Created/Modified

- `src/app/globals.css` — Brand color overrides in :root and .dark, new --brand-primary/--brand-secondary properties
- `src/app/layout.tsx` — metadataBase, updated description, favicon/apple-touch-icon icons
- `src/components/dashboard/Sidebar.tsx` — next/image import, logo in header alongside teacher name
- `scripts/generate-favicon.mjs` — One-off Sharp script to generate favicon and apple-touch-icon
- `public/favicon-32.png` — Generated 32×32 branded favicon
- `public/apple-touch-icon.png` — Generated 180×180 apple touch icon
