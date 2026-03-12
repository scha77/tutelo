---
id: T01
parent: S05
milestone: M001
provides: []
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 
verification_result: passed
completed_at: 
blocker_discovered: false
---
# T01: 05-dashboard-reviews 01

**# Phase 5 Plan 01: Schema Foundation and Test Scaffold Summary**

## What Happened

# Phase 5 Plan 01: Schema Foundation and Test Scaffold Summary

Migration 0006 adds four Phase 5 columns (reviews.token, reviews.token_used_at, reviews.reviewer_name, bookings.amount_cents), relaxes reviews.rating to nullable with an updated range check, adds a partial index on token, and updates RLS policies for server-side stub inserts and token-gated public reads.

## What Was Built

**Migration 0006** (`supabase/migrations/0006_phase5_reviews.sql`) — adds all columns Wave 2 plans depend on, plus the idx_reviews_token partial index and updated RLS policies. Dry-run validated clean.

**Test scaffold** (`src/__tests__/dashboard-reviews.test.ts`) — 18 it.todo() stubs across 7 requirement areas (DASH-01, DASH-03, DASH-04, DASH-05, REVIEW-01, REVIEW-02, REVIEW-03). Vitest exits 0 with all stubs as todo.

**Sidebar** (`src/components/dashboard/Sidebar.tsx`) — expanded from 4 to 7 nav items: Overview (LayoutDashboard), Requests, Sessions (CalendarCheck), Students (Users), Page, Availability, Settings. Overview uses exact pathname match; all others use startsWith.

**Requests page** (`src/app/(dashboard)/dashboard/requests/page.tsx`) — removed confirmed bookings fetch, ConfirmedSessionCard import, and confirmed section JSX. Page now shows only requested-status bookings. Empty state condition simplified to `bookings.length === 0`.

## Verification Results

- `npx supabase db push --dry-run` — no errors
- `npx vitest run src/__tests__/dashboard-reviews.test.ts` — 18 todo, 0 failures
- `npx tsc --noEmit` — clean
- `npx vitest run` (full suite) — 81 passed, 67 todo, 0 failures

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Hash | Task | Description |
|------|------|-------------|
| de03d4f | Task 1 | chore(05-01): add migration 0006 — Phase 5 review token columns and RLS |
| 54d1bc3 | Task 2 | test(05-01): add dashboard-reviews test scaffold with it.todo() stubs |
| 268e87f | Task 3 | feat(05-01): update Sidebar nav and make requests page pending-only |

## Self-Check: PASSED

All 4 artifact files found on disk. All 3 task commits verified in git log.
