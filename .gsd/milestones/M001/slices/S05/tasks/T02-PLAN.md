# T02: 05-dashboard-reviews 02

**Slice:** S05 — **Milestone:** M001

## Description

Build the three dashboard data pages: the overview home, the sessions history, and the student list.

Purpose: Delivers DASH-01 (view upcoming sessions), DASH-03 (earnings), and DASH-04 (student list) — giving teachers visibility into their full business at a glance.

Output: Three RSC pages + two new client components (StatsBar, ReviewPreviewCard). All queries use parallel Promise.all(). Reuses existing ConfirmedSessionCard for the sessions page Upcoming section.

## Must-Haves

- [ ] "Teacher dashboard home (/dashboard) shows stats bar with Total Earned, Upcoming count, and Students count — all reading live data"
- [ ] "Dashboard home shows next 3 confirmed sessions and 1–2 most recent reviews, with links to /dashboard/sessions and the public profile"
- [ ] "Teacher can see all upcoming confirmed sessions (with Mark Complete button) and all past completed sessions on /dashboard/sessions"
- [ ] "Each completed session row shows amount earned (or '—' for historical null rows) and review status"
- [ ] "Teacher can see student list at /dashboard/students — rows grouped by (student_name, parent_email) with session count and subjects"
- [ ] "Earnings calculation sums amount_cents client-side; handles NULL rows as 0"
- [ ] "Student grouping runs client-side from completed bookings data"

## Files

- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/sessions/page.tsx`
- `src/app/(dashboard)/dashboard/students/page.tsx`
- `src/components/dashboard/StatsBar.tsx`
- `src/components/dashboard/ReviewPreviewCard.tsx`
- `src/__tests__/dashboard-reviews.test.ts`
