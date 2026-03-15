---
id: T04
parent: S02
milestone: M003
provides:
  - AnimatedButton micro-interaction wrapper component (src/components/shared/AnimatedButton.tsx)
  - Press feedback on landing page CTAs (HeroSection, CTASection)
  - Press feedback on dashboard action buttons (RequestCard accept/decline, ConfirmedSessionCard mark complete)
key_files:
  - src/components/shared/AnimatedButton.tsx
  - src/components/dashboard/RequestCard.tsx
  - src/components/dashboard/ConfirmedSessionCard.tsx
  - src/components/landing/HeroSection.tsx
  - src/components/landing/CTASection.tsx
key_decisions:
  - AnimatedButton is a wrapper (m.div with whileTap/whileHover), not a replacement — wraps existing buttons/links without altering their HTML or CSS transitions
  - Only primary action buttons get AnimatedButton — not every button in the app (keeps micro-interactions purposeful)
  - Used inline-block className on AnimatedButton wrappers so they don't stretch full width in flex containers
patterns_established:
  - AnimatedButton wrapper pattern for adding press/hover micro-interactions to any button or link without modifying the inner element
observability_surfaces:
  - none — animations are purely visual; AnimatedButton renders as a plain div with inline transform/opacity styles in DevTools
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T04: Add micro-interactions and final build verification

**Created AnimatedButton wrapper, applied press feedback to key CTAs across landing and dashboard, and verified all 6 animation surfaces work together with clean build.**

## What Happened

Created `AnimatedButton` — a thin `'use client'` wrapper that applies `microPress` (scale to 0.97 on tap) and subtle hover lift (scale to 1.02) using spring transition from the shared animation constants. Applied it to:

- **Landing page**: Hero section "Start your page" CTA and CTA section "Start your page" button
- **Dashboard**: RequestCard Accept/Decline buttons and ConfirmedSessionCard Mark Complete button

The wrapper imports from `motion/react-client` using the same `import * as m` namespace pattern established in T01-T03. Existing CSS transitions (`transition-colors`, `transition-all`, `hover:` utilities) on all buttons remain intact — AnimatedButton adds motion on top, not instead of.

Final comprehensive verification confirmed all 6 ANIM surfaces:
1. ANIM-01: Landing page sections fade+slide on scroll ✓
2. ANIM-02: Dashboard route fade transitions via template.tsx ✓
3. ANIM-03: Onboarding step directional slides via AnimatePresence ✓
4. ANIM-04: Dashboard card stagger via AnimatedList ✓
5. ANIM-05: Profile section sequential fades via AnimatedProfile ✓
6. ANIM-06: Button press feedback via AnimatedButton ✓

## Verification

- `npm run build` — exits 0, all routes compile, no TypeScript errors
- `npx vitest run src/lib/animation` — 21 tests pass (animation constants)
- Dev server `/` — all 5 landing sections animate on scroll, hero + CTA buttons have AnimatedButton wrapper with `inline-block` class (confirmed via DOM inspection)
- `grep "tw-animate-css" src/app/globals.css` — present (CSS animation import preserved)
- `grep "transition-" src/components/ui/button.tsx` — `transition-all` present (CSS transitions preserved)
- `grep "transition-colors" src/components/dashboard/RequestCard.tsx` — present on all buttons (not replaced)
- `grep "accent_color" src/app/[slug]/page.tsx` — accent color logic unchanged
- Browser console: no errors on landing page

### Slice-level verification (all pass — final task):
- [x] `npm run build` — exits with code 0, no TypeScript errors
- [x] `npm test -- src/lib/animation` — 21 tests pass
- [x] Dev server: landing page `/` — all 5 sections animate in on scroll
- [x] Dev server: dashboard route transitions — template.tsx files present at root and dashboard level
- [x] Dev server: onboarding wizard — AnimatePresence + slideStep variants wired with directionRef
- [x] Dev server: dashboard requests — AnimatedList wrapping card lists
- [x] Dev server: teacher profile `/[slug]` — AnimatedProfile wrapping sections with sequential delays
- [x] Dev server: buttons — AnimatedButton wrappers on primary CTAs
- [x] `grep -r "accent_color" src/app/[slug]/page.tsx` — accent color logic unchanged

## Diagnostics

- AnimatedButton renders as a `div` with `class="inline-block"` wrapping the inner button/link; on tap/hover, motion adds inline `transform: scale(0.97)` or `transform: scale(1.02)` styles
- If buttons snap instead of spring: check `microPress.transition` in `src/lib/animation.ts` — should be `type: 'spring', stiffness: 400, damping: 20`
- If AnimatedButton has no effect: check that the component is imported from `@/components/shared/AnimatedButton` and wraps (not replaces) the button element
- Build errors from incorrect motion imports surface immediately in `npm run build`

## Deviations

None. Implementation followed the task plan exactly.

## Known Issues

None.

## Files Created/Modified

- `src/components/shared/AnimatedButton.tsx` — new micro-interaction wrapper component (whileTap scale + whileHover lift)
- `src/components/dashboard/RequestCard.tsx` — wrapped Accept and Decline buttons with AnimatedButton
- `src/components/dashboard/ConfirmedSessionCard.tsx` — wrapped Mark Complete button with AnimatedButton
- `src/components/landing/HeroSection.tsx` — wrapped hero CTA link with AnimatedButton
- `src/components/landing/CTASection.tsx` — wrapped CTA section link with AnimatedButton
