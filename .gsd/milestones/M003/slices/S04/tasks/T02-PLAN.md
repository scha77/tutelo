---
estimated_steps: 3
estimated_files: 1
---

# T02: Auto-populate social_email from auth email on teacher signup

**Slice:** S04 — OG Tags, Email Fix & Deploy
**Milestone:** M003

## Description

Fix the silent notification gap where teachers who complete onboarding but never visit Page Settings miss all booking notification emails because `social_email` is NULL. When a new teacher row is first created in `saveWizardStep`, retrieve their auth email via `supabase.auth.getUser()` and include it as `social_email` in the INSERT. This works for both email/password signup and Google OAuth because `getUser()` always returns the verified email from Supabase Auth.

## Steps

1. Modify `saveWizardStep` in `src/actions/onboarding.ts`:
   - In the `!existing` (first-INSERT) branch, after getting `userId` and before the INSERT
   - Call `supabase.auth.getUser()` to retrieve the full user object
   - Extract `email` from `data.user?.email`
   - Add `social_email: data.social_email ?? email ?? null` to the INSERT object
   - This ensures: if caller explicitly provides `social_email` in `data`, use that; otherwise fall back to auth email; otherwise null
   - Do NOT modify the UPDATE branch — social_email should only be auto-set on initial creation

2. Verify the fix handles edge cases:
   - Email/password signup: `getUser()` returns the email used to sign up
   - Google OAuth signup: `getUser()` returns the Google email
   - Explicit `social_email` in data: preserved (not overwritten)
   - `getUser()` failure: falls back to null (no crash)

3. Run `npm run build` to confirm no TypeScript errors

## Must-Haves

- [ ] `saveWizardStep` INSERT branch includes `social_email` from auth email
- [ ] Explicit `social_email` in `data` takes priority over auth email
- [ ] `getUser()` failure does not crash the action (falls back gracefully)
- [ ] UPDATE branch is NOT modified (only first INSERT affected)
- [ ] `npm run build` passes

## Verification

- Read the modified `src/actions/onboarding.ts` and confirm the INSERT includes `social_email` logic
- `npm run build` succeeds
- Unit test in T03 will exercise this logic with mocked Supabase

## Observability Impact

- Signals added/changed: `social_email` column populated on new teacher rows (was previously NULL until manual Page Settings visit)
- How a future agent inspects this: `SELECT social_email FROM teachers WHERE user_id = '...'` — non-NULL for any teacher created after this fix
- Failure state exposed: If `getUser()` fails, `social_email` will be NULL (same as current behavior) — no regression

## Inputs

- `src/actions/onboarding.ts` — `saveWizardStep` function with INSERT and UPDATE branches
- S04-RESEARCH.md — confirmed `supabase.auth.getUser()` works for both email/password and OAuth

## Expected Output

- `src/actions/onboarding.ts` — modified: INSERT branch now includes `social_email` auto-populated from auth email
