---
id: T02
parent: S04
milestone: M003
provides:
  - social_email auto-populated from auth email on new teacher INSERT in saveWizardStep
key_files:
  - src/actions/onboarding.ts
key_decisions:
  - Set social_email directly from authEmail (not data.social_email fallback) because social_email is not in FullOnboardingData schema — wizard data never carries it
patterns_established:
  - Use supabase.auth.getUser() in server actions to retrieve auth email; wrap in try/catch for graceful fallback
observability_surfaces:
  - "SELECT social_email FROM teachers WHERE user_id = '...'" — non-NULL for teachers created after this fix; NULL indicates getUser() failure or pre-fix row
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Auto-populate social_email from auth email on teacher signup

**In the saveWizardStep INSERT branch, added supabase.auth.getUser() call to auto-set social_email from the authenticated user's email address on first teacher row creation.**

## What Happened

Modified `saveWizardStep` in `src/actions/onboarding.ts` to retrieve the auth user's email via `supabase.auth.getUser()` before the INSERT and include it as `social_email` in the new teacher row. This closes the notification gap where teachers who complete onboarding but never visit Page Settings would have NULL `social_email` and miss all booking notification emails.

The implementation:
- Calls `supabase.auth.getUser()` in a try/catch (graceful fallback to null on failure)
- Extracts `userData?.user?.email`
- Sets `social_email: authEmail` in the INSERT object (after the `...data` spread, so it's always applied)
- Works for both email/password and Google OAuth because `getUser()` returns the verified email from Supabase Auth in both cases
- UPDATE branch is untouched — social_email is only auto-set on initial creation

Note: `social_email` is not part of `FullOnboardingData` (the Zod schema for wizard data), so there's no need for a `data.social_email ?? authEmail` fallback — auth email is always the right default on INSERT.

## Verification

- `npm run build` — exit code 0, no TypeScript errors
- Manual code review confirms:
  - INSERT branch includes `social_email: authEmail`
  - `getUser()` wrapped in try/catch (failure → null, same as prior behavior)
  - UPDATE branch unchanged
  - `social_email` key placed after `...data` spread to ensure it's always set
- `npx vitest run tests/unit/og-metadata.test.ts` — 4/4 tests pass (T01 regression check)
- `tests/unit/social-email.test.ts` — does not exist yet (T03 will create it)

## Diagnostics

- Inspect: `SELECT social_email FROM teachers WHERE user_id = '...'` — non-NULL for any teacher created after this fix
- Failure state: If `getUser()` fails, `social_email` will be NULL (identical to pre-fix behavior — no regression)
- No new error types or log entries — failure is silent and safe

## Deviations

- Task plan suggested `data.social_email ?? authEmail` fallback, but `social_email` is not in `FullOnboardingData` schema so `data.social_email` would cause a TypeScript error. Simplified to `social_email: authEmail` directly.

## Known Issues

None.

## Files Created/Modified

- `src/actions/onboarding.ts` — Added `getUser()` call and `social_email` auto-population in saveWizardStep INSERT branch
