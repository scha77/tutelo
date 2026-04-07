---
estimated_steps: 39
estimated_files: 7
skills_used: []
---

# T02: Remove motion from dashboard page components, delete dead code, and verify build

## Description

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

## Inputs

- ``src/components/dashboard/MobileBottomNav.tsx` — already converted by T01 (no motion imports)`
- ``src/components/parent/ParentMobileNav.tsx` — already converted by T01`
- ``src/components/dashboard/RequestCard.tsx` — imports AnimatedButton`
- ``src/components/dashboard/ConfirmedSessionCard.tsx` — imports AnimatedButton`
- ``src/components/dashboard/SwipeFileCard.tsx` — uses m.button with microPress`
- ``src/components/dashboard/QRCodeCard.tsx` — uses m.div with fadeSlideUp, m.button with microPress`
- ``src/components/dashboard/FlyerPreview.tsx` — uses m.div with fadeSlideUp, m.a with microPress`
- ``src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx` — uses m.div with stagger variants`
- ``src/components/shared/PageTransition.tsx` — dead code, zero imports`
- ``src/app/globals.css` — contains animate-list CSS pattern for stagger replacement`

## Expected Output

- ``src/components/dashboard/RequestCard.tsx` — AnimatedButton replaced with CSS transition div`
- ``src/components/dashboard/ConfirmedSessionCard.tsx` — AnimatedButton replaced with CSS transition div`
- ``src/components/dashboard/SwipeFileCard.tsx` — plain button with CSS transitions`
- ``src/components/dashboard/QRCodeCard.tsx` — plain div/button with CSS animations`
- ``src/components/dashboard/FlyerPreview.tsx` — plain div/a with CSS animations`
- ``src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx` — CSS animate-list stagger`
- ``src/components/shared/PageTransition.tsx` — deleted`

## Verification

grep -r 'from.*motion' src/components/dashboard/ src/components/parent/ParentMobileNav.tsx 'src/app/(dashboard)/' 2>/dev/null; test $? -eq 1 && echo 'PASS: no motion imports in dashboard' && test ! -f src/components/shared/PageTransition.tsx && echo 'PASS: PageTransition deleted' && npm run build 2>&1 | tail -20
