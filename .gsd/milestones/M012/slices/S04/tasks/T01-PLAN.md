---
estimated_steps: 32
estimated_files: 2
skills_used: []
---

# T01: Remove motion from MobileBottomNav and ParentMobileNav layout components

## Description

MobileBottomNav (in dashboard layout) and ParentMobileNav (in parent layout) import motion, causing **every** dashboard and parent route to load the ~135KB motion library chunk. This task converts both to CSS-only animations, which is the single highest-impact change in this slice.

**MobileBottomNav** (170 lines) uses three motion features:
1. `AnimatePresence` + `m.div` for the More panel backdrop (opacity fade in/out)
2. `m.div` for the More panel slide (translateY 100% → 0 enter, 0 → 100% exit)
3. `m.nav` with `slideFromBottom` for the bottom nav entrance animation

The AnimatePresence exit animation is the trickiest part. CSS transitions require the element to stay in DOM during exit. Use a `data-state` pattern:
- Keep panel + backdrop in DOM always
- Toggle `data-state="open"` / `data-state="closed"` 
- CSS transitions handle the animation
- When closed: `pointer-events-none` prevents interaction, `translate-y-full` / `opacity-0` hides visually

**ParentMobileNav** (61 lines) only uses `m.nav` with `slideFromBottom` entrance animation. Replace with a CSS `animate-fade-slide-up` class on the `<nav>` element.

**Critical constraint:** Do NOT modify `src/lib/animation.ts` — it's still used by landing page, profile page, and onboarding components where motion is acceptable.

## Steps

1. Open `src/components/dashboard/MobileBottomNav.tsx`. Remove the `AnimatePresence` and `m` imports from motion.
2. Convert the More panel backdrop: replace `<m.div>` with `<div>`. Add `data-state={moreOpen ? 'open' : 'closed'}` attribute. Apply CSS transition classes: `transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:pointer-events-none`. Remove the conditional rendering (`{moreOpen && ...}`) — keep elements in DOM always.
3. Convert the More panel slide: replace `<m.div>` with `<div>`. Add same `data-state` attribute. Apply CSS: `transition-transform duration-300 ease-out data-[state=open]:translate-y-0 data-[state=closed]:translate-y-full data-[state=closed]:pointer-events-none`.
4. Convert the bottom nav bar: replace `<m.nav {...slideFromBottom}>` with `<nav className="... animate-fade-slide-up">` (uses existing keyframe from globals.css, or add `animate-[fade-slide-up_0.3s_ease-out]` via Tailwind arbitrary value).
5. Remove the `AnimatePresence` import from `motion/react` and the `* as m` import from `motion/react-client`. Remove the `slideFromBottom` import from `@/lib/animation` (no longer needed in this file).
6. Open `src/components/parent/ParentMobileNav.tsx`. Replace `<m.nav {...slideFromBottom}>` with `<nav>` using a CSS entrance animation class. Remove the `m` import from `motion/react-client` and `slideFromBottom` from `@/lib/animation`.
7. Verify: `grep -r "from.*motion" src/components/dashboard/MobileBottomNav.tsx src/components/parent/ParentMobileNav.tsx` returns zero results.

## Must-Haves

- [ ] MobileBottomNav has zero motion imports
- [ ] ParentMobileNav has zero motion imports
- [ ] More panel opens with slide-up + backdrop fade-in via CSS transition
- [ ] More panel closes with slide-down + backdrop fade-out via CSS transition (not instant disappear)
- [ ] Bottom nav bar renders with entrance animation on mount
- [ ] No behavioral regressions: More panel links navigate correctly, sign out works, active indicators display

## Verification

- `grep -r "from.*motion" src/components/dashboard/MobileBottomNav.tsx src/components/parent/ParentMobileNav.tsx` returns empty (exit code 1)
- `npx tsc --noEmit` passes with no type errors in these files
- `npm run build` succeeds

## Inputs

- ``src/components/dashboard/MobileBottomNav.tsx` — current motion-based implementation (170 lines)`
- ``src/components/parent/ParentMobileNav.tsx` — current motion-based implementation (61 lines)`
- ``src/app/globals.css` — existing `@keyframes fade-slide-up` and `.animate-list-item` CSS patterns (reference for entrance animation approach)`

## Expected Output

- ``src/components/dashboard/MobileBottomNav.tsx` — CSS-only transitions, zero motion imports`
- ``src/components/parent/ParentMobileNav.tsx` — CSS-only animation, zero motion imports`

## Verification

grep -r 'from.*motion' src/components/dashboard/MobileBottomNav.tsx src/components/parent/ParentMobileNav.tsx; test $? -eq 1 && echo 'PASS: no motion imports' && npx tsc --noEmit 2>&1 | tail -5
