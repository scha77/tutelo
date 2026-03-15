---
estimated_steps: 5
estimated_files: 8
---

# T01: Install motion, create animation constants, and add landing page scroll reveals

**Slice:** S02 — Animation System & App-Wide Polish
**Milestone:** M003

## Description

Install the `motion` package, create the shared animation constants module that every subsequent task depends on, write unit tests for those constants, and wire scroll-triggered reveals into all 5 landing page sections. This task delivers ANIM-01 (landing page scroll reveals) and establishes the animation foundation for the entire slice.

## Steps

1. Run `npm install motion`. Verify it resolves to v12.x with React 19 peer dep satisfied.
2. Create `src/lib/animation.ts` — export shared animation variants and constants:
   - `fadeSlideUp`: `initial: { opacity: 0, y: 24 }`, `animate: { opacity: 1, y: 0 }`, `transition: { duration: 0.4, ease: "easeOut" }`
   - `staggerContainer`: `variants` with `staggerChildren: 0.07` for lists, and a `0.1` variant for landing sections
   - `staggerItem`: child variant for stagger containers
   - `pageFade`: `initial: { opacity: 0 }`, `animate: { opacity: 1 }`, `exit: { opacity: 0 }`, `transition: { duration: 0.25 }`
   - `slideStep`: directional slide variant for onboarding (x: ±30, opacity 0→1)
   - `microPress`: `whileTap: { scale: 0.97 }`, `transition: { type: "spring", stiffness: 400, damping: 20 }`
   - `VIEWPORT_ONCE`: `{ once: true, margin: "-50px" }` — shared viewport config
3. Create `src/lib/animation.test.ts` — unit tests verifying:
   - All exported variant objects have `initial` and `animate` keys where expected
   - `fadeSlideUp.initial.opacity` is 0, `.animate.opacity` is 1
   - `staggerContainer` variants have `staggerChildren` defined
   - `VIEWPORT_ONCE.once` is true
   - `microPress.whileTap.scale` is less than 1
4. Create `src/components/landing/AnimatedSection.tsx` — a `'use client'` thin wrapper:
   - Imports `* as m from "motion/react-client"`
   - Accepts `children`, optional `className`, optional `delay`, optional `variants` override
   - Renders `<m.div initial="hidden" whileInView="visible" viewport={VIEWPORT_ONCE} variants={fadeSlideUp} ...>{children}</m.div>`
   - Default variant is fadeSlideUp; allow override for stagger containers
5. Update `src/app/page.tsx` — wrap each RSC landing section with `<AnimatedSection>`:
   - HeroSection gets a small delay (0) — appears first
   - HowItWorksSection wrapped in AnimatedSection, and internally create an `AnimatedSteps` client component in `src/components/landing/HowItWorksSection.tsx` that wraps the 3-step grid with stagger (convert to `'use client'` or create inline wrapper)
   - ProblemSolutionSection wrapped in AnimatedSection
   - TeacherMockSection is already `'use client'` — add motion directly inside
   - CTASection wrapped in AnimatedSection

## Must-Haves

- [ ] `motion` package installed and importable from `"motion/react-client"`
- [ ] `src/lib/animation.ts` exports all shared variants (fadeSlideUp, staggerContainer, staggerItem, pageFade, slideStep, microPress, VIEWPORT_ONCE)
- [ ] `src/lib/animation.test.ts` has real assertions that pass
- [ ] All 5 landing sections animate on scroll via whileInView
- [ ] `viewport={{ once: true }}` on all whileInView uses
- [ ] `npm run build` passes with zero errors

## Verification

- `npm run build` — exits 0
- `npm test -- src/lib/animation` — all tests pass
- Dev server at `/` — scroll down the page, each section fades+slides in as it enters the viewport
- Scroll back up — sections do NOT re-animate (once: true working)

## Observability Impact

- Signals added/changed: None — animation constants are pure values
- How a future agent inspects this: `npm test -- src/lib/animation` runs the constant tests; browser DevTools shows `motion.div` elements with `style` transforms
- Failure state exposed: Build errors from incorrect motion imports; test failures from malformed variants

## Inputs

- `src/components/landing/*` — 5 RSC components + 1 client component from S01
- `src/app/page.tsx` — landing page composition from S01
- S02-RESEARCH.md — animation strategy, import pattern (`motion/react-client`), viewport config

## Expected Output

- `package.json` — `motion` added to dependencies
- `src/lib/animation.ts` — shared animation constants module
- `src/lib/animation.test.ts` — unit tests for constants
- `src/components/landing/AnimatedSection.tsx` — reusable scroll-reveal wrapper
- `src/app/page.tsx` — landing sections wrapped with AnimatedSection
- Landing sections animate on scroll in browser
