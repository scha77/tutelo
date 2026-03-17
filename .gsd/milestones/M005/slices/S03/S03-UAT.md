# S03: School Email Verification & Badge Gating — UAT

**Milestone:** M005
**Written:** 2026-03-17

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: The verification flow requires a real Resend email delivery to a real inbox and a real Supabase DB write. Unit tests cover the logic; live runtime proves the plumbing works end-to-end.

## Preconditions

1. Dev server running: `npm run dev`
2. `.env.local` has `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `SUPABASE_SERVICE_ROLE_KEY`
3. A teacher account exists and is logged in (completed onboarding)
4. Teacher's `verified_at` is NULL in the DB (unverified state to start)
5. Access to the school email inbox used for testing

## Smoke Test

Visit `/dashboard/settings` as a logged-in, unverified teacher. The page should show a "Verify your school email" form below the Account Settings section (not a green checkmark). This confirms the component renders and correctly reads `verified_at = NULL`.

---

## Test Cases

### 1. Settings page shows verification form for unverified teacher

1. Log in as a teacher with `verified_at IS NULL`
2. Navigate to `/dashboard/settings`
3. Scroll below the Account Settings card
4. **Expected:** A card with a Mail icon, heading "Verify your school email", description about the badge, an email input labeled "School email address", and a "Send verification link" button

### 2. Submitting an invalid email shows validation error

1. On `/dashboard/settings`, type `not-an-email` into the School email address input
2. Click "Send verification link"
3. **Expected:** A Sonner error toast appears with "Invalid email address". The button re-enables. No email is sent.

### 3. Submitting a valid school email sends the verification link

1. On `/dashboard/settings`, type a valid school email (e.g. `teacher@test.edu`) into the input
2. Click "Send verification link"
3. **Expected:** Button shows `Loader2` spinner + "Sending…" while the action runs, then a success toast: "Verification link sent! Check your inbox." Email input is cleared.
4. In the DB: `SELECT school_email_verification_token, school_email_verification_expires_at FROM teachers WHERE user_id = '<your-uid>'` — should show a UUID token and an expiry ~24h from now.
5. In the email inbox at the submitted address: receive a "Verify your school email on Tutelo" email with a CTA button.

### 4. Clicking the verification link stamps verified_at

1. Open the verification email from Test Case 3
2. Click the "Verify my school email" CTA button
3. **Expected:** Browser redirects to `http://localhost:3000/dashboard/settings?verified=true`
4. **Expected:** A Sonner success toast: "School email verified! Your profile now shows the Verified Teacher badge."
5. **Expected:** The verification card now shows a green `CheckCircle` icon with heading "School email verified" and description "Your profile displays the Verified Teacher badge."
6. In the DB: `SELECT verified_at, school_email_verification_token FROM teachers WHERE user_id = '<your-uid>'` — `verified_at` should be set (non-null), token should be NULL (cleared).

### 5. Verified teacher sees badge on public profile

1. After Test Case 4, navigate to the teacher's public profile (`/<slug>`)
2. Scroll to the CredentialsBar section
3. **Expected:** A green "✓ Verified Teacher" badge is visible in the credential bar
4. **Expected (contrast check):** Create a second teacher account with `verified_at IS NULL`. Visit that teacher's public profile — no "Verified Teacher" badge should appear.

### 6. Settings page shows verified state on reload

1. After Test Case 4, hard-reload `/dashboard/settings` (Cmd+Shift+R)
2. **Expected:** The "Verify your school email" form is NOT shown. The green verified card is shown. No toast (no URL params on direct reload).

### 7. Re-submitting verification form overwrites previous token

1. On a verified teacher's settings page (or a second unverified teacher), submit the verification form with email A
2. Immediately submit again with email B (without clicking the first link)
3. In the DB: verify that the token has changed (second submission overwrote first)
4. Click the first email link (from email A)
5. **Expected:** Redirect to `/dashboard/settings?error=invalid` — first token is no longer in the DB
6. **Expected:** Error toast: "Verification link is invalid or has already been used."

