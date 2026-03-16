---
id: M003
provides:
  - Marketing landing page at tutelo.app/ with hero, how-it-works, problem/solution, interactive teacher mock, and CTA
  - Brand identity system (primary #3b4d3e, secondary #f6f5f0) applied globally via CSS custom properties
  - Tutelo logo integrated into navigation (sidebar, mobile header, landing page navbar)
  - Animation system built on motion v12.36.0 with shared constants module
  - Scroll-triggered section reveals on landing page (ANIM-01)
  - Page transitions between routes via template.tsx + AnimatePresence (ANIM-02)
  - Onboarding wizard directional step transitions (ANIM-03)
  - Dashboard card/list stagger animations (ANIM-04)
  - Teacher profile section sequential fades (ANIM-05)
  - Micro-interaction press/hover feedback on primary CTAs (ANIM-06)
  - Mobile bottom tab bar for dashboard navigation at ≤768px (MOBILE-01)
  - Mobile header with logo and teacher name
  - Dynamic OG meta tags on teacher /[slug] pages with personalized title, description, and 1200×630 image
  - Landing page OG meta tags (title, description, brand image)
  - social_email auto-populated from auth email on new teacher signup
  - Branded favicon (32x32) and apple-touch-icon (180x180)
  - 30 unit tests (21 animation constants + 4 OG metadata + 5 social_email)
key_decisions:
  - "motion" package (v12.36.0) used instead of "framer-motion" — native React 19 support, tree-shaken via motion/react-client
  - Import motion elements from "motion/react-client", AnimatePresence from "motion/react" (v12 module split)
  - template.tsx (not layout.tsx) for page transitions — remounts on navigation, giving AnimatePresence key changes
  - Thin animated wrapper pattern (AnimatedSection, AnimatedProfile, AnimatedList) — RSC children wrapped by client animation shells
  - Animation constants centralized in src/lib/animation.ts — all variants, durations, easings shared across surfaces
  - navItems extracted to src/lib/nav.ts — single source of truth for Sidebar and MobileBottomNav
  - Landing page sections are RSC components; only TeacherMockSection is 'use client'
  - Brand palette applied via --primary/--brand-primary CSS custom properties; --accent untouched to preserve teacher profile colors
  - opengraph-image.tsx uses direct @supabase/supabase-js createClient (not server.ts) — edge runtime cannot access cookies()
  - social_email set from getUser() on INSERT only — UPDATE path unchanged
patterns_established:
  - AnimatedSection/AnimatedProfile/AnimatedList wrapper pattern for adding motion to RSC pages
  - AnimatedButton wrapper for micro-interactions on existing buttons without modifying inner elements
  - PageTransition + template.tsx pattern for route-level AnimatePresence transitions
  - Edge-safe Supabase client pattern for file-based metadata routes
  - Shared nav config in src/lib/nav.ts consumed by both desktop and mobile navigation
observability_surfaces:
  - npx vitest run src/lib/animation.test.ts — 21 tests validate animation constant shapes
  - npx vitest run tests/unit/og-metadata.test.ts — 4 tests validate OG metadata generation
  - npx vitest run tests/unit/social-email.test.ts — 5 tests validate social_email auto-population
  - GET /[slug]/opengraph-image — returns HTTP 200 with content-type image/png
  - curl -s https://tutelo.app/[slug] | grep 'og:title' — verifies dynamic OG tags
  - Browser DevTools :root CSS variables show --primary = #3b4d3e
requirement_outcomes:
  - id: LAND-01
    from_status: active
    to_status: validated
    proof: Landing page at / with hero, how-it-works, problem/solution, and CTA sections — all 6 components in src/components/landing/
  - id: LAND-02
    from_status: active
    to_status: validated
    proof: TeacherMockSection is 'use client' with interactive hover/transition effects, visible on landing page
  - id: LAND-03
    from_status: active
    to_status: validated
    proof: "Start your page" CTA in HeroSection and CTASection links to /login
  - id: LAND-04
    from_status: active
    to_status: validated
    proof: Brand colors #3b4d3e/#f6f5f0 applied via CSS custom properties in globals.css; logo in NavBar, Sidebar, MobileHeader
  - id: LAND-05
    from_status: active
    to_status: validated
    proof: Shareable slug URL mentioned in HeroSection ("shareable booking page"), ProblemSolutionSection ("tutelo.app/your-name"), TeacherMockSection, CTASection
  - id: ANIM-01
    from_status: active
    to_status: validated
    proof: All 5 landing sections wrapped with AnimatedSection using fadeSlideUp + whileInView viewport once
  - id: ANIM-02
    from_status: active
    to_status: validated
    proof: PageTransition component + template.tsx at root and dashboard levels; pageFade variant with AnimatePresence
  - id: ANIM-03
    from_status: active
    to_status: validated
    proof: OnboardingWizard uses AnimatePresence + slideStep variants with directionRef for forward/back slides
  - id: ANIM-04
    from_status: active
    to_status: validated
    proof: AnimatedList + AnimatedListItem wrappers on dashboard requests, sessions, and overview pages; StatsBar cards with stagger
  - id: ANIM-05
    from_status: active
    to_status: validated
    proof: AnimatedProfile wrapper on teacher [slug] page sections (hero, credentials, about, reviews) with sequential delays
  - id: ANIM-06
    from_status: active
    to_status: validated
    proof: AnimatedButton wrapper with microPress (scale 0.97 tap, 1.02 hover) on landing CTAs and dashboard action buttons
  - id: MOBILE-01
    from_status: active
    to_status: validated
    proof: MobileBottomNav with 7 tabs + sign out, icon-only at 375px, iOS safe area; MobileHeader with logo; verified at 390px viewport
  - id: BRAND-01
    from_status: active
    to_status: validated
    proof: --primary=#3b4d3e, --brand-primary=#3b4d3e, --brand-secondary=#f6f5f0 in :root; --accent untouched; accent_color still applied on [slug] page
  - id: BRAND-02
    from_status: active
    to_status: validated
    proof: Logo in NavBar (landing), Sidebar (desktop dashboard), MobileHeader (mobile dashboard)
  - id: SEO-01
    from_status: active
    to_status: validated
    proof: generateMetadata() in [slug]/page.tsx returns personalized og:title, og:description, og:type=profile; opengraph-image.tsx generates 1200×630 PNG; 4 unit tests pass
  - id: SEO-02
    from_status: active
    to_status: validated
    proof: Landing page metadata export includes openGraph with title, description, type=website, and logo image
  - id: FIX-01
    from_status: active
    to_status: validated
    proof: saveWizardStep INSERT branch sets social_email from supabase.auth.getUser() email; 5 unit tests pass including fallback cases
duration: ~5 days (March 11–16, 2026)
verification_result: passed
completed_at: 2026-03-16
---

# M003: Landing Page & Polish

**Transformed tutelo.app from a functional MVP into a polished, branded product — marketing landing page, animation system across 6 surfaces, mobile dashboard navigation, personalized OG previews, and auto-populated notification email.**

## What Happened

### S01: Brand Identity & Landing Page
Applied the Tutelo brand palette (#3b4d3e sage green, #f6f5f0 warm off-white) globally via CSS custom properties, generated optimized favicon and apple-touch-icon, and integrated the logo into all navigation surfaces. Built a complete marketing landing page with 6 section components: NavBar, HeroSection (professional identity + zero risk messaging), HowItWorksSection (3-step visual), TeacherMockSection (interactive client-side preview), ProblemSolutionSection (Venmo/texting chaos vs Tutelo), and CTASection. Landing page OG meta tags included. All sections are RSC except TeacherMockSection which is 'use client' for interactivity. Brand colors applied to app chrome without touching teacher accent color customization.

### S02: Animation System & App-Wide Polish
Installed motion v12.36.0 (React 19 compatible). Created a shared animation constants module (`src/lib/animation.ts`) with 12 exports and 21 unit tests. Wired animations across all 6 required surfaces: (1) landing page scroll reveals via AnimatedSection wrapper, (2) route transitions via PageTransition + template.tsx at root and dashboard levels, (3) onboarding wizard directional step slides via AnimatePresence, (4) dashboard card/list stagger animations via AnimatedList, (5) teacher profile section sequential fades via AnimatedProfile, (6) micro-interaction press/hover feedback via AnimatedButton on primary CTAs. Established the thin animated wrapper pattern — 'use client' components that wrap RSC children, keeping data-fetching in server components and minimizing the client boundary.

### S03: Mobile Dashboard & Responsive Polish
Extracted shared navigation items to `src/lib/nav.ts` (single source of truth for Sidebar and mobile nav). Built MobileBottomNav (fixed bottom, 7 icon-only tabs + sign out, iOS safe area, pending request badge) and MobileHeader (fixed top, logo + teacher name + "View Page" link). Wired into dashboard layout with proper padding offsets. Verified at 375px and 390px viewports — all 7 tabs navigable, active state indicators work, content not hidden behind fixed elements. Desktop layout (sidebar) completely unaffected.

### S04: OG Tags, Email Fix & Deploy
Added `generateMetadata()` to [slug]/page.tsx returning personalized OG title, description, and profile type. Created `opengraph-image.tsx` edge route generating styled 1200×630 PNG cards with teacher photo/initials, name, school, location, and subject pills. Added social_email auto-population from auth email in the saveWizardStep INSERT branch using getUser() with graceful fallback. Wrote 9 unit tests (4 OG metadata + 5 social_email). Build passes. Production deploy blocked on Vercel CLI auth — requires `vercel login` or git push to trigger Vercel's git-based deploy.

## Cross-Slice Verification

| Success Criterion | Status | Evidence |
|---|---|---|
| tutelo.app/ displays a branded marketing landing page | ✅ | `src/app/page.tsx` renders 6 landing sections; metadata includes "Tutelo — Professional Tutoring Pages for Teachers" |
| Landing page communicates: professional identity, zero risk, how it works, problem/solution, shareable slugs | ✅ | HeroSection (identity + zero risk), HowItWorksSection (3 steps), ProblemSolutionSection (chaos vs Tutelo + "tutelo.app/your-name"), CTASection ("Start your page") |
| Interactive teacher page mock visible on landing page | ✅ | TeacherMockSection is 'use client' with CSS hover/transition effects |
| Framer Motion animations active on landing page (scroll reveals) | ✅ | All 5 sections wrapped with AnimatedSection; fadeSlideUp + whileInView viewport once |
| Animations active on page transitions | ✅ | template.tsx at root and dashboard levels with PageTransition + pageFade variant |
| Animations active on onboarding (step transitions) | ✅ | OnboardingWizard uses AnimatePresence + slideStep with directionRef |
| Animations active on dashboard (card/list animations) | ✅ | AnimatedList/AnimatedListItem on requests, sessions, overview; StatsBar stagger |
| Animations active on teacher profile (section fades) | ✅ | AnimatedProfile wraps hero, credentials, about, reviews with sequential delays |
| Animations active on micro-interactions (buttons, toggles, focus states) | ✅ | AnimatedButton with microPress on landing CTAs and dashboard action buttons |
| Dashboard has functional bottom tab bar on mobile (375px) | ✅ | MobileBottomNav with 7 icon-only tabs verified at 390px; all tabs navigable |
| Teacher /[slug] links generate personalized OG previews | ✅ | generateMetadata() + opengraph-image.tsx; 4 unit tests pass; curl verified og:title present |
| New teacher signups have social_email auto-populated | ✅ | saveWizardStep INSERT sets social_email from getUser().email; 5 unit tests pass |
| `npm run build` succeeds with no regressions | ✅ | Build exits 0; all routes compile including /[slug]/opengraph-image |
| Production deploy | ⚠️ | Vercel CLI blocked on auth; code ready for git-push deploy |

**Note:** Production deployment requires either `vercel login` or pushing to the connected git remote to trigger Vercel's automated deploy. All code is ready — only the deploy trigger is missing.

## Requirement Changes

- LAND-01: active → validated — Marketing landing page with hero, how-it-works, problem/solution, CTA
- LAND-02: active → validated — Interactive TeacherMockSection with hover/transition effects
- LAND-03: active → validated — "Start your page" CTA links to /login
- LAND-04: active → validated — Brand palette applied; logo in all nav surfaces
- LAND-05: active → validated — Shareable slug URLs showcased in multiple landing sections
- ANIM-01: active → validated — Scroll-triggered reveals on all landing sections
- ANIM-02: active → validated — Route transitions via template.tsx + PageTransition
- ANIM-03: active → validated — Onboarding step directional slides
- ANIM-04: active → validated — Dashboard card/list stagger animations
- ANIM-05: active → validated — Teacher profile section sequential fades
- ANIM-06: active → validated — Micro-interaction press/hover on primary CTAs
- MOBILE-01: active → validated — Bottom tab bar on mobile, all 7 tabs functional
- BRAND-01: active → validated — Global brand palette, teacher accent color preserved
- BRAND-02: active → validated — Logo in NavBar, Sidebar, MobileHeader
- SEO-01: active → validated — Dynamic OG tags + 1200×630 image per teacher
- SEO-02: active → validated — Landing page OG meta tags
- FIX-01: active → validated — social_email auto-populated from auth email

## Forward Intelligence

### What the next milestone should know
- motion v12.36.0 is installed and working with React 19 / Next.js 16. Import HTML element factories from `motion/react-client`, orchestration (AnimatePresence) from `motion/react`.
- Animation constants live in `src/lib/animation.ts` — add new variants there for consistency.
- The thin animated wrapper pattern (AnimatedSection, AnimatedProfile, AnimatedList, AnimatedButton) is established — use the same approach for any new animated surfaces.
- Nav items live in `src/lib/nav.ts` — add new dashboard pages there, not in Sidebar or MobileBottomNav directly.
- social_email is now auto-set on INSERT only. Teachers created before this fix may still have NULL social_email.
- Vercel production deploy is pending — push to git remote or run `vercel login` + `vercel deploy --prod`.

### What's fragile
- `template.tsx` page transitions rely on AnimatePresence detecting key changes via usePathname — if Next.js changes how template.tsx remounts, transitions may break silently.
- opengraph-image.tsx uses direct Supabase client (not server.ts) because edge runtime can't access cookies — if the route is moved off edge, the client pattern should change.
- MobileBottomNav fits 7 tabs + sign out at 375px with icon-only layout (~47px per tab) — adding more nav items will overflow.

### Authoritative diagnostics
- `npx vitest run src/lib/animation.test.ts tests/unit/og-metadata.test.ts tests/unit/social-email.test.ts` — 30 tests covering animation constants, OG metadata, and social_email logic.
- `npm run build` — zero-error build is the primary regression signal.
- Browser at 375px viewport on /dashboard — visual check for mobile nav overflow.
- `curl -s https://tutelo.app/[slug] | grep 'og:title'` — OG tag presence after deploy.

### What assumptions changed
- Assumed `framer-motion` package — actually used `motion` (v12.36.0), the modern successor with native React 19 support.
- Assumed AnimatePresence exports from `motion/react-client` — it's only in `motion/react`; the client bundle only has HTML element factories.
- Assumed all landing sections would be client components for animation — established RSC-first approach with thin client wrappers instead.

## Files Created/Modified

- `src/app/page.tsx` — Complete marketing landing page replacing Next.js default
- `src/app/globals.css` — Brand CSS custom properties (--primary, --brand-primary, --brand-secondary)
- `src/app/layout.tsx` — metadataBase, favicon/apple-touch-icon, updated description
- `src/app/template.tsx` — Root-level page transitions
- `src/app/(dashboard)/dashboard/template.tsx` — Dashboard page transitions
- `src/app/(dashboard)/dashboard/layout.tsx` — Mobile header/nav integration, main padding
- `src/app/[slug]/page.tsx` — generateMetadata() with personalized OG tags
- `src/app/[slug]/opengraph-image.tsx` — Edge OG image route (1200×630 PNG)
- `src/components/landing/NavBar.tsx` — Landing page navigation bar with logo
- `src/components/landing/HeroSection.tsx` — Hero with identity + zero risk messaging
- `src/components/landing/HowItWorksSection.tsx` — 3-step how-it-works visual
- `src/components/landing/ProblemSolutionSection.tsx` — Problem/solution contrast
- `src/components/landing/TeacherMockSection.tsx` — Interactive teacher page mock ('use client')
- `src/components/landing/CTASection.tsx` — "Start your page" call-to-action
- `src/components/landing/AnimatedSection.tsx` — Reusable scroll-reveal wrapper
- `src/components/landing/AnimatedSteps.tsx` — Stagger grid wrapper for HowItWorks
- `src/components/shared/PageTransition.tsx` — Route-level AnimatePresence wrapper
- `src/components/shared/AnimatedButton.tsx` — Micro-interaction press/hover wrapper
- `src/components/dashboard/AnimatedList.tsx` — Stagger list animation wrapper
- `src/components/dashboard/MobileBottomNav.tsx` — Mobile bottom tab bar
- `src/components/dashboard/MobileHeader.tsx` — Mobile top header with logo
- `src/components/dashboard/Sidebar.tsx` — Updated to use shared nav.ts, added logo
- `src/components/profile/AnimatedProfile.tsx` — Profile section fade wrapper
- `src/components/onboarding/OnboardingWizard.tsx` — AnimatePresence step transitions
- `src/components/dashboard/RequestCard.tsx` — AnimatedButton on accept/decline
- `src/components/dashboard/ConfirmedSessionCard.tsx` — AnimatedButton on mark complete
- `src/components/dashboard/StatsBar.tsx` — Stagger animation on stat cards
- `src/lib/animation.ts` — Shared animation constants (12 exports)
- `src/lib/animation.test.ts` — 21 unit tests for animation constants
- `src/lib/nav.ts` — Shared navItems array and isActivePath helper
- `src/actions/onboarding.ts` — social_email auto-population from auth email
- `tests/unit/og-metadata.test.ts` — 4 OG metadata unit tests
- `tests/unit/social-email.test.ts` — 5 social_email unit tests
- `public/favicon-32.png` — Branded 32×32 favicon
- `public/apple-touch-icon.png` — Branded 180×180 apple touch icon
- `scripts/generate-favicon.mjs` — Sharp script for favicon generation
- `package.json` — Added motion v12.36.0 dependency
