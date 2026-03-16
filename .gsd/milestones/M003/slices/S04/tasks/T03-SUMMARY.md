---
id: T03
parent: S04
milestone: M003
provides:
  - Unit test suite for OG metadata generation (4 tests) covering valid slug, invalid slug, empty subjects, null subjects
  - Unit test suite for social_email auto-population (5 tests) covering INSERT with auth email, getUser failure fallback, missing email, UPDATE skips getUser, unauthenticated user
  - Build verification (zero errors)
key_files:
  - tests/unit/og-metadata.test.ts
  - tests/unit/social-email.test.ts
key_decisions:
  - Mock @/lib/supabase/server createClient with chainable query builder pattern for both test suites
  - Test social_email on the INSERT call argument rather than DB state (unit-level isolation)
patterns_established:
  - Chainable Supabase mock: mockFrom → mockSelect → mockEq → mockSingle for read queries; mockFrom → mockInsert for writes
  - Server action testing: mock getClaims for auth, mock getUser for email retrieval, assert on mock call arguments
observability_surfaces:
  - Run `npx vitest run tests/unit/og-metadata.test.ts tests/unit/social-email.test.ts` to verify OG metadata and social_email behavior
  - Test failures pinpoint which metadata field or social_email logic branch is broken
duration: 20m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Build verification, test suite, and production deploy

**Created social-email unit tests (5 tests), verified existing OG metadata tests (4 tests), confirmed zero-error build; Vercel deploy blocked on CLI auth.**

## What Happened

The OG metadata test file (`tests/unit/og-metadata.test.ts`) already existed from T01 with 4 comprehensive tests covering valid slug, invalid slug, empty subjects, and null subjects cases. All pass.

Created `tests/unit/social-email.test.ts` with 5 tests covering the `saveWizardStep` INSERT branch:
1. Auto-sets `social_email` from auth email on new teacher INSERT
2. Falls back to null when `getUser()` throws (graceful degradation)
3. Falls back to null when `getUser()` returns no email
4. Does NOT call `getUser()` on UPDATE path (existing teacher)
5. Returns "Not authenticated" when user has no valid claims

Both test suites run together: 9 tests, all pass.

Full `npm run build` succeeds with zero errors. All routes render correctly including the new `/[slug]/opengraph-image` edge route.

Vercel CLI deploy (`vercel deploy --prod`) is blocked — no credentials found. Requires `vercel login` interactively or a `VERCEL_TOKEN` env var. The production site at `https://tutelo.app` is currently live (HTTP 200) from a prior deploy. The new code needs to be deployed via Vercel dashboard, git push trigger, or after authenticating the CLI.

## Verification

- `npx vitest run tests/unit/og-metadata.test.ts` — **4 tests pass** ✅
- `npx vitest run tests/unit/social-email.test.ts` — **5 tests pass** ✅
- `npm run build` — **exits 0, zero errors** ✅
- `vercel deploy --prod` — **blocked on auth** (no credentials; requires `vercel login` or `VERCEL_TOKEN`)
- `curl -sI https://tutelo.app` — **HTTP 200** (existing deployment live)

### Slice-level verification:
- ✅ `npm run build` succeeds
- ✅ `npx vitest run tests/unit/og-metadata.test.ts` passes
- ✅ `npx vitest run tests/unit/social-email.test.ts` passes
- ⬜ Integration: OG meta tags in HTML (requires live dev server with DB data)
- ⬜ Integration: OG image route returns PNG (requires live server)
- ⚠️ Production deploy: blocked on Vercel CLI auth

## Diagnostics

- Run `npx vitest run tests/unit/og-metadata.test.ts tests/unit/social-email.test.ts` — 9 tests verify OG metadata generation and social_email auto-population logic
- Test failures identify the exact field or branch that broke
- For integration verification post-deploy: `curl -I https://tutelo.app/[slug]/opengraph-image` should return 200 + `content-type: image/png`

## Deviations

- OG metadata test file already existed from T01 — verified it passes rather than rewriting
- Deploy blocked on Vercel CLI credentials — documented as user action required per plan's fallback instructions

## Known Issues

- Vercel production deploy requires user to run `vercel login` or provide `VERCEL_TOKEN` before CLI deploy can proceed. Alternative: push to connected git remote to trigger Vercel's git-based deploy.

## Files Created/Modified

- `tests/unit/social-email.test.ts` — new: 5 unit tests for saveWizardStep social_email auto-population
- `tests/unit/og-metadata.test.ts` — existing: verified 4 tests pass (no modifications)
