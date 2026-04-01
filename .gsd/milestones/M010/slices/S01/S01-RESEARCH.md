# S01 Research: Parent Dashboard & Multi-Child

**Slice:** M010/S01 — Parent Dashboard & Multi-Child  
**Requirements owned:** PARENT-04, PARENT-07, PARENT-08  
**Date:** 2026-03-31

---

## Summary

S01 is **targeted research** — the technology stack is well-understood (Next.js App Router, Supabase RLS, shadcn/ui), the patterns exist in the teacher dashboard, and the data model changes are additive (new `children` table, nullable FK on bookings). The primary risks are: (1) auth routing for parent-only users is broken today, (2) the booking form child-selector graft into an 856-line component is the largest touch point, and (3) dual-role users (teacher + parent) need a clear navigation strategy.

---

## Implementation Landscape

### What Exists Today

**`/account` page (`src/app/account/page.tsx`)** — A minimal pre-dashboard parent view. Server component. Fetches bookings by `parent_id`, shows upcoming/past. Has `getUser()` auth guard + teacher-redirect. **This is the seed; S01 replaces it with the full `/parent` dashboard.**

**Auth routing gaps:**
- `(auth)/login/page.tsx` — redirects all authenticated users to `/dashboard` if any Supabase `getClaims()` returns data. A parent-only user (no teacher row) hits `/dashboard` → layout redirects to `/onboarding`. This is a bug that S01 must fix.
- `(auth)/callback/route.ts` — OAuth callback. Checks for a teacher row; if none, redirects to `/onboarding`. Parent-only Google sign-ins will incorrectly land in `/onboarding`. **Must be updated** to redirect parent-only users to `/parent`.
- `actions/auth.ts#signIn` — has `redirectTo` support (already handles `/account`). If teacher row → `/dashboard`, else → `/onboarding`. Must add: if no teacher row → `/parent`.
- No `middleware.ts` exists. Auth protection is page-level (`getUser()` + redirect).

**Teacher dashboard pattern (`(dashboard)/dashboard/layout.tsx`):**
- Uses `getUser()` (not `getClaims()`) per the documented Next.js 16 POST re-render constraint.
- Fetches teacher row; if none → `/onboarding`.
- Passes `pendingCount` and teacher identity to `Sidebar` + `MobileBottomNav`.
- **Pattern to replicate for parent layout.** Parent layout: no teacher row needed; query children count; pass user email/name to sidebar.

**`BookingCalendar.tsx` (856 lines, `src/components/profile/BookingCalendar.tsx`):**
- The `student_name` free-text field is at ~line 706. It's `form.name` in the local form state: `{ name, subject, email, notes, phone, smsOptIn }`.
- The component already checks `supabase.auth.getUser()` client-side at lines 280, 290 (in `handleRecurringConfirm` and the auth step flow). It has an `'auth'` step that shows `InlineAuthForm`.
- The child selector must be added here. When a logged-in parent has children on file, replace the "Student's name" `<Input>` with a `<Select>` showing child options + an "Add new child" option. Guests still see the free-text field.
- This requires the component to know: (a) whether the user is logged in, (b) their children list. Since `BookingCalendar` is `'use client'`, it can call `supabase.auth.getUser()` on mount and fetch children via an API route. **Do not add a server-side prop** — the component lives inside the `[slug]` page which must stay server-rendered for SEO.

**Database state:**
- `bookings` table: `student_name TEXT NOT NULL`, `parent_id UUID REFERENCES auth.users(id)` (nullable). No `child_id` column yet.
- No `children` table in any existing migration (0001–0016).
- `recurring_schedules` has `stripe_customer_id` (per-schedule, not per-parent).

### What Must Be Built

#### 1. Database migration: `children` table + `child_id` on bookings

```sql
-- 0017_children_and_parent_dashboard.sql
CREATE TABLE children (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  grade      TEXT,          -- e.g. '5th Grade', 'K', '10th Grade'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_children_parent ON children (parent_id);
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
-- RLS: parent can only CRUD their own children
CREATE POLICY "children_owner_all" ON children FOR ALL
  USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());

-- Add child_id to bookings (nullable — old bookings keep student_name)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id);
```

Per `supabase-postgres-best-practices` skill: use `TIMESTAMPTZ` not `TIMESTAMP`, enable RLS, create index on the FK. Grade should be `TEXT` not an enum (grades vary by school system).

