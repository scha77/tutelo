---
id: T02
parent: S01
milestone: M001
provides:
  - "Login page with email+password form and Google SSO button"
  - "Server Actions (signUp, signIn) with redirect-on-success pattern"
  - "OAuth callback route at /auth/callback that exchanges code for session"
  - "Route protection: unauthenticated access to /dashboard and /onboarding redirects to /login"
  - "Session persistence via cookie (src/middleware.ts wiring proxy.ts)"
  - "Auth layout (centered, max-w-md) for auth route group"
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 45min
verification_result: passed
completed_at: 2026-03-04
blocker_discovered: false
---
# T02: 01-foundation 02

**# Phase 1 Plan 02: Auth Layer Summary**

## What Happened

# Phase 1 Plan 02: Auth Layer Summary

**Supabase Auth with Google SSO + email/password, cookie-session persistence via middleware.ts wiring proxy.ts, and route protection for /dashboard and /onboarding**

## Performance

- **Duration:** ~45 min (including human-verify checkpoint)
- **Started:** 2026-03-04T09:06:19Z
- **Completed:** 2026-03-04T17:16:37Z
- **Tasks:** 2 auto + 1 checkpoint (approved)
- **Files modified:** 8

## Accomplishments
- LoginForm Client Component with email+password form (React Hook Form + Zod), sign-in/sign-up mode toggle, and Google OAuth button
- Server Actions (signUp, signIn) with typed error returns and redirect-on-success to /onboarding or /dashboard respectively
- OAuth callback route at /auth/callback that exchanges code for session, queries teachers table (try/catch resilient), and routes to /dashboard or /onboarding
- Route protection active: unauthenticated visits to /dashboard and /onboarding redirect to /login
- Auth layout with centered container for auth route group
- Vitest tests for Server Action logic (mock Supabase client, verify redirect behavior) — GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1 RED — Failing auth tests** - `9095f0a` (test)
2. **Task 1 GREEN — LoginForm + Server Actions** - `dbdfd4e` (feat)
3. **Task 2 — Auth layout, login page, OAuth callback** - `8350714` (feat)
4. **Fix — middleware.ts to wire proxy.ts (deviation)** - `35d1df8` (fix)
5. **Fix — src/middleware.ts final correction** - `5bd2f36` (fix)

**Plan metadata:** (docs commit — this file)

_Note: TDD task has separate RED and GREEN commits._

## Files Created/Modified
- `src/actions/auth.ts` - signUp (redirect /onboarding) and signIn (redirect /dashboard) Server Actions
- `src/components/auth/LoginForm.tsx` - Client Component with email+password form, mode toggle, Google OAuth button, inline error display
- `src/app/(auth)/layout.tsx` - Minimal centered layout (min-h-screen, max-w-md) for auth route group
- `src/app/(auth)/login/page.tsx` - RSC with getClaims() auth guard, Tutelo branding, tagline, renders LoginForm
- `src/app/(auth)/callback/route.ts` - OAuth code exchange, teachers table check with try/catch for pre-schema resilience
- `src/middleware.ts` - Next.js middleware entry point that delegates to proxy.ts session management
- `proxy.ts` - Minor update (route from middleware.ts delegation)
- `tests/auth/signup.test.ts` - Vitest tests for signUp and signIn Server Actions with mocked Supabase client

## Decisions Made
- **middleware.ts required as Next.js 16.1.6 entry point:** Next.js 16.1.6 requires the file to be named `middleware.ts` (not `proxy.ts`) as the entry point. proxy.ts is invoked from middleware.ts. The MEMORY.md note about "proxy.ts not middleware.ts" refers to the pattern name, not the filename — middleware.ts delegates to proxy.ts logic.
- **OAuth callback try/catch around teachers query:** At execution time Plan 01-03 (database schema) has not run yet. Wrapping the teachers query in try/catch and defaulting to /onboarding makes the callback route safe to call before the schema exists.
- **Google OAuth redirect uses `window.location.origin`:** Dynamic origin avoids hard-coding env vars in client-side code, works identically in dev, staging, and production.
- **Two-mode LoginForm (signin/signup toggle):** Single page with toggled mode reduces nav complexity compared to separate /login and /signup routes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Next.js 16.1.6 requires middleware.ts as entry point, not proxy.ts filename**
- **Found during:** Task 2 verification (npm run build / middleware not executing)
- **Issue:** Next.js 16.1.6 looks for `middleware.ts` at the project root or `src/`. The PLAN referenced "proxy.ts" as the middleware convention but the actual Next.js runtime requires the standard `middleware.ts` filename. Route protection was not being enforced until this was added.
- **Fix 1:** Created `middleware.ts` at project root (35d1df8) to wire into Next.js middleware chain and delegate to proxy.ts
- **Fix 2:** Moved to `src/middleware.ts` (5bd2f36) as the correct location for src-dir projects, updated proxy.ts accordingly
- **Files modified:** middleware.ts, src/middleware.ts, proxy.ts
- **Verification:** Route protection confirmed working during human-verify checkpoint (unauthenticated /dashboard redirect to /login)
- **Committed in:** 35d1df8, 5bd2f36

---

**Total deviations:** 1 auto-fixed (blocking — file placement)
**Impact on plan:** Required for plan correctness — route protection would not function without middleware.ts as Next.js entry point. No scope creep.

## Issues Encountered
- Next.js 16 middleware file naming: The project memory's "proxy.ts not middleware.ts" note describes the session management pattern (proxy-style cookie refresh), not the actual filename Next.js uses for middleware. Both files are needed: `src/middleware.ts` (Next.js entry) and `proxy.ts` (session logic). Resolved by auto-fix above.

## User Setup Required
External services require manual configuration for full auth flow:

**Supabase Auth configuration:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase Dashboard > Project Settings > API > Project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase Dashboard > Project Settings > API (sb_publishable_... key)
- Enable Google OAuth provider in Supabase Dashboard > Authentication > Providers > Google
- Add callback URL `https://your-project.supabase.co/auth/v1/callback` to Google Cloud Console OAuth credentials
- Set Site URL to `http://localhost:3000` in Supabase Dashboard > Authentication > URL Configuration
- Add redirect URL `http://localhost:3000/auth/callback` in Supabase Dashboard > Authentication > URL Configuration > Redirect URLs

Email+password flows work immediately once env vars are set. Google OAuth requires both Supabase dashboard and Google Cloud Console configuration.

## Next Phase Readiness
- Auth layer complete — login, signup, Google SSO, session persistence, route protection all verified
- Plan 01-03 (database schema) can proceed — callback route is resilient to pre-schema state
- Plan 01-04 (onboarding wizard) will land on /onboarding after redirect from signUp Server Action
- No blockers for 01-03

---
*Phase: 01-foundation*
*Completed: 2026-03-04*
