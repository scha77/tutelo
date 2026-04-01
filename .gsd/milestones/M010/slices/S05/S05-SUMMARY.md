---
id: S05
parent: M010
milestone: M010
provides:
  - Admin dashboard at /admin with 6 metric stat cards and 15-item activity feed
  - ADMIN_USER_IDS env-var access gate (any future admin routes can reuse this layout)
  - supabaseAdmin parallel query pattern for platform metrics (no additional API routes needed)
  - 9 unit tests covering all access gate edge cases — safety net for future layout changes
requires:
  []
affects:
  []
key_files:
  - src/app/(admin)/layout.tsx
  - src/app/(admin)/admin/page.tsx
  - src/__tests__/admin-dashboard.test.ts
key_decisions:
  - notFound() (not redirect) for unauthorized admin access — prevents route existence leakage (ADMIN-04)
  - filter(Boolean) on ADMIN_USER_IDS split/trim to handle empty string, trailing commas, and whitespace
  - All 9 Supabase queries merged into a single Promise.all for maximum parallelism — no waterfall
  - supabaseAdmin (service role) used for all queries — bypasses RLS, correct for server-side operator tool
  - used full_name column instead of plan's 'name' — must match actual teachers table schema
patterns_established:
  - Admin route group pattern: (admin) route group with layout.tsx doing auth check + ADMIN_USER_IDS allowlist check before rendering children
  - env-var access gating: split(',').map(trim).filter(Boolean) is the canonical safe parse for comma-separated ID allowlists
  - Operator metrics page pattern: supabaseAdmin + single Promise.all for all read queries, revenue computed client-side from raw amount_cents rows
  - Activity feed pattern: fetch N rows from each table, push typed events into a shared array, sort by timestamp, slice to limit — no dedicated events table needed
observability_surfaces:
  - Admin dashboard page displays 6 live platform metrics (teachers, Stripe active, published, bookings, completed, revenue) on each page load
  - 15-item activity feed shows recent signups/bookings/completions with timestamps and type badges
drill_down_paths:
  - .gsd/milestones/M010/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M010/slices/S05/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-01T14:36:36.684Z
blocker_discovered: false
---

# S05: Admin Dashboard

**Built the read-only admin dashboard at /admin with ADMIN_USER_IDS env-var access gating (404 for non-admins), 6 stat cards for platform metrics, a 15-item merged activity feed, and 9 unit tests covering all gate scenarios.**

## What Happened

S05 delivered the complete admin dashboard in two tasks. T01 created the `(admin)` route group with two files: `layout.tsx` enforces auth + access control (unauthenticated users redirect to /login; authenticated users not in the ADMIN_USER_IDS comma-separated allowlist get notFound() — a 404, not a redirect, to avoid revealing the route's existence), and `admin/page.tsx` runs 9 Supabase queries in a single Promise.all via supabaseAdmin (service role, bypasses RLS). The page renders 6 stat cards — Total Teachers, Stripe Active (stripe_charges_enabled=true), Published (is_published=true), Total Bookings, Completed Sessions, and Revenue (summed from amount_cents on completed bookings, formatted as USD currency) — plus a Recent Activity feed that merges teacher signups, new bookings, and session completions into a unified timeline sorted by timestamp descending, capped at 15 items, with color-coded type badges (green Signup, blue Booking, purple Completed) and relative timestamps (e.g., "5m ago", "2d ago"). T02 added 9 unit tests in `src/__tests__/admin-dashboard.test.ts` covering: unauthenticated redirect, non-admin 404, empty env 404, undefined env 404, admin renders children, whitespace-padded multi-ID allowlist, successful metrics fetch (all 9 queries dispatched), null revenue handling, and empty activity feed. Tests follow the existing vi.resetModules + dynamic import pattern from parent-dashboard.test.ts. No deviations from the functional spec; the only schema adaptation was using `full_name` instead of `name` for the teachers table (actual schema column). Full suite: 474 tests, 0 failures, tsc clean.

## Verification

1. `npx tsc --noEmit` — exit 0, zero type errors. 2. `npx vitest run src/__tests__/admin-dashboard.test.ts` — 9/9 tests passed (52ms). 3. `npx vitest run` — 474 tests passed across 49 test files, 0 failures, 45 todo, 0 regressions.

## Requirements Advanced

None.

## Requirements Validated

- ADMIN-01 — admin/page.tsx fetches and displays Total Teachers, Stripe Active, Published, Total Bookings, Completed Sessions, and Revenue in a stat card grid. All via supabaseAdmin, 9 unit tests pass.
- ADMIN-02 — admin/page.tsx renders a 15-item activity feed merging teacher signups, new bookings, and session completions sorted by timestamp. Derived from existing tables, no new event system.
- ADMIN-04 — (admin)/layout.tsx parses ADMIN_USER_IDS, calls notFound() for empty allowlist or ID mismatch. 6 gate unit tests cover all four fail paths and one success path.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Schema deviation: used `full_name` column (actual teachers table schema) instead of plan's `name`. Added `filter(Boolean)` to ADMIN_USER_IDS split/trim to handle trailing commas and whitespace — not in original plan but necessary for robustness. T02 added two bonus test cases (whitespace-padded multi-ID allowlist and empty activity feed) beyond the 7 specified in the plan.

## Known Limitations

No pagination on activity feed (hard-capped at 15 items). Revenue metric counts all completed bookings ever — no date filtering or period comparison. No teacher name fallback if full_name is null in activity feed descriptions. No real-time refresh; admin must reload page to see updated metrics.

## Follow-ups

Could add date-range filtering to revenue and booking metrics. Could add a refresh/auto-reload interval for the activity feed. Could add Stripe connection rate (active/total teachers) as a computed KPI card. Could add pagination or infinite scroll to the activity feed for high-volume operators.

## Files Created/Modified

- `src/app/(admin)/layout.tsx` — New admin route group layout: auth check, ADMIN_USER_IDS env-var access gate (notFound for non-admins), operator header with user email and sign-out form
- `src/app/(admin)/admin/page.tsx` — New admin dashboard page: 9 parallel supabaseAdmin queries, 6 stat cards (teachers/bookings/revenue), 15-item activity feed with type badges and relative timestamps
- `src/__tests__/admin-dashboard.test.ts` — 9 unit tests: 6 access gate scenarios (auth/allowlist edge cases) + 3 metrics scenarios (queries, null revenue, empty feed)
