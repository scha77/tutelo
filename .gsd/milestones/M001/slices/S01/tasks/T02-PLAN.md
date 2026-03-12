# T02: 01-foundation 02

**Slice:** S01 — **Milestone:** M001

## Description

Build the complete authentication layer: a login page supporting both email+password and Google SSO, an OAuth callback route handler, and session persistence via the proxy.ts already in place. Teachers who are new get redirected to /onboarding; existing teachers go to /dashboard.

Purpose: Auth gates all dashboard and onboarding routes. Without this, no subsequent plan can be tested end-to-end.

Output: Working login/signup page, Google OAuth flow, session cookie set on login, route protection enforced by proxy.ts, and the auth callback route that Supabase redirects to after OAuth.

## Must-Haves

- [ ] "Teacher can sign up with email + password and land on /onboarding"
- [ ] "Teacher can log in with email + password and land on /dashboard"
- [ ] "Google OAuth button triggers the OAuth flow and redirects back correctly"
- [ ] "Session persists across browser refresh (cookie-based via proxy.ts)"
- [ ] "Unauthenticated visit to /dashboard or /onboarding redirects to /login"
- [ ] "Authenticated visit to /login redirects to /dashboard"

## Files

- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/callback/route.ts`
- `src/app/(auth)/layout.tsx`
- `src/components/auth/LoginForm.tsx`
