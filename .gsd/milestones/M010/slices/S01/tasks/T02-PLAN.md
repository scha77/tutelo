---
estimated_steps: 63
estimated_files: 7
skills_used: []
---

# T02: Build parent dashboard layout, sidebar, mobile nav, and all three pages

Create the `(parent)` route group with auth-guarded layout, ParentSidebar, ParentMobileNav, and three pages: overview, children management, and booking history. This is the full parent dashboard UI.

## Steps

1. Create `src/lib/parent-nav.ts` — parent navigation items:
   - Overview → `/parent` (LayoutDashboard icon)
   - My Children → `/parent/children` (Users icon)
   - My Bookings → `/parent/bookings` (CalendarCheck icon)
   - Export `parentNavItems` array and reuse `isActivePath` from `src/lib/nav.ts`

2. Create `src/components/parent/ParentSidebar.tsx` — desktop sidebar:
   - Mirrors `src/components/dashboard/Sidebar.tsx` structure
   - Props: `userName: string`, `childrenCount: number`, `hasTeacherRole: boolean`
   - Shows Tutelo logo, user name, nav items from `parentNavItems`
   - If `hasTeacherRole`, show 'Go to Teacher Dashboard' link to `/dashboard`
   - Badge on 'My Children' showing `childrenCount` if > 0
   - Sign out button using `signOut` server action
   - Mark as `'use client'` (uses `usePathname`)

3. Create `src/components/parent/ParentMobileNav.tsx` — mobile bottom nav:
   - Mirrors `src/components/dashboard/MobileBottomNav.tsx`
   - Icon-only bottom tabs for the 3 parent nav items
   - Mark as `'use client'`

4. Create `src/app/(parent)/layout.tsx` — parent layout:
   - Server component. Uses `getUser()` for auth (NOT `getClaims()`)
   - If no user → `redirect('/login?redirect=/parent')`
   - Query `teachers` table to check dual-role → pass `hasTeacherRole` boolean to sidebar
   - Query `children` count for sidebar badge
   - Render ParentSidebar + ParentMobileNav + `{children}` in same flex layout as teacher dashboard

5. Create `src/app/(parent)/parent/page.tsx` — Overview page:
   - Server component. Fetch user's children count and upcoming bookings count
   - Display welcome message with user email/name
   - Stats cards: number of children, upcoming sessions, past sessions
   - Quick links to 'Add a Child' and 'Find a Tutor' (link to `/tutors`)

6. Create `src/app/(parent)/parent/children/page.tsx` — Children management:
   - Client component (`'use client'`) — needs interactivity for add/edit/delete
   - Fetch children from `GET /api/parent/children` on mount
   - Display children as cards (name, grade, created date)
   - 'Add Child' button opens inline form (name input, optional grade input)
   - Each child card has Edit and Delete buttons
   - Edit shows inline form pre-filled with child data
   - Delete shows confirmation dialog
   - Uses shadcn/ui components: Card, Button, Input, Label, Dialog (for delete confirm)

7. Create `src/app/(parent)/parent/bookings/page.tsx` — Booking history:
   - Server component. Port logic from existing `src/app/account/page.tsx`
   - Fetch bookings where `parent_id = user.id`, join teacher info
   - Split into upcoming/past sections
   - Show child name from `children` join when `child_id` is present, else `student_name`
   - Include rebook link for past sessions

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase getUser() | Redirect to /login | Redirect to /login | Redirect to /login |
| Children API fetch | Show empty state + retry button | Show error toast | Show empty state |
| Bookings query | Show 'No bookings yet' | Show loading skeleton | Show empty state |

## Must-Haves

- [ ] Parent layout with `getUser()` auth guard
- [ ] ParentSidebar with nav items, dual-role cross-link, sign out
- [ ] ParentMobileNav with icon-only bottom tabs
- [ ] Overview page with stats cards
- [ ] Children page with full add/edit/delete UI
- [ ] Bookings page with upcoming/past split
- [ ] All components use shadcn/ui consistently

## Verification

- `npx tsc --noEmit` passes
- `npx next build` succeeds (all new pages compile)
- All 7 new files exist and are non-empty

## Inputs

- ``src/app/(dashboard)/dashboard/layout.tsx` — teacher layout pattern to mirror`
- ``src/components/dashboard/Sidebar.tsx` — teacher sidebar pattern to mirror`
- ``src/components/dashboard/MobileBottomNav.tsx` — teacher mobile nav pattern to mirror`
- ``src/lib/nav.ts` — navigation helpers (isActivePath) to reuse`
- ``src/app/account/page.tsx` — existing booking history logic to port`
- ``src/actions/auth.ts` — signOut action for sidebar`
- ``supabase/migrations/0017_children_and_parent_dashboard.sql` — children table schema (from T01)`

## Expected Output

- ``src/lib/parent-nav.ts` — parent navigation items and helpers`
- ``src/components/parent/ParentSidebar.tsx` — parent desktop sidebar`
- ``src/components/parent/ParentMobileNav.tsx` — parent mobile bottom nav`
- ``src/app/(parent)/layout.tsx` — parent layout with auth guard`
- ``src/app/(parent)/parent/page.tsx` — parent overview page`
- ``src/app/(parent)/parent/children/page.tsx` — children management page`
- ``src/app/(parent)/parent/bookings/page.tsx` — booking history page`

## Verification

npx tsc --noEmit && npx next build
