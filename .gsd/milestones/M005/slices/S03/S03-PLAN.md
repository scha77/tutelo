# S03: School Email Verification & Badge Gating

**Goal:** Teacher can verify their school email via a token-based flow, and the "Verified Teacher" badge on their public profile is gated on `verified_at IS NOT NULL`.

**Demo:** Teacher visits dashboard settings → enters school email → receives verification email → clicks link → `verified_at` is set → public profile shows "Verified Teacher" badge. An unverified teacher sees no badge.

## Must-Haves

- Migration adds `school_email_verification_token` and `school_email_verification_expires_at` columns to teachers table
- `src/lib/verification.ts` exports `generateVerificationToken()`, `isTokenExpired()`, and `sendVerificationEmail()` functions
- `src/emails/SchoolVerificationEmail.tsx` React Email template with CTA link
- `requestSchoolEmailVerification` server action validates email, generates token with 24h expiry, writes to DB, sends verification email
- GET `/api/verify-email?token=<uuid>` route validates token, checks expiry, stamps `verified_at`, clears token columns, redirects to dashboard
- `SchoolEmailVerification` client component on settings page shows three states: unverified form, pending/loading, verified badge
- Settings page fetches `verified_at` and passes it to the verification component
- CredentialsBar badge gated on `isVerified` prop (already done — no changes needed)
- Public profile passes `!!teacher.verified_at` to CredentialsBar (already done — no changes needed)
- Unit tests for token generation, expiry validation, and email sending pass
- `npm run build` passes with zero errors

## Proof Level

- This slice proves: integration
- Real runtime required: yes (Resend email delivery, Supabase DB writes)
- Human/UAT required: yes (clicking real email link in inbox)

## Verification

- `npx vitest run src/__tests__/verification.test.ts` — unit tests for token generation, expiry, email send, and route handler logic
- `npm run build` — zero type errors, zero build errors
- Manual: submit school email on settings page → email arrives → click link → redirected to settings with success → visit public profile → "Verified Teacher" badge visible

## Observability / Diagnostics

- Runtime signals: `console.warn` on token-not-found or expired-token in verify-email route; Resend API response for email send
- Inspection surfaces: `teachers` table — `school_email_verification_token`, `school_email_verification_expires_at`, `verified_at` columns
- Failure visibility: redirect to `/dashboard/settings?error=invalid` on failed verification; toast error on failed email send
- Redaction constraints: verification tokens are short-lived UUIDs with no PII; school email is stored transiently (only in the email send, not persisted on the teachers row in S03)

## Integration Closure

- Upstream surfaces consumed: `teachers.verified_at` column from S01 migration (0008); `supabaseAdmin` from `src/lib/supabase/service.ts`; Resend SDK pattern from `src/lib/email.ts`; `getClaims()` auth pattern from `src/actions/profile.ts`
- New wiring introduced in this slice: `SchoolEmailVerification` component rendered on settings page; `/api/verify-email` public GET route; `requestSchoolEmailVerification` server action
- What remains before the milestone is truly usable end-to-end: nothing — S01 and S02 are already complete; S03 closes the milestone

## Tasks

- [x] **T01: Add verification token migration, library, email template, and unit tests** `est:45m`
  - Why: Establishes the foundation — DB columns for token storage, pure verification logic (token generation, expiry checking, email sending), the email template, and unit tests that prove the logic works. All downstream tasks depend on this.
  - Files: `supabase/migrations/0010_email_verification_tokens.sql`, `src/lib/verification.ts`, `src/emails/SchoolVerificationEmail.tsx`, `src/__tests__/verification.test.ts`
  - Do: Create migration 0010 adding `school_email_verification_token TEXT` and `school_email_verification_expires_at TIMESTAMPTZ` to teachers table with a partial index on token. Create `verification.ts` with `generateVerificationToken()` (returns `crypto.randomUUID()`), `isTokenExpired(expiresAt: string | Date): boolean`, and `sendVerificationEmail(toEmail: string, token: string): Promise<void>` (uses Resend with `SchoolVerificationEmail` template). Create `SchoolVerificationEmail.tsx` following `SessionReminderEmail.tsx` pattern — simple layout with a CTA button linking to `/api/verify-email?token=<token>`. Write unit tests for token generation (UUID format), expiry check (expired vs valid), and email send (mock Resend).
  - Verify: `npx vitest run src/__tests__/verification.test.ts` passes; `npm run build` passes
  - Done when: All verification utility tests pass and the library exports are importable without type errors

- [x] **T02: Build server action and API route for the verification flow** `est:40m`
  - Why: Implements the two backend endpoints: the server action that teachers call to request verification (writes token to DB, sends email), and the public GET route that handles the email link click (validates token, stamps `verified_at`, redirects). Together they form the complete verification pipeline.
  - Files: `src/actions/verification.ts`, `src/app/api/verify-email/route.ts`
  - Do: Create `requestSchoolEmailVerification(email: string)` server action — `'use server'`, auth via `getClaims()`, validate email with `z.string().email()`, generate token + 24h expiry, update teachers row with token/expiry via `createClient()`, call `sendVerificationEmail()`, revalidate `/dashboard/settings`. Create GET route handler at `/api/verify-email/route.ts` — read `?token` param, query teachers by token via `supabaseAdmin` (bypasses RLS), check expiry with `isTokenExpired()`, on success: set `verified_at = new Date().toISOString()` and clear token columns, redirect to `/dashboard/settings?verified=true`; on failure: redirect to `/dashboard/settings?error=invalid`.
  - Verify: `npm run build` passes; manual test: calling the action with a valid email writes token to DB; hitting the route with a valid token stamps `verified_at`
  - Done when: Both files compile, the action writes token to DB and calls Resend, the route validates token and stamps `verified_at` with proper redirects

- [x] **T03: Build SchoolEmailVerification UI and wire into dashboard settings** `est:35m`
  - Why: Closes the user-facing loop — teachers need a UI to initiate verification and see their status. The settings page must fetch `verified_at` and render the verification component. Also handles URL param feedback (success/error after redirect from verify-email route).
  - Files: `src/components/dashboard/SchoolEmailVerification.tsx`, `src/app/(dashboard)/dashboard/settings/page.tsx`
  - Do: Create `SchoolEmailVerification` as a `'use client'` component following `AccountSettings` patterns — accepts `isVerified: boolean` prop. Three states: (a) verified — green checkmark + "School email verified" text; (b) unverified — email input + "Send verification link" button with `useTransition` for loading state; (c) after submit — success toast via sonner. Uses `requestSchoolEmailVerification` action. Update `settings/page.tsx` to add `verified_at` to the teacher select query, render `SchoolEmailVerification` below `AccountSettings`, and read `searchParams` for `verified=true` / `error=invalid` to show appropriate toast/message on page load after redirect.
  - Verify: `npm run build` passes; visual check: settings page shows verification section; after verification, badge appears on public profile
  - Done when: Settings page renders SchoolEmailVerification component; unverified teachers see the form; verified teachers see a success state; `npm run build` passes with zero errors

## Files Likely Touched

- `supabase/migrations/0010_email_verification_tokens.sql`
- `src/lib/verification.ts`
- `src/emails/SchoolVerificationEmail.tsx`
- `src/__tests__/verification.test.ts`
- `src/actions/verification.ts`
- `src/app/api/verify-email/route.ts`
- `src/components/dashboard/SchoolEmailVerification.tsx`
- `src/app/(dashboard)/dashboard/settings/page.tsx`
