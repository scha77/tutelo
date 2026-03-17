---
estimated_steps: 6
estimated_files: 4
---

# T01: Add verification token migration, library, email template, and unit tests

**Slice:** S03 — School Email Verification & Badge Gating
**Milestone:** M005

## Description

Create the foundational pieces for the school email verification flow: a DB migration adding token storage columns, a pure verification library with token generation/expiry/email-sending functions, a React Email template for the verification link, and unit tests covering all verification logic. Everything in this task is pure and unit-testable — no runtime dependencies on the Next.js server or auth.

## Steps

1. **Create migration `supabase/migrations/0010_email_verification_tokens.sql`:**
   - Add two nullable columns to `teachers`:
     - `school_email_verification_token TEXT`
     - `school_email_verification_expires_at TIMESTAMPTZ`
   - Add a partial index for fast token lookups:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_teachers_verification_token
       ON teachers (school_email_verification_token)
       WHERE school_email_verification_token IS NOT NULL;
     ```
   - Note: `verified_at TIMESTAMPTZ` already exists from migration 0008. Do NOT add it again.

2. **Create `src/lib/verification.ts`:**
   - `generateVerificationToken(): string` — returns `crypto.randomUUID()`
   - `isTokenExpired(expiresAt: string | Date): boolean` — returns `true` if `expiresAt` is in the past
   - `sendVerificationEmail(toEmail: string, token: string): Promise<void>` — uses Resend SDK (same `new Resend(process.env.RESEND_API_KEY)` pattern as `src/lib/email.ts`), sends email with `SchoolVerificationEmail` React component. The verification URL is `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'}/api/verify-email?token=${token}`. From address: `'Tutelo <noreply@tutelo.app>'`. Subject: `'Verify your school email on Tutelo'`.

3. **Create `src/emails/SchoolVerificationEmail.tsx`:**
   - Follow the exact pattern of `src/emails/SessionReminderEmail.tsx` (same imports from `@react-email/components`, same styling structure).
   - Props: `{ verificationUrl: string }`
   - Content: greeting ("Verify your school email"), brief explanation ("Click the button below to verify your school email address on Tutelo. This link expires in 24 hours."), a CTA button linking to `verificationUrl` with text "Verify Email", and a footer note.
   - Import the `Button` component from `@react-email/components` for the CTA (add to imports alongside Body, Container, Head, Hr, Html, Preview, Section, Text).

4. **Create `src/__tests__/verification.test.ts`:**
   - Mock Resend with `vi.mock('resend', ...)` using the vi.hoisted pattern (see `sms.test.ts` for the exact mock pattern).
   - Test `generateVerificationToken()`:
     - Returns a string matching UUID v4 format (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`)
     - Two calls return different tokens
   - Test `isTokenExpired()`:
     - Returns `true` for a date 1 hour in the past
     - Returns `false` for a date 1 hour in the future
     - Returns `true` for `new Date(0)` (epoch — edge case)
   - Test `sendVerificationEmail()`:
     - Calls `resend.emails.send` with correct `to`, `from`, `subject`, and `react` fields
     - Verify the `react` prop is truthy (the email template was rendered)
     - Set `process.env.NEXT_PUBLIC_APP_URL = 'https://test.tutelo.app'` and verify the URL includes the token param

## Must-Haves

- [ ] Migration 0010 adds `school_email_verification_token TEXT` and `school_email_verification_expires_at TIMESTAMPTZ` to teachers table
- [ ] Migration 0010 includes a partial index on `school_email_verification_token`
- [ ] `generateVerificationToken()` returns a UUID string
- [ ] `isTokenExpired()` correctly identifies past and future dates
- [ ] `sendVerificationEmail()` sends email via Resend with correct template and verification URL
- [ ] `SchoolVerificationEmail` renders with a CTA button linking to the verification URL
- [ ] All unit tests pass

## Verification

- `npx vitest run src/__tests__/verification.test.ts` — all tests pass
- `npm run build` — zero errors (new files compile cleanly)

## Inputs

- `src/emails/SessionReminderEmail.tsx` — pattern for the email template (imports, styling, structure)
- `src/lib/email.ts` — pattern for Resend SDK usage (`new Resend(process.env.RESEND_API_KEY)`)
- `src/__tests__/sms.test.ts` — pattern for `vi.hoisted` mocking and test structure
- `supabase/migrations/0008_sms_and_verification.sql` — confirms `verified_at` column already exists; do NOT re-add

## Observability Impact

- **New DB columns:** `teachers.school_email_verification_token` and `teachers.school_email_verification_expires_at` — inspectable via `SELECT school_email_verification_token, school_email_verification_expires_at FROM teachers WHERE school_email_verification_token IS NOT NULL` to see pending verifications.
- **Email send signal:** `sendVerificationEmail()` calls `resend.emails.send()` — Resend dashboard shows delivery status. Failures throw and should be caught by the caller (T02/T03).
- **Token expiry:** `isTokenExpired()` is a pure function — testable directly. In production, expired tokens are detected at verification time (T02) and logged via `console.warn`.
- **Partial index:** `idx_teachers_verification_token` enables fast token lookups — visible in `\di` in psql.

## Expected Output

- `supabase/migrations/0010_email_verification_tokens.sql` — migration file with ALTER TABLE and CREATE INDEX
- `src/lib/verification.ts` — exports `generateVerificationToken`, `isTokenExpired`, `sendVerificationEmail`
- `src/emails/SchoolVerificationEmail.tsx` — React Email component exported as named export `SchoolVerificationEmail`
- `src/__tests__/verification.test.ts` — passing test file with 6+ test cases
