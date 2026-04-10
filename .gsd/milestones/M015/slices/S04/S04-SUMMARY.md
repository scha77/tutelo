---
id: S04
parent: M015
milestone: M015
provides:
  - Distributed rate limiting active on all public endpoints — S05 E2E tests can verify 429 behavior if needed
requires:
  []
affects:
  []
key_files:
  - src/app/api/waitlist/route.ts
  - src/app/api/track-view/route.ts
  - src/app/api/verify-email/route.ts
  - src/actions/auth.ts
  - tests/unit/rate-limit-wiring.test.ts
key_decisions:
  - track-view limit set to 30/min (higher than other endpoints) because page views fire frequently during normal browsing
  - verify-email returns JSON 429 (not redirect) to distinguish abuse from legitimate token clicks
  - signIn and signUp share a single 'auth' rate-limit bucket at 10/min per IP
patterns_established:
  - checkLimit wiring pattern: extract IP from x-forwarded-for (API routes) or headers() (server actions), call checkLimit with endpoint-specific key and limits, return 429 on block
  - Auth action rate limiting via headers() from next/headers — server actions don't receive a Request object
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-10T05:20:31.334Z
blocker_discovered: false
---

# S04: Wire Rate Limits to Public Endpoints

**Wired distributed Upstash rate limiting to all four public endpoints (waitlist, track-view, verify-email, auth actions) with per-endpoint limits and 10 tests covering allowed/blocked paths.**

## What Happened

Replaced the old in-memory `rateLimit` helper with the distributed `checkLimit` from `src/lib/rate-limit.ts` (built in S03) across all four public-facing endpoints. The waitlist and track-view routes had existing in-memory limiters that were swapped out. The verify-email route and auth server actions (signIn/signUp) had no rate limiting — it was added from scratch.

Rate limits per endpoint:
- `/api/waitlist` POST: 5 requests/min per IP
- `/api/track-view` POST: 30 requests/min per IP (higher because page views fire frequently during normal browsing)
- `/api/verify-email` GET: 5 requests/min per IP
- `signIn`/`signUp` server actions: 10 requests/min per IP (shared 'auth' bucket)

Auth actions extract IP via `headers()` from `next/headers` since server actions don't receive a Request object. All blocked requests return 429 — API routes return JSON `{ error: 'Too many requests' }`, auth actions return the same error shape as existing validation errors.

T02 created `tests/unit/rate-limit-wiring.test.ts` with 10 tests across 4 describe blocks. Each endpoint has two tests: one verifying the normal path when allowed, one verifying 429 when blocked. Auth action tests additionally confirm that Supabase auth methods are never called when rate-limited (early exit before any DB work).

T01's changes to `src/actions/auth.ts` (adding `headers()` and `checkLimit` imports) caused mock drift in two pre-existing test files (`tests/auth/signup.test.ts` and `src/__tests__/parent-dashboard.test.ts`). T02 fixed these by adding the required mocks — 9 tests were restored.

## Verification

All slice verification checks passed:

1. `grep -q checkLimit` confirmed in all four target files (waitlist, track-view, verify-email, auth) — exit 0
2. `npx vitest run tests/unit/rate-limit-wiring.test.ts` — 10/10 tests pass
3. `npx vitest run` — 55 files, 514 tests, all pass, 0 failures
4. `npm run build` — exits 0, 73 pages generated (verified in T02)

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

Rate limiting fails closed if Upstash Redis is unreachable — requests get 500 instead of being allowed through. A try/catch wrapper around checkLimit that defaults to { allowed: true } on error would match the safe-default-on-error pattern but was deferred.

## Follow-ups

Consider wrapping checkLimit calls in try/catch to fail open if Upstash Redis is unavailable — currently an Upstash outage would cause 500 errors on all rate-limited endpoints. This matches the safe-default-on-error principle in KNOWLEDGE.md but was not implemented in S04.

## Files Created/Modified

- `src/app/api/waitlist/route.ts` — Replaced in-memory rateLimit with distributed checkLimit (5/min)
- `src/app/api/track-view/route.ts` — Replaced in-memory rateLimit with distributed checkLimit (30/min)
- `src/app/api/verify-email/route.ts` — Added rate limiting via checkLimit (5/min) — previously unprotected
- `src/actions/auth.ts` — Added rate limiting to signIn and signUp via checkLimit (10/min shared 'auth' bucket)
- `tests/unit/rate-limit-wiring.test.ts` — New: 10 tests covering all 4 endpoints' rate-limit wiring (allowed + blocked paths)
- `tests/auth/signup.test.ts` — Fixed mock drift from T01 auth.ts changes (added headers/rate-limit mocks)
- `src/__tests__/parent-dashboard.test.ts` — Fixed mock drift from T01 auth.ts changes (added headers/rate-limit mocks)