#### 2. Auth routing fix (3 files)

- `src/app/(auth)/callback/route.ts` — after code exchange, check teachers table: if teacher row → `/dashboard`; if no teacher row → `/parent`; if no auth → `/login?error=auth`.
- `src/actions/auth.ts#signIn` — same fork: teacher → `/dashboard`, no teacher → `/parent`.
- `src/app/(auth)/login/page.tsx` — currently redirects all authenticated users to `/dashboard`. Change to: if teacher row → `/dashboard`, else → `/parent`.

#### 3. Parent route group: `(parent)` layout + pages

New route group: `src/app/(parent)/`. Structure:

```
src/app/(parent)/
  layout.tsx          — auth guard (getUser), no teacher check, ParentSidebar + MobileNav
  parent/
    page.tsx          — overview (child count, upcoming bookings)
    children/
      page.tsx        — list children + add/edit form
    bookings/
      page.tsx        — upcoming + past bookings (from /account page)
```

**Layout** mirrors `(dashboard)/dashboard/layout.tsx`:
- `getUser()` → redirect `/login?redirect=/parent` if no session
- Check if user also has a teacher row → show "Switch to Teacher View" link (dual-role)
- Fetch children count for sidebar badge
- `ParentSidebar` component with nav: Overview, My Children, My Bookings

**No `Sidebar.tsx` reuse** — teacher sidebar is teacher-specific. New `ParentSidebar` component.

#### 4. Children CRUD API routes

Use API route handlers (not Server Actions) per the established M010 constraint:

```
src/app/api/parent/children/route.ts   — GET (list), POST (create)
src/app/api/parent/children/[id]/route.ts — PUT (update), DELETE (delete)
```

All routes: `getUser()` → 401 if not authenticated; use `supabaseAdmin` for the mutation (consistent with anonymous mutations pattern from M007); RLS handles read security.

#### 5. BookingCalendar child selector graft

In `BookingCalendar.tsx`:
- On mount (in a `useEffect`), call `supabase.auth.getUser()`. If logged in, call `GET /api/parent/children` to fetch the user's children.
- Store `children` in local state alongside existing form state.
- In the form JSX (around line 706), conditionally render:
  - If `children.length > 0`: `<Select>` with child options + "Someone else (enter name)" option that reveals the text input
  - If `children.length === 0` and user is logged in: show text input + "Save as a child" checkbox
  - If user not logged in: existing text input unchanged

The `form.name` field populates `studentName` in the booking submission. `child_id` should be sent alongside if a child is selected — update `BookingRequestSchema` to include optional `child_id: z.string().uuid().optional()`, and pass it through the create-intent route to the booking INSERT.

**Form state change:** Add `childId: string | null` to the local form state.

#### 6. Tests

Pattern: vitest + jsdom (existing). Tests in `src/__tests__/`:

- `parent-children.test.ts` — children CRUD API: list returns only parent's children; create validates name; unauthenticated gets 401; delete cannot delete another parent's child.
- `parent-dashboard.test.ts` — auth guard logic: no user → redirect; user with teacher row → dual-role path; user without teacher row → renders dashboard.
- `booking-child-selector.test.ts` — BookingCalendar child selector: logged-in user with children sees Select; guest sees Input; selecting child sets childId in form state; submitting includes child_id.

---

## Key Constraints & Gotchas

1. **`getUser()` not `getClaims()`** — The dashboard layout docs say use `getUser()` for verified identity because `getClaims()` can fail on server-action POST re-renders (Next.js 16 bug). Parent layout must follow the same pattern.

2. **Server Actions unreliable for mutations** — Per M010 context: use API route handlers for all mutations (children CRUD, etc.). This is the established pattern.

3. **Dual-role users** — A user who is both a teacher and a parent (teacher.user_id = auth.uid AND they also have children). The parent layout should detect teacher row existence and show a "Go to Teacher Dashboard" link, not redirect away. The teacher dashboard similarly should show a "Go to Parent Dashboard" link. No role picker needed — just a cross-link.

