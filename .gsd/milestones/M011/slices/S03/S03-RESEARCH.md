# S03 Research — Mobile Navigation Overhaul

**Gathered:** 2026-04-03
**Calibration:** Targeted research — known React/motion/Next.js patterns applied to known files. The work is well-scoped but has one design decision (More menu interaction) worth validating.

---

## Summary

Both mobile nav components (`MobileBottomNav`, `ParentMobileNav`) render every nav item as **icon-only** today — labels exist only as `sr-only` spans. Teacher nav has 11 items + sign out crammed into one bar (unusable on small screens). Parent nav has 5 items + sign out with the same problem.

The fix is well-understood: add visible labels, split teacher nav into 4–5 primary tabs + a "More" tab that opens a bottom-sheet panel with remaining items. Parent nav gets visible labels only (5 items fits comfortably). No new dependencies required — the existing `motion` library (`AnimatePresence` + `motion.div`) and the existing `Dialog` primitive cover everything needed.

---

## Requirement Owned

**UI-03** — Mobile navigation overhaul with labeled primary tabs and More menu  
- Teacher: 11 unlabeled icons → 4–5 labeled primary tabs + More menu  
- Parent: 5 unlabeled icons + sign out → visible labels on all 5 tabs + sign out  
- More menu items must show label + description (per UI-03 notes)  
- Users must be able to navigate without guessing

---

## Implementation Landscape

### Files to change

| File | What changes |
|---|---|
| `src/lib/nav.ts` | Add optional `description?: string` to `NavItem` interface; populate descriptions on all 11 items; split into `primaryNavItems` (4–5 items) and `moreNavItems` (remaining) |
| `src/lib/parent-nav.ts` | No structural change needed — 5 items fit in primary tabs. May add optional `description` for consistency. |
| `src/components/dashboard/MobileBottomNav.tsx` | Full rewrite — render primary tabs with visible labels + "More" tab; More tab opens AnimatePresence bottom-sheet panel listing `moreNavItems` with icon + label + description |
| `src/components/parent/ParentMobileNav.tsx` | Targeted rewrite — remove `sr-only`, make labels visible (same tab height, smaller text), add Sign out visible label |
| `src/app/globals.css` | No change needed (`pb-safe-nav` already defined at line 135) |

### Files NOT changing
- `src/components/dashboard/Sidebar.tsx` — desktop only, uses full `navItems` already with labels, no change needed
- `src/components/parent/ParentSidebar.tsx` — desktop only, no change needed
- `src/app/(dashboard)/dashboard/layout.tsx` — passes `pendingCount` already; no additional props needed
- `src/app/(parent)/layout.tsx` — already passes `<ParentMobileNav />` with no props; no change needed

---

## Current State (exact)

### `MobileBottomNav` props
```ts
interface MobileBottomNavProps {
  pendingCount: number
}
```
- Renders all `navItems` (11 items) with `sr-only` labels
- Sign out as a `<form action={signOut}>` button at end
- Has green pulse badge on `/dashboard/requests` when `pendingCount > 0`
- Uses `slideFromBottom` animation from `@/lib/animation` on the `<m.nav>` wrapper
- `'use client'` component using `usePathname()`

### `ParentMobileNav` props
```ts
// no props
```
- Renders all `parentNavItems` (5 items) with `sr-only` labels
- Same structure as teacher nav, same Sign out pattern
- No badge logic

### `navItems` (11 items in order)
```
Overview → /dashboard            (LayoutDashboard)
Requests → /dashboard/requests   (Inbox) [has pending badge]
Sessions → /dashboard/sessions   (CalendarCheck)
Students → /dashboard/students   (Users)
Waitlist → /dashboard/waitlist   (ListOrdered)
Page     → /dashboard/page       (FileText)
Availability → /dashboard/availability (Calendar)
Promote  → /dashboard/promote    (Megaphone)
Analytics → /dashboard/analytics (BarChart2)
Messages → /dashboard/messages   (MessageSquare)
Settings → /dashboard/settings   (Settings)
```

### `parentNavItems` (5 items)
```
Overview    → /parent            (LayoutDashboard)
My Children → /parent/children   (Users)
My Bookings → /parent/bookings   (CalendarCheck)
Payment     → /parent/payment    (CreditCard)
Messages    → /parent/messages   (MessageSquare)
```

---

## Design Decisions Needed at Planning Time

### Teacher primary tab selection (4 vs 5 tabs)
The roadmap says "4-5 most-used destinations." Recommended split:

