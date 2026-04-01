# S05: Admin Dashboard

**Goal:** Platform operator visits /admin, sees teacher count, total bookings, revenue, and recent activity feed. Non-admin users get 404.
**Demo:** After this: Platform operator visits /admin, sees teacher count, total bookings, revenue, and recent activity feed. Non-admin users get 404

## Tasks
- [x] **T01: Built admin dashboard at /admin with ADMIN_USER_IDS env-var gating (non-admins get 404), stat cards for 6 platform metrics, and a 15-item activity feed** — Create the complete admin dashboard: (admin) route group layout with ADMIN_USER_IDS env var gating, and admin/page.tsx with stat cards (teacher counts, booking counts, revenue) and recent activity feed (signups, bookings, completions). All queries via supabaseAdmin.

## Steps

1. Create `src/app/(admin)/layout.tsx`:
   - Import `createClient` from `@/lib/supabase/server` and `notFound` from `next/navigation`
   - Call `supabase.auth.getUser()` — if error or no user, `redirect('/login')`
   - Parse `process.env.ADMIN_USER_IDS?.split(',').map(s => s.trim()) ?? []`
   - If `allowlist` is empty or `!allowlist.includes(user.id)`, call `notFound()` (returns 404, not redirect — per ADMIN-04)
   - Render a minimal layout: header with 'Admin Dashboard' title, user email display, sign-out form using the `signOut` server action from `@/actions/auth`, and `{children}` main area
   - No sidebar needed — single-page operator tool

2. Create `src/app/(admin)/admin/page.tsx`:
   - Import `supabaseAdmin` from `@/lib/supabase/service`
   - Run all metric queries in parallel via `Promise.all()`:
     - Total teachers: `supabaseAdmin.from('teachers').select('*', { count: 'exact', head: true })`
     - Active teachers (Stripe connected): `.select('*', { count: 'exact', head: true }).eq('stripe_charges_enabled', true)`
     - Published teachers: `.select('*', { count: 'exact', head: true }).eq('is_published', true)`
     - Total bookings: `supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true })`
     - Completed bookings: `.select('*', { count: 'exact', head: true }).eq('status', 'completed')`
     - Revenue: `.from('bookings').select('amount_cents').eq('status', 'completed')` — sum client-side, null-guard with `?? 0`
   - Render stat cards in a responsive grid (CSS grid or flex, Tailwind utility classes)
   - Format revenue as dollars: `(totalCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })`

3. Add activity feed section to the same page:
   - Fetch 3 lists in parallel (within the same Promise.all or a second one):
     - Recent teacher signups: `supabaseAdmin.from('teachers').select('name, created_at').order('created_at', { ascending: false }).limit(5)`
     - Recent bookings: `supabaseAdmin.from('bookings').select('student_name, created_at, status').order('created_at', { ascending: false }).limit(5)`
     - Recent completions: `supabaseAdmin.from('bookings').select('student_name, updated_at, status').eq('status', 'completed').order('updated_at', { ascending: false }).limit(5)`
   - Merge into a typed `ActivityEvent[]` array with `{ type, description, timestamp }` shape
   - Sort by timestamp descending, take first 15
   - Render as a timeline list with event type badges and relative timestamps

4. Verify: `npx tsc --noEmit` passes clean
  - Estimate: 45m
  - Files: src/app/(admin)/layout.tsx, src/app/(admin)/admin/page.tsx
  - Verify: npx tsc --noEmit
- [ ] **T02: Add admin access gate and dashboard unit tests** — Write unit tests for the admin access gate logic and page rendering. Tests must cover: admin user allowed, non-admin user gets 404, missing ADMIN_USER_IDS env var gets 404, unauthenticated user redirects to /login. Follow established test patterns (vi.mock for supabase modules, mock auth responses).

## Negative Tests

- **Unauthenticated**: No user session → redirect to /login
- **Non-admin user**: Valid session but user ID not in ADMIN_USER_IDS → notFound() called
- **Empty env var**: ADMIN_USER_IDS is empty string → notFound() called
- **Missing env var**: ADMIN_USER_IDS undefined → notFound() called
- **Admin user**: Valid session + user ID in ADMIN_USER_IDS → page renders with metrics

## Steps

1. Create `src/__tests__/admin-dashboard.test.ts`:
   - Mock `@/lib/supabase/server` (createClient returning mock auth)
   - Mock `@/lib/supabase/service` (supabaseAdmin returning mock query results)
   - Mock `next/navigation` (redirect, notFound as vi.fn())
   - Mock `@/actions/auth` (signOut)

2. Write access gate tests (test the layout component):
   - `it('redirects to /login when no user session')` — mock getUser returning error → expect redirect('/login') called
   - `it('returns 404 when user is not in ADMIN_USER_IDS')` — mock valid user with ID not in env var → expect notFound() called
   - `it('returns 404 when ADMIN_USER_IDS is empty')` — set env to '' → expect notFound() called
   - `it('returns 404 when ADMIN_USER_IDS is undefined')` — delete env var → expect notFound() called
   - `it('renders children when user is admin')` — mock valid user with ID in ADMIN_USER_IDS → expect children rendered (no redirect, no notFound)

3. Write page metric tests (test the page component):
   - `it('fetches and displays metric counts')` — mock supabaseAdmin queries returning known counts → verify the page function returns without error and queries were called
   - `it('handles null revenue gracefully')` — mock amount_cents sum returning null → verify no crash

4. Verify: `npx vitest run src/__tests__/admin-dashboard.test.ts` passes, then `npx vitest run` (full suite) passes with no regressions
  - Estimate: 30m
  - Files: src/__tests__/admin-dashboard.test.ts
  - Verify: npx vitest run src/__tests__/admin-dashboard.test.ts && npx vitest run
