# M003: Landing Page & Polish — Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

## Project Description

Tutelo is a live tutoring platform at https://tutelo.app. All 59 MVP requirements are implemented and verified in production. But the app needs visual polish before sharing publicly — the homepage is the Next.js default, there are no animations, the dashboard doesn't work on mobile, and shared links don't generate rich previews. This milestone transforms the app from "it works" to "it looks professional."

## Why This Milestone

The founder is preparing to recruit the first founding teachers via the @eyes_on_meme Instagram audience. The homepage is literally the first thing anyone will see when they visit tutelo.app, and it currently says "To get started, edit the page.tsx file." Beyond the homepage, the overall app feels static — no transitions, no micro-interactions, no motion. Teachers evaluating whether to invest their time in Tutelo will judge it by how polished it feels. First impressions are permanent. This milestone must ship before the founder starts sharing the URL.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Visit tutelo.app/ and see a polished marketing landing page that explains what Tutelo is, shows a live teacher page preview, and has a clear "Start your page" CTA
- Navigate the entire app and feel smooth animations on every surface — scroll reveals on the landing page, slide transitions in onboarding, animated cards in the dashboard, section fades on profile pages, and responsive micro-interactions throughout
- Use the dashboard on their phone with a thumb-friendly bottom navigation bar
- Share their tutelo.app/ms-johnson link and see a personalized preview with their name, photo, and subjects
- Sign up as a new teacher and have booking notification emails work immediately (no manual social_email setup needed)

### Entry point / environment

- Entry point: https://tutelo.app
- Environment: Vercel production
- Live dependencies: Supabase (auth email lookup for social_email fix), Vercel (deployment)

## Completion Class

- Contract complete means: `npm run build` succeeds, Vercel deployment succeeds, no TypeScript errors
- Integration complete means: landing page renders at tutelo.app/, animations visible across all surfaces, mobile bottom nav functional, OG tags generate previews, social_email auto-populated on signup
- Operational complete means: deployed to production with no regressions in existing auth/booking/dashboard flows

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- tutelo.app/ shows the marketing landing page with all sections (hero, how-it-works, problem/solution, CTA)
- The interactive teacher page mock is visible and animated on the landing page
- Animations are active on: landing (scroll reveals), onboarding (step transitions), dashboard (card/list animations), profile (section fades), and micro-interactions (buttons, toggles, focus states)
- Dashboard is usable on mobile viewport (375px) with bottom tab navigation
- Sharing a teacher /[slug] link on social media shows a personalized preview (teacher name, photo, subjects)
- A new teacher signup has social_email automatically set from their auth email
- All existing flows (auth, onboarding, booking, dashboard, Stripe Connect) still work correctly

## Risks and Unknowns

- **Framer Motion + Next.js 16 + React 19 compatibility** — Framer Motion's `AnimatePresence` for page transitions may have quirks with the App Router. Medium risk — may need `motion` (the newer package name) instead of `framer-motion`.
- **Performance impact of animations** — Adding motion to every surface could cause jank on lower-end devices. Low risk if animations are CSS-based where possible and Framer Motion only used where needed.
- **Brand color application scope** — Applying #3b4d3e globally must not break teacher accent color customization (PAGE-07). Teachers choose their own accent color on their profile pages.

## Existing Codebase / Prior Art

- `src/app/page.tsx` — Current homepage (Next.js default). Will be completely replaced.
- `src/app/layout.tsx` — Root layout. Animations provider will wrap here.
- `src/app/globals.css` — Imports `tw-animate-css`. Brand colors will be added as CSS variables.
- `src/components/ui/` — shadcn/ui components. Micro-interaction animations added here.
- `src/components/dashboard/Sidebar.tsx` — Desktop sidebar. Mobile bottom nav is a companion, not a replacement.
- `src/components/dashboard/AvailabilityEditor.tsx` — 158 lines. Not changing functionality, but may get animation polish.
- `src/components/onboarding/OnboardingWizard.tsx` — Step transitions will be added here.
- `src/components/profile/` — HeroSection, CredentialsBar, AboutSection, BookingCalendar, etc. Section entrance animations.
- `src/app/[slug]/page.tsx` — Teacher profile RSC. OG tags via generateMetadata(). Section animations on client components.
- `src/actions/auth.ts` — Signup action. social_email auto-population will be added here.
- `public/logo.png` — Tutelo logo (4000x4000 PNG). Needs an optimized version for web use.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- LAND-01 through LAND-05 — Landing page (M003/S01)
- ANIM-01 through ANIM-06 — Animations (M003/S02)
- MOBILE-01 — Mobile bottom nav (M003/S03)
- BRAND-01, BRAND-02 — Brand identity (M003/S01)
- SEO-01, SEO-02 — OG tags (M003/S04 and M003/S01)
- FIX-01 — social_email auto-populate (M003/S04)

## Scope

### In Scope

- Marketing landing page (complete replacement of src/app/page.tsx)
- Tutelo brand palette integration (CSS variables, component updates)
- Logo integration into navigation surfaces
- Framer Motion (or motion) installation and animation system
- Scroll-triggered reveals on landing page
- Page transition animations
- Onboarding wizard step transitions
- Dashboard card/list animations
- Teacher profile section entrance animations
- Button/toggle/form micro-interactions
- Mobile bottom navigation bar for dashboard
- Dynamic OG meta tags on teacher /[slug] pages
- Landing page OG meta tags
- Auto-populate social_email from auth email on signup
- Optimized logo variants for web (smaller sizes, favicon)
- Vercel production deployment

### Out of Scope / Non-Goals

- Availability editor redesign (M004)
- Per-date availability overrides (M004)
- Teacher verification system (M005)
- SMS notifications (M005)
- New feature development — this is polish and presentation only
- Changing any existing data models or API logic (except social_email fix)
- Performance optimization beyond ensuring animations don't cause jank

## Technical Constraints

- Brand colors: primary #3b4d3e (sage green), secondary #f6f5f0 (warm off-white)
- Logo: public/logo.png (4000x4000 — needs optimization for web)
- Animation style: subtle & smooth (not bouncy or dramatic)
- Must preserve teacher accent color customization (PAGE-07) — brand colors apply to app chrome, not teacher profile accent colors
- Next.js 16.1.6 + React 19 — verify Framer Motion compatibility
- Existing `tw-animate-css` can be used for simpler CSS animations; Framer Motion for complex orchestration

## Integration Points

- **Vercel** — deployment target
- **Supabase Auth** — reading auth email for social_email auto-population
- **Next.js generateMetadata()** — dynamic OG tags on [slug] pages

## Open Questions

- **Framer Motion vs motion package** — The `motion` package is the modern successor to `framer-motion`. Need to check which is compatible with Next.js 16 / React 19 at research time.
- **Page transition approach** — `AnimatePresence` with layout animations, or CSS View Transitions API? Research during S02.
- **Logo optimization** — 4000x4000 PNG is too large for web. Need to generate favicon, 64px nav logo, and OG image variant.