**Primary tabs (5):** Overview, Requests (with pending badge), Sessions, Availability, More  
**More menu (6 items):** Students, Waitlist, Page, Promote, Analytics, Messages, Settings + Sign Out at bottom

Rationale: Overview/Requests/Sessions are the daily workflow. Availability is set regularly. Page is visited occasionally — it moves to More. Settings/Promote/Analytics/Waitlist/Students/Messages all go in More.

This is the most defensible split; planner should make the final call. Alternatively a 4-tab split: Overview, Requests, Sessions, More (putting Availability in More too).

### More menu interaction pattern
No `vaul` (drawer library) or `Sheet` component exists in this codebase. Options:

**Option A (recommended): Custom `AnimatePresence` bottom panel**  
- State: `const [moreOpen, setMoreOpen] = useState(false)` in `MobileBottomNav`  
- `AnimatePresence` wraps a `motion.div` that slides up from y: 100% → y: 0  
- Backdrop: `motion.div` with `opacity: 0 → 0.4` behind the panel  
- Click backdrop or "Close" to dismiss  
- Pattern already proven in `OnboardingWizard.tsx` with `AnimatePresence`  
- Import: `import * as m from 'motion/react-client'` + `import { AnimatePresence } from 'motion/react'`  
- No new dependencies

**Option B: Radix Dialog with custom bottom positioning**  
- Override `DialogContent` styles to `top: auto; bottom: 0; translate: none; transform: translateX(-50%)`  
- More work, less native-feeling

**Recommended:** Option A. Matches existing motion patterns, avoids new deps, gives full control over slide-up animation.

---

## Key Technical Constraints

1. **`pendingCount` badge must work on both primary nav AND in the More menu** if Requests ever moves to More. With the recommended 5-tab split, Requests stays primary so badge stays in primary bar.

2. **`NavItem` interface change is additive** — `description?: string` (optional) means Sidebar.tsx and ParentSidebar.tsx compile without change. Nav consumers that don't use descriptions continue to work.

3. **No tests currently reference `MobileBottomNav` or `ParentMobileNav`** — confirmed by rg search over `src/__tests__/`. Safe to rewrite these components without touching tests.

4. **`pb-safe-nav` is defined in `globals.css` at line 135** as `calc(4rem + env(safe-area-inset-bottom, 0px))`. The More menu panel must appear above the nav bar (z-index aware) and the nav bar height accounts for this padding already.

5. **Parent layout has `pt-14` but no `MobileHeader`** — the `pt-14` is already in the layout but appears to be a leftover / precaution (there is no ParentMobileHeader rendered). This slice does not need to fix this but planner should note it.

6. **Sign out uses `<form action={signOut}>` pattern** — server action. This must be preserved in both primary nav and in the More menu. In the More menu, sign out should appear at the bottom of the list.

7. **`isActivePath` / `isParentActivePath` helpers are in nav files** — these remain unchanged and are reused.

---

## More Menu Item Descriptions (suggested, for planner to confirm)

```
Students    → "Manage your enrolled students"
Waitlist    → "View parents waiting for availability"
Page        → "Edit your public profile page"
Promote     → "Flyers, QR codes, and share links"
Analytics   → "Traffic and booking stats"
Messages    → "Chat with parents"
Settings    → "Account, rate, and preferences"
```

---

## Animation Patterns Already in Codebase

```ts
// animation.ts — already exported, reuse these:
slideFromBottom  // { initial: {opacity:0, y:20}, animate: {opacity:1, y:0} }
fastTransition   // { duration: 0.25, ease: 'easeOut' }

// Import pattern from OnboardingWizard.tsx (proven):
import * as m from 'motion/react-client'
import { AnimatePresence } from 'motion/react'
```

For the More panel slide-up: use a custom variant (y: "100%" → y: "0%") not the existing `slideFromBottom` (which is for the nav bar entrance). The panel should slide up from the bottom of the screen.

---

## Verification

- `tsc --noEmit` — must stay clean after `NavItem` interface change
- `npx vitest run` — all 474+ tests must still pass (no tests reference these components)
- Visual: at mobile breakpoint (< md), primary tabs show icons + labels side by side or icon-over-label; More tab opens bottom panel; parent nav shows all labels
- No regressions: active state indicator, pending badge on Requests, sign out action all preserved

---

## Skills Discovered

No new skills installed. All technologies (React/Next.js, motion/react, Tailwind CSS, Radix UI) are established in this codebase and well-understood.
