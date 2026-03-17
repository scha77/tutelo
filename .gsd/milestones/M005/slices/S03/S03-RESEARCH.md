# S03: School Email Verification & Badge Gating — Research

**Date:** 2026-03-17
**Slice:** M005/S03
**Depends on:** S01 migration (0008_sms_and_verification.sql) — already applied

---

## Summary

S03 is well-scoped and technically straightforward. The badge-gating half is **already done**: `CredentialsBar.tsx` already accepts `isVerified: boolean` and conditionally renders the badge, and `src/app/[slug]/page.tsx` already passes `!!teacher.verified_at`. Nothing needs to change in either of those files.

The remaining work is entirely the **verification flow**: a UI panel on the teacher dashboard where a teacher submits their school email, a server action that generates a short-lived token and sends a verification email via Resend, a public callback route that validates the token and stamps `verified_at`, and unit tests for the token logic. There is no novel architecture here — the review token flow (`/review/[token]`) is a near-identical pattern to follow: token stored in DB, public route resolves it, `supabaseAdmin` bypasses RLS to write back.

One nuance: the verification email does NOT use Supabase Auth magic links. The research notes warn against this because it would conflict with the teacher's auth session. Instead we generate a plain UUID token, store it on the `teachers` row (or a dedicated column), email the link to the submitted school address, and when clicked, validate token + expiry and set `verified_at`. This is the same pattern as reviews — no Supabase Auth involvement.

S01's migration 0008 already added `verified_at TIMESTAMPTZ` to the `teachers` table. The migration also needs two new columns for the verification flow: `school_email_verification_token TEXT` and `school_email_verification_expires_at TIMESTAMPTZ`. These are additive and belong in a new migration 0010.

## Recommendation

Build in this order:
1. **Migration 0010** — add `school_email_verification_token` and `school_email_verification_expires_at` columns to teachers table
2. **`src/lib/verification.ts`** — token generation, validation logic, and the `sendVerificationEmail` Resend call (unit-testable module)
3. **`src/actions/verification.ts`** — `requestSchoolEmailVerification(email)` server action (auth-gated, writes token, calls sendVerificationEmail)
4. **`src/app/api/verify-email/route.ts`** — public GET handler: validates token, sets `verified_at`, redirects to dashboard with success param
5. **`src/components/dashboard/SchoolEmailVerification.tsx`** — client component: form to submit school email, show pending state, show verified state
6. **`src/app/(dashboard)/dashboard/settings/page.tsx`** — extend to fetch `verified_at` and render `SchoolEmailVerification`
7. **`src/emails/SchoolVerificationEmail.tsx`** — React Email template for the verification link
8. **`src/__tests__/verification.test.ts`** — unit tests for token generation, validation, expiry, and the callback route

The server action (`requestSchoolEmailVerification`) can safely use the `getClaims()` pattern already used in `profile.ts` and `onboarding.ts` — it's called from a client component inside the dashboard, not on a POST re-render.

## Implementation Landscape

### Key Files

**Already complete — no changes needed:**
- `src/components/profile/CredentialsBar.tsx` — already accepts `isVerified: boolean`, conditionally renders "Verified Teacher" badge. Badge gating is done.
- `src/app/[slug]/page.tsx` — already passes `isVerified={!!teacher.verified_at}` to `CredentialsBar`. Public profile wiring is done.
- `supabase/migrations/0008_sms_and_verification.sql` — already adds `verified_at TIMESTAMPTZ` to teachers table. Deployed in S01.

**New migration needed:**
- `supabase/migrations/0010_email_verification_tokens.sql` — adds `school_email_verification_token TEXT` and `school_email_verification_expires_at TIMESTAMPTZ` to teachers table. These are nullable, no data migration needed. (0009 was rename_reviews_text_column, so 0010 is the correct sequence number.)

