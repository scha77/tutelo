# S03: Mobile Navigation Overhaul

**Goal:** Teacher mobile bottom nav shows 5 labeled primary tabs (Overview, Requests, Sessions, Availability, More) with a More menu bottom panel listing remaining items with icons, labels, and descriptions. Parent mobile nav shows all 5 tabs with visible labels. Users can navigate without guessing what icons mean.
**Demo:** After this: After this: teacher mobile bottom nav shows 4-5 labeled primary tabs with a More menu for remaining items. Parent mobile nav has labeled tabs. Users can navigate without guessing what icons mean.

## Tasks
- [x] **T01: Added description field to NavItem, split nav items into primary/more exports, and rewrote MobileBottomNav with 5 visible-label tabs and an AnimatePresence bottom-sheet More panel** — The teacher mobile bottom nav currently renders all 11 nav items as icon-only tabs, which is unusable. This task extends the NavItem interface with an optional description field, splits navItems into primaryNavItems (5) and moreNavItems (7), and rewrites MobileBottomNav to render primary tabs with visible labels plus a "More" tab that opens an AnimatePresence bottom-sheet panel listing the remaining items with icon + label + description, and Sign Out at the bottom.

## Steps

1. In `src/lib/nav.ts`:
   - Add `description?: string` to the `NavItem` interface
   - Add descriptions to all 11 nav items (e.g. Students → "Manage your enrolled students", Waitlist → "View parents waiting for availability", Page → "Edit your public profile page", Promote → "Flyers, QR codes, and share links", Analytics → "Traffic and booking stats", Messages → "Chat with parents", Settings → "Account, rate, and preferences"). Primary items can have empty/no descriptions.
   - Export `primaryNavItems` = first 4 items (Overview, Requests, Sessions, Availability)
   - Export `moreNavItems` = remaining 7 items (Students, Waitlist, Page, Promote, Analytics, Messages, Settings)
   - Keep existing `navItems` export unchanged (Sidebar.tsx uses it)
   - Keep `isActivePath` unchanged

2. In `src/components/dashboard/MobileBottomNav.tsx`, full rewrite:
   - Import `primaryNavItems`, `moreNavItems` from `@/lib/nav`
   - Import `AnimatePresence` from `motion/react` and `* as m` from `motion/react-client`
   - Add `const [moreOpen, setMoreOpen] = useState(false)` state
   - Render primary tabs (4 items) with visible labels below icons (remove `sr-only`, use `text-[10px]` visible text). Keep active indicator dot and pending badge on Requests.
   - Render a 5th "More" tab with `Ellipsis` icon (from lucide-react) + visible "More" label. When `moreOpen`, highlight the More tab.
   - When More tab tapped: toggle `moreOpen` state
   - AnimatePresence wraps the More panel:
     - Backdrop: `motion.div` fixed inset-0, bg-black/40, onClick → close, z-40
     - Panel: `motion.div` fixed bottom of screen (above nav bar height), rounded-t-2xl, bg-background, z-50. Slide animation: initial y: "100%" → animate y: 0, exit y: "100%". Transition: duration 0.3, ease "easeOut".
     - Panel content: grid/list of moreNavItems, each showing Icon (h-5 w-5) + label (font-medium) + description (text-muted-foreground text-sm). Each item is a Link that also calls `setMoreOpen(false)` on click.
     - Sign Out at bottom: `<form action={signOut}>` button styled consistently, separated by a border-t.
     - Panel should have a drag handle indicator bar at top (w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto)
   - The nav bar itself keeps the same fixed-bottom positioning with safe-area padding
   - Detect if current path matches any moreNavItem — if so, highlight More tab as active

3. Verify: `npx tsc --noEmit` passes. `npx vitest run` passes (474+ tests). Visually confirm at mobile breakpoint that 5 labeled tabs appear and More panel works.

## Must-Haves

- [ ] NavItem interface has optional `description` field
- [ ] `primaryNavItems` and `moreNavItems` exported from nav.ts
- [ ] Existing `navItems` export unchanged (Sidebar compatibility)
- [ ] MobileBottomNav renders 5 labeled tabs (Overview, Requests, Sessions, Availability, More)
- [ ] Labels are visible (not sr-only)
- [ ] More tab opens AnimatePresence bottom panel with 7 items + Sign Out
- [ ] More panel items show icon + label + description
- [ ] Backdrop dismisses panel
- [ ] Pending badge on Requests preserved
- [ ] Active state indicator on primary tabs preserved
- [ ] More tab highlighted when current path matches a more-menu item
- [ ] Sign Out uses `<form action={signOut}>` pattern (server action preserved)
- [ ] `tsc --noEmit` clean
  - Estimate: 1.5h
  - Files: src/lib/nav.ts, src/components/dashboard/MobileBottomNav.tsx
  - Verify: npx tsc --noEmit && npx vitest run
- [x] **T02: Confirmed ParentMobileNav already has visible labels on all 5 tabs plus Sign Out, and ran full verification: tsc clean, 474 tests pass, next build succeeds** — The parent mobile bottom nav currently renders 5 items + sign out as icon-only tabs. This task makes all labels visible and runs the complete verification suite for the slice.

## Steps

1. In `src/components/parent/ParentMobileNav.tsx`, targeted rewrite:
   - Keep the same overall structure (fixed bottom, safe-area padding, `m.nav` with `slideFromBottom`)
   - Make labels visible: remove `sr-only` class from label spans, use `text-[10px]` visible text below icons (same pattern as updated teacher nav from T01)
   - Sign Out tab also gets visible "Sign out" label
   - Keep active state indicator dot
   - Keep `<form action={signOut}>` server action pattern
   - Ensure all 5 items + Sign Out fit comfortably (6 flex-1 items at mobile width is fine — 5 was the original + Sign Out)

2. Verify the full slice:
   - `npx tsc --noEmit` — must be clean
   - `npx vitest run` — all 474+ tests pass
   - `npx next build` — builds successfully
   - Confirm no imports of `description` from NavItem in parent-nav.ts (it reuses the interface but 5 items don't need descriptions since there's no More menu)

## Must-Haves

- [ ] ParentMobileNav renders all 5 tabs with visible labels (not sr-only)
- [ ] Sign Out has visible label
- [ ] Active state indicator preserved
- [ ] Server action signOut pattern preserved
- [ ] `tsc --noEmit` clean
- [ ] All 474+ tests pass
- [ ] `next build` succeeds
  - Estimate: 30m
  - Files: src/components/parent/ParentMobileNav.tsx
  - Verify: npx tsc --noEmit && npx vitest run && npx next build
