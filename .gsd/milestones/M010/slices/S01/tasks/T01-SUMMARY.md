---
id: T01
parent: S01
milestone: M010
provides: []
requires: []
affects: []
key_files: ["supabase/migrations/0017_children_and_parent_dashboard.sql", "src/app/(auth)/callback/route.ts", "src/actions/auth.ts", "src/app/(auth)/login/page.tsx", "src/app/account/page.tsx"]
key_decisions: ["Used getUser() instead of getClaims() in callback and login for consistency with signIn teacher check pattern", "Kept signUp /onboarding redirect intentionally for new user flow"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "npx tsc --noEmit passed with zero errors. grep confirms redirect.*parent present in auth.ts. No remaining /onboarding redirects in callback or login (only intentional one in signUp for new user flow)."
completed_at: 2026-04-01T01:46:39.357Z
blocker_discovered: false
---

# T01: Created children table with RLS, added child_id FK to bookings, and routed parent-only users to /parent in all auth paths

> Created children table with RLS, added child_id FK to bookings, and routed parent-only users to /parent in all auth paths

## What Happened
---
id: T01
parent: S01
milestone: M010
key_files:
  - supabase/migrations/0017_children_and_parent_dashboard.sql
  - src/app/(auth)/callback/route.ts
  - src/actions/auth.ts
  - src/app/(auth)/login/page.tsx
  - src/app/account/page.tsx
key_decisions:
  - Used getUser() instead of getClaims() in callback and login for consistency with signIn teacher check pattern
  - Kept signUp /onboarding redirect intentionally for new user flow
duration: ""
verification_result: passed
completed_at: 2026-04-01T01:46:39.358Z
blocker_discovered: false
---

# T01: Created children table with RLS, added child_id FK to bookings, and routed parent-only users to /parent in all auth paths

**Created children table with RLS, added child_id FK to bookings, and routed parent-only users to /parent in all auth paths**

## What Happened

Created migration 0017 with children table (id, parent_id, name, grade, created_at), RLS owner policy, parent_id index, and child_id FK on bookings. Updated OAuth callback, email signIn, and login page to route non-teacher users to /parent instead of /onboarding. Replaced /account page with redirect to /parent/bookings. Used consistent getUser() + maybeSingle() teacher check pattern across all three auth paths.

## Verification

npx tsc --noEmit passed with zero errors. grep confirms redirect.*parent present in auth.ts. No remaining /onboarding redirects in callback or login (only intentional one in signUp for new user flow).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 14200ms |
| 2 | `npx tsc --noEmit && grep -c 'redirect.*parent' src/actions/auth.ts | grep -q '[1-9]'` | 0 | ✅ pass | 14000ms |
| 3 | `grep -rn 'onboarding' callback/route.ts login/page.tsx` | 1 | ✅ pass | 50ms |


## Deviations

Callback route switched from getClaims() to getUser() for consistency with other auth paths — same effect, cleaner pattern.

## Known Issues

None.

## Files Created/Modified

- `supabase/migrations/0017_children_and_parent_dashboard.sql`
- `src/app/(auth)/callback/route.ts`
- `src/actions/auth.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/account/page.tsx`


## Deviations
Callback route switched from getClaims() to getUser() for consistency with other auth paths — same effect, cleaner pattern.

## Known Issues
None.
