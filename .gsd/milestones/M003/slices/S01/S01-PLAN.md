# S01: Brand Identity & Landing Page

**Goal:** Replace the Next.js default homepage with a polished marketing landing page at tutelo.app/ using brand identity (#3b4d3e sage green, #f6f5f0 warm off-white, Tutelo logo). Apply brand palette globally without breaking teacher accent colors. Sections: hero, how-it-works, problem/solution, interactive teacher mock, slug showcase, and CTA. OG meta tags present. Logo integrated into Sidebar.

**Demo:** Visit tutelo.app/ and see a polished marketing landing page with brand colors, logo, hero, how-it-works, problem/solution, interactive teacher page mock, shareable slug showcase, and "Start your page" CTA. OG meta tags in `<head>`. Dashboard buttons use brand sage green. Teacher profile accent colors still work independently.

## Must-Haves

- Landing page at `/` with hero, how-it-works, problem/solution, interactive teacher mock, CTA sections (LAND-01)
- Interactive teacher page mock visible on landing page — not static, uses CSS hover/transition effects (LAND-02)
- "Start your page" CTA links to `/login` (LAND-03)
- Brand palette applied: primary #3b4d3e, secondary #f6f5f0, Tutelo logo (LAND-04)
- Shareable slug links (`tutelo.app/ms-johnson`) showcased as key value prop (LAND-05)
- Brand palette applied globally via CSS custom properties without breaking teacher `--accent` (BRAND-01)
- Tutelo logo in landing page navbar and dashboard Sidebar (BRAND-02)
- OG meta tags on landing page with title, description, image (SEO-02)
- Landing page sections extracted as separate components in `src/components/landing/` (supports ANIM-01 for S02)
- `metadataBase` set in root layout for absolute OG URLs
- Favicon updated from default to Tutelo branding
- `npm run build` succeeds with no regressions

## Proof Level

- This slice proves: integration
- Real runtime required: yes (visual verification of landing page render, brand colors, component structure)
- Human/UAT required: yes (design quality of landing page is subjective — needs visual review)

## Verification

- `npm run build` — succeeds with zero errors
- Dev server at `localhost:3000/` renders the landing page (not Next.js default)
- All 6 landing page sections visible: navbar, hero, how-it-works, problem/solution, teacher mock, CTA
- "Start your page" CTA links to `/login`
- OG tags present in page `<head>` (title, description, og:image)
- `metadataBase` set in root layout
- Logo visible in landing page navbar and dashboard Sidebar
- `--primary` overridden to `#3b4d3e` in `:root`, teacher `--accent` isolation preserved (no change to `src/app/[slug]/page.tsx`)
- Dashboard buttons render with sage green (brand primary), not near-black
- Landing page components exist as separate files in `src/components/landing/`
- Interactive teacher mock has CSS hover/transition effects

## Observability / Diagnostics

- Runtime signals: None — this is a static landing page + CSS theming. No async flows, no API calls, no state machines.
- Inspection surfaces: `npm run build` output for TypeScript/build errors. Browser DevTools for CSS variable inspection (`:root` custom properties). `<head>` inspection for OG tags.
- Failure visibility: Build failures surface as TypeScript or import errors in build output. Visual regressions visible via browser inspection of dashboard buttons and teacher profile accent colors.
- Redaction constraints: None — no secrets or PII involved.

## Integration Closure

- Upstream surfaces consumed: None (first slice in M003)
- New wiring introduced in this slice:
  - `src/app/page.tsx` completely replaced with landing page composition
  - `globals.css` `:root` block modified with brand color overrides
  - `src/app/layout.tsx` updated with `metadataBase` and favicon
  - `src/components/dashboard/Sidebar.tsx` updated with logo
  - New component tree: `src/components/landing/{NavBar,HeroSection,HowItWorksSection,ProblemSolutionSection,TeacherMockSection,CTASection}.tsx`
- What remains before the milestone is truly usable end-to-end:
  - S02: Animation wiring (scroll reveals on landing, page transitions, micro-interactions)
  - S03: Mobile bottom tab bar for dashboard
  - S04: Dynamic OG tags on teacher slug pages, social_email fix, production deploy

## Tasks

- [x] **T01: Apply brand CSS variables, update root layout metadata, and add logo to Sidebar** `est:45m`
  - Why: Foundation for everything else — brand palette must be in place before building landing page components. Logo in Sidebar satisfies BRAND-02 (dashboard surface). `metadataBase` required for OG tag absolute URLs.
  - Files: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/dashboard/Sidebar.tsx`, `public/favicon-32.png` (generated), `scripts/generate-favicon.mjs`
  - Do: Override `--primary` → `#3b4d3e`, `--primary-foreground` → `#f6f5f0` in `:root`. Add `--brand-primary` and `--brand-secondary` custom properties. Add `metadataBase: new URL('https://tutelo.app')` to layout metadata. Generate 32×32 favicon from logo.png via Sharp script. Add `<Image>` logo to Sidebar header. Do NOT touch `--accent`.
  - Verify: `npm run build` succeeds. Dashboard Sidebar shows logo. Inspect `:root` CSS vars in browser. Dashboard buttons render sage green.
  - Done when: Brand CSS variables in `:root`, logo in Sidebar, `metadataBase` set, favicon generated, build passes.

- [x] **T02: Build landing page with all sections — hero, how-it-works, problem/solution, interactive teacher mock, slug showcase, and CTA** `est:2h`
  - Why: Core deliverable of this slice — replaces Next.js default with the full marketing landing page. Covers LAND-01 through LAND-05, SEO-02, and supports ANIM-01 component structure.
  - Files: `src/app/page.tsx`, `src/components/landing/NavBar.tsx`, `src/components/landing/HeroSection.tsx`, `src/components/landing/HowItWorksSection.tsx`, `src/components/landing/ProblemSolutionSection.tsx`, `src/components/landing/TeacherMockSection.tsx`, `src/components/landing/CTASection.tsx`
  - Do: Create 6 landing components in `src/components/landing/`. Replace `page.tsx` with server component importing all sections + `export const metadata` with OG tags. NavBar: logo + "Sign in" + "Start your page" CTA → `/login`. Hero: professional identity headline, zero-risk messaging, primary CTA. HowItWorks: 3-step visual. ProblemSolution: before/after contrast. TeacherMock: realistic interactive preview with CSS hover effects, mock browser chrome, hardcoded accent `#10B981`. CTASection: final CTA with slug URL showcase (`tutelo.app/ms-johnson`). All sections RSC except TeacherMockSection (`'use client'`). Teacher-only audience. No Founding Teacher badge.
  - Verify: `npm run build` succeeds. Dev server at `/` shows all 6 sections. "Start your page" links to `/login`. OG tags present in `<head>`. Teacher mock has hover interactivity. Slug URL `tutelo.app/ms-johnson` visible on page.
  - Done when: Landing page renders all sections at `/`, OG tags present, interactive teacher mock works, CTA links correct, build passes, no regressions.

## Files Likely Touched

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `src/components/landing/NavBar.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/HowItWorksSection.tsx`
- `src/components/landing/ProblemSolutionSection.tsx`
- `src/components/landing/TeacherMockSection.tsx`
- `src/components/landing/CTASection.tsx`
- `public/favicon-32.png`
- `scripts/generate-favicon.mjs`
