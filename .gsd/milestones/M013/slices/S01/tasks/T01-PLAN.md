---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T01: Fix admin-dashboard.test.ts — mock getAuthUser instead of createClient

Replace the `@/lib/supabase/server` mock with a `@/lib/supabase/auth-cache` mock. Mock `getAuthUser` to return `{ user, supabase, error }` where `supabase` has `auth.getUser()` for the email fetch. Restructure the `setupAuth` helper. Re-register the `auth-cache` mock in `beforeEach` after `resetModules()`. The admin page metrics tests (3 tests) are already passing — do not change them.

## Inputs

- `src/lib/supabase/auth-cache.ts`
- `src/app/(admin)/layout.tsx`

## Expected Output

- `src/__tests__/admin-dashboard.test.ts (fixed mocks)`

## Verification

npx vitest run src/__tests__/admin-dashboard.test.ts — 0 failures
