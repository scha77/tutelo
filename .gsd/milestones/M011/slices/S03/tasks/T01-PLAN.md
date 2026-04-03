---
estimated_steps: 39
estimated_files: 2
skills_used: []
---

# T01: Extend nav data model and rewrite teacher MobileBottomNav with primary tabs + More panel

The teacher mobile bottom nav currently renders all 11 nav items as icon-only tabs, which is unusable. This task extends the NavItem interface with an optional description field, splits navItems into primaryNavItems (5) and moreNavItems (7), and rewrites MobileBottomNav to render primary tabs with visible labels plus a "More" tab that opens an AnimatePresence bottom-sheet panel listing the remaining items with icon + label + description, and Sign Out at the bottom.

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

## Inputs

- `src/lib/nav.ts`
- `src/lib/animation.ts`
- `src/components/dashboard/MobileBottomNav.tsx`
- `src/actions/auth.ts`

## Expected Output

- `src/lib/nav.ts`
- `src/components/dashboard/MobileBottomNav.tsx`

## Verification

npx tsc --noEmit && npx vitest run
