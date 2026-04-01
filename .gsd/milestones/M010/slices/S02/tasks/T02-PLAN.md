---
estimated_steps: 16
estimated_files: 1
skills_used: []
---

# T02: Write callback route handler tests and AUTH-04 provider-agnostic smoke test

The OAuth callback route (`src/app/(auth)/callback/route.ts`) correctly routes teachers to `/dashboard` and parents to `/parent`, but has no direct unit tests. This task writes tests that call the GET handler with mocked Supabase, covering all four paths. It also adds an AUTH-04 smoke test proving `requestSchoolEmailVerification` is provider-agnostic (uses `getUser()`, not provider-specific checks).

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

## Inputs

- ``src/app/(auth)/callback/route.ts` — the callback route handler to test`
- ``src/actions/verification.ts` — the verification action to smoke-test for AUTH-04`
- ``src/__tests__/verification.test.ts` — reference for vi.hoisted() mocking pattern`

## Expected Output

- ``src/__tests__/google-sso-callback.test.ts` — new test file with callback route + AUTH-04 assertions`

## Verification

npx vitest run src/__tests__/google-sso-callback.test.ts && npx vitest run 2>&1 | tail -5
