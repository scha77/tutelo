---
id: T01
parent: S03
milestone: M005
provides:
  - DB migration for verification token columns and partial index
  - Pure verification library (token gen, expiry check, email send)
  - SchoolVerificationEmail React Email template
  - Unit tests for all verification logic
key_files:
  - supabase/migrations/0010_email_verification_tokens.sql
  - src/lib/verification.ts
  - src/emails/SchoolVerificationEmail.tsx
  - src/__tests__/verification.test.ts
key_decisions:
  - Used class-based mock for Resend (vi.hoisted + class) since Resend is instantiated with `new` at module scope
patterns_established:
  - Resend mock pattern for tests: use `class MockResend { emails = { send: emailsSendMock } }` in vi.hoisted, not vi.fn().mockReturnValue (which isn't constructable)
observability_surfaces:
  - DB inspection: `SELECT school_email_verification_token, school_email_verification_expires_at FROM teachers WHERE school_email_verification_token IS NOT NULL`
  - Resend dashboard for email delivery status
  - Partial index `idx_teachers_verification_token` visible in psql `\di`
duration: 10m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T01: Add verification token migration, library, email template, and unit tests

**Created DB migration, pure verification library, React Email template, and 9 passing unit tests for the school email verification flow.**

## What Happened

1. Created migration `0010_email_verification_tokens.sql` — adds `school_email_verification_token TEXT` and `school_email_verification_expires_at TIMESTAMPTZ` columns to teachers, plus a partial index on the token column for fast lookups. Did NOT re-add `verified_at` (already exists from 0008).

2. Created `src/lib/verification.ts` with three exports:
   - `generateVerificationToken()` — wraps `crypto.randomUUID()`
   - `isTokenExpired(expiresAt)` — compares expiry date to `Date.now()`
   - `sendVerificationEmail(toEmail, token)` — sends via Resend with `SchoolVerificationEmail` template, building the verification URL from `NEXT_PUBLIC_APP_URL`

3. Created `src/emails/SchoolVerificationEmail.tsx` following the `SessionReminderEmail` pattern exactly — same imports, styling structure, layout. Added `Button` component from `@react-email/components` for the CTA. Props: `{ verificationUrl: string }`.

4. Created `src/__tests__/verification.test.ts` with 9 test cases across 3 describe blocks. Used `vi.hoisted()` with a class-based Resend mock (not `vi.fn().mockReturnValue`) because Resend is instantiated with `new` at module scope.

## Verification

- `npx vitest run src/__tests__/verification.test.ts` — **9/9 tests pass** (token UUID format, uniqueness, expiry past/future/epoch/string, email send args, react prop truthy, URL construction)
- `npm run build` — **zero errors**, all 24 pages generated successfully

### Slice-level verification status (T01 of 3):
- ✅ `npx vitest run src/__tests__/verification.test.ts` — passes
- ✅ `npm run build` — passes
- ⏳ Manual flow — not yet testable (needs T02 server action + T03 UI)

## Diagnostics

- **DB columns:** Query `SELECT school_email_verification_token, school_email_verification_expires_at FROM teachers WHERE school_email_verification_token IS NOT NULL` to see pending verifications
- **Index:** `idx_teachers_verification_token` partial index enables fast token lookups
- **Email delivery:** Check Resend dashboard for send status; `sendVerificationEmail` throws on Resend API failure (caller in T02 should catch)

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `supabase/migrations/0010_email_verification_tokens.sql` — migration adding token columns and partial index
- `src/lib/verification.ts` — pure verification library (token gen, expiry check, email send)
- `src/emails/SchoolVerificationEmail.tsx` — React Email template with CTA button
- `src/__tests__/verification.test.ts` — 9 unit tests covering all verification logic
- `.gsd/milestones/M005/slices/S03/tasks/T01-PLAN.md` — added Observability Impact section
