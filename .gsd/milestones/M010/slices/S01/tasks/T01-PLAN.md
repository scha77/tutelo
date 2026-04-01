---
estimated_steps: 33
estimated_files: 5
skills_used: []
---

# T01: Database migration, auth routing fix, and /account redirect

Create the `children` table and add `child_id` FK to `bookings`. Fix auth routing so parent-only users (no teacher row) land at `/parent` instead of `/onboarding`. Redirect `/account` to `/parent/bookings`.

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

## Inputs

- ``src/app/(auth)/callback/route.ts` — current OAuth callback routing logic`
- ``src/actions/auth.ts` — current signIn/signUp/signOut server actions`
- ``src/app/(auth)/login/page.tsx` — current login page with auth redirect`
- ``src/app/account/page.tsx` — current parent account page to be replaced with redirect`
- ``supabase/migrations/0016_cancel_token.sql` — last existing migration (naming reference)`

## Expected Output

- ``supabase/migrations/0017_children_and_parent_dashboard.sql` — children table, RLS, child_id on bookings`
- ``src/app/(auth)/callback/route.ts` — updated OAuth callback with parent routing`
- ``src/actions/auth.ts` — updated signIn with parent routing fork`
- ``src/app/(auth)/login/page.tsx` — updated login page redirect logic`
- ``src/app/account/page.tsx` — redirect to /parent/bookings`

## Verification

npx tsc --noEmit && grep -c 'redirect.*parent' src/actions/auth.ts | grep -q '[1-9]'
