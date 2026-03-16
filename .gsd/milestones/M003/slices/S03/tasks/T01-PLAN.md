---
estimated_steps: 5
estimated_files: 6
---

# T01: Build MobileBottomNav, MobileHeader, and wire into dashboard layout

**Slice:** S03 — Mobile Dashboard & Responsive Polish
**Milestone:** M003

## Description

Create the complete mobile navigation experience for the dashboard: a bottom tab bar with all 7 nav items (icon-only), a top header bar with the Tutelo logo and teacher name, and wire both into the dashboard layout. Extract the shared nav items array to a dedicated module so Sidebar and MobileBottomNav stay in sync. Add a slide-up entrance animation on the bottom nav using the established motion patterns.

## Steps

1. **Extract shared nav items** — Create `src/lib/nav.ts` with the `navItems` array (href, label, icon) and the `isActivePath(pathname, href)` helper function. Update `Sidebar.tsx` to import from `src/lib/nav.ts` instead of defining `navItems` inline. Verify Sidebar still works by checking the build.

2. **Build MobileBottomNav** — Create `src/components/dashboard/MobileBottomNav.tsx` as a `'use client'` component:
   - Fixed to bottom (`fixed bottom-0 left-0 right-0 z-50`)
   - `md:hidden` to only show on mobile
   - Import `navItems` and `isActivePath` from `src/lib/nav.ts`
   - Render all 7 items as icon-only buttons with `flex-1` distribution (~53px each at 375px)
   - Active tab: filled icon color using `text-foreground` + a small indicator dot above the icon
   - Inactive tabs: `text-muted-foreground`
   - Pending badge on Requests tab: green dot (matching Sidebar's green pulse dot)
   - Sign out: Add a small sign-out icon as an 8th item, or integrate into the bottom nav as the last tab. Use the established `<form action={signOut}>` pattern with a submit button styled as a tab.
   - Slide-up entrance animation: wrap in `motion.nav` from `motion/react-client` with `fadeSlideUp` or a `slideFromBottom` variant
   - iOS safe area: add `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}` on the nav container
   - Background: `bg-background border-t border-border` (consistent with Sidebar's `border-r`)

3. **Build MobileHeader** — Create `src/components/dashboard/MobileHeader.tsx` as a `'use client'` component:
   - `md:hidden` to only show on mobile
   - Fixed or sticky top bar with `h-14`
   - Tutelo logo (`/logo.png`, `width={28} height={28}`, `rounded`) + "Tutelo" text
   - Teacher name truncated with `truncate` class
   - "View Page" link (same as Sidebar header)
   - Background: `bg-background border-b border-border`

4. **Wire into dashboard layout** — Update `src/app/(dashboard)/dashboard/layout.tsx`:
   - Import `MobileBottomNav` and `MobileHeader`
   - Render `<MobileHeader>` before `<main>` with `md:hidden`
   - Render `<MobileBottomNav>` after `<main>` with props: `teacherSlug`, `pendingCount`
   - Add `pb-16 md:pb-0` to `<main>` to prevent content being hidden behind the fixed bottom nav
   - Add `pt-14 md:pt-0` to `<main>` (or the layout container) if MobileHeader is fixed (to account for fixed header height)
   - Pass same props to mobile components: `teacherName`, `teacherSlug`, `pendingCount`

5. **Add slideFromBottom animation variant (if needed)** — If `fadeSlideUp` doesn't look right for the bottom nav (it slides from below), add a `slideFromBottom` variant to `src/lib/animation.ts` that starts at `y: 20, opacity: 0` and animates to `y: 0, opacity: 1`. Use `fastTransition` for snappy feel.

## Must-Haves

- [ ] `navItems` extracted to `src/lib/nav.ts` and imported by both `Sidebar.tsx` and `MobileBottomNav.tsx`
- [ ] `isActivePath` helper extracted and shared (eliminates active-state logic drift)
- [ ] `MobileBottomNav` renders all 7 nav items as icon-only tabs at `md:hidden`
- [ ] Active tab visually distinguished — matching Sidebar's active-state logic exactly
- [ ] Pending count badge on Requests tab (green dot)
- [ ] Sign out accessible from mobile bottom nav
- [ ] `MobileHeader` shows Tutelo logo + teacher name at `md:hidden`
- [ ] `<main>` has bottom padding on mobile (`pb-16 md:pb-0`)
- [ ] Slide-up entrance animation on bottom nav
- [ ] iOS safe area inset on bottom nav container
- [ ] Desktop sidebar completely unchanged — `hidden md:flex` preserved
- [ ] `npm run build` succeeds with no TypeScript errors

## Verification

- `npm run build` passes with zero errors
- Grep for `navItems` in `Sidebar.tsx` confirms it imports from `src/lib/nav.ts` (not inline)
- `MobileBottomNav.tsx` and `MobileHeader.tsx` exist and are imported in `layout.tsx`
- No `md:flex` or `md:hidden` classes accidentally removed from `Sidebar`

## Observability Impact

- Signals added/changed: None — purely presentational components
- How a future agent inspects this: Read `src/lib/nav.ts` for the canonical nav items list; check `layout.tsx` for mobile component wiring
- Failure state exposed: None — layout-only changes; broken state is visible as missing nav in browser

## Inputs

- `src/components/dashboard/Sidebar.tsx` — source of truth for nav items, active-path logic, pending badge, sign-out form pattern
- `src/app/(dashboard)/dashboard/layout.tsx` — prop threading pattern (teacherName, teacherSlug, pendingCount)
- `src/lib/animation.ts` — established animation constants (fadeSlideUp, microPress, fastTransition)
- `src/components/landing/NavBar.tsx` — logo usage pattern (`/logo.png`, rounded-lg)
- `src/components/shared/AnimatedButton.tsx` — motion import pattern (`motion/react-client`)

## Expected Output

- `src/lib/nav.ts` — shared navItems array + isActivePath helper
- `src/components/dashboard/MobileBottomNav.tsx` — complete bottom tab bar component
- `src/components/dashboard/MobileHeader.tsx` — complete mobile header component
- `src/components/dashboard/Sidebar.tsx` — updated to import from shared nav
- `src/app/(dashboard)/dashboard/layout.tsx` — updated with mobile components + main padding
- `src/lib/animation.ts` — possibly updated with slideFromBottom variant
