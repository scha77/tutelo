# S05: Dashboard Reviews

**Goal:** Lay the schema foundation and test scaffold for Phase 5.
**Demo:** Lay the schema foundation and test scaffold for Phase 5.

## Must-Haves


## Tasks

- [x] **T01: 05-dashboard-reviews 01**
  - Lay the schema foundation and test scaffold for Phase 5. This plan runs first (Wave 1) so all downstream plans in Wave 2 can implement against known column shapes and a pre-existing test file.

Purpose: Migration 0006 adds the four missing columns Phase 5 requires (token, token_used_at, reviewer_name, amount_cents) and adjusts RLS policies. The test scaffold creates the vitest file with it.todo() stubs so Wave 2 plans can fill in real tests. The sidebar and requests page cleanups are atomic changes that belong here — they unblock the sessions page plan from having a broken UI state mid-deploy.

Output: Migration file, green test scaffold, updated Sidebar with 2 new nav items, pending-only requests page.
- [x] **T02: 05-dashboard-reviews 02** `est:5min`
  - Build the three dashboard data pages: the overview home, the sessions history, and the student list.

Purpose: Delivers DASH-01 (view upcoming sessions), DASH-03 (earnings), and DASH-04 (student list) — giving teachers visibility into their full business at a glance.

Output: Three RSC pages + two new client components (StatsBar, ReviewPreviewCard). All queries use parallel Promise.all(). Reuses existing ConfirmedSessionCard for the sessions page Upcoming section.
- [x] **T03: 05-dashboard-reviews 03**
  - Wire the complete review flow end-to-end: token generation at mark-complete, the public review submission page, and review display on the teacher's public profile.

Purpose: Delivers DASH-05 (mark complete with token generation), REVIEW-01 (parent submits review), REVIEW-02 (reviews on public profile), and REVIEW-03 (review prompt email with real URL). This completes the Phase 5 and MVP feature set.

Output: Updated markSessionComplete, new submitReview action, new /review/[token] page, new ReviewsSection component wired into /[slug].

## Files Likely Touched

- `supabase/migrations/0006_phase5_reviews.sql`
- `src/__tests__/dashboard-reviews.test.ts`
- `src/components/dashboard/Sidebar.tsx`
- `src/app/(dashboard)/dashboard/requests/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/sessions/page.tsx`
- `src/app/(dashboard)/dashboard/students/page.tsx`
- `src/components/dashboard/StatsBar.tsx`
- `src/components/dashboard/ReviewPreviewCard.tsx`
- `src/__tests__/dashboard-reviews.test.ts`
- `src/actions/bookings.ts`
- `src/actions/reviews.ts`
- `src/lib/email.ts`
- `src/emails/SessionCompleteEmail.tsx`
- `src/app/review/[token]/page.tsx`
- `src/app/[slug]/page.tsx`
- `src/components/profile/ReviewsSection.tsx`
- `src/__tests__/dashboard-reviews.test.ts`
