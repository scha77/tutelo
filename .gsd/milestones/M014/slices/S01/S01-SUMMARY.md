---
id: S01
parent: M014
milestone: M014
provides:
  - (none)
requires:
  []
affects:
  []
key_files:
  - src/proxy.ts
  - src/app/(dashboard)/dashboard/layout.tsx
  - src/app/(parent)/layout.tsx
  - src/app/(admin)/layout.tsx
key_decisions:
  - Use proxy.ts (not middleware.ts) for auth redirects — Next.js 16 forbids both files
  - Layout made synchronous with Suspense-wrapped async components — streams shell before data resolves
  - Skeleton fallbacks match real component dimensions to prevent CLS
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-07T16:37:44.021Z
blocker_discovered: false
---

# S01: Auth Middleware for Dashboard Streaming

**Added auth redirects to proxy.ts and restructured dashboard layout for Suspense streaming — layout shell renders instantly while teacher data resolves.**

## What Happened

The dashboard layout was blocking all rendering until getAuthUser() + getTeacher() completed server-side. On mobile with a cold cache, this meant 300-400ms of blank screen before any HTML arrived.

Two changes fix this: (1) Added protected-route auth redirects to the existing proxy.ts (Next.js 16's proxy replaces middleware) using the session data from getSession() — no extra API call. (2) Restructured the dashboard layout from a top-level await to a synchronous function with Suspense-wrapped async components. The sidebar, mobile header, and mobile nav each have their own async wrapper. Skeleton fallbacks match real component dimensions to prevent layout shift.

The layout function now returns JSX immediately — the browser receives the layout shell (flex container + skeletons) while teacher data and pending counts stream in via Suspense. The parent and admin layouts also had their auth redirects simplified since the proxy handles them.

## Verification

curl tests: /dashboard → 307, /parent → 307, /admin → 307, / → 200. Build succeeds. 52 files, 490 tests, 0 failures.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

None.
