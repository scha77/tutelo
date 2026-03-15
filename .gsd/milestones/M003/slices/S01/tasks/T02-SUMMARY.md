---
id: T02
parent: S01
milestone: M003
provides:
  - 6 landing page components in src/components/landing/ (NavBar, HeroSection, HowItWorksSection, ProblemSolutionSection, TeacherMockSection, CTASection)
  - Replaced page.tsx with marketing landing page composing all 6 sections
  - OG meta tags (title, description, openGraph) exported from page.tsx
  - Interactive teacher mock with CSS hover/transition effects
  - Slug URL showcase (tutelo.app/ms-johnson) visible in CTA and teacher mock
key_files:
  - src/app/page.tsx
  - src/components/landing/NavBar.tsx
  - src/components/landing/HeroSection.tsx
  - src/components/landing/HowItWorksSection.tsx
  - src/components/landing/ProblemSolutionSection.tsx
  - src/components/landing/TeacherMockSection.tsx
  - src/components/landing/CTASection.tsx
key_decisions:
  - Ordered sections as NavBar → Hero → HowItWorks → TeacherMock → ProblemSolution → CTA (mock before problem/solution to lead with the product visual)
  - Used hardcoded brand hex values (#3b4d3e, #f6f5f0) in landing components instead of CSS variables for landing page isolation from dark mode theming
patterns_established:
  - Landing page components as separate RSC files in src/components/landing/ with only TeacherMockSection using 'use client'
  - Consistent section spacing with py-24 md:py-32 pattern
  - Brand sage green (#3b4d3e) with opacity variants for text hierarchy (e.g. /70, /55, /40)
  - Subtle dot-grid background pattern for texture on hero and CTA sections
observability_surfaces:
  - none — static marketing page with no runtime signals
duration: ~15m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T02: Build landing page with all sections

**Replaced Next.js default homepage with a polished 6-section marketing landing page using sage green brand palette, interactive teacher mock, slug showcase, and OG meta tags.**

## What Happened

Created 6 landing page components in `src/components/landing/` and replaced `src/app/page.tsx` to compose them into a complete marketing page:

1. **NavBar** — Sticky top nav with Tutelo logo, "Sign in" text link, and "Start your page" pill button, all linking to `/login`. Backdrop blur on scroll via pure CSS.

2. **HeroSection** — Large centered headline ("Your professional tutoring page, ready in minutes") with eyebrow badge, sub-headline about zero risk/free to start, primary CTA, and subtle dot-grid background texture.

3. **HowItWorksSection** — 3-step flow (Sign up & customize → Share your link → Get booked) with Lucide icons in sage green icon boxes, step cards with hover states, and connector lines between steps on desktop.

4. **TeacherMockSection** (`'use client'`) — Realistic teacher page preview inside a mock browser chrome frame. Shows `tutelo.app/ms-johnson` in address bar, emerald (#10B981) accent banner, avatar with initials, headline, credential badges, 3 subjects with rates, availability mini-grid, and "Book a session" button. CSS hover effects: credential badges scale, subject cards lift with shadow, availability slots scale, book button scales with shadow.

5. **ProblemSolutionSection** — Before/After contrast with red-tinted "Before Tutelo" card (X icons) and sage-tinted "With Tutelo" card (check icons). 5 items each covering pain points and solutions.

6. **CTASection** — Final CTA in a sage green rounded card with dot-grid texture. Features the slug URL showcase (`tutelo.app/ms-johnson`) in a styled pill, inverted "Start your page" button, and copyright footer.

Page-level OG metadata exported with title, description, type, and image.

## Verification

All checks passed:

- **`npm run build`** — exits with code 0, no errors
- **`ls src/components/landing/`** — shows all 6 component files (NavBar, HeroSection, HowItWorksSection, ProblemSolutionSection, TeacherMockSection, CTASection)
- **Dev server at `/`** — renders landing page (not "To get started, edit the page.tsx file")
- **Browser assertions (16/16 PASS):**
  - Hero headline "Your professional tutoring page, ready in minutes" visible
  - "Start your page" text visible (3 instances — nav, hero, CTA)
  - 3-step how-it-works titles visible
  - Problem/solution "Before Tutelo" / "With Tutelo" visible
  - Teacher mock "Sarah Johnson" and "ms-johnson" visible
  - CTA "Ready to launch your tutoring page?" visible
  - "Built for classroom teachers" eyebrow visible
  - No console errors
- **Link verification** — all 3 "Start your page" links and "Sign in" link resolve to `/login`
- **OG tags in `<head>`** — `og:title`, `og:description`, `og:image` (https://tutelo.app/logo.png), `og:type` all present
- **No "Founding Teacher"** text anywhere on page (confirmed via text search)
- **Visual** — page uses sage green (#3b4d3e) and warm off-white (#f6f5f0), not generic black/white
- **TeacherMockSection** — confirmed `'use client'` directive, 4 hover interaction classes present

### Slice-level verification status (S01 — this is the final task):

- ✅ `npm run build` succeeds with zero errors
- ✅ Dev server at `localhost:3000/` renders the landing page (not Next.js default)
- ✅ All 6 landing page sections visible: navbar, hero, how-it-works, problem/solution, teacher mock, CTA
- ✅ "Start your page" CTA links to `/login`
- ✅ OG tags present in page `<head>` (title, description, og:image)
- ✅ `metadataBase` set in root layout (from T01)
- ✅ Logo visible in landing page navbar (and dashboard Sidebar from T01)
- ✅ `--primary` overridden to `#3b4d3e` in `:root` (from T01), teacher `--accent` isolation preserved
- ✅ Landing page components exist as separate files in `src/components/landing/`
- ✅ Interactive teacher mock has CSS hover/transition effects
- ⏭️ Dashboard buttons render with sage green — verified in T01, not re-verified visually (would require auth)

## Diagnostics

- `npm run build` for compile errors
- Browser at `/` for visual state
- `<head>` inspection for OG tags
- Component file listing: `ls src/components/landing/`

## Deviations

- Section order changed: TeacherMock placed before ProblemSolution (plan listed them in reverse). Product demo before pain points is a stronger conversion flow — show the solution first, then explain the problem.
- Used hardcoded hex colors (#3b4d3e, #f6f5f0) in landing components instead of CSS variable references. This isolates the landing page from dark mode theming, which is appropriate for a public marketing page that should always appear in light mode.

## Known Issues

None.

## Files Created/Modified

- `src/components/landing/NavBar.tsx` — Sticky nav with logo, sign-in link, CTA button
- `src/components/landing/HeroSection.tsx` — Hero with headline, sub-headline, CTA, dot-grid bg
- `src/components/landing/HowItWorksSection.tsx` — 3-step visual flow with Lucide icons
- `src/components/landing/ProblemSolutionSection.tsx` — Before/after contrast cards
- `src/components/landing/TeacherMockSection.tsx` — Interactive teacher page mock with browser chrome (`'use client'`)
- `src/components/landing/CTASection.tsx` — Final CTA with slug URL showcase and footer
- `src/app/page.tsx` — Replaced with server component composing all 6 sections + OG metadata
