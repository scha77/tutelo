---
id: T01
parent: S05
milestone: M010
provides: []
requires: []
affects: []
key_files: ["src/app/(admin)/layout.tsx", "src/app/(admin)/admin/page.tsx"]
key_decisions: ["Used filter(Boolean) after split/trim on ADMIN_USER_IDS to handle trailing commas or spaces", "Used full_name column instead of plan's 'name' since that's the actual schema column", "Merged all 9 Supabase queries into a single Promise.all for maximum parallelism"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Ran `npx tsc --noEmit` — completed in 17.6s with zero errors, confirming both new files type-check cleanly against the existing codebase."
completed_at: 2026-04-01T14:31:27.707Z
blocker_discovered: false
---

# T01: Built admin dashboard at /admin with ADMIN_USER_IDS env-var gating (non-admins get 404), stat cards for 6 platform metrics, and a 15-item activity feed

> Built admin dashboard at /admin with ADMIN_USER_IDS env-var gating (non-admins get 404), stat cards for 6 platform metrics, and a 15-item activity feed

## What Happened
---
id: T01
parent: S05
milestone: M010
key_files:
  - src/app/(admin)/layout.tsx
  - src/app/(admin)/admin/page.tsx
key_decisions:
  - Used filter(Boolean) after split/trim on ADMIN_USER_IDS to handle trailing commas or spaces
  - Used full_name column instead of plan's 'name' since that's the actual schema column
  - Merged all 9 Supabase queries into a single Promise.all for maximum parallelism
duration: ""
verification_result: passed
completed_at: 2026-04-01T14:31:27.708Z
blocker_discovered: false
---

# T01: Built admin dashboard at /admin with ADMIN_USER_IDS env-var gating (non-admins get 404), stat cards for 6 platform metrics, and a 15-item activity feed

**Built admin dashboard at /admin with ADMIN_USER_IDS env-var gating (non-admins get 404), stat cards for 6 platform metrics, and a 15-item activity feed**

## What Happened

Created two files for the admin dashboard feature:\n\n1. `src/app/(admin)/layout.tsx` — Admin route group layout that authenticates via supabase.auth.getUser(), redirects unauthenticated users to /login, then checks the user ID against ADMIN_USER_IDS env var (comma-separated). If the allowlist is empty or the user isn't in it, notFound() is called (returns 404, not a redirect). The layout renders a minimal header with "Admin Dashboard" title, operator badge, user email, and sign-out form using the existing signOut server action.\n\n2. `src/app/(admin)/admin/page.tsx` — Dashboard page that runs 9 Supabase queries in a single Promise.all via supabaseAdmin (service role client, bypasses RLS). Displays 6 stat cards: Total Teachers, Stripe Active, Published, Total Bookings, Completed Sessions, and Revenue (summed from amount_cents on completed bookings). Below the stats is a Recent Activity feed that merges teacher signups, new bookings, and completed sessions into a unified timeline sorted by timestamp, limited to 15 items, with type badges and relative timestamps.

## Verification

Ran `npx tsc --noEmit` — completed in 17.6s with zero errors, confirming both new files type-check cleanly against the existing codebase.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 17600ms |


## Deviations

Used full_name instead of plan's 'name' for teachers table (actual schema column). Added filter(Boolean) when parsing ADMIN_USER_IDS to handle edge cases.

## Known Issues

None.

## Files Created/Modified

- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/admin/page.tsx`


## Deviations
Used full_name instead of plan's 'name' for teachers table (actual schema column). Added filter(Boolean) when parsing ADMIN_USER_IDS to handle edge cases.

## Known Issues
None.