**New files to create:**
- `src/lib/verification.ts` — Pure functions: `generateVerificationToken(): string` (returns `randomUUID()`), `isTokenExpired(expiresAt: string): boolean`, `sendVerificationEmail(toEmail: string, token: string): Promise<void>` (Resend call). Unit-testable without DB.
- `src/emails/SchoolVerificationEmail.tsx` — React Email component. Follows exact pattern of `SessionReminderEmail.tsx` / `CancellationEmail.tsx`. Plain layout, single CTA button linking to `/api/verify-email?token=<token>`.
- `src/actions/verification.ts` — `'use server'` — `requestSchoolEmailVerification(email: string): Promise<{error?: string}>`. Auth-gated via `getClaims()`. Validates email format (Zod), generates token + 24h expiry via `generateVerificationToken()`, writes to `teachers` row, calls `sendVerificationEmail`. Revalidates `/dashboard/settings`.
- `src/app/api/verify-email/route.ts` — `GET(request)` handler. Reads `?token` param, queries `teachers` by token using `supabaseAdmin` (bypasses RLS), checks expiry via `isTokenExpired()`, stamps `verified_at = now()`, clears token columns, redirects to `/dashboard/settings?verified=true` on success or `/dashboard/settings?error=invalid` on failure.
- `src/components/dashboard/SchoolEmailVerification.tsx` — `'use client'` component. Three states: (a) verified — shows green checkmark + verified email badge; (b) pending — shows email input form + submit button, with loading state via `useTransition`; (c) success toast after submit. Follows `AccountSettings.tsx` pattern exactly: `useState` for input, `useTransition` for action call, `toast.success/error` from sonner.
- `src/__tests__/verification.test.ts` — Vitest unit tests. Uses same mock patterns as `sms.test.ts` and `cancel-session.test.ts`.

**Files to modify:**
- `src/app/(dashboard)/dashboard/settings/page.tsx` — extend select query to include `verified_at`, pass it to `AccountSettings` (or render `SchoolEmailVerification` alongside). Simplest approach: add `SchoolEmailVerification` as a separate section below the profile form, fetching `verified_at` and `school_email_verification_token` (to show pending state) from the teacher select.

### Token Storage Design

Store token directly on the `teachers` row (two new nullable columns):
- `school_email_verification_token TEXT` — the UUID token, nullable; NULL after verification completes
- `school_email_verification_expires_at TIMESTAMPTZ` — expiry time (24h from send), nullable

