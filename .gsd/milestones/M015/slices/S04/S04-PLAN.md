# S04: Wire Rate Limits to Public Endpoints

**Goal:** Burst traffic against /api/waitlist, /api/track-view, /api/verify-email, and the login action returns 429 after hitting the limit. Legitimate requests still work.
**Demo:** After this: After this: Burst traffic against /api/waitlist, /api/track-view, /api/verify-email, and the login action returns 429 after hitting the limit. Legitimate requests still work.

## Tasks
- [x] **T01: Replaced in-memory rateLimit with distributed Upstash checkLimit in waitlist, track-view, verify-email, and auth actions** — Replace the old in-memory `rateLimit` import with `checkLimit` from `src/lib/rate-limit.ts` in waitlist and track-view routes. Add rate limiting to verify-email (GET route, no existing limiter) and auth server actions (signIn/signUp, use `headers()` from `next/headers` for IP extraction).

Steps:
1. In `src/app/api/waitlist/route.ts`: replace `import { rateLimit } from '@/lib/utils/rate-limit'` with `import { checkLimit } from '@/lib/rate-limit'`. Change the sync `if (!rateLimit(...))` call to `const { allowed } = await checkLimit(ip, 'waitlist', { max: 5, window: '1 m' })` followed by `if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })`. The handler is already async.
2. In `src/app/api/track-view/route.ts`: same swap — replace `rateLimit` import with `checkLimit`. Change to `const { allowed } = await checkLimit(ip, 'track-view', { max: 30, window: '1 m' })` (bump from 10 to 30 — page views fire frequently on normal browsing). Keep the same 429 response pattern.
3. In `src/app/api/verify-email/route.ts`: add `import { checkLimit } from '@/lib/rate-limit'` at top. At the start of the GET handler, extract IP with `const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'`, then `const { allowed } = await checkLimit(ip, 'verify-email', { max: 5, window: '1 m' })`. If not allowed, return `NextResponse.json({ error: 'Too many requests' }, { status: 429 })` (JSON response, not a redirect — distinguishes abuse from legitimate requests).
4. In `src/actions/auth.ts`: add `import { headers } from 'next/headers'` and `import { checkLimit } from '@/lib/rate-limit'`. In both `signIn` and `signUp`, at the top of each function (before any Supabase calls), add: `const headersList = await headers()` then `const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'` then `const { allowed } = await checkLimit(ip, 'auth', { max: 10, window: '1 m' })`. If not allowed, return `{ error: 'Too many requests. Please try again later.' }` (same return shape as existing error returns).
5. Run `npm run build` to verify no type errors.
  - Estimate: 20m
  - Files: src/app/api/waitlist/route.ts, src/app/api/track-view/route.ts, src/app/api/verify-email/route.ts, src/actions/auth.ts
  - Verify: npm run build exits 0. grep -q 'checkLimit' src/app/api/waitlist/route.ts && grep -q 'checkLimit' src/app/api/track-view/route.ts && grep -q 'checkLimit' src/app/api/verify-email/route.ts && grep -q 'checkLimit' src/actions/auth.ts
- [x] **T02: Add 10 rate-limit wiring tests for all four endpoints and fix 9 pre-existing mock-drift failures in auth tests** — Create a single test file covering all four endpoints' rate-limit wiring. Mock `checkLimit` via `vi.mock('@/lib/rate-limit')` and verify that each endpoint returns 429 when blocked and succeeds when allowed.

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
  - Estimate: 30m
  - Files: tests/unit/rate-limit-wiring.test.ts
  - Verify: npx vitest run tests/unit/rate-limit-wiring.test.ts -- all tests pass. npx vitest run -- no regressions.
