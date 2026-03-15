---
estimated_steps: 5
estimated_files: 8
---

# T03: Add dashboard card staggers and profile section fades

**Slice:** S02 — Animation System & App-Wide Polish
**Milestone:** M003

## Description

Wire stagger animations into dashboard card lists (requests, sessions, stats) for ANIM-04, and add entrance fade animations to teacher profile sections (hero, credentials, about, reviews) for ANIM-05. These target the two primary user-facing surfaces — the teacher's dashboard and the parent-facing public profile.

## Steps

1. Create `src/components/dashboard/AnimatedList.tsx` — a `'use client'` component:
   - Imports from `"motion/react-client"`
   - Imports `staggerContainer`, `staggerItem` from `@/lib/animation`
   - Renders `<m.ul variants={staggerContainer} initial="hidden" animate="visible">` wrapping children
   - Exports an `AnimatedListItem` component: `<m.li variants={staggerItem}>` wrapping children
   - Accepts optional `className` on both components
2. Update `src/app/(dashboard)/dashboard/requests/page.tsx`:
   - Import `AnimatedList` and `AnimatedListItem`
   - Replace the plain `<div>` / `<ul>` wrapping the RequestCard `.map()` with `<AnimatedList>` and wrap each `<RequestCard>` in `<AnimatedListItem>`
   - Keep the page as RSC — `AnimatedList` is the client boundary
3. Apply the same AnimatedList pattern to `src/app/(dashboard)/dashboard/sessions/page.tsx` for ConfirmedSessionCard list, and to `src/app/(dashboard)/dashboard/page.tsx` for the main dashboard overview content.
4. Update `src/components/dashboard/StatsBar.tsx` — already `'use client'`:
   - Import `motion` from `"motion/react-client"` and `staggerContainer`, `staggerItem` from animation constants
   - Wrap the stats card container with `m.div variants={staggerContainer}` and each stat card with `m.div variants={staggerItem}`
5. Create `src/components/profile/AnimatedProfile.tsx` — a `'use client'` thin wrapper:
   - Imports from `"motion/react-client"` and `fadeSlideUp`, `VIEWPORT_ONCE` from animation constants
   - Accepts `children`, optional `delay` (number), optional `className`
   - Renders `<m.div initial="hidden" whileInView="visible" viewport={VIEWPORT_ONCE} variants={fadeSlideUp} transition={{ delay }}>` wrapping children
   - Use `whileInView` (not just `animate`) so profile sections reveal as user scrolls on long profiles
   - Update `src/app/[slug]/page.tsx` — wrap HeroSection (delay: 0), CredentialsBar (delay: 0.1), AboutSection (delay: 0.15), ReviewsSection (delay: 0.2) each in `<AnimatedProfile delay={N}>`
   - Verify: `accent_color` logic and inline style application are NOT modified — AnimatedProfile only adds opacity/transform, never color

## Must-Haves

- [ ] Dashboard requests page cards stagger in on mount
- [ ] Dashboard sessions page cards stagger in on mount
- [ ] StatsBar stat cards stagger in on mount
- [ ] Profile HeroSection, CredentialsBar, AboutSection, ReviewsSection fade in with sequential delays
- [ ] Teacher `accent_color` on profile pages is completely unaffected (only opacity/transform added)
- [ ] RSC pages remain RSCs — client boundary is only on AnimatedList/AnimatedProfile wrappers
- [ ] `npm run build` passes with zero errors

## Verification

- `npm run build` — exits 0
- Dev server: `/dashboard/requests` — request cards appear with stagger effect (not all at once)
- Dev server: `/dashboard/sessions` — session cards stagger in
- Dev server: `/dashboard` — stats animate in
- Dev server: `/[slug]` (any teacher profile) — sections fade in sequentially from top to bottom
- `grep "accent_color" src/app/[slug]/page.tsx` — accent color logic still present and unmodified
- `head -1 src/app/(dashboard)/dashboard/requests/page.tsx` — does NOT contain `'use client'` (page stays RSC)

## Observability Impact

- Signals added/changed: None — animations are visual-only
- How a future agent inspects this: Browser DevTools on dashboard pages shows `motion.ul` / `motion.li` elements with staggered transform/opacity styles; profile sections show `motion.div` wrappers with whileInView
- Failure state exposed: Build errors if motion imports fail in RSC context (must be in client components only); stagger not visible if variants are misconfigured (no error, just instant render)

## Inputs

- `src/lib/animation.ts` — `staggerContainer`, `staggerItem`, `fadeSlideUp`, `VIEWPORT_ONCE` from T01
- `src/app/(dashboard)/dashboard/requests/page.tsx` — RSC rendering RequestCard list
- `src/app/(dashboard)/dashboard/sessions/page.tsx` — RSC rendering ConfirmedSessionCard list
- `src/app/(dashboard)/dashboard/page.tsx` — RSC rendering StatsBar and overview
- `src/components/dashboard/StatsBar.tsx` — client component for stat cards
- `src/app/[slug]/page.tsx` — RSC rendering profile sections with accent_color logic

## Expected Output

- `src/components/dashboard/AnimatedList.tsx` — stagger list wrapper + list item
- `src/app/(dashboard)/dashboard/requests/page.tsx` — card list wrapped with AnimatedList
- `src/app/(dashboard)/dashboard/sessions/page.tsx` — card list wrapped with AnimatedList
- `src/app/(dashboard)/dashboard/page.tsx` — overview content animated
- `src/components/dashboard/StatsBar.tsx` — stat cards with stagger animation
- `src/components/profile/AnimatedProfile.tsx` — thin profile section wrapper
- `src/app/[slug]/page.tsx` — profile sections wrapped with AnimatedProfile, accent_color untouched
