# S01: Parent Dashboard & Multi-Child

**Goal:** Parent logs in, sees a login-required dashboard at /parent with My Children, My Bookings, and Overview pages. Parent can add/edit/delete children. When booking a session, logged-in parents with children see a child dropdown instead of free-text student name. Auth routing correctly sends parent-only users to /parent (not /onboarding).
**Demo:** After this: Parent logs in, sees dashboard with My Children, adds a child, and books a session selecting that child from a dropdown instead of typing a name

## Tasks
- [x] **T01: Created children table with RLS, added child_id FK to bookings, and routed parent-only users to /parent in all auth paths** — Create the `children` table and add `child_id` FK to `bookings`. Fix auth routing so parent-only users (no teacher row) land at `/parent` instead of `/onboarding`. Redirect `/account` to `/parent/bookings`.

## Steps

1. Create `supabase/migrations/0017_children_and_parent_dashboard.sql`:
   - `children` table: `id UUID PK DEFAULT gen_random_uuid()`, `parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `name TEXT NOT NULL`, `grade TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Index on `parent_id`
   - Enable RLS with policy `children_owner_all` for ALL using `parent_id = auth.uid()`
   - `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES children(id)`

2. Update `src/app/(auth)/callback/route.ts`:
   - After successful code exchange, query `teachers` table for the user
   - If teacher row exists → redirect to `/dashboard`
   - If no teacher row → redirect to `/parent` (NOT `/onboarding`)
   - Use `.maybeSingle()` instead of `.single()` to avoid error on no match

3. Update `src/actions/auth.ts` `signIn` function:
   - When no `redirectTo` is provided and no teacher row found → redirect to `/parent` (currently goes to `/onboarding`)
   - The `signUp` function currently redirects to `/onboarding` — keep this for now (new users need onboarding or will reach parent dashboard via login)

4. Update `src/app/(auth)/login/page.tsx`:
   - Currently redirects all authenticated users to `/dashboard`
   - Change: if `claims` exist, check teacher table. If teacher row → `/dashboard`, else → `/parent`
   - Use `getUser()` + teacher query to decide (consistent with other auth checks)

5. Update `src/app/account/page.tsx`:
   - Replace the entire component body with a simple redirect to `/parent/bookings`
   - Keep metadata export for SEO continuity

## Must-Haves

- [ ] Migration file creates `children` table with RLS and `child_id` on `bookings`
- [ ] OAuth callback routes parent-only users to `/parent`
- [ ] Email/password signIn routes parent-only users to `/parent`
- [ ] Login page redirects authenticated parent-only users to `/parent`
- [ ] `/account` redirects to `/parent/bookings`
- [ ] Teacher users still route to `/dashboard` in all three auth paths

## Verification

- `npx tsc --noEmit` passes
- Migration SQL is syntactically valid (no runtime test — applied manually)
- Grep confirms no remaining hardcoded `/onboarding` redirect for non-teacher users in auth files
  - Estimate: 45m
  - Files: supabase/migrations/0017_children_and_parent_dashboard.sql, src/app/(auth)/callback/route.ts, src/actions/auth.ts, src/app/(auth)/login/page.tsx, src/app/account/page.tsx
  - Verify: npx tsc --noEmit && grep -c 'redirect.*parent' src/actions/auth.ts | grep -q '[1-9]'
- [x] **T02: Built complete parent dashboard with auth-guarded layout, sidebar, mobile nav, overview stats, children CRUD management, and booking history pages** — Create the `(parent)` route group with auth-guarded layout, ParentSidebar, ParentMobileNav, and three pages: overview, children management, and booking history. This is the full parent dashboard UI.

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
  - Estimate: 2h
  - Files: src/lib/parent-nav.ts, src/components/parent/ParentSidebar.tsx, src/components/parent/ParentMobileNav.tsx, src/app/(parent)/layout.tsx, src/app/(parent)/parent/page.tsx, src/app/(parent)/parent/children/page.tsx, src/app/(parent)/parent/bookings/page.tsx
  - Verify: npx tsc --noEmit && npx next build
