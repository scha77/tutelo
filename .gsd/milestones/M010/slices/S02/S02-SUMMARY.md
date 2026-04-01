---
id: S02
parent: M010
milestone: M010
provides:
  - Verified Google SSO OAuth flow (redirectTo bug fixed)
  - Full unit coverage of all 4 OAuth callback routing paths
  - AUTH-04 proof that school email verification is provider-agnostic
  - 426-test clean suite baseline for S03/S04/S05
requires:
  []
affects:
  []
key_files:
  - src/components/auth/LoginForm.tsx
  - src/__tests__/google-sso-login.test.tsx
  - src/__tests__/google-sso-callback.test.ts
key_decisions:
  - Used dynamic import pattern for LoginForm in tests consistent with existing parent-auth.test.tsx (T01)
  - Used vi.hoisted() for mock factory so mockExchangeCodeForSession, mockGetUser, and mockFrom are available at module-scope before vi.mock runs (T02)
  - New Google user (no teacher row) routes to /parent — no special onboarding branch added to callback route (D030)
patterns_established:
  - Route handler unit testing: call GET(new NextRequest(...)), assert response.headers.get('location') for redirect destination — no thrown-redirect to catch
  - vi.hoisted() pattern for Supabase server mock in route handler tests — required because vi.mock() factories execute before variable declarations in the test file
  - AUTH-04 smoke test pattern: fs.readFileSync source assertion to prove a function has no provider-specific logic — lightweight and resistant to implementation drift
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M010/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M010/slices/S02/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-01T13:24:17.029Z
blocker_discovered: false
---

# S02: Google SSO Verification

**Fixed the OAuth redirectTo bug blocking Google SSO and added 7 unit tests covering the complete OAuth callback routing matrix plus a provider-agnostic school email verification smoke test.**

## What Happened

S02 had a single runtime bug and a coverage gap, both fully addressed across two tasks.

**T01 — OAuth redirectTo bug fix + component tests**

The root cause was a one-line mismatch in `LoginForm.tsx`: `handleGoogleSignIn` was passing `redirectTo: \`${window.location.origin}/auth/callback\`` to Supabase's `signInWithOAuth`. However, the callback route lives at `src/app/(auth)/callback/route.ts` — Next.js route groups strip the parenthesized directory segment from the URL, so the actual accessible path is `/callback`, not `/auth/callback`. The fix was surgical: change one string literal on line 68.

Two component tests were written in `src/__tests__/google-sso-login.test.tsx` using the dynamic import pattern established in `parent-auth.test.tsx`. Test 1 asserts the Google button renders and is enabled by default. Test 2 clicks the button and asserts `signInWithOAuth` was called with `{ provider: 'google', options: { redirectTo: expect.stringContaining('/callback') } }` and that the redirectTo does NOT contain `/auth/callback`. Both pass.

**T02 — Callback route tests + AUTH-04 smoke test**

The OAuth callback route (`src/app/(auth)/callback/route.ts`) had no direct unit coverage. Five tests were written in `src/__tests__/google-sso-callback.test.ts` using `vi.hoisted()` to hoist the Supabase mock variables before `vi.mock()` runs (required because `vi.mock()` is hoisted to module scope by Vitest's transform).

Four tests cover all execution paths of the GET handler:
- Teacher user (teacher row found in DB) → redirects to `/dashboard`
- Non-teacher user (no teacher row) → redirects to `/parent`
- Missing `code` query param → redirects to `/login?error=auth`
- `exchangeCodeForSession` returns error → redirects to `/login?error=auth`

The fifth test is the AUTH-04 smoke: it reads `src/actions/verification.ts` source with `fs.readFileSync` and asserts the file uses `supabase.auth.getUser()` and contains no provider-specific terms (`provider`, `google`, `getSession().provider`). This proves the school email verification flow is provider-agnostic — a teacher who signs in via Google can still trigger the verification OTP flow.

**Final suite: 426 tests across 46 files, 0 failures** (up from 419 at M010 start).

## Verification

Ran targeted vitest run for both test files: 7/7 tests pass (2 in google-sso-login.test.tsx, 5 in google-sso-callback.test.ts). Ran full suite: 426 passed, 0 failures, 45 todo across 46 test files. Confirmed LoginForm.tsx line 68 uses `/callback` not `/auth/callback`. Confirmed verification.ts contains no provider-specific references.

## Requirements Advanced

- AUTH-03 — Fixed OAuth redirectTo bug; component tests prove signInWithOAuth called with correct provider and URL
- AUTH-04 — Smoke test proves verification.ts uses getUser() with no provider-specific logic — works post-Google-login

## Requirements Validated

- AUTH-03 — 2 component tests verify Google button present+enabled and signInWithOAuth called with provider:google and redirectTo containing /callback (not /auth/callback). 5 callback route tests verify teacher→/dashboard, non-teacher→/parent, missing-code→/login?error=auth, exchange-failure→/login?error=auth. All 426 tests pass.
- AUTH-04 — fs.readFileSync smoke test on verification.ts confirms getUser() present and no provider/google/getSession().provider references. All 426 tests pass.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. All must-haves from the slice plan were delivered as specified.

## Known Limitations

This slice covers unit-level verification only. End-to-end OAuth flow (actual Google consent screen → Supabase token exchange → redirect) requires a live Supabase environment with Google OAuth configured. No E2E test was written — that's an operational concern, not a code coverage gap. New Google SSO users (no teacher row) land at /parent rather than an onboarding flow; this is accepted behavior (D030).

## Follow-ups

None required for this slice. S03 (Saved Payment Methods) and S04 (Teacher-Parent Messaging) are independent of S02 — no SSO-specific concerns carry forward.

## Files Created/Modified

- `src/components/auth/LoginForm.tsx` — Fixed handleGoogleSignIn redirectTo from /auth/callback to /callback (line 68)
- `src/__tests__/google-sso-login.test.tsx` — New: 2 component tests — Google button renders+enabled, signInWithOAuth called with correct provider+URL
- `src/__tests__/google-sso-callback.test.ts` — New: 5 tests — all 4 OAuth callback routing paths + AUTH-04 provider-agnostic smoke test
