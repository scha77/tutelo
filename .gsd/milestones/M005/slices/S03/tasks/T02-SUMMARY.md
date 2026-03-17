---
id: T02
parent: S03
milestone: M005
provides:
  - Server action `requestSchoolEmailVerification` for initiating school email verification
  - GET `/api/verify-email` route for handling email link clicks and stamping `verified_at`
key_files:
  - src/actions/verification.ts
  - src/app/api/verify-email/route.ts
key_decisions:
  - Used getUser() in server action (not getClaims()) per auth knowledge doc
  - Route uses supabaseAdmin (service role) since teacher may click link in a different browser with no session
  - Added error handling for DB update failure in both action and route (not in plan but defensively correct)
patterns_established:
  - Verification server action pattern: getUser() auth → zod validate → generate token → DB write → send email → revalidate
observability_surfaces:
  - console.warn on token-not-found or expired-token in verify-email route
  - console.error on email send failure or DB update failure
  - Redirect URL params (?error=invalid, ?error=expired, ?verified=true) visible in browser
duration: 10m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Build server action and API route for the verification flow

**Created `requestSchoolEmailVerification` server action and GET `/api/verify-email` route — the complete backend verification pipeline.**

## What Happened

Built two files exactly per plan:

1. **`src/actions/verification.ts`** — Server action with `'use server'` directive. Authenticates via `getUser()`, validates email with zod, generates UUID token with 24h expiry, writes token to teacher's DB row, sends verification email via Resend, and revalidates `/dashboard/settings`. Returns `{ error }` on failure, `{}` on success.

2. **`src/app/api/verify-email/route.ts`** — Public GET handler. Uses `supabaseAdmin` (service role) to look up teacher by token, checks expiry with `isTokenExpired()`, stamps `verified_at`, clears token columns, and redirects to `/dashboard/settings?verified=true`. Returns distinct error redirects for missing/bad token (`?error=invalid`) and expired token (`?error=expired`).

## Verification

- `npm run build` — zero errors, both files compile, `/api/verify-email` appears in route table as dynamic route (ƒ)
- `npx vitest run src/__tests__/verification.test.ts` — 9/9 tests pass (T01 unit tests still green)
- Confirmed `getUser()` used in action (not `getClaims()`)
- Confirmed `supabaseAdmin` used in route (not session-based `createClient()`)
- All 8 must-haves in task plan checked off

## Diagnostics

- **Server action failures:** Returned as `{ error: string }` — caller (T03 UI) should display via toast
- **Route failures:** Redirect to `/dashboard/settings?error=invalid` or `?error=expired` — visible in browser URL
- **Logs:** `[verification]` prefix for email send errors; `[verify-email]` prefix for token lookup/expiry warnings
- **DB inspection:** `SELECT school_email_verification_token, school_email_verification_expires_at, verified_at FROM teachers WHERE id = '<teacher_id>'`

## Deviations

- Added error handling for the DB `.update()` call in both the server action and the route handler. Plan didn't explicitly mention checking for DB update errors, but it's defensively correct — a failed write should not silently succeed.

## Known Issues

None.

## Files Created/Modified

- `src/actions/verification.ts` — Server action `requestSchoolEmailVerification` with auth, validation, token generation, DB write, and email send
- `src/app/api/verify-email/route.ts` — GET route handler that validates token, checks expiry, stamps `verified_at`, and redirects
