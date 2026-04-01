---
estimated_steps: 23
estimated_files: 1
skills_used: []
---

# T02: Add admin access gate and dashboard unit tests

Write unit tests for the admin access gate logic and page rendering. Tests must cover: admin user allowed, non-admin user gets 404, missing ADMIN_USER_IDS env var gets 404, unauthenticated user redirects to /login. Follow established test patterns (vi.mock for supabase modules, mock auth responses).

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

## Inputs

- ``src/app/(admin)/layout.tsx` — layout component to test access gate`
- ``src/app/(admin)/admin/page.tsx` — page component to test metrics rendering`
- ``src/__tests__/messaging.test.ts` — reference for supabaseAdmin mock patterns`
- ``src/__tests__/parent-auth.test.ts` — reference for auth mock patterns`

## Expected Output

- ``src/__tests__/admin-dashboard.test.ts` — unit tests for admin access gate and dashboard metrics`

## Verification

npx vitest run src/__tests__/admin-dashboard.test.ts && npx vitest run
