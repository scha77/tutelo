---
id: T01
parent: S03
milestone: M003
provides:
  - Shared navItems array and isActivePath helper in src/lib/nav.ts
  - MobileBottomNav component (fixed bottom bar, 7 nav + sign out, slide-up animation, iOS safe area)
  - MobileHeader component (fixed top bar, Tutelo logo + teacher name + View Page link)
  - Dashboard layout wired with mobile components and proper main padding
  - slideFromBottom animation variant in shared animation module
key_files:
  - src/lib/nav.ts
  - src/components/dashboard/MobileBottomNav.tsx
  - src/components/dashboard/MobileHeader.tsx
  - src/components/dashboard/Sidebar.tsx
  - src/app/(dashboard)/dashboard/layout.tsx
  - src/lib/animation.ts
key_decisions:
  - Extracted navItems and isActivePath to src/lib/nav.ts — single source of truth for both Sidebar and MobileBottomNav
  - Sign out implemented as 8th tab in bottom nav (form + submit button) rather than putting it in the header — keeps header clean, all actions in one strip
  - Icon-only bottom nav with sr-only labels for accessibility — saves space at 375px viewport
  - slideFromBottom animation added to shared animation.ts (not inline) for reuse
patterns_established:
  - Shared nav config in src/lib/nav.ts — any new nav item goes here, both Sidebar and MobileBottomNav pick it up
  - Fixed mobile header + fixed bottom nav pattern with pt-14 pb-16 on main (md:pt-0 md:pb-0 for desktop)
observability_surfaces:
  - none — purely presentational components
duration: 30m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Built MobileBottomNav, MobileHeader, and wired into dashboard layout

**Extracted shared nav items, built mobile bottom tab bar and header, wired both into the dashboard layout with proper spacing and animation.**

## What Happened

1. **Extracted shared nav items** — Created `src/lib/nav.ts` with the `navItems` array (7 items: Overview, Requests, Sessions, Students, Page, Availability, Settings) and the `isActivePath(pathname, href)` helper. Updated `Sidebar.tsx` to import from the shared module instead of defining navItems inline. Sidebar's lucide icon imports were cleaned up (removed 7 icons now imported via nav.ts).

2. **Built MobileBottomNav** — Created `src/components/dashboard/MobileBottomNav.tsx` as a `'use client'` component. Fixed to bottom with `z-50`, hidden on desktop via `md:hidden`. Renders all 7 nav items as icon-only links with `flex-1` distribution plus sign out as an 8th tab. Active tab shows a small dot above the icon and uses `text-foreground`. Requests tab has a green pulse dot when `pendingCount > 0`. Uses `slideFromBottom` animation from shared animation module. Includes `paddingBottom: 'env(safe-area-inset-bottom)'` for iOS notch devices.

3. **Built MobileHeader** — Created `src/components/dashboard/MobileHeader.tsx` as a `'use client'` component. Fixed to top with `h-14`, hidden on desktop via `md:hidden`. Shows Tutelo logo (28x28, rounded), truncated teacher name, and "View Page" external link.

4. **Wired into dashboard layout** — Updated `layout.tsx` to import and render both mobile components. Added `pt-14 pb-16 md:pt-0 md:pb-0` to `<main>` to prevent content from being hidden behind the fixed mobile header/nav.

5. **Added slideFromBottom animation** — Added `slideFromBottom` variant to `src/lib/animation.ts` using `fastTransition` (0.25s easeOut), starting at `y: 20, opacity: 0`.

## Verification

- ✅ `npm run build` passes with zero TypeScript errors
- ✅ Grep confirms `Sidebar.tsx` imports `navItems` from `@/lib/nav` (not inline)
- ✅ Grep confirms `Sidebar.tsx` still has `hidden` + `md:flex md:flex-col` classes (unchanged)
- ✅ `MobileBottomNav.tsx` and `MobileHeader.tsx` exist and are imported in `layout.tsx`
- ✅ Browser at 390px mobile viewport: bottom nav visible with all 8 icons, header shows "Testing Cha" + "View Page", active indicator dot works on Overview and Requests tabs
- ✅ Browser at 390px: Requests tab green pending badge visible, navigation between tabs works
- ✅ Browser at 1280px desktop: sidebar visible with all 7 items + sign out, no bottom nav visible, no mobile header visible
- ✅ 6/6 explicit browser assertions passed (url_contains, selector_visible for nav.fixed and header.fixed, text_visible for teacher name, View Page, and page heading)

### Slice-level verification (partial — T01 of 2):
- ✅ `npm run build` — no TypeScript errors, no regressions
- ✅ Browser at mobile viewport: bottom nav visible, all 7 tabs present, active state works, header with logo visible, content not hidden behind nav
- ✅ Desktop verification: sidebar unchanged, no bottom nav visible
- Browser tab navigation for all 7 tabs — deferred to T02

## Diagnostics

None — purely presentational components. Inspect by viewing the dashboard at mobile viewport width (<768px). Desktop layout unaffected.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/nav.ts` — New. Shared navItems array and isActivePath helper
- `src/components/dashboard/MobileBottomNav.tsx` — New. Fixed bottom tab bar with 7 nav + sign out
- `src/components/dashboard/MobileHeader.tsx` — New. Fixed top header with logo + teacher name
- `src/components/dashboard/Sidebar.tsx` — Updated imports to use shared nav.ts; removed inline navItems and isActivePath logic
- `src/app/(dashboard)/dashboard/layout.tsx` — Added MobileHeader + MobileBottomNav + main padding
- `src/lib/animation.ts` — Added slideFromBottom animation variant
