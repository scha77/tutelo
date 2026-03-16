# S03: Mobile Dashboard & Responsive Polish

**Goal:** Dashboard is fully navigable on mobile viewports via a bottom tab bar, with the Tutelo logo visible in a mobile header.
**Demo:** Open the dashboard at 375px viewport width → see a top header bar with Tutelo logo + teacher name, and a bottom tab bar with all 7 nav items as icons. Tap each tab to navigate. Active tab is visually highlighted. Pending badge visible on Requests tab. Sign out accessible. Content not hidden behind the bottom nav.

## Must-Haves

- Bottom tab bar visible on mobile viewports (`md:hidden`), hidden on desktop
- All 7 dashboard nav items accessible from bottom tab bar (icon-only layout)
- Active tab visually distinguished (matches Sidebar active-state logic exactly)
- Pending count badge on Requests tab (green dot + count, matching Sidebar)
- Mobile header with Tutelo logo + truncated teacher name (`md:hidden`)
- Sign out accessible from mobile (via header or tab overflow)
- `<main>` has bottom padding on mobile so content is not hidden behind the fixed nav
- Slide-up entrance animation on the bottom nav using established motion patterns
- iOS safe area inset handled on bottom nav
- Desktop sidebar remains completely unchanged (`hidden md:flex`)

## Proof Level

- This slice proves: integration
- Real runtime required: yes (browser verification at 375px viewport)
- Human/UAT required: no (browser automation + build check sufficient)

## Verification

- `npm run build` — no TypeScript errors, no regressions
- Browser verification at 375px viewport: bottom nav visible, all 7 tabs present, active state works, header with logo visible, content scrollable without being hidden behind nav
- Desktop verification: sidebar unchanged, no bottom nav visible

## Observability / Diagnostics

- Runtime signals: none — purely presentational UI components with no async state
- Inspection surfaces: browser viewport at 375px shows mobile nav; resize to ≥768px shows desktop sidebar only
- Failure visibility: broken nav renders as missing tabs or layout overflow — visually obvious in browser at 375px
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `Sidebar.tsx` (nav items array, active-path logic, pending badge, sign-out pattern), `dashboard/layout.tsx` (prop threading — teacherName, teacherSlug, pendingCount), `src/lib/animation.ts` (fadeSlideUp, microPress, springTransition), brand CSS variables from globals.css
- New wiring introduced in this slice: `MobileBottomNav` + `MobileHeader` composed into `dashboard/layout.tsx` via `md:hidden` conditional rendering; shared `navItems` extracted to `src/lib/nav.ts`
- What remains before the milestone is truly usable end-to-end: S04 (OG tags, email fix, production deploy)

## Tasks

- [x] **T01: Build MobileBottomNav, MobileHeader, and wire into dashboard layout** `est:45m`
  - Why: This is the entire implementation — extract shared nav items, build both mobile components, wire into layout with proper spacing, add entrance animation. Single deliverable task.
  - Files: `src/lib/nav.ts`, `src/components/dashboard/MobileBottomNav.tsx`, `src/components/dashboard/MobileHeader.tsx`, `src/components/dashboard/Sidebar.tsx`, `src/app/(dashboard)/dashboard/layout.tsx`, `src/lib/animation.ts`
  - Do: Extract `navItems` array to `src/lib/nav.ts`. Build `MobileBottomNav` as `'use client'` component with fixed bottom positioning, icon-only tabs, active state, pending badge, sign-out button, slide-up entrance animation, and iOS safe area inset. Build `MobileHeader` as `'use client'` component with logo + truncated teacher name. Update `Sidebar.tsx` to import from shared nav. Wire both into `layout.tsx` with `md:hidden`. Add `pb-16 md:pb-0` to `<main>`.
  - Verify: `npm run build` succeeds with no errors
  - Done when: Build passes and all new components exist with correct imports and structure

- [x] **T02: Browser-verify mobile nav at 375px and fix any layout issues** `est:30m`
  - Why: The implementation must be verified at actual mobile viewport size in a running browser to catch overflow, spacing, touch target, and visual issues that TypeScript alone cannot detect.
  - Files: any files from T01 that need adjustment
  - Do: Start dev server, navigate to dashboard at 375px viewport, verify: bottom nav has 7 tabs, active tab highlighted, header shows logo + name, content not cut off, tabs navigate correctly, desktop sidebar still works at 1280px. Fix any issues found.
  - Verify: Browser assertions pass at 375px (bottom nav visible, header visible, tabs functional) AND at 1280px (sidebar visible, no bottom nav)
  - Done when: Mobile dashboard is fully navigable at 375px with all 7 tabs, and desktop layout is unchanged at 1280px

## Files Likely Touched

- `src/lib/nav.ts` (new — shared nav items constant)
- `src/components/dashboard/MobileBottomNav.tsx` (new — bottom tab bar)
- `src/components/dashboard/MobileHeader.tsx` (new — mobile header with logo)
- `src/components/dashboard/Sidebar.tsx` (update — import navItems from shared)
- `src/app/(dashboard)/dashboard/layout.tsx` (update — add mobile components + main padding)
- `src/lib/animation.ts` (possible — add slideFromBottom variant if needed)
