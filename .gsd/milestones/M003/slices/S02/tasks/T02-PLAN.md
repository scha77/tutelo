---
estimated_steps: 4
estimated_files: 5
---

# T02: Add page transitions and onboarding step animations

**Slice:** S02 — Animation System & App-Wide Polish
**Milestone:** M003

## Description

Wire page transitions using `template.tsx` + AnimatePresence for dashboard and root routes (ANIM-02), and add slide/fade transitions between onboarding wizard steps with directional awareness (ANIM-03). These are the two surfaces that require AnimatePresence orchestration — the trickiest motion pattern in App Router.

## Steps

1. Create `src/components/shared/PageTransition.tsx` — a `'use client'` component:
   - Imports from `"motion/react-client"` (AnimatePresence, motion)
   - Imports `pageFade` variant from `@/lib/animation`
   - Accepts `children` and a `transitionKey` prop (string)
   - Renders `<AnimatePresence mode="wait"><m.div key={transitionKey} {...pageFade}>{children}</m.div></AnimatePresence>`
   - Duration: 0.2s fade (fast enough to avoid feeling sluggish)
2. Create `src/app/(dashboard)/dashboard/template.tsx`:
   - Imports `PageTransition`
   - Uses `usePathname()` from `next/navigation` as the transition key
   - Wraps `{children}` in `<PageTransition transitionKey={pathname}>`
   - Note: `template.tsx` remounts on every navigation (unlike layout.tsx), giving AnimatePresence the key change it needs
3. Create `src/app/template.tsx` — root level page transition:
   - Same pattern as dashboard template
   - Provides fade transitions between landing page ↔ login ↔ onboarding
   - Only applies to the root layout level (dashboard has its own template)
4. Update `src/components/onboarding/OnboardingWizard.tsx`:
   - Import `AnimatePresence` and `motion` from `"motion/react-client"`
   - Import `slideStep` variant from `@/lib/animation`
   - Add `direction` state (1 for forward, -1 for back) — updated when next/back buttons are clicked
   - Replace the `{currentStep === N && <WizardStepN />}` block: wrap all three conditionals in `<AnimatePresence mode="wait" custom={direction}>` with a single `<m.div key={currentStep} custom={direction} variants={slideStep} initial="enter" animate="center" exit="exit">` containing the active step
   - `slideStep` variants use `custom` for directional slide: enter slides from `x: direction * 30`, exit slides to `x: direction * -30`

## Must-Haves

- [ ] Dashboard route changes (e.g. requests → sessions) show a fade transition
- [ ] Root-level navigation (landing → login → onboarding) shows a fade transition
- [ ] Onboarding wizard steps slide with directional awareness (forward = slide left, back = slide right)
- [ ] AnimatePresence `mode="wait"` ensures exit completes before enter starts
- [ ] Sidebar does NOT animate/re-render on dashboard navigation (persists in layout.tsx)
- [ ] `npm run build` passes with zero errors

## Verification

- `npm run build` — exits 0
- Dev server: navigate from `/dashboard/requests` to `/dashboard/sessions` — old page fades out, new page fades in (no jarring flash)
- Dev server: navigate from `/` to `/login` — fade transition visible
- Dev server: onboarding wizard — click "Next" to advance, step slides left; click "Back", step slides right
- Sidebar remains stable during dashboard navigation (no flicker, no re-animation)

## Observability Impact

- Signals added/changed: None — page transitions are purely visual
- How a future agent inspects this: Check for `template.tsx` files at expected route levels; inspect OnboardingWizard for AnimatePresence wrapper; browser DevTools shows motion.div with opacity transitions between routes
- Failure state exposed: If AnimatePresence fails to detect key change, pages will render without transition — visible in browser but no error thrown. Build errors surface import issues.

## Inputs

- `src/lib/animation.ts` — `pageFade` and `slideStep` variants from T01
- `src/app/(dashboard)/dashboard/layout.tsx` — existing dashboard layout (Sidebar stays here, not in template)
- `src/components/onboarding/OnboardingWizard.tsx` — existing wizard with `currentStep` state and conditional step rendering
- S02-RESEARCH.md — template.tsx remount behavior, AnimatePresence pitfalls, custom prop for directional slides

## Expected Output

- `src/components/shared/PageTransition.tsx` — reusable page transition wrapper
- `src/app/(dashboard)/dashboard/template.tsx` — dashboard page transitions
- `src/app/template.tsx` — root-level page transitions
- `src/components/onboarding/OnboardingWizard.tsx` — modified with AnimatePresence step transitions
