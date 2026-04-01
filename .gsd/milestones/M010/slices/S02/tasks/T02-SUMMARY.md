---
id: T02
parent: S02
milestone: M010
provides: []
requires: []
affects: []
key_files: ["src/__tests__/google-sso-callback.test.ts"]
key_decisions: ["Used vi.hoisted() for mock factory so mockExchangeCodeForSession, mockGetUser, and mockFrom are available at module-scope before vi.mock runs"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Ran npx vitest run src/__tests__/google-sso-callback.test.ts — 5 tests pass. Ran npx vitest run — full suite: 426 tests pass across 46 test files, 0 failures, no regressions."
completed_at: 2026-04-01T13:21:34.250Z
blocker_discovered: false
---

# T02: Added 5 tests covering all 4 OAuth callback paths plus AUTH-04 provider-agnostic smoke test

> Added 5 tests covering all 4 OAuth callback paths plus AUTH-04 provider-agnostic smoke test

## What Happened
---
id: T02
parent: S02
milestone: M010
key_files:
  - src/__tests__/google-sso-callback.test.ts
key_decisions:
  - Used vi.hoisted() for mock factory so mockExchangeCodeForSession, mockGetUser, and mockFrom are available at module-scope before vi.mock runs
duration: ""
verification_result: passed
completed_at: 2026-04-01T13:21:34.251Z
blocker_discovered: false
---

# T02: Added 5 tests covering all 4 OAuth callback paths plus AUTH-04 provider-agnostic smoke test

**Added 5 tests covering all 4 OAuth callback paths plus AUTH-04 provider-agnostic smoke test**

## What Happened

Created src/__tests__/google-sso-callback.test.ts with two describe blocks. The first tests the OAuth callback route handler (src/app/(auth)/callback/route.ts) by mocking createClient from @/lib/supabase/server using vi.hoisted() pattern. Four tests cover all execution paths: teacher user redirects to /dashboard, non-teacher redirects to /parent, missing code param redirects to /login?error=auth, and exchange failure redirects to /login?error=auth. The second describe block is the AUTH-04 smoke test which reads src/actions/verification.ts source and asserts it uses getUser() with no provider-specific logic (no 'provider', 'google', or 'getSession().provider' references).

## Verification

Ran npx vitest run src/__tests__/google-sso-callback.test.ts — 5 tests pass. Ran npx vitest run — full suite: 426 tests pass across 46 test files, 0 failures, no regressions.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/__tests__/google-sso-callback.test.ts` | 0 | ✅ pass | 542ms |
| 2 | `npx vitest run` | 0 | ✅ pass | 9890ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/__tests__/google-sso-callback.test.ts`


## Deviations
None.

## Known Issues
None.
