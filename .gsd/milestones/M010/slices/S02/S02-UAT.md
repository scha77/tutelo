# S02: Google SSO Verification — UAT

**Milestone:** M010
**Written:** 2026-04-01T13:24:17.030Z

## UAT Script: S02 — Google SSO Verification

### Preconditions
- Supabase project configured with Google OAuth provider (client ID + secret set in Supabase Dashboard → Authentication → Providers → Google)
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in environment
- Dev server running (`npm run dev`)
- Test teacher account exists in `teachers` table
- Test parent account exists (no row in `teachers` table)

---

### TC-01: Google SSO button initiates OAuth with correct redirect URL

**What's being tested:** LoginForm sends the correct `redirectTo` to Supabase (the bug that was fixed).

**Preconditions:** Open browser DevTools → Network tab. Navigate to `/login`.

**Steps:**
1. Open DevTools Network tab filtered to `XHR` / `Fetch`.
2. Click "Continue with Google".
3. Observe the outbound request to Supabase `/auth/v1/authorize`.

**Expected:**
- The `redirect_to` query parameter in the Supabase authorize URL contains `/callback` (e.g. `https://your-domain.com/callback`).
- The URL does NOT contain `/auth/callback`.
- Browser is redirected to Google's consent screen.

**Edge cases:**
- If the redirect URL contains `/auth/callback`, the bug has regressed — check LoginForm.tsx line 68.

---

### TC-02: Teacher completes Google OAuth → lands on /dashboard

**What's being tested:** Callback route routes a teacher user to the correct dashboard.

**Preconditions:** A user record exists with a matching row in the `teachers` table.

**Steps:**
1. Navigate to `/login`.
2. Click "Continue with Google".
3. Complete the Google consent flow (select teacher's Google account).
4. Observe redirect after OAuth callback.

**Expected:**
- User lands at `/dashboard` (not `/parent`, not `/login`).
- Teacher dashboard renders with their name and session data.
- No 404 or error page.

---

### TC-03: Parent (non-teacher) completes Google OAuth → lands on /parent

**What's being tested:** Callback route routes a non-teacher user to the parent dashboard.

**Preconditions:** A user record exists with NO matching row in the `teachers` table.

**Steps:**
1. Navigate to `/login`.
2. Click "Continue with Google".
3. Complete the Google consent flow (select parent's Google account).
4. Observe redirect after OAuth callback.

**Expected:**
- User lands at `/parent` (not `/dashboard`, not `/login`).
- Parent dashboard renders (overview page with My Children / My Bookings).
- No 404 or error page.

---

### TC-04: New Google user (first-ever login) → lands at /parent

**What's being tested:** A brand-new Supabase user created via Google OAuth has no teacher row, so they route to /parent.

**Preconditions:** Use a Google account that has never logged into this Supabase project.

**Steps:**
1. Navigate to `/login`.
2. Click "Continue with Google".
3. Complete Google consent (first-time authorization).
4. Observe landing page.

**Expected:**
- New user record created in Supabase `auth.users`.
- User lands at `/parent` (no teacher row exists for them).
- Parent dashboard renders without errors.

---

### TC-05: OAuth callback — missing code parameter → redirect to /login?error=auth

**What's being tested:** Callback route handles malformed/missing OAuth code gracefully.

**Preconditions:** Can test unit-level (already passing) or via direct URL hit.

**Steps (manual):**
1. Navigate directly to `/callback` (no `code` query param).

**Expected:**
- Browser is redirected to `/login?error=auth`.
- Login page displays an error state (or the error query param is present).
- No 500 error, no unhandled exception.

---

### TC-06: Teacher can trigger school email verification after Google login

**What's being tested:** AUTH-04 — the school email verification flow is provider-agnostic.

**Preconditions:** Teacher is signed in via Google SSO (completed TC-02).

**Steps:**
1. Navigate to `/dashboard/settings` (or wherever school email verification is exposed).
2. Enter a `.edu` email address.
3. Submit the verification request.
4. Retrieve the OTP from the school email inbox.
5. Enter the OTP in the verification form.

**Expected:**
- OTP email is sent successfully (same flow as email+password login).
- Entering the correct OTP stamps `verified_at` on the teacher record.
- "Verified" badge appears on the teacher's public profile page.
- No "provider" or "Google" check blocks or short-circuits the flow.

---

### TC-07 (Unit verification): All 7 S02 tests pass

**What's being tested:** Unit-level regression check.

**Command:**
```bash
npx vitest run src/__tests__/google-sso-login.test.tsx src/__tests__/google-sso-callback.test.ts
```

**Expected output:**
```
✓ src/__tests__/google-sso-callback.test.ts (5 tests)
✓ src/__tests__/google-sso-login.test.tsx (2 tests)

Test Files  2 passed (2)
      Tests  7 passed (7)
```

**Full regression:**
```bash
npx vitest run 2>&1 | tail -5
# Expected: 426 passed, 0 failures
```
