# S02 Research: Google SSO Verification

**Gathered:** 2026-04-01  
**Slice:** M010/S02 — Google SSO Verification  
**Requirements:** AUTH-03 (Google SSO end-to-end), AUTH-04 (school email verification post-Google-login)

---

## Summary

This slice is **targeted** work: the OAuth button is already wired, the callback route already routes correctly for the returning-user case, and the school email verification flow is provider-agnostic. The slice has two concrete deliverables: (1) fix a URL bug that would prevent OAuth from working, and (2) write unit tests that contractually lock in the callback routing logic and Google button behavior. No new architecture is needed.

---

## Implementation Landscape

### What Already Exists

| File | What It Does | Status for S02 |
|------|-------------|----------------|
| `src/components/auth/LoginForm.tsx` | Full-page login form with Google OAuth button (`signInWithOAuth`) | Has URL bug — see below |
| `src/components/auth/InlineAuthForm.tsx` | Booking-flow inline auth — also has Google button using `window.location.href` as redirectTo | Different bug: booking context lost on OAuth, accepted limitation |
| `src/app/(auth)/callback/route.ts` | OAuth code exchange + teacher/parent routing | Correct logic, needs tests |
| `src/actions/auth.ts` | `signUp` / `signIn` / `signOut` server actions | Not involved in OAuth flow |
| `src/components/dashboard/SchoolEmailVerification.tsx` | UI for submitting school email OTP request | Works for any auth provider |
| `src/actions/verification.ts` | `requestSchoolEmailVerification` server action — `getUser()` based | Works for any auth provider |
| `src/lib/verification.ts` | `generateVerificationToken`, `sendVerificationEmail`, `isTokenExpired` | Fully tested, no changes needed |
| `src/app/api/verify-email/route.ts` | Token lookup + `verified_at` stamp | Works, no changes needed |
| `supabase/config.toml` | Local Supabase config — no `[auth.external.google]` section | Google OAuth is prod-only config |

### The URL Bug (AUTH-03 blocker)

**`src/components/auth/LoginForm.tsx` line 68:**
```ts
redirectTo: `${window.location.origin}/auth/callback`
```

This is **wrong**. Next.js route groups are stripped from the URL:
- `src/app/(auth)/callback/route.ts` → URL: **`/callback`**
- `src/app/(auth)/login/page.tsx` → URL: **`/login`**

The correct redirect URL is `/callback`, not `/auth/callback`. With the current code, Supabase would redirect the user to `https://tutelo.app/auth/callback`, which does not exist (404).

**Fix:** Change line 68 to:
```ts
redirectTo: `${window.location.origin}/callback`,
```

Additionally, the Supabase dashboard **Site URL** and **Redirect URLs** allowlist must include `https://tutelo.app/callback` (not `/auth/callback`). This is a manual dashboard step — not testable in unit tests.

### Callback Route Logic (Already Correct for Returning Users)

`src/app/(auth)/callback/route.ts` already does:
1. `exchangeCodeForSession(code)` — exchanges Supabase code for session
2. `getUser()` — gets authenticated user (D025 pattern)
3. Queries `teachers` table with `maybeSingle()`
4. Teacher row exists → `/dashboard`; no teacher row → `/parent`

This handles:
- ✅ Returning teacher via Google → `/dashboard`
- ✅ Returning parent via Google → `/parent`
- ✅ Error cases → `/login?error=auth`

**Edge case — new teacher via Google:** A brand-new user who clicks "Continue with Google" from the landing page will have no teacher row and land at `/parent`. This is **acceptable** — the "Start your page" CTA drives new teacher signup via email+password → `/onboarding`. Google SSO is primarily for returning logins. Document this behavior. Do NOT complicate the callback with a "new user" check.

### School Email Verification Post-Google-Login (AUTH-04)

The verification flow is **completely provider-agnostic**:
1. `requestSchoolEmailVerification` calls `supabase.auth.getUser()` — works for OAuth sessions ✓  
2. Looks up teacher row by `user_id` — works if teacher row exists ✓
3. Sends OTP email via Resend — independent of auth provider ✓
4. Token click → `supabase/api/verify-email` uses `supabaseAdmin` — no session required ✓

**Proof path:** Unit tests already cover the full verification pipeline (9 tests in `verification.test.ts`). AUTH-04 can be validated by asserting that `requestSchoolEmailVerification` doesn't check the auth provider anywhere — purely `getUser()` + teacher DB lookup.

### Test Coverage Gaps

**What exists:**
- `src/__tests__/verification.test.ts` — 9 tests, all passing ✓
- `src/__tests__/parent-dashboard.test.ts` — 15 tests covering auth routing logic (using source-file assertions and mock signIn), passes ✓
- `src/__tests__/parent-auth.test.ts` / `.tsx` — InlineAuthForm tests; `signInWithOAuth` is mocked but not verified ✓

