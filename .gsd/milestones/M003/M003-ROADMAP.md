# M003: Landing Page & Polish

**Vision:** Tutelo looks and feels like a real product — a polished marketing landing page at tutelo.app/, smooth animations throughout, mobile-friendly dashboard, and professional share previews. Teachers who visit the URL for the first time are impressed; those who sign up feel the quality at every step.

## Success Criteria

- tutelo.app/ displays a branded marketing landing page (not the Next.js default)
- The landing page communicates: professional identity, zero risk, how it works, problem/solution contrast, and shareable slug links
- An interactive teacher page mock is visible on the landing page
- Framer Motion animations are active on: landing page (scroll reveals), onboarding (step transitions), dashboard (card/list animations), teacher profile (section fades), and micro-interactions (buttons, toggles, focus states)
- Dashboard has a functional bottom tab bar on mobile viewports (375px)
- Teacher /[slug] links generate personalized OG previews (name, photo, subjects)
- New teacher signups have social_email auto-populated from their auth email
- `npm run build` succeeds with no regressions

## Key Risks / Unknowns

- Framer Motion (or `motion` package) compatibility with Next.js 16 + React 19 — may need specific version or configuration
- Page transition animations with App Router — AnimatePresence may not work seamlessly with RSC navigation
- Brand color application must not break teacher accent color customization on profile pages

## Proof Strategy

- Motion library risk → retire in S02 by successfully animating landing page sections with the chosen library
- Page transition risk → retire in S02 by demonstrating a working transition between two routes
- Brand color conflict risk → retire in S01 by applying brand palette globally and confirming teacher profile accent colors still work

## Verification Classes

- Contract verification: `npm run build` succeeds, no TypeScript errors, Vercel deployment succeeds
- Integration verification: landing page renders at /, animations visible, mobile nav works, OG tags generate previews, social_email populated on signup
- Operational verification: deployed to production, no regressions in existing flows
- UAT / human verification: visual quality of animations and landing page design

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 4 slices are complete
- tutelo.app/ shows the marketing landing page with brand colors and logo
- Interactive teacher page preview is visible on the landing page
- Animations are active across all 6 surfaces (landing, page transitions, onboarding, dashboard, profile, micro-interactions)
- Dashboard bottom nav works on mobile viewport
- Teacher /[slug] links produce personalized OG previews
- New signups have social_email set automatically
- No regressions in auth, onboarding, booking, dashboard, or Stripe Connect flows
- `npm run build` passes and Vercel deployment succeeds

## Requirement Coverage

- Covers: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, ANIM-01, ANIM-02, ANIM-03, ANIM-04, ANIM-05, ANIM-06, MOBILE-01, BRAND-01, BRAND-02, SEO-01, SEO-02, FIX-01
- Partially covers: none
- Leaves for later: AVAIL-04, AVAIL-05, AVAIL-06, AVAIL-07, CANCEL-01 (M004); VERIFY-01, SMS-01, SMS-02, CANCEL-02 (M005)
- Orphan risks: none

## Slices

- [x] **S01: Brand Identity & Landing Page** `risk:medium` `depends:[]`
  > After this: Visit tutelo.app/ and see a polished marketing landing page with brand colors, logo, hero, how-it-works, problem/solution, interactive teacher page mock, and "Start your page" CTA. OG meta tags present. Brand palette applied globally.

- [x] **S02: Animation System & App-Wide Polish** `risk:medium` `depends:[S01]`
  > After this: Navigate the app and see smooth animations everywhere — landing page scroll reveals, page transitions, onboarding step slides, dashboard card animations, profile section fades, and micro-interactions on buttons/toggles/forms.

- [ ] **S03: Mobile Dashboard & Responsive Polish** `risk:low` `depends:[S01]`
  > After this: Open the dashboard on a phone-sized viewport and navigate via a bottom tab bar. All dashboard pages accessible. Logo visible in mobile header.

- [ ] **S04: OG Tags, Email Fix & Deploy** `risk:low` `depends:[S01,S02,S03]`
  > After this: Share a teacher's tutelo.app/ms-johnson link and see a personalized preview. Sign up as a new teacher and social_email is auto-populated. Everything deployed to production.

## Boundary Map

### S01 → S02

Produces:
- `src/app/page.tsx` — Complete marketing landing page with all sections (hero, how-it-works, problem/solution, mock, CTA)
- `src/app/globals.css` — Brand CSS custom properties (--color-primary, --color-secondary, derived tones)
- `public/logo.png` + optimized variants (favicon, nav-size SVG or small PNG)
- `src/components/landing/` — Landing page section components (reusable for animation wiring)
- Brand palette applied to root layout, Sidebar, and global styles

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- Brand CSS custom properties (consumed by mobile nav styling)
- Logo asset (consumed by mobile header)
- Updated Sidebar component with brand integration (mobile nav derives from this)

Consumes:
- nothing (first slice)

### S01, S02, S03 → S04

Produces (S01):
- Landing page with OG meta tags (SEO-02 done in S01)
- Brand assets for OG images

Produces (S02):
- All animations wired and working

Produces (S03):
- Mobile bottom nav working

Consumes (S04):
- All three slices' work is complete before final integration, OG tag work, email fix, and production deploy