- [x] **T03: Verified children CRUD API routes (GET/POST/PUT/DELETE with ownership checks) and BookingCalendar child selector dropdown with graceful fallback to text input** — Create the children CRUD API endpoints and graft the child selector into BookingCalendar.tsx. Update BookingRequestSchema to accept optional `child_id` and pass it through the booking creation flow.

## Steps

1. Create `src/app/api/parent/children/route.ts` — GET + POST:
   - GET: `getUser()` → 401 if not authenticated. Query `children` where `parent_id = user.id`, order by `created_at`. Return JSON array.
   - POST: `getUser()` → 401. Parse body with Zod: `{ name: string (1-100 chars), grade?: string (max 50 chars) }`. Insert via `supabaseAdmin` with `parent_id = user.id`. Return created child JSON.

2. Create `src/app/api/parent/children/[id]/route.ts` — PUT + DELETE:
   - PUT: `getUser()` → 401. Fetch child by id, verify `parent_id = user.id` → 404 if not owner. Update name/grade. Return updated child.
   - DELETE: `getUser()` → 401. Fetch child by id, verify `parent_id = user.id` → 404 if not owner. Delete. Return 204.
   - Both routes: validate `id` param is UUID.

3. Update `src/lib/schemas/booking.ts`:
   - Add `child_id: z.string().uuid().optional()` to `BookingRequestSchema`
   - Add `childId: z.string().uuid().optional()` to `RecurringBookingSchema`

4. Update `src/app/api/direct-booking/create-intent/route.ts`:
   - Destructure `childId` from validated body (alongside existing fields)
   - Add `child_id: childId ?? null` to the bookings INSERT object
   - No other changes needed — `student_name` is still populated from `studentName`

5. Graft child selector into `src/components/profile/BookingCalendar.tsx`:
   - Add `childId: string | null` to form state (default `null`)
   - Add `children` state: `{ id: string; name: string; grade: string | null }[]` (default `[]`)
   - Add `childrenLoaded` state boolean (default `false`)
   - In a `useEffect` on mount: call `supabase.auth.getUser()`. If user exists, fetch `GET /api/parent/children`. Set `children` state + `childrenLoaded = true`.
   - In the form JSX (around line 706-720, the student name field):
     - If `childrenLoaded && children.length > 0`: render `<Select>` with children as options + 'Someone else (type name)' option. When a child is selected, set `form.name = child.name` and `form.childId = child.id`. When 'Someone else' selected, set `form.childId = null` and show the text `<Input>`.
     - If user logged in but no children: show existing text `<Input>` unchanged
     - If user not logged in: show existing text `<Input>` unchanged
   - Update `createPaymentIntent()` to include `childId: form.childId` in the POST body
   - Update `createRecurringIntent()` to include `childId: form.childId` in the POST body
   - Update `handleSubmit()` deferred path to include `childId: form.childId`

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| GET /api/parent/children | Set children=[], show text input | Set children=[], show text input | Set children=[], show text input |
| supabase.auth.getUser() | Treat as guest, show text input | Treat as guest, show text input | Treat as guest, show text input |

## Negative Tests

- **Malformed inputs**: POST /api/parent/children with empty name → 400; with name > 100 chars → 400; with missing body → 400
- **Error paths**: GET /api/parent/children without auth → 401; DELETE /api/parent/children/[id] with non-owner id → 404
- **Boundary conditions**: Parent with 0 children → text input shown; parent with 1 child → select shown with that child + 'Someone else'

## Must-Haves

