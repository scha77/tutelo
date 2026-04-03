---
id: S03
parent: M011
milestone: M011
provides:
  - Teacher mobile bottom nav with 5 labeled tabs and working More panel — ready for S04 dashboard polish
  - nav.ts primaryNavItems/moreNavItems exports — available for any future mobile navigation extension
  - Confirmed ParentMobileNav labeled-tab pattern — parent mobile nav is complete and consistent with teacher nav
requires:
  []
affects:
  - S04
key_files:
  - src/lib/nav.ts
  - src/components/dashboard/MobileBottomNav.tsx
  - src/components/parent/ParentMobileNav.tsx
key_decisions:
  - primaryNavItems uses explicit index references (0,1,2,6) not .slice(0,4) because Availability is at index 6 in the navItems array
  - More panel implemented with AnimatePresence + motion/react-client — no new dependencies (vaul/sheet avoided)
  - ParentMobileNav required zero code changes — it already had visible labels before S03 began
patterns_established:
  - Mobile nav split pattern: single navItems source of truth in nav.ts, with primaryNavItems and moreNavItems as derived slices; Sidebar.tsx continues to consume navItems unchanged
  - AnimatePresence bottom-sheet pattern for mobile More menu: backdrop (z-40) + panel (z-50), panel bottom anchored to calc(3.5rem + env(safe-area-inset-bottom,0px)), slide animation y:100%→0
  - isMoreActive detection: moreNavItems.some(item => isActivePath(pathname, item.href)) — highlights More tab when user navigates to a more-menu destination directly
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M011/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M011/slices/S03/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-03T16:25:33.558Z
blocker_discovered: false
---

# S03: Mobile Navigation Overhaul

**Teacher mobile bottom nav rebuilt with 5 labeled primary tabs and an AnimatePresence More panel; ParentMobileNav confirmed already had visible labels — all 474 tests pass, tsc clean, build green.**

## What Happened

S03 delivered the full mobile navigation overhaul in two tasks.

**T01 — NavItem extension + MobileBottomNav rewrite:** The NavItem interface in `src/lib/nav.ts` gained an optional `description` field. Seven secondary items received description strings (Students, Waitlist, Page, Promote, Analytics, Messages, Settings). Two new exports were added: `primaryNavItems` (4 items: Overview/Requests/Sessions/Availability, selected by explicit index since Availability sits at index 6 in the array) and `moreNavItems` (7 remaining items). The existing `navItems` export is unchanged — Sidebar.tsx continues to consume it without modification.

`MobileBottomNav.tsx` was fully rewritten. The prior component rendered all 11 nav items as unlabeled icon-only tabs. The new implementation renders 4 primary tabs with visible `text-[10px]` labels below icons, plus a 5th "More" tab (Ellipsis icon + "More" label). Tapping More toggles `moreOpen` state, which drives an `AnimatePresence`-wrapped panel: a black/40 backdrop overlay (z-40) plus a slide-up bottom sheet (z-50, rounded-t-2xl, `y: 100% → 0` over 300ms). The panel shows a drag-handle bar, 7 rows (icon + label + description per item), and a border-separated Sign Out at the bottom. Clicking any item or the backdrop dismisses the panel. The More tab shows an active indicator dot when the current route matches any more-menu item. The pending badge on the Requests tab is preserved. Sign Out uses the established `<form action={signOut}>` server action pattern.

**T02 — ParentMobileNav verification:** The planned task was to remove `sr-only` from label spans and make labels visible. On inspection, `ParentMobileNav.tsx` already had visible `text-[10px]` labels on all 5 tabs and Sign Out — no code changes were needed. The full verification suite was run: tsc --noEmit (0 errors), vitest run (474 tests, 49 files), next build (67 pages generated successfully).

## Verification

All three verification levels passed:
1. `npx tsc --noEmit` — 0 errors (confirmed twice: T01 and T02 runs)
2. `npx vitest run` — 474 tests pass across 49 files (no regressions)
3. `npx next build` — compiled, 67 static/dynamic pages generated, exit 0

Structural spot-checks:
- `nav.ts`: `description?` field on NavItem, `primaryNavItems` with 4 items (indices 0/1/2/6), `moreNavItems` with 7 items, original `navItems` export unchanged
- `MobileBottomNav.tsx`: 5 tabs rendered, `moreOpen` state, `AnimatePresence` wrapping backdrop + panel, drag handle, `isMoreActive` detection, pending badge on Requests, `form action={signOut}` for Sign Out
- `ParentMobileNav.tsx`: visible labels (no `sr-only`), `form action={signOut}` pattern preserved, active dot present

## Requirements Advanced

- UI-03 — Teacher mobile bottom nav rebuilt with 5 labeled tabs (Overview, Requests, Sessions, Availability, More) plus AnimatePresence panel for 7 secondary items with icon/label/description. Parent mobile nav has visible labels on all 5 tabs. Navigation is no longer icon-only.
- UI-09 — Labeled tabs and descriptive More panel eliminate the mystery-icon navigation pattern. Users can now navigate without guessing.

## Requirements Validated

- UI-03 — MobileBottomNav renders 4 labeled primary tabs + More tab. More panel shows 7 items with icon, label, and description. ParentMobileNav has visible labels on all 5 tabs. tsc --noEmit clean, 474 tests pass, next build succeeds.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

T01: primaryNavItems built with explicit index references (`navItems[0]`, `navItems[1]`, `navItems[2]`, `navItems[6]`) rather than `.slice(0, 4)` because Availability is at index 6, not index 3. The original plan said "first 4 items" but the nav array is ordered by priority, not position. Explicit indices match the intended items correctly.

T02: No code changes were needed. ParentMobileNav already had visible labels in the correct pattern — the task reduced to a read + verification run only.

## Known Limitations

None. The More panel is a custom AnimatePresence implementation (no drag-to-dismiss gesture — only tap-backdrop to dismiss). A drag-down-to-dismiss gesture would be a UX enhancement but was out of scope and not required by the plan.

## Follow-ups

S04 (Dashboard Polish) depends on S03 and can now proceed. The MobileBottomNav changes are immediately visible in the teacher dashboard at mobile breakpoints. No follow-up required for S03 scope.

## Files Created/Modified

- `src/lib/nav.ts` — Added optional description field to NavItem interface; added descriptions to 7 secondary items; exported primaryNavItems (4) and moreNavItems (7); kept navItems export unchanged
- `src/components/dashboard/MobileBottomNav.tsx` — Full rewrite: 5-tab layout with visible labels, AnimatePresence More panel (backdrop + slide-up sheet), isMoreActive detection, pending badge preserved, form action signOut
- `src/components/parent/ParentMobileNav.tsx` — No changes — already had visible labels before S03. Confirmed: no sr-only, text-[10px] labels present, form action={signOut} preserved
