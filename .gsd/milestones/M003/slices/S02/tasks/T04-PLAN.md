---
estimated_steps: 4
estimated_files: 5
---

# T04: Add micro-interactions and final build verification

**Slice:** S02 — Animation System & App-Wide Polish
**Milestone:** M003

## Description

Add subtle micro-interaction animations (button press scale, hover spring) to key interactive elements across the app (ANIM-06), then perform a final comprehensive verification of all 6 animation surfaces to confirm the entire slice works together without regressions.

## Steps

1. Create `src/components/shared/AnimatedButton.tsx` — a `'use client'` wrapper:
   - Imports from `"motion/react-client"` and `microPress` from animation constants
   - Wraps children in `<m.div whileTap={microPress.whileTap} whileHover={{ scale: 1.02 }} transition={microPress.transition}>`
   - Accepts `className` for layout (e.g. `inline-block`, `w-full`)
   - This is a wrapper, not a replacement — it wraps existing `<Button>` components
2. Apply `AnimatedButton` to key CTAs:
   - `src/components/dashboard/RequestCard.tsx` — wrap the Accept/Decline action buttons
   - `src/components/dashboard/ConfirmedSessionCard.tsx` — wrap the Mark Complete button
   - Landing page CTAs in `src/components/landing/HeroSection.tsx` and `src/components/landing/CTASection.tsx` — wrap the "Start your page" buttons (convert to client or use AnimatedButton wrapper from page.tsx)
   - Note: Do NOT wrap every button — only primary action buttons that benefit from tactile feedback
3. Verify existing CSS transition utilities are preserved:
   - `tw-animate-css` import still in `globals.css`
   - Tailwind `transition-colors`, `transition-all`, `hover:` utilities on buttons, links, and form inputs are NOT removed
   - AnimatedButton adds motion on top of CSS transitions, does not replace them
4. Final comprehensive verification — check all 6 animation surfaces in browser:
   - (1) ANIM-01: Landing page sections fade in on scroll
   - (2) ANIM-02: Dashboard route transitions show fade
   - (3) ANIM-03: Onboarding steps slide with direction
   - (4) ANIM-04: Dashboard cards stagger in
   - (5) ANIM-05: Profile sections fade in sequentially
   - (6) ANIM-06: Buttons show press feedback
   - Run `npm run build` one final time — must exit 0 with no TypeScript errors
   - Run `npm test -- src/lib/animation` — constants tests still pass

## Must-Haves

- [ ] Primary action buttons have press scale feedback (scale to 0.97 on tap)
- [ ] Landing page CTA buttons have press feedback
- [ ] Dashboard accept/decline/complete buttons have press feedback
- [ ] Existing CSS transitions (hover, focus) are NOT removed or broken
- [ ] All 6 ANIM requirements (01-06) verifiable in browser
- [ ] `npm run build` passes with zero errors
- [ ] `npm test -- src/lib/animation` passes

## Verification

- `npm run build` — exits 0
- `npm test -- src/lib/animation` — all tests pass
- Dev server comprehensive check:
  - `/` — scroll reveals on 5 sections, CTA buttons have press feedback
  - `/dashboard/requests` → `/dashboard/sessions` — page fade transition
  - `/onboarding` — step slide transitions (if accessible without full setup, otherwise verify code structure)
  - `/dashboard/requests` — cards stagger in, accept/decline buttons have press feedback
  - `/[slug]` — profile sections fade in
- `grep "tw-animate-css" src/app/globals.css` — still present
- `grep "transition-" src/components/ui/button.tsx` — CSS transitions still present

## Observability Impact

- Signals added/changed: None
- How a future agent inspects this: AnimatedButton renders motion.div with whileTap/whileHover — visible in React DevTools component tree; browser shows scale transform on button press
- Failure state exposed: If microPress transition is misconfigured, buttons will snap instead of spring — visual only, no error. Build failures surface any import issues.

## Inputs

- `src/lib/animation.ts` — `microPress` variant from T01
- `src/components/dashboard/RequestCard.tsx` — existing action buttons
- `src/components/dashboard/ConfirmedSessionCard.tsx` — existing mark complete button
- `src/components/landing/HeroSection.tsx`, `src/components/landing/CTASection.tsx` — landing CTA buttons
- All animation work from T01-T03 — this task verifies the full integration

## Expected Output

- `src/components/shared/AnimatedButton.tsx` — micro-interaction wrapper component
- `src/components/dashboard/RequestCard.tsx` — action buttons wrapped with AnimatedButton
- `src/components/dashboard/ConfirmedSessionCard.tsx` — mark complete button wrapped
- `src/components/landing/HeroSection.tsx` — CTA button with press feedback
- `src/components/landing/CTASection.tsx` — CTA button with press feedback
- All 6 animation surfaces working, build passing, no regressions
