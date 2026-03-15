---
estimated_steps: 5
estimated_files: 5
---

# T01: Apply brand CSS variables, update root layout metadata, and add logo to Sidebar

**Slice:** S01 — Brand Identity & Landing Page
**Milestone:** M003

## Description

Apply the Tutelo brand palette globally by overriding CSS custom properties in `globals.css`, update root layout metadata with `metadataBase` for OG URL resolution, generate a branded favicon from the existing 4000×4000 logo.png, and integrate the logo into the dashboard Sidebar. This is the foundation task — all subsequent landing page work depends on brand colors being in place.

Critical constraint: `--accent` is reserved for teacher profile pages (set inline in `src/app/[slug]/page.tsx`). Brand colors must use `--primary` / `--primary-foreground` overrides and new `--brand-primary` / `--brand-secondary` properties. Profile components use `var(--accent)`, not `var(--primary)`, so overriding `--primary` is safe.

## Steps

1. **Override brand colors in `globals.css` `:root` block.** Change `--primary` from `oklch(0.205 0 0)` (near-black) to `#3b4d3e` (sage green). Change `--primary-foreground` from `oklch(0.985 0 0)` to `#f6f5f0` (warm off-white). Add `--brand-primary: #3b4d3e` and `--brand-secondary: #f6f5f0` as additional named properties. Also update `--sidebar-primary` to match `#3b4d3e` so Sidebar active states use brand color. Do NOT modify `--accent`. Ensure `.dark` block has sensible brand-aware values (keep dark mode functional, even if landing page is light).

2. **Update `src/app/layout.tsx` metadata.** Add `metadataBase: new URL('https://tutelo.app')` to the existing `metadata` export. Update `description` to a more polished marketing description. Add `icons` field pointing to the new favicon.

3. **Generate branded favicon.** Write `scripts/generate-favicon.mjs` — a one-off Node script that uses Sharp to resize `public/logo.png` to 32×32 PNG and write it to `public/favicon-32.png`. Run the script. Optionally also generate a 180×180 apple-touch-icon. Reference the generated files in layout.tsx metadata `icons` field.

4. **Add Tutelo logo to `Sidebar.tsx` header.** Import `next/image`. Add `<Image src="/logo.png" width={28} height={28} alt="Tutelo" sizes="28px" />` to the existing `border-b p-4` header div, positioned before or alongside the teacher name. The logo and teacher name should sit together cleanly.

5. **Verify.** Run `npm run build` — must pass. Start dev server and visually confirm: dashboard buttons are sage green (not near-black), Sidebar shows Tutelo logo, `metadataBase` is set. Confirm teacher profile accent colors are not affected (inspect `src/app/[slug]/page.tsx` is unchanged).

## Must-Haves

- [ ] `--primary` overridden to `#3b4d3e` in `:root`
- [ ] `--primary-foreground` overridden to `#f6f5f0` in `:root`
- [ ] `--brand-primary` and `--brand-secondary` custom properties added
- [ ] `--accent` NOT modified (teacher profile isolation preserved)
- [ ] `metadataBase: new URL('https://tutelo.app')` in root layout metadata
- [ ] Branded favicon generated and referenced in layout metadata
- [ ] Tutelo logo visible in Sidebar header via `<Image>`
- [ ] `npm run build` passes

## Verification

- `npm run build` exits with code 0
- `grep -q "brand-primary" src/app/globals.css` — brand CSS vars present
- `grep -q "metadataBase" src/app/layout.tsx` — metadata base set
- `test -f public/favicon-32.png` — favicon generated
- Visual: dev server dashboard shows sage green buttons and logo in Sidebar
- `src/app/[slug]/page.tsx` has no changes (accent isolation preserved)

## Observability Impact

- Signals added/changed: None — purely visual CSS and metadata changes
- How a future agent inspects this: Browser DevTools → Computed Styles → check `--primary` value on `:root`. Check `<head>` for favicon and metadataBase-resolved URLs.
- Failure state exposed: Build errors if CSS syntax is wrong or Image import fails

## Inputs

- `src/app/globals.css` — existing `:root` CSS variables to override
- `src/app/layout.tsx` — existing metadata export to extend
- `src/components/dashboard/Sidebar.tsx` — existing header section to add logo
- `public/logo.png` — source logo for favicon generation and Sidebar display
- Research: `--accent` set inline in `src/app/[slug]/page.tsx:111`, safe to override `--primary`

## Expected Output

- `src/app/globals.css` — `:root` block with brand color overrides + new custom properties
- `src/app/layout.tsx` — metadata with `metadataBase`, updated description, favicon icons
- `src/components/dashboard/Sidebar.tsx` — logo `<Image>` in header section
- `public/favicon-32.png` — 32×32 branded favicon
- `scripts/generate-favicon.mjs` — one-off favicon generation script
