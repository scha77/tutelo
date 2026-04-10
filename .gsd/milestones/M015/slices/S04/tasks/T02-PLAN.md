---
estimated_steps: 26
estimated_files: 1
skills_used: []
---

# T02: Add unit tests for rate-limited endpoints

Create a single test file covering all four endpoints' rate-limit wiring. Mock `checkLimit` via `vi.mock('@/lib/rate-limit')` and verify that each endpoint returns 429 when blocked and succeeds when allowed.

Steps:
1. Create `tests/unit/rate-limit-wiring.test.ts` with four `describe` blocks (one per endpoint).
2. Mock dependencies shared by all tests:
   - `vi.mock('@/lib/rate-limit')` — mock `checkLimit` to control allowed/blocked
   - `vi.mock('@sentry/nextjs')` — standard Sentry mock
   - `vi.mock('@/lib/supabase/service')` — mock `supabaseAdmin` with `.from().insert()` returning `{ error: null }` and `.from().select().eq().maybeSingle()` returning `{ data: null }`
   - `vi.mock('@/lib/supabase/server')` — mock `createClient` for auth actions
   - `vi.mock('next/headers')` — mock `headers()` returning a Map with `x-forwarded-for`
   - `vi.mock('next/navigation')` — mock `redirect` (throws to prevent real redirects)
3. For **waitlist** describe block (2 tests):
   - 'returns 201 when rate limit allows': set `checkLimit` to return `{ allowed: true }`, POST with valid body, assert status 201
   - 'returns 429 when rate limited': set `checkLimit` to return `{ allowed: false }`, POST with valid body, assert status 429
4. For **track-view** describe block (2 tests):
   - 'returns 201 when rate limit allows': same pattern, POST with `{ teacherId: 'test-id' }`, assert 201
   - 'returns 429 when rate limited': assert 429
5. For **verify-email** describe block (2 tests):
   - 'processes normally when rate limit allows': set `checkLimit` to `{ allowed: true }`, GET with `?token=test-token`, assert response is a redirect (status 307/308) or a JSON response (depending on token validity)
   - 'returns 429 when rate limited': set `checkLimit` to `{ allowed: false }`, GET request, assert status 429
6. For **auth actions** describe block (4 tests):
   - 'signIn succeeds when rate limit allows': set `checkLimit` to `{ allowed: true }`, call signIn with FormData, assert no error returned (or redirect thrown)
   - 'signIn returns error when rate limited': set `checkLimit` to `{ allowed: false }`, call signIn, assert returned error message contains 'Too many requests'
   - 'signUp succeeds when rate limit allows': same pattern for signUp
   - 'signUp returns error when rate limited': assert error message
7. Run `npx vitest run tests/unit/rate-limit-wiring.test.ts` to verify all tests pass.
8. Run `npx vitest run` to verify no regressions in other test files (existing tests that import waitlist/track-view routes may need the `@/lib/rate-limit` mock added if they break).

## Inputs

- `src/app/api/waitlist/route.ts`
- `src/app/api/track-view/route.ts`
- `src/app/api/verify-email/route.ts`
- `src/actions/auth.ts`
- `src/lib/rate-limit.ts`

## Expected Output

- `tests/unit/rate-limit-wiring.test.ts`

## Verification

npx vitest run tests/unit/rate-limit-wiring.test.ts -- all tests pass. npx vitest run -- no regressions.
