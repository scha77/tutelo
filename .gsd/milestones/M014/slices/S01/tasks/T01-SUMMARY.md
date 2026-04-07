---
id: T01
parent: S01
milestone: M014
key_files:
  - src/proxy.ts
  - src/app/(dashboard)/dashboard/layout.tsx
  - src/app/(parent)/layout.tsx
  - src/app/(admin)/layout.tsx
key_decisions:
  - Use proxy.ts not middleware.ts — Next.js 16 forbids both
  - Layout function made synchronous with Suspense-wrapped async components for streaming
  - getSession() reused for auth check in proxy — no extra API call needed
  - Skeleton fallbacks match real component dimensions to prevent CLS
duration: 
verification_result: passed
completed_at: 2026-04-07T16:37:03.854Z
blocker_discovered: false
---

# T01: Added auth redirects to the existing proxy.ts and restructured the dashboard layout to stream the shell via Suspense before teacher data resolves.

**Added auth redirects to the existing proxy.ts and restructured the dashboard layout to stream the shell via Suspense before teacher data resolves.**

## What Happened

Discovered the project already uses Next.js 16's proxy.ts (not middleware.ts) for Supabase session refresh. Creating a middleware.ts alongside it fails with a build error — Next.js 16 only allows one. Added auth redirect logic to the existing proxy: after getSession() runs, check if the route is protected (/dashboard/*, /parent/*, /admin/*) and redirect to /login?redirect=<path> if no session.

The dashboard layout was restructured from a top-level await (getTeacher blocking everything) to a synchronous function that returns immediately with Suspense-wrapped async components. The sidebar, mobile header, and mobile nav each have their own async wrapper that resolves teacher data independently. Skeleton fallbacks match the real component dimensions to prevent layout shift. The layout function is now synchronous — it streams the shell (flex container + skeletons) instantly while teacher data resolves in parallel.

Also removed the auth redirect from the dashboard layout (proxy handles it), simplified the parent layout auth check to defensive-only, and added a comment to the admin layout noting the proxy handles the redirect.

## Verification

curl tests confirm: /dashboard → 307 to /login?redirect=%2Fdashboard (41ms TTFB), /parent → 307 (2ms), /admin → 307 (2ms), / → 200 (no redirect). Deep paths (/dashboard/sessions) preserve the full path in the redirect param. Build succeeds. 52 test files, 490 tests, 0 failures.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx next build` | 0 | ✅ pass | 31700ms |
| 2 | `npx vitest run` | 0 | ✅ pass — 52 files, 490 tests, 0 failures | 15950ms |
| 3 | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3456/dashboard` | 0 | ✅ pass — 307 redirect to /login | 41ms |
| 4 | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3456/parent` | 0 | ✅ pass — 307 redirect to /login | 3ms |

## Deviations

T01/T02/T03 merged into one task — creating a middleware.ts was not possible due to Next.js 16's proxy-only constraint. The proxy already existed and just needed the redirect logic added.

## Known Issues

None.

## Files Created/Modified

- `src/proxy.ts`
- `src/app/(dashboard)/dashboard/layout.tsx`
- `src/app/(parent)/layout.tsx`
- `src/app/(admin)/layout.tsx`
