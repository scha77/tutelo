# S01: Auth Middleware for Dashboard Streaming

**Goal:** Add Next.js middleware that handles auth verification at the edge, so the dashboard layout streams the shell immediately without blocking on auth queries.
**Demo:** After this: Navigate to /dashboard on mobile — layout shell with sidebar and skeleton appears immediately while page data loads. Unauthenticated users redirect to /login without hitting the layout at all.

## Tasks
- [x] **T01: Added auth redirects to the existing proxy.ts and restructured the dashboard layout to stream the shell via Suspense before teacher data resolves.** — 1. Read @supabase/ssr docs for middleware pattern
2. Create src/middleware.ts with createServerClient
3. Protect /dashboard/*, /parent/*, /admin/* routes
4. Redirect unauthenticated users to /login
5. Configure matcher to skip static files and API routes
6. Test locally with unauthenticated request
  - Estimate: 30min
  - Files: src/middleware.ts
  - Verify: curl -s -o /dev/null -w '%{http_code} %{redirect_url}' http://localhost:3456/dashboard returns 307 /login without hitting the layout
- [x] **T02: Dashboard layout slimmed — auth redirect removed, layout function made synchronous with Suspense streaming.** — 1. Read current layout.tsx
2. Remove the redirect('/login') for missing user — middleware handles this now
3. Keep getTeacher() for teacher name/slug (layout still needs it for sidebar)
4. Keep redirect('/onboarding') for users without teacher row (middleware can't check this without DB)
5. Verify layout streams shell before page data
  - Estimate: 20min
  - Files: src/app/(dashboard)/dashboard/layout.tsx
  - Verify: Dashboard layout renders skeleton immediately while page data loads. Unauthenticated requests never reach the layout.
- [x] **T03: Full verification — 490 tests pass, proxy redirects confirmed for all protected routes, public routes unaffected.** — 1. Run full test suite
2. Verify middleware redirects unauthenticated requests
3. Verify dashboard renders with authenticated session
4. Check parent routes also protected
5. Verify no regressions on login, callback, or public routes
  - Estimate: 15min
  - Verify: npx vitest run passes all tests. Manual verification of redirect behavior.