4. **`student_name` backward compatibility** — Existing bookings have `student_name NOT NULL`. New `child_id` column is nullable (additive migration). The booking INSERT for child-selected bookings should set both `student_name` (the child's name, for display consistency on teacher dashboard) AND `child_id`. Guest bookings set `student_name` from the form field as before, `child_id = NULL`.

5. **BookingCalendar client-side auth check** — The component already calls `supabase.auth.getUser()` client-side inside event handlers. The children fetch can be in a `useEffect` on mount. **No prop drilling needed** — the `[slug]/page.tsx` is a server component; passing children as props would require the server component to know the viewing user's identity (expensive, breaks caching). Client-side fetch is correct.

6. **Login page redirect bug** — `login/page.tsx` currently redirects everyone with a valid session to `/dashboard`. This needs to check teacher row presence. But server-side in the login page, avoid adding expensive DB queries to a page that needs to be fast. Pattern: redirect to a single auth-check route, or check teacher table. Look at the existing pattern: the login page uses `getClaims()` for the redirect check (fast, no DB call). Change: if claims exist, redirect to a `/auth/role-check` interim route that checks teacher row and decides `/dashboard` vs `/parent`. Or simpler: redirect to `/parent` by default (which auto-redirects to `/dashboard` if teacher row exists). **Simplest fix:** redirect to `/parent` on login; parent layout's auth check will detect teacher row and offer the cross-link.

7. **No middleware.ts** — Auth protection is entirely page-level. The parent layout handles its own auth guard. This is consistent with the teacher dashboard pattern.

8. **`src/app/account/page.tsx`** — The existing `/account` page is the rudimentary parent booking history view. S01 should redirect `/account` → `/parent/bookings` for backward compat (email links point to `/account`). Or update the `accountUrl` in recurring booking emails (sent from `create-recurring/route.ts`) to `/parent/bookings` going forward.

---

## File Map (what to touch)

| File | Change |
|------|--------|
| `supabase/migrations/0017_children_and_parent_dashboard.sql` | NEW — children table + child_id on bookings |
| `src/app/(auth)/callback/route.ts` | UPDATE — parent-only → `/parent` |
| `src/actions/auth.ts` | UPDATE — signIn fork: teacher → `/dashboard`, else → `/parent` |
| `src/app/(auth)/login/page.tsx` | UPDATE — authenticated redirect to `/parent` (not `/dashboard`) |
| `src/app/(parent)/layout.tsx` | NEW — parent layout with auth guard |
| `src/app/(parent)/parent/page.tsx` | NEW — parent overview |
| `src/app/(parent)/parent/children/page.tsx` | NEW — children list + add form |
| `src/app/(parent)/parent/bookings/page.tsx` | NEW — booking history (from /account) |
| `src/components/parent/ParentSidebar.tsx` | NEW — parent nav sidebar |
| `src/components/parent/ParentMobileNav.tsx` | NEW — parent mobile bottom nav |
| `src/app/api/parent/children/route.ts` | NEW — GET + POST children |
| `src/app/api/parent/children/[id]/route.ts` | NEW — PUT + DELETE child |
| `src/components/profile/BookingCalendar.tsx` | UPDATE — child selector (lines ~680-730) |
| `src/lib/schemas/booking.ts` | UPDATE — add optional child_id to BookingRequestSchema |
| `src/app/api/direct-booking/create-intent/route.ts` | UPDATE — pass child_id to booking INSERT |
| `src/app/account/page.tsx` | UPDATE — redirect to `/parent/bookings` |
| `src/__tests__/parent-children.test.ts` | NEW — children CRUD tests |
| `src/__tests__/parent-dashboard.test.ts` | NEW — dashboard auth tests |

---

## Verification

```bash
# Type check
npx tsc --noEmit

# All tests green
npx vitest run

# Build clean
npx next build
```

Manual verification (integration):
1. Sign up as a new parent (no teacher row) → lands at `/parent`
2. Add a child → appears in children list
3. Visit a teacher's profile → booking form shows child selector for logged-in parent
4. Complete booking selecting a child → booking row has both `student_name` and `child_id`
5. Guest user visits teacher profile → sees free-text student name field unchanged
6. Dual-role user (teacher) → `/dashboard` still works; cross-link to parent dashboard shown

---

## Skills Discovered

- `supabase-postgres-best-practices` — already installed. Informs: TIMESTAMPTZ, RLS on all new tables, FK indexes, use of `supabaseAdmin` for service-role mutations.
- `react-best-practices` — already installed. Informs: `useEffect` for client-side data fetch in BookingCalendar, avoid prop drilling server→client for auth-dependent data.
- No new skills needed for this slice.
