---
id: T01
parent: S02
milestone: M003
provides:
  - motion package installed (v12.36.0)
  - shared animation constants module (src/lib/animation.ts)
  - unit tests for animation constants (21 tests)
  - scroll-reveal animations on all 5 landing page sections
  - AnimatedSection reusable client wrapper component
  - AnimatedSteps stagger wrapper for HowItWorks grid
key_files:
  - src/lib/animation.ts
  - src/lib/animation.test.ts
  - src/components/landing/AnimatedSection.tsx
  - src/components/landing/AnimatedSteps.tsx
  - src/app/page.tsx
key_decisions:
  - Pre-render Lucide icons as JSX in RSC parent and pass as ReactNode props to avoid "Functions cannot be passed to Client Components" error
  - Use thin client wrapper pattern (AnimatedSection) to keep landing sections as RSCs
  - Import from "motion/react-client" for App Router tree-shaking optimization
patterns_established:
  - AnimatedSection wrapper for scroll-triggered fade+slide reveals with whileInView + viewport once
  - staggerContainerSlow + staggerItem variants pattern for list/grid animations
  - VIEWPORT_ONCE shared config object for consistent viewport behavior
observability_surfaces:
  - npm test -- src/lib/animation — validates all animation constant shapes
  - Browser DevTools → Elements → motion.div elements with style attributes (transform, opacity)
duration: 20m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Installed motion, created animation constants, and added landing page scroll reveals

**Installed motion v12.36.0, created shared animation constants module with 7 exports, wrote 21 unit tests, and wired scroll-triggered fade+slide reveals on all 5 landing page sections.**

## What Happened

1. Installed `motion` v12.36.0 — React 19 peer dep satisfied, `motion/react-client` importable.
2. Created `src/lib/animation.ts` with all planned exports: `fadeSlideUp`, `staggerContainer`, `staggerContainerSlow`, `staggerItem`, `pageFade`, `slideStep`, `microPress`, `VIEWPORT_ONCE`, plus three transition presets (`enterTransition`, `fastTransition`, `springTransition`).
3. Created `src/lib/animation.test.ts` with 21 assertions covering variant shapes, opacity values, stagger config, viewport settings, spring params, and directional slide functions.
4. Created `AnimatedSection.tsx` — thin `'use client'` wrapper using `motion.div whileInView` with `viewport={{ once: true }}`. Supports optional delay and variant override for stagger containers.
5. Created `AnimatedSteps.tsx` — `'use client'` stagger wrapper for the HowItWorks 3-step grid using `staggerContainerSlow` + `staggerItem` variants.
6. Updated `page.tsx` — wrapped all 5 landing sections with `AnimatedSection`.
7. Updated `TeacherMockSection.tsx` — added motion.div animation directly (already `'use client'`).
8. Updated `HowItWorksSection.tsx` — extracted step data (without icon functions), pre-rendered Lucide icons as JSX in the RSC parent, and passed both to `AnimatedSteps` client component.

## Verification

- `npm run build` — exits 0, zero errors ✅
- `npm test -- src/lib/animation` — 21/21 tests pass ✅
- Dev server at `/` — scrolled through all 5 sections, each fades+slides in as it enters viewport ✅
- Scrolled back up — sections remain visible, do NOT re-animate (once: true working) ✅
- Browser console — no errors, no hydration mismatches ✅
- No failed network requests ✅

### Slice-level checks (partial — T01 is task 1 of 4):
- ✅ `npm run build` — exits 0
- ✅ `npm test -- src/lib/animation` — passes
- ✅ Landing page at `/` — all 5 sections animate in on scroll
- ⬜ Dashboard page transitions (T02)
- ⬜ Onboarding step slides (T02)
- ⬜ Dashboard card staggers (T03)
- ⬜ Teacher profile section fades (T03)
- ⬜ Button press feedback (T04)
- ⬜ Accent color unchanged (T03)

## Diagnostics

- `npm test -- src/lib/animation` validates constant shapes
- Browser DevTools → Elements → look for `div` elements with `style` containing `transform` and `opacity` (motion.div renders as plain div with inline styles)
- Build errors from incorrect motion imports surface immediately in `npm run build`

## Deviations

- **Lucide icon prop serialization**: The original plan called for passing step data (including icon components) directly to the AnimatedSteps client component. React's RSC→Client serialization boundary rejects function references. Fixed by pre-rendering icons as JSX ReactNodes in the RSC parent and passing them via `stepIcons: React.ReactNode[]` prop.
- **Added `staggerContainerSlow` variant**: Plan mentioned 0.1 stagger for landing sections vs 0.07 for lists. Created a separate `staggerContainerSlow` export to distinguish the two use cases rather than overloading a single variant.
- **Added transition presets**: Exported `enterTransition`, `fastTransition`, `springTransition` as standalone objects in addition to their use within variants — enables downstream consumers to compose custom animations.

## Known Issues

None.

## Files Created/Modified

- `package.json` — added `motion` v12.36.0 dependency
- `src/lib/animation.ts` — shared animation constants module (all variants, transitions, viewport config)
- `src/lib/animation.test.ts` — 21 unit tests for animation constants
- `src/components/landing/AnimatedSection.tsx` — reusable scroll-reveal `'use client'` wrapper
- `src/components/landing/AnimatedSteps.tsx` — stagger grid `'use client'` wrapper for HowItWorks steps
- `src/components/landing/HowItWorksSection.tsx` — refactored to pass pre-rendered icons to AnimatedSteps
- `src/components/landing/TeacherMockSection.tsx` — added motion.div scroll animation on browser mock
- `src/app/page.tsx` — wrapped all 5 landing sections with AnimatedSection
