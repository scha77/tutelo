# M011: UI Overhaul — Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

## Project Description

Tutelo is a live production web app (tutelo.app) that gives K-12 classroom teachers professional tutoring pages with scheduling, payments, and booking. 10 milestones of feature development are complete. This milestone is a comprehensive UI overhaul — raising every surface from "functional MVP" to "modern SaaS premium."

## Why This Milestone

The app was built feature-first across 10 milestones. Each milestone added capability, and the UI grew organically around those features. The result is a working product with accumulated visual inconsistencies, rough edges, and places where polish didn't keep up with the pace of shipping. The mobile navigation is a specific usability barrier — 11 unlabeled icons that require guessing. The booking calendar is a 935-line monolith that's both visually flat and structurally unwieldy.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Visit any teacher's /[slug] profile page and see a polished, premium presentation — not a generic template
- Complete the booking flow (date → time → form → payment) smoothly and without confusion
- Navigate the teacher mobile dashboard using labeled primary tabs + a More menu
- Use the teacher and parent dashboards and feel like they're using a cohesive, intentionally designed product
- Visit the landing page and see a tightened, professional presentation

### Entry point / environment

- Entry point: https://tutelo.app, /[slug] teacher profiles, /dashboard, /parent
- Environment: browser (desktop + mobile)
- Live dependencies involved: none — this is purely frontend visual/structural work

## Completion Class

- Contract complete means: all existing tests pass (474+), tsc clean, next build succeeds, no functional regressions
- Integration complete means: visual consistency across all surfaces (landing, profile, dashboards, booking flow, directory, login, onboarding)
- Operational complete means: none — no backend changes

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- The teacher /[slug] profile page looks premium with polished hero, credentials, about, reviews
- The booking flow from date → time → form → payment is smooth and cohesive
- Mobile bottom nav shows labeled primary tabs with a "More" menu for remaining items
- Teacher and parent dashboard pages have premium card treatments, visual hierarchy, and intentional spacing
- No surface looks like a generic shadcn/ui template with default styling
- The whole app feels like one product, not 10 milestones of accumulated features
- All 474+ existing tests pass, tsc clean, next build succeeds

## Risks and Unknowns

- BookingCalendar (935 lines) restructuring risk — decomposing a monolith while preserving 3 booking paths (deferred, direct, recurring) plus session type selection, child selector, and recurring options
- Scope creep — "polish" can expand infinitely; each surface needs a defined "done" bar
- Mobile nav "More" menu interaction pattern — needs to feel native and not janky

## Existing Codebase / Prior Art

- `src/components/profile/BookingCalendar.tsx` — 935-line monolith handling calendar, form, payment, recurring. Decomposition target.
- `src/components/dashboard/MobileBottomNav.tsx` — Current 11-icon bottom nav. Replacement target.
- `src/components/parent/ParentMobileNav.tsx` — Current 5-icon parent bottom nav. Same pattern fix.
- `src/lib/nav.ts` — 11 teacher nav items (shared between Sidebar and MobileBottomNav)
- `src/lib/parent-nav.ts` — 5 parent nav items
- `src/components/landing/` — 7 landing page section components, all use hardcoded #3b4d3e/#f6f5f0 hex colors
- `src/app/globals.css` — CSS variable system with brand colors; --primary: #3b4d3e, --primary-foreground: #f6f5f0
- `src/lib/animation.ts` — Centralized animation constants (variants, durations, easings)
- `src/components/profile/HeroSection.tsx` — Profile hero with banner + avatar overlay
- `src/components/profile/CredentialsBar.tsx` — Subject/grade badges + verified badge + rate
- `src/components/profile/ReviewsSection.tsx` — Star ratings + review cards
- `src/components/dashboard/StatsBar.tsx` — Overview stats (earnings, upcoming, students)

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- UI-01 through UI-09 — all active M011 requirements
- UI-10 — dark mode, explicitly deferred

## Scope

### In Scope

- Teacher profile page (/[slug]) visual overhaul — hero, credentials, about, reviews, social links
- Booking calendar step flow restructure and visual polish
- Mobile navigation overhaul — both teacher (11 items) and parent (5 items) bottom navs
- Teacher dashboard visual polish — all 11 pages
- Parent dashboard visual polish — all 5 pages
- Landing page visual tightening
- Global consistency pass — typography, spacing, component patterns
- Structural refactoring of BookingCalendar into cohesive sub-components

### Out of Scope / Non-Goals

- Dark mode (deferred — CSS variable foundation stays, no theme toggle)
- New features or capabilities — this is polish and restructuring of existing surfaces
- Backend changes, new API routes, or database migrations
- Admin dashboard polish (low priority, operator-only surface)
- Email template redesign
- OG image/flyer visual updates

## Technical Constraints

- All 474+ existing tests must continue to pass
- `tsc --noEmit` must stay clean
- `next build` must succeed
- BookingCalendar decomposition must preserve all 3 booking paths (deferred, direct, recurring) and all sub-features (session type selection, child selector, recurring options, inline auth)
- Landing page components use hardcoded hex (#3b4d3e, #f6f5f0) — these are intentional for the brand treatment and don't need to be converted to CSS variables

## Integration Points

- None — this milestone is purely frontend visual/structural work

## Open Questions

- None — scope is well-defined

## Design Constraints (from user discussion)

- **Visual bar:** Modern SaaS — clean & premium. Reference points: Stripe, Linear, Cal.com. Clean type, generous spacing, polished micro-interactions.
- **Never look like a template:** Every surface must have intentional, premium design choices. No default shadcn/ui with default spacing.
- **Never feel clunky or confusing:** Smooth interactions, clear affordances, obvious navigation. No mystery icons, no jarring shifts.
- **Mobile nav pattern:** Primary tabs (4-5 most-used) with visible labels + "More" menu for remaining items. Same pattern as Instagram/Spotify.
- **Profile page is highest priority surface:** The conversion page parents land on.
- **Structural refactors included:** Not just reskinning — booking calendar flow can be reworked.
