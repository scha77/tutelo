---
id: T01
parent: S02
milestone: M010
provides: []
requires: []
affects: []
key_files: ["src/components/auth/LoginForm.tsx", "src/__tests__/google-sso-login.test.tsx"]
key_decisions: ["Used dynamic import pattern for LoginForm in tests consistent with existing parent-auth.test.tsx"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Ran npx vitest run src/__tests__/google-sso-login.test.tsx — 2 tests pass. Ran npx vitest run — full suite: 421 tests pass across 45 test files, 0 failures, no regressions."
completed_at: 2026-04-01T13:19:36.679Z
blocker_discovered: false
---

# T01: Fixed Google OAuth redirectTo from /auth/callback to /callback and added 2 component tests verifying Google SSO button behavior

> Fixed Google OAuth redirectTo from /auth/callback to /callback and added 2 component tests verifying Google SSO button behavior

## What Happened
---
id: T01
parent: S02
milestone: M010
key_files:
  - src/components/auth/LoginForm.tsx
  - src/__tests__/google-sso-login.test.tsx
key_decisions:
  - Used dynamic import pattern for LoginForm in tests consistent with existing parent-auth.test.tsx
duration: ""
verification_result: passed
completed_at: 2026-04-01T13:19:36.680Z
blocker_discovered: false
---

# T01: Fixed Google OAuth redirectTo from /auth/callback to /callback and added 2 component tests verifying Google SSO button behavior

**Fixed Google OAuth redirectTo from /auth/callback to /callback and added 2 component tests verifying Google SSO button behavior**

## What Happened

The handleGoogleSignIn function in LoginForm.tsx was using /auth/callback as the OAuth redirect URL, but the actual Next.js callback route is at /callback (the (auth) route group strips that segment from URLs). Changed the single line from ${window.location.origin}/auth/callback to ${window.location.origin}/callback. Created src/__tests__/google-sso-login.test.tsx with two tests: (1) verifies the Google button is rendered and enabled by default, and (2) verifies that clicking it calls signInWithOAuth with provider: 'google' and a redirectTo containing /callback but NOT /auth/callback.

## Verification

Ran npx vitest run src/__tests__/google-sso-login.test.tsx — 2 tests pass. Ran npx vitest run — full suite: 421 tests pass across 45 test files, 0 failures, no regressions.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run src/__tests__/google-sso-login.test.tsx` | 0 | ✅ pass | 2800ms |
| 2 | `npx vitest run` | 0 | ✅ pass | 9200ms |


## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/components/auth/LoginForm.tsx`
- `src/__tests__/google-sso-login.test.tsx`


## Deviations
None.

## Known Issues
None.
