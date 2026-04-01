---
estimated_steps: 12
estimated_files: 2
skills_used: []
---

# T01: Fix OAuth redirect URL bug and add LoginForm Google button tests

The LoginForm.tsx Google sign-in handler uses `/auth/callback` as the OAuth redirectTo, but Next.js route groups strip the `(auth)` segment from URLs. The actual callback route is at `/callback`. This task fixes the one-line bug and writes a React component test proving the Google button calls `signInWithOAuth` with the correct provider and URL.

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

## Inputs

- ``src/components/auth/LoginForm.tsx` — contains the `/auth/callback` bug to fix`
- ``src/__tests__/parent-auth.test.tsx` — reference for React component test pattern with Supabase client mocking`

## Expected Output

- ``src/components/auth/LoginForm.tsx` — fixed OAuth redirectTo URL`
- ``src/__tests__/google-sso-login.test.tsx` — new test file with Google button assertions`

## Verification

npx vitest run src/__tests__/google-sso-login.test.tsx && npx vitest run 2>&1 | tail -5