**Why on teachers row, not a separate table:** The review token flow stores the token on the `reviews` row. This is the established codebase pattern. A separate `verification_tokens` table adds unnecessary complexity for a one-at-a-time flow. One teacher can only have one pending verification at a time — overwriting on re-request is safe and desirable (user re-submits if they typo'd the email).

### Verification Email Flow

1. Teacher visits `/dashboard/settings`, sees "Verify your school email" section
2. Teacher enters their school email address and clicks "Send verification link"
3. `requestSchoolEmailVerification` server action runs:
   - Validates email format (Zod `z.string().email()`)
   - Generates `token = randomUUID()`, `expiresAt = new Date(Date.now() + 24*60*60*1000)`
   - Updates `teachers` row: `school_email_verification_token`, `school_email_verification_expires_at`
   - Calls `sendVerificationEmail(email, token)` — Resend email with CTA to `/api/verify-email?token=<token>`
4. Teacher clicks link in email — GET `/api/verify-email?token=<uuid>`
5. Route handler:
   - Looks up teacher by token (`supabaseAdmin.from('teachers').select('id, school_email_verification_expires_at').eq('school_email_verification_token', token).maybeSingle()`)
   - If not found or expired: redirect to `/dashboard/settings?error=invalid`
   - If valid: update teacher row (`verified_at = now()`, clear token columns), redirect to `/dashboard/settings?verified=true`
6. Settings page shows success state (read from URL param or re-fetched `verified_at`)

### Resend Email Pattern

`sendVerificationEmail` in `src/lib/verification.ts` follows `src/lib/email.ts` exactly:
```ts
const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(toEmail: string, token: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'
  await resend.emails.send({
    from: 'Tutelo <noreply@tutelo.app>',
    to: toEmail,
    subject: 'Verify your school email on Tutelo',
    react: SchoolVerificationEmail({ verificationUrl: `${appUrl}/api/verify-email?token=${token}` }),
  })
}
```

No new env vars needed — `RESEND_API_KEY` is already used by `src/lib/email.ts`.

### API Route Pattern

`src/app/api/verify-email/route.ts` follows `src/app/api/connect-stripe/route.ts` pattern:
- GET handler (not POST — link in email, user clicks it)
- Uses `supabaseAdmin` (no user session — teacher may click link in a different browser)
- Redirects on success/failure (no JSON response — browser navigation)

### Dashboard Settings Extension

`src/app/(dashboard)/dashboard/settings/page.tsx` currently selects `phone_number, sms_opt_in`. Extend to also select `verified_at`. Then render `SchoolEmailVerification` below `AccountSettings`:

```tsx
return (
  <>
    <AccountSettings teacher={teacher} />
    <SchoolEmailVerification isVerified={!!teacher.verified_at} />
  </>
)
```

`SchoolEmailVerification` is a standalone client component with its own form state — it doesn't need to share state with `AccountSettings`.

### Build Order

1. Migration 0010 (unblocks everything)
2. `src/lib/verification.ts` + `src/emails/SchoolVerificationEmail.tsx` (pure, no deps)
3. `src/__tests__/verification.test.ts` (prove token logic works)
4. `src/actions/verification.ts` (depends on lib)
5. `src/app/api/verify-email/route.ts` (depends on lib)
6. `src/components/dashboard/SchoolEmailVerification.tsx` (depends on action)
7. `src/app/(dashboard)/dashboard/settings/page.tsx` (wire up component)

### Verification Approach

```bash
# Run unit tests
npm run test -- --run verification

# Type check
npm run build

# Manual: submit school email → click link in inbox → refresh /[slug] → badge appears
```

## Constraints

- **No new env vars needed** — `RESEND_API_KEY` and `NEXT_PUBLIC_APP_URL` already exist. No Supabase Auth magic links (avoids session conflict).
- **`supabaseAdmin` required for verify-email callback** — teacher may click the link in a different browser or device where they have no active session. Route handler cannot use `createClient()` (session-based); must use `supabaseAdmin` (service role).
- **RLS bypass** — `teachers` table has RLS. `supabaseAdmin` bypasses it for the token lookup. This is the same pattern as `sendCancellationEmail`, `sendSessionReminderEmail`, and all cron handlers.
- **Server action auth** — `requestSchoolEmailVerification` uses `getClaims()` (same as `profile.ts`, `onboarding.ts`). This is acceptable because it's called from a client component inside the dashboard layout (not on a POST re-render of a layout).
- **Token is plain UUID** — `crypto.randomUUID()` (Node built-in, no new package needed). 24-hour expiry is sufficient and standard.
- **One pending token at a time** — Re-submitting overwrites the previous token. This is correct — if a teacher typo'd the email, they should be able to re-send without being blocked.
- **`verified_at` is never cleared** — Once set, the teacher is permanently verified. There is no "unverify" flow in S03.

## Common Pitfalls

- **Don't use Supabase Auth email OTP** — The research notes flag this: sending a Supabase magic link to the school email would arrive in parallel with any auth magic links the teacher is using. Keep verification entirely separate from auth.
- **`settings/page.tsx` select query** — Currently selects specific columns (`phone_number, sms_opt_in`). After S03, it must also select `verified_at`. Forgetting this means `isVerified` is always false even after a successful verification.
- **Token column indexing** — The token lookup `eq('school_email_verification_token', token)` should be on an indexed column. Add `CREATE INDEX IF NOT EXISTS idx_teachers_verification_token ON teachers (school_email_verification_token) WHERE school_email_verification_token IS NOT NULL;` in migration 0010.
- **Redirect after verification** — The GET route must redirect (not return JSON) since it's navigated to by clicking a link in an email. Use `NextResponse.redirect(...)`.
- **URL param for success state** — After redirect to `/dashboard/settings?verified=true`, the settings page should show a success message. This can be done by reading `searchParams` in the page server component (already used in `[slug]/page.tsx` for the `preview` param and in `dashboard/page.tsx` for the `stripe=connected` pattern).

## Open Risks

- **School email deliverability** — Resend is already used for all notification emails. No additional deliverability concern. School domains may have aggressive spam filters, but verification emails from `noreply@tutelo.app` with a clear subject are low risk.
- **What counts as a "school email"** — S03 does NOT validate the domain (`.edu`, `.k12.*.us`). The teacher can submit any email address they control. The trust signal is that they control *some* external email address they've claimed is their school address. Domain validation can be added later (VERIFY-02 advisory) without breaking this flow.