**What's missing (gaps S02 must close):**
1. **`callback/route.ts` direct unit tests** — the existing `parent-dashboard.test.ts` only does source-file text assertions (`expect(source).toContain('/parent')`). No tests actually call the route handler with mocked Supabase. Need: teacher routing, parent routing, code exchange failure, missing code parameter.
2. **`LoginForm.tsx` Google button tests** — no test verifies that clicking "Continue with Google" calls `signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })`. Need: button calls `signInWithOAuth` with `provider: 'google'` and correct `/callback` URL.
3. **AUTH-04 smoke assertion** — a test that reads the `requestSchoolEmailVerification` source and asserts it uses `getUser()` (not provider-specific checks), proving provider-agnosticism.

---

## Verification Approach

Because Google OAuth requires a live browser + configured Supabase provider, the **unit test layer** proves structural correctness; the **operational layer** is a manual E2E checklist.

### Unit test targets (vitest, no browser)

| Test file | Scenarios |
|-----------|-----------|
| `src/__tests__/google-sso.test.ts` (new) | callback route: teacher routing, parent routing, missing code, exchange error |
| `src/__tests__/google-sso.test.ts` (new) | LoginForm: Google button calls `signInWithOAuth` with `provider: 'google'` and `redirectTo` ending in `/callback` |
| `src/__tests__/google-sso.test.ts` (new) | AUTH-04 smoke: `requestSchoolEmailVerification` source uses `getUser()` not provider-specific check |

### Operational verification checklist (manual, in S02 UAT)

1. Supabase dashboard → Authentication → Providers → Google: enabled with Client ID + Secret
2. Supabase dashboard → Authentication → URL Configuration: `https://tutelo.app/callback` in allowed redirect URLs (not `/auth/callback`)
3. Visit `https://tutelo.app/login`, click "Continue with Google" → Google OAuth screen appears
4. Complete OAuth as a teacher account → lands at `/dashboard`
5. Complete OAuth as a parent-only account → lands at `/parent`
6. New Google user (no teacher row) → lands at `/parent` (expected/accepted)
7. Teacher signed in via Google → Settings page → "Verify school email" form present and submittable
8. After step 7: email received, link clicked → `/dashboard/settings?verified=true` → toast + badge

---

## Natural Task Seams

**T01 — Fix the callback URL bug** (~15 min)  
- `src/components/auth/LoginForm.tsx` line 68: `/auth/callback` → `/callback`
- Add a regression test assertion: LoginForm `signInWithOAuth` call uses a URL that does NOT contain `/auth/callback`
- Verify: `npx vitest run src/__tests__/google-sso.test.ts`

**T02 — Write unit tests for callback route and Google button** (~45 min)  
- New file: `src/__tests__/google-sso.test.ts`
- Mock `@/lib/supabase/server` for callback route tests
- Mock `@/lib/supabase/client` for LoginForm button test
- Cover: teacher routing, parent routing, missing code, exchange failure, Google button provider/URL
- Include AUTH-04 smoke test (source-code assertion that `requestSchoolEmailVerification` uses `getUser()`)
- Verify: `npx vitest run src/__tests__/google-sso.test.ts` all pass; full `npx vitest run` stays at 419+

---

## Constraints and Notes

- **Google OAuth can only be tested E2E in production** — Supabase local dev doesn't have Google configured. Unit tests mock `exchangeCodeForSession`. Operational verification is a manual checklist in UAT.
- **Supabase dashboard configuration is a manual step** — must set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the Supabase project's OAuth providers. Not captured in `supabase/config.toml` (which only shows local config).
- **The `/auth/callback` URL must NOT be in the Supabase allowed redirect list** — once the bug is fixed to `/callback`, the old URL should be removed from the Supabase allowlist to prevent confusion.
- **`InlineAuthForm.tsx` OAuth redirectTo is `window.location.href`** — this redirects back to the booking page after OAuth, which means the booking state is lost. This is an accepted limitation noted in the code comment. Do NOT change this in S02.
- **School email verification is truly provider-agnostic** — `requestSchoolEmailVerification` only cares that `getUser()` returns a user who has a teacher row. The auth provider (email/password or OAuth) is irrelevant.
- **D025 pattern** — all auth checks use `getUser()` (not `getClaims()`). The callback route already follows this. Any new S02 code must follow it too.
- **signUp → /onboarding** — the email+password signUp action still redirects to `/onboarding`. This is correct and should not change. New teacher signup is email-first.
- **Baseline test count: 419 tests passing.** S02 must not break this.
