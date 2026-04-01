# S02: Google SSO Verification

**Goal:** Teacher or parent clicks Continue with Google, completes OAuth flow, lands in the correct dashboard. Teacher can still verify school email post-Google-login.
**Demo:** After this: Teacher or parent clicks Continue with Google, completes OAuth flow, lands in the correct dashboard. Teacher can still verify school email post-Google-login

## Tasks
- [x] **T01: Fixed Google OAuth redirectTo from /auth/callback to /callback and added 2 component tests verifying Google SSO button behavior** — The LoginForm.tsx Google sign-in handler uses `/auth/callback` as the OAuth redirectTo, but Next.js route groups strip the `(auth)` segment from URLs. The actual callback route is at `/callback`. This task fixes the one-line bug and writes a React component test proving the Google button calls `signInWithOAuth` with the correct provider and URL.

## Steps

1. Open `src/components/auth/LoginForm.tsx`. In the `handleGoogleSignIn` function (~line 68), change `redirectTo: \`${window.location.origin}/auth/callback\`` to `redirectTo: \`${window.location.origin}/callback\``.
2. Create `src/__tests__/google-sso-login.test.tsx`. Mock `@/lib/supabase/client` using `vi.mock()`. Mock `@/actions/auth` to prevent server action imports.
3. Write test: render `LoginForm`, find the 'Continue with Google' button, click it, assert `signInWithOAuth` was called with `{ provider: 'google', options: { redirectTo: expect.stringContaining('/callback') } }` and that the redirectTo does NOT contain `/auth/callback`.
4. Write a second test: render `LoginForm`, verify the Google button is present and enabled by default.
5. Run `npx vitest run src/__tests__/google-sso-login.test.tsx` to confirm all pass. Then run `npx vitest run` to confirm no regressions (419+ tests).

## Must-Haves

- [ ] LoginForm.tsx line 68 uses `/callback` not `/auth/callback`
- [ ] Test asserts `signInWithOAuth` called with `provider: 'google'`
- [ ] Test asserts redirectTo ends with `/callback` (not `/auth/callback`)
- [ ] Full test suite passes (419+ tests)
  - Estimate: 25m
  - Files: src/components/auth/LoginForm.tsx, src/__tests__/google-sso-login.test.tsx
  - Verify: npx vitest run src/__tests__/google-sso-login.test.tsx && npx vitest run 2>&1 | tail -5
- [ ] **T02: Write callback route handler tests and AUTH-04 provider-agnostic smoke test** — The OAuth callback route (`src/app/(auth)/callback/route.ts`) correctly routes teachers to `/dashboard` and parents to `/parent`, but has no direct unit tests. This task writes tests that call the GET handler with mocked Supabase, covering all four paths. It also adds an AUTH-04 smoke test proving `requestSchoolEmailVerification` is provider-agnostic (uses `getUser()`, not provider-specific checks).

## Steps

1. Create `src/__tests__/google-sso-callback.test.ts`. Mock `@/lib/supabase/server` using `vi.mock()` with `vi.hoisted()` pattern (see `verification.test.ts` for reference).
2. Write test: 'routes teacher to /dashboard' — mock `exchangeCodeForSession` success, `getUser` returns user, `teachers` query returns a row. Import GET from the callback route. Call `GET(new NextRequest('http://localhost/callback?code=test-code'))`. Assert response is a redirect to URL containing `/dashboard`.
3. Write test: 'routes non-teacher to /parent' — same as above but teachers query returns null. Assert redirect to `/parent`.
4. Write test: 'redirects to /login?error=auth when code is missing' — call GET with no `code` param. Assert redirect to `/login?error=auth`.
5. Write test: 'redirects to /login?error=auth when code exchange fails' — mock `exchangeCodeForSession` returning an error. Assert redirect to `/login?error=auth`.
6. Write AUTH-04 smoke test: read `src/actions/verification.ts` source with `fs.readFileSync`. Assert it contains `supabase.auth.getUser()` call. Assert it does NOT contain `provider`, `google`, or `getSession().provider` — proving the verification flow is auth-provider-agnostic.
7. Run `npx vitest run src/__tests__/google-sso-callback.test.ts` to confirm all pass. Then run `npx vitest run` to confirm no regressions (419+ tests).

## Must-Haves

- [ ] Callback route test: teacher → /dashboard redirect
- [ ] Callback route test: non-teacher → /parent redirect
- [ ] Callback route test: missing code → /login?error=auth
- [ ] Callback route test: exchange failure → /login?error=auth
- [ ] AUTH-04 smoke: verification action uses getUser(), has no provider-specific logic
- [ ] Full test suite passes (419+ tests)
  - Estimate: 35m
  - Files: src/__tests__/google-sso-callback.test.ts
  - Verify: npx vitest run src/__tests__/google-sso-callback.test.ts && npx vitest run 2>&1 | tail -5
