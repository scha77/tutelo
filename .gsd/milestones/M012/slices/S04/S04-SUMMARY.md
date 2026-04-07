---
id: S04
parent: M012
milestone: M012
provides:
  - Motion-free dashboard routes — no motion library chunks loaded on any /dashboard/* or /parent/* page
  - CSS data-state transition pattern for future components needing open/close animations
requires:
  []
affects:
  []
key_files:
  - src/components/dashboard/MobileBottomNav.tsx
  - src/components/parent/ParentMobileNav.tsx
  - src/components/dashboard/RequestCard.tsx
  - src/components/dashboard/ConfirmedSessionCard.tsx
  - src/components/dashboard/SwipeFileCard.tsx
  - src/components/dashboard/QRCodeCard.tsx
  - src/components/dashboard/FlyerPreview.tsx
  - src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx
key_decisions:
  - Used data-state CSS pattern for AnimatePresence exit animation replacement — keeps elements in DOM with pointer-events-none when closed
  - Preserved AnimatedButton.tsx and animation.ts for landing/profile/onboarding — only dashboard and parent routes stripped of motion
  - Used Write (full-file rewrite) instead of Edit for JSX files with motion elements to avoid partial-replace corruption
  - Reused existing animate-list and animate-list-item CSS classes from globals.css for entrance and stagger animations
patterns_established:
  - data-state CSS transition pattern for open/close animations without AnimatePresence
  - Motion-free dashboard: all dashboard/parent routes use CSS-only transitions while motion remains available for public-facing routes
  - animate-list/animate-list-item CSS stagger pattern as drop-in replacement for motion staggerContainer/staggerItem
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-07T06:43:22.383Z
blocker_discovered: false
---

# S04: Asset & Bundle Audit

**Eliminated motion library from all dashboard and parent routes (~135KB savings), converted 8 components to CSS-only transitions, deleted dead PageTransition component, and confirmed clean build deploying to Vercel Hobby.**

## What Happened

This slice removed the motion animation library from all dashboard and parent layout routes, replacing it with CSS-only transitions. The work was split across two tasks.

**T01** targeted the two layout-level navigation components — MobileBottomNav and ParentMobileNav — which caused every dashboard and parent route to load the ~135KB motion chunk. MobileBottomNav's AnimatePresence exit animation (the trickiest part) was replaced with a `data-state` CSS pattern: backdrop and slide panel stay in DOM always, toggled by `data-state="open"/"closed"` with CSS transitions and `pointer-events-none` when closed. ParentMobileNav's entrance animation was replaced with the existing `animate-list-item` class from globals.css.

**T02** converted six remaining page-level components: RequestCard, ConfirmedSessionCard, SwipeFileCard, QRCodeCard, FlyerPreview, and SwipeFileSection. AnimatedButton wrappers were replaced with `div` + `transition-transform hover:scale-[1.02] active:scale-[0.97]`. Motion `m.div`/`m.button`/`m.a` elements were replaced with plain HTML elements. SwipeFileSection's stagger animation was converted to the `animate-list`/`animate-list-item` CSS pattern. Dead `PageTransition.tsx` was deleted (zero imports confirmed). AnimatedButton.tsx was deliberately preserved — it serves landing page components where motion is still appropriate.

All 8 converted components now use zero motion imports. The motion library remains available for landing page, profile page, and onboarding components via `src/lib/animation.ts` and `src/components/shared/AnimatedButton.tsx`. HeroSection confirmed using `next/image` for banner and avatar. Build completes successfully generating all 72 static pages with no errors.

## Verification

All verification checks passed:

1. **No motion imports in MobileBottomNav/ParentMobileNav:** `grep -r "from.*motion" src/components/dashboard/MobileBottomNav.tsx src/components/parent/ParentMobileNav.tsx` → exit code 1 (no matches) ✅
2. **No motion imports in any dashboard route:** `grep -r "from.*motion" src/components/dashboard/ src/components/parent/ParentMobileNav.tsx src/app/(dashboard)/` → exit code 1 (no matches) ✅
3. **No AnimatedButton imports in dashboard:** `grep -r "from.*AnimatedButton" src/components/dashboard/` → exit code 1 (no matches) ✅
4. **PageTransition deleted:** `test ! -f src/components/shared/PageTransition.tsx` → exit code 0 ✅
5. **AnimatedButton preserved:** `grep -r "AnimatedButton" src/components/shared/AnimatedButton.tsx` → found ✅
6. **HeroSection uses next/image:** `grep "next/image" src/components/profile/HeroSection.tsx` → import confirmed ✅
7. **TypeScript clean:** `npx tsc --noEmit` → exit code 0 ✅
8. **Build succeeds:** `npm run build` → 72 static pages, all dashboard routes compile cleanly ✅
9. **Motion preserved for non-dashboard:** Landing page, profile, and onboarding components still import motion ✅

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `src/components/dashboard/MobileBottomNav.tsx` — Removed all motion imports; converted AnimatePresence exit animation to data-state CSS pattern; entrance animation to animate-list-item class
- `src/components/parent/ParentMobileNav.tsx` — Removed motion imports; replaced m.nav slideFromBottom with plain nav + animate-list-item class
- `src/components/dashboard/RequestCard.tsx` — Replaced AnimatedButton wrappers with div + transition-transform hover/active scale classes
- `src/components/dashboard/ConfirmedSessionCard.tsx` — Replaced AnimatedButton wrappers with div + transition-transform hover/active scale classes
- `src/components/dashboard/SwipeFileCard.tsx` — Replaced m.button + microPress with plain button + CSS transition classes
- `src/components/dashboard/QRCodeCard.tsx` — Replaced m.div + fadeSlideUp with div + animate-list-item; m.button + microPress with button + CSS transitions
- `src/components/dashboard/FlyerPreview.tsx` — Replaced m.div + fadeSlideUp with div + animate-list-item; m.a + microPress with a + CSS transitions
- `src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx` — Replaced motion staggerContainer/staggerItem with animate-list/animate-list-item CSS pattern
- `src/components/shared/PageTransition.tsx` — Deleted — zero imports confirmed, dead code
