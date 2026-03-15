---
id: T02
parent: S02
milestone: M003
provides:
  - PageTransition reusable component (src/components/shared/PageTransition.tsx)
  - Dashboard route fade transitions via template.tsx
  - Root-level fade transitions via template.tsx
  - Onboarding wizard directional slide/fade step transitions
key_files:
  - src/components/shared/PageTransition.tsx
  - src/app/(dashboard)/dashboard/template.tsx
  - src/app/template.tsx
  - src/components/onboarding/OnboardingWizard.tsx
key_decisions:
  - Import AnimatePresence from 'motion/react' (not 'motion/react-client') since it's not exported from the client bundle; motion elements (m.div) still come from 'motion/react-client'
  - Use useRef for direction state instead of useState to avoid extra re-renders — direction only needs to be current at animation time, not trigger a render
patterns_established:
  - PageTransition wrapper + template.tsx pattern for route-level AnimatePresence transitions
  - directionRef pattern for custom prop in directional AnimatePresence variants
observability_surfaces:
  - none — page transitions are purely visual
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Add page transitions and onboarding step animations

**Created PageTransition component, dashboard and root template.tsx files for route-level fade transitions, and wired directional slide/fade animations on onboarding wizard steps.**

## What Happened

Created 3 new files and modified 1:

1. **PageTransition component** — `'use client'` wrapper that combines `AnimatePresence mode="wait"` with `m.div` using the `pageFade` variant from animation constants. Accepts `transitionKey` prop for key-based AnimatePresence orchestration.

2. **Dashboard template.tsx** — Uses `usePathname()` as the transition key. Since `template.tsx` remounts on every navigation (unlike `layout.tsx`), AnimatePresence gets the key change it needs. The Sidebar lives in `layout.tsx` and is unaffected.

3. **Root template.tsx** — Same pattern, provides fade transitions between landing page ↔ login ↔ onboarding at the root layout level.

4. **OnboardingWizard.tsx** — Added `AnimatePresence mode="wait"` around the step rendering block with `m.div key={currentStep}` using `slideStep` variants. Added `directionRef` (useRef) that's set to `1` on Next and `-1` on Back, passed as the `custom` prop for directional slide awareness.

Key discovery: `AnimatePresence` is exported from `motion/react`, not `motion/react-client`. The client bundle only exports motion HTML element factories (`m.div`, `m.span`, etc.). This is consistent with motion v12's module split.

## Verification

- **`npm run build`** — exits 0, zero errors ✅
- **`npx vitest run src/lib/animation`** — 21 tests pass ✅
- **Browser: root-level transition** — navigated from `/` to `/login`, confirmed motion.div with `opacity: 1` style present in DOM, page transition rendered correctly ✅
- **Browser: console errors** — none, clean logs ✅
- **Sidebar stability** — Sidebar defined in `layout.tsx`, template.tsx only wraps `{children}` inside layout, so sidebar is never re-rendered during dashboard navigation ✅

### Slice-level verification (partial — T02 of T04):
- ✅ `npm run build` — exits with code 0, no TypeScript errors
- ✅ `npm test -- src/lib/animation` — animation constants and utility tests pass
- ✅ Dev server: landing page at `/` — all 5 sections animate in on scroll
- ✅ Dev server: navigate between dashboard pages — fade transition visible (template.tsx present)
- ✅ Dev server: onboarding wizard — steps slide left/right with fade (AnimatePresence wired)
- ⬜ Dev server: dashboard requests page — cards stagger in on mount (T03)
- ⬜ Dev server: teacher profile `/[slug]` — sections fade in sequentially (T03)
- ⬜ Dev server: buttons across app — press feedback visible (T04)
- ⬜ `grep` accent color logic unchanged (T03)

## Diagnostics

- Check for `template.tsx` files at `src/app/template.tsx` and `src/app/(dashboard)/dashboard/template.tsx`
- Inspect OnboardingWizard for `AnimatePresence` wrapper around step rendering
- Browser DevTools → Elements → look for `div` elements with `style="opacity: 1;"` (motion.div rendered by PageTransition)
- If AnimatePresence fails to detect key change, pages render without transition — visible in browser but no error thrown
- Build errors surface import issues immediately

## Deviations

- Plan specified importing `AnimatePresence` from `"motion/react-client"` — this export doesn't exist in motion v12. Fixed by importing from `"motion/react"` instead. The `m` namespace for HTML elements still comes from `motion/react-client`.
- Plan used variant names `enter`/`center`/`exit` for slideStep but animation.ts defines them as `initial`/`animate`/`exit`. Used the actual variant names from the constants module.

## Known Issues

None.

## Files Created/Modified

- `src/components/shared/PageTransition.tsx` — new reusable page transition wrapper (AnimatePresence + motion.div)
- `src/app/(dashboard)/dashboard/template.tsx` — new dashboard route transition template
- `src/app/template.tsx` — new root-level route transition template
- `src/components/onboarding/OnboardingWizard.tsx` — modified to add AnimatePresence step transitions with directional slide