- [ ] GET /api/parent/children returns only the authenticated parent's children
- [ ] POST /api/parent/children validates name and creates child
- [ ] PUT /api/parent/children/[id] verifies ownership before update
- [ ] DELETE /api/parent/children/[id] verifies ownership before delete
- [ ] BookingRequestSchema accepts optional child_id
- [ ] create-intent route passes child_id to booking INSERT
- [ ] BookingCalendar shows Select for logged-in parent with children
- [ ] BookingCalendar falls back to text Input for guests
- [ ] Selecting a child sets both form.name (child's name) and form.childId

## Verification

- `npx tsc --noEmit` passes
- `npx next build` succeeds
- Manual: API routes return correct responses (tested via curl or browser dev tools)
  - Estimate: 1h30m
  - Files: src/app/api/parent/children/route.ts, src/app/api/parent/children/[id]/route.ts, src/lib/schemas/booking.ts, src/app/api/direct-booking/create-intent/route.ts, src/components/profile/BookingCalendar.tsx
  - Verify: npx tsc --noEmit && npx next build
- [ ] **T04: Add test coverage for children CRUD, dashboard auth, and booking child selector** — Write comprehensive vitest tests covering the three key areas: children API CRUD operations, parent dashboard auth routing, and the BookingCalendar child selector behavior.

## Steps

1. Create `src/__tests__/parent-children.test.ts` — Children CRUD API tests:
   - Mock `supabase.auth.getUser()` and `supabaseAdmin` Supabase client
   - Test GET returns only the authenticated parent's children (mock parent_id filter)
   - Test POST validates name (rejects empty, rejects >100 chars), creates child with correct parent_id
   - Test PUT verifies ownership — returns 404 when child belongs to different parent
   - Test DELETE verifies ownership — returns 404 when child belongs to different parent
   - Test all endpoints return 401 when unauthenticated
   - Pattern: import the route handler directly, pass mock Request objects

2. Create `src/__tests__/parent-dashboard.test.ts` — Dashboard auth routing tests:
   - Test auth routing logic (extracted to testable functions where possible):
     - No user → would redirect to login
     - User with teacher row → teacher dashboard path (has cross-link)
     - User without teacher row → parent dashboard path
     - Dual-role user → parent dashboard with hasTeacherRole=true
   - Test `signIn` action routing: mock teacher lookup, verify redirect targets
   - Test login page redirect logic: authenticated teacher → /dashboard, authenticated non-teacher → /parent

3. Create `src/__tests__/booking-child-selector.test.ts` — BookingCalendar child selector tests:
   - Mock `supabase.auth.getUser()` and `fetch` for children API
   - Test: logged-in user with children → Select element rendered with child options
   - Test: logged-in user with no children → text Input rendered (no Select)
   - Test: unauthenticated user → text Input rendered (no Select)
   - Test: selecting a child sets form.childId and form.name to child's name
   - Test: selecting 'Someone else' clears childId, shows text Input
   - Test: booking submission includes child_id when child is selected
   - Note: BookingCalendar has many props — use minimal required props for focused tests

## Must-Haves

- [ ] Children CRUD tests cover: list, create, update, delete, auth guard, ownership guard
- [ ] Dashboard auth tests cover: no user redirect, teacher routing, parent routing, dual-role
- [ ] Booking child selector tests cover: children dropdown, guest fallback, form state
- [ ] All tests pass with `npx vitest run`

## Verification

- `npx vitest run src/__tests__/parent-children.test.ts` — all pass
- `npx vitest run src/__tests__/parent-dashboard.test.ts` — all pass
- `npx vitest run src/__tests__/booking-child-selector.test.ts` — all pass
- `npx vitest run` — full suite still passes (no regressions)
  - Estimate: 1h30m
  - Files: src/__tests__/parent-children.test.ts, src/__tests__/parent-dashboard.test.ts, src/__tests__/booking-child-selector.test.ts
  - Verify: npx vitest run src/__tests__/parent-children.test.ts && npx vitest run src/__tests__/parent-dashboard.test.ts && npx vitest run src/__tests__/booking-child-selector.test.ts
