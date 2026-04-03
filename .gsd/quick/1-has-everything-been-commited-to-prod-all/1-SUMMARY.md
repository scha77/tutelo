# Quick Task: Deployment status check + iPhone bottom nav + missing migrations

**Date:** 2026-04-03
**Branch:** gsd/quick/1-has-everything-been-commited-to-prod-all

## What Changed

### 1. Pushed 29 unpushed commits to origin/main
28 commits from M008–M010 + 1 bottom nav fix had never been pushed to `origin/main`. Remote was stuck at M007. All pushed successfully.

### 2. Fixed iPhone bottom nav overlap with home indicator
Root cause: `viewport-fit=cover` was missing from the root layout, so `env(safe-area-inset-bottom)` resolved to `0px` on all pages — the safe area padding was a no-op.

- Added `export const viewport: Viewport` with `viewportFit: 'cover'` to root layout
- Added fallback values to `env()` calls in nav components
- Added safe area padding to `BookNowCTA` (profile page had none)
- Added `pb-safe-nav` CSS utility class (mobile-only) for content behind fixed bottom bars
- Updated dashboard and parent layouts to use `pb-safe-nav`

### 3. Applied missing Supabase migrations (0011–0016)
The "Application error: client-side exception" on `/dashboard/waitlist` and `/dashboard/settings` was caused by **missing database migrations**. Migrations 0011–0016 (M007, M008, M009) were never applied to Supabase production — the tables (`waitlist`, `session_types`, `page_views`, `recurring_schedules`) and columns (`capacity_limit`, `search_vector`, `recurring_schedule_id`, etc.) didn't exist. Server components threw query errors, which triggered a known Next.js Router hooks-mismatch bug (#310).

Applied via `supabase db push --linked`:
- 0011: `capacity_limit`, `waitlist` table, `session_types` table
- 0012: `search_vector` tsvector + GIN index + trigger (fixed `CONCURRENTLY` → regular index)
- 0013: `page_views` table
- 0014: `recurring_schedules` table + bookings FK columns
- 0015: `payment_failed` status CHECK constraint
- 0016: `cancel_token` on recurring_schedules
- 0017–0019: re-registered in migration history (already existed from prior manual apply)

Also made migrations 0012, 0017, 0018, 0019 idempotent for safe re-runs.

## Files Modified

- `src/app/layout.tsx` — viewport export with viewportFit: 'cover'
- `src/app/globals.css` — pb-safe-nav utility class
- `src/components/dashboard/MobileBottomNav.tsx` — env() fallback
- `src/components/parent/ParentMobileNav.tsx` — env() fallback
- `src/components/profile/BookNowCTA.tsx` — safe area padding + spacer
- `src/app/(dashboard)/dashboard/layout.tsx` — pb-safe-nav class
- `src/app/(parent)/layout.tsx` — pb-safe-nav class
- `supabase/migrations/0012_teachers_search_vector.sql` — removed CONCURRENTLY
- `supabase/migrations/0017_children_and_parent_dashboard.sql` — DROP POLICY IF EXISTS
- `supabase/migrations/0018_parent_profiles.sql` — DROP POLICY IF EXISTS
- `supabase/migrations/0019_messaging.sql` — idempotent indexes, policies, publication

## Verification

- `next build` passes clean
- All missing tables confirmed via Supabase REST API after migration push
- `/dashboard/waitlist` and `/dashboard/settings` confirmed working in production by user