---

## Edge Cases

### Expired token

1. Directly update a teacher's verification token expiry in the DB:
   ```sql
   UPDATE teachers SET school_email_verification_expires_at = NOW() - INTERVAL '1 hour'
   WHERE user_id = '<uid>';
   ```
2. Construct the verification URL manually: `http://localhost:3000/api/verify-email?token=<token-from-db>`
3. Visit that URL
4. **Expected:** Redirect to `/dashboard/settings?error=expired`
5. **Expected:** Error toast: "Verification link has expired. Please request a new one."
6. **Expected:** `verified_at` remains NULL in the DB (not stamped on expired token)

### Token not found (tampered or already used)

1. Visit `http://localhost:3000/api/verify-email?token=00000000-0000-0000-0000-000000000000`
2. **Expected:** Redirect to `/dashboard/settings?error=invalid`
3. **Expected:** Error toast: "Verification link is invalid or has already been used."

### Missing token parameter

1. Visit `http://localhost:3000/api/verify-email` (no token param)
2. **Expected:** Redirect to `/dashboard/settings?error=invalid`
3. **Expected:** Error toast: "Verification link is invalid or has already been used."

### Unauthenticated verification action

1. Log out of the application
2. Navigate to `/dashboard/settings` (should redirect to `/login`)
3. **Expected:** Settings page is not accessible to unauthenticated users (redirect handled by dashboard layout)

---

## Failure Signals

- **Verification form not visible on settings page:** Check that `verified_at` is in the Supabase select query in `settings/page.tsx`. Check that `SchoolEmailVerification` is rendered below `AccountSettings`.
- **"Send verification link" shows error immediately without loading state:** Server action returned `{ error }` — check server logs for the specific error (auth failure, DB write failure, or email send failure).
- **Email not received:** Check Resend dashboard for send status. Verify `RESEND_API_KEY` is set and the sender domain `noreply@tutelo.app` is configured in Resend.
- **Clicking link lands on invalid page:** Confirm `NEXT_PUBLIC_APP_URL` matches the URL the link was generated from. Check that migration 0010 has been applied (token columns exist).
- **Badge appears on unverified teacher profile:** Check `src/app/[slug]/page.tsx` — confirm `isVerified={!!teacher.verified_at}` and that `verified_at` is in the select query.
- **Badge missing on verified teacher profile:** Check `verified_at` in DB is non-null. Check `CredentialsBar` props in the `[slug]` page.

---

## Requirements Proved By This UAT

- VERIFY-01 — Teacher submits school email → receives verification email → clicks link → `verified_at` stamped → profile shows "Verified Teacher" badge
- VERIFY-02 (badge gating) — Unverified teachers see no badge; verified teachers see the badge; the badge is derived from real DB state, not hardcoded

## Not Proven By This UAT

- Production Resend deliverability to non-test inboxes (requires live sender domain verification in Resend)
- Behavior under Supabase service role key misconfiguration in production
- Token cleanup (expired tokens remain in DB until manually cleared — no cron to remove them)
- School domain allowlist enforcement (any valid email format passes; `.edu` validation not implemented)

## Notes for Tester

- The verification link URL is built from `NEXT_PUBLIC_APP_URL`. In local dev, this must be set to `http://localhost:3000` or the link will point to the wrong host.
- If testing with a real email inbox, Resend's sandbox mode may not deliver to non-verified addresses. Add your test email to Resend's allowed list or use a verified sender + recipient in your Resend account.
- The `verified_at` column is shared with the SMS infrastructure from S01. If S01 migration 0008 has not been applied to the local Supabase instance, `verified_at` will not exist and the settings page query will fail. Apply migrations in order: 0008, then 0010.
- "Verified Teacher" badge styling: green shield/checkmark in CredentialsBar. If accent color overrides make it hard to see, check the teacher's chosen accent_color in the DB.
