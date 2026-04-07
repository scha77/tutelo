# S04: Asset & Bundle Audit

**Goal:** Remove motion library from all dashboard routes, delete dead code, and confirm the build deploys cleanly with no motion chunks in dashboard bundles.
**Demo:** After this: After this: npm run build output shows no motion-related chunks in dashboard routes; HeroSection banner and avatar confirmed as next/image; build deploys to Vercel Hobby without errors.

## Tasks
- [x] **T01: Converted MobileBottomNav and ParentMobileNav from motion library to CSS-only transitions, eliminating ~135KB motion chunk from all dashboard and parent routes** — ## Description

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
  - Estimate: 45m
  - Files: src/components/dashboard/MobileBottomNav.tsx, src/components/parent/ParentMobileNav.tsx
  - Verify: grep -r 'from.*motion' src/components/dashboard/MobileBottomNav.tsx src/components/parent/ParentMobileNav.tsx; test $? -eq 1 && echo 'PASS: no motion imports' && npx tsc --noEmit 2>&1 | tail -5
- [ ] **T02: Remove motion from dashboard page components, delete dead code, and verify build** — ## Description

After T01 removed motion from the layout components, dashboard routes still pull motion through page-level component imports. This task converts all remaining dashboard motion consumers to CSS, deletes dead code, and runs the final build audit to confirm the slice goal.

**Components to convert:**

1. **RequestCard** and **ConfirmedSessionCard** — import `AnimatedButton` which wraps children in `m.div` with `whileTap={{ scale: 0.97 }}` and `whileHover={{ scale: 1.02 }}`. Replace `<AnimatedButton className="inline-block">` wrappers with `<div className="inline-block transition-transform hover:scale-[1.02] active:scale-[0.97]">`. Remove the AnimatedButton import. **Do NOT modify AnimatedButton.tsx** — landing page components (CTASection, HeroSection) still use it.

2. **SwipeFileCard** — uses `m.button` with `microPress` (same whileTap/whileHover as AnimatedButton). Replace with `<button>` + Tailwind transition classes.

3. **QRCodeCard** — uses `m.div` with `fadeSlideUp` for container entrance, `m.button` with `microPress` for download button. Replace `m.div` with `<div className="... animate-list-item">` and `m.button` with `<button>` + transition classes.

4. **FlyerPreview** — uses `m.div` with `fadeSlideUp` for container, `m.a` with `microPress` for download link. Same conversion as QRCodeCard.

5. **SwipeFileSection** — uses `m.div` with `staggerContainer`/`staggerItem` variants for stagger animation. Replace with the existing `animate-list` CSS pattern from globals.css: parent `<div className="... animate-list">`, children get `animate-list-item` class.

6. **PageTransition** — dead code, zero imports anywhere. Delete the file.

**Critical constraint:** `AnimatedButton.tsx` must NOT be modified or deleted. It's in `src/components/shared/` and used by landing page components where motion is appropriate.

## Steps

1. Open `src/components/dashboard/RequestCard.tsx`. Remove the `AnimatedButton` import. Replace all `<AnimatedButton className="inline-block">...</AnimatedButton>` wrappers with `<div className="inline-block transition-transform hover:scale-[1.02] active:scale-[0.97]">...</div>`.
2. Open `src/components/dashboard/ConfirmedSessionCard.tsx`. Same conversion as RequestCard — replace AnimatedButton wrappers with CSS transition divs.
3. Open `src/components/dashboard/SwipeFileCard.tsx`. Remove the `m` import from motion and `microPress` from animation. Replace `<m.button {...microPress}>` with `<button className="... transition-transform hover:scale-[1.02] active:scale-[0.97]">`. Keep all other functionality identical.
4. Open `src/components/dashboard/QRCodeCard.tsx`. Remove motion and animation imports. Replace `<m.div {...fadeSlideUp}>` with `<div className="... animate-list-item">`. Replace `<m.button {...microPress}>` with `<button>` + transition classes.
5. Open `src/components/dashboard/FlyerPreview.tsx`. Same conversion as QRCodeCard. Replace `<m.div {...fadeSlideUp}>` with `<div className="... animate-list-item">`. Replace `<m.a {...microPress}>` with `<a>` + transition classes.
6. Open `src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx`. Remove motion and animation imports. Replace `<m.div variants={staggerContainer} initial="hidden" animate="visible">` with `<div className="space-y-4 animate-list">`. Replace inner `<m.div key={...} variants={staggerItem}>` with `<div className="animate-list-item">`.
7. Delete `src/components/shared/PageTransition.tsx`.
8. Run `grep -r "from.*motion" src/components/dashboard/ src/components/parent/ParentMobileNav.tsx 'src/app/(dashboard)/'` — expect zero results.
9. Run `npx tsc --noEmit` — expect no type errors.
10. Run `npm run build` — expect success, inspect route output for dashboard routes.

## Must-Haves

- [ ] RequestCard has zero motion/AnimatedButton imports
- [ ] ConfirmedSessionCard has zero motion/AnimatedButton imports
- [ ] SwipeFileCard uses plain `<button>` with CSS transitions
- [ ] QRCodeCard uses plain `<div>` + `<button>` with CSS animations
- [ ] FlyerPreview uses plain `<div>` + `<a>` with CSS animations
- [ ] SwipeFileSection uses CSS `animate-list` stagger pattern
- [ ] PageTransition.tsx deleted
- [ ] AnimatedButton.tsx is NOT modified (still used by landing pages)
- [ ] `npm run build` completes with no errors
- [ ] No motion imports in any dashboard route file

## Verification

- `grep -r "from.*motion" src/components/dashboard/ src/components/parent/ParentMobileNav.tsx 'src/app/(dashboard)/' src/components/shared/PageTransition.tsx 2>&1` returns empty or "No such file" for PageTransition
- `test ! -f src/components/shared/PageTransition.tsx && echo 'PASS: PageTransition deleted'`
- `grep -r "from.*AnimatedButton" src/components/dashboard/` returns empty
- `npx tsc --noEmit` passes
- `npm run build` succeeds
- `grep -r "AnimatedButton" src/components/shared/AnimatedButton.tsx` still exists (not deleted)
  - Estimate: 45m
  - Files: src/components/dashboard/RequestCard.tsx, src/components/dashboard/ConfirmedSessionCard.tsx, src/components/dashboard/SwipeFileCard.tsx, src/components/dashboard/QRCodeCard.tsx, src/components/dashboard/FlyerPreview.tsx, src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx, src/components/shared/PageTransition.tsx
  - Verify: grep -r 'from.*motion' src/components/dashboard/ src/components/parent/ParentMobileNav.tsx 'src/app/(dashboard)/' 2>/dev/null; test $? -eq 1 && echo 'PASS: no motion imports in dashboard' && test ! -f src/components/shared/PageTransition.tsx && echo 'PASS: PageTransition deleted' && npm run build 2>&1 | tail -20
