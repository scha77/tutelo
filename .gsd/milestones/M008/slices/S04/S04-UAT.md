# S04: Page View Tracking & Dashboard Analytics — UAT

**Milestone:** M008
**Written:** 2026-03-31T02:37:46.349Z

## S04 UAT: Page View Tracking & Dashboard Analytics

**Prerequisite:** Migration 0013 applied to the database.

### Test Cases

**TC-01: Page view recorded on profile visit**
- Visit a published teacher's /[slug] page as an anonymous user
- Expected: A row inserted in page_views (is_bot=false, teacher_id set)

**TC-02: Bot views not counted**
- Simulate a request to /[slug] with Googlebot UA (dev test)
- Expected: Row inserted with is_bot=true, not counted in analytics

**TC-03: Analytics dashboard loads**
- Login as a teacher and navigate to /dashboard/analytics
- Expected: Page renders without error with the 4 stat cards visible

**TC-04: View count reflects visits**
- After visiting the teacher's profile page, check /dashboard/analytics
- Expected: Total page views increments by 1 (after migration applied)

**TC-05: Conversion rate displays**
- With at least 1 view and 1 completed booking
- Expected: Conversion rate shows a non-zero percentage

**TC-06: Empty state nudge**
- New teacher with 0 views
- Expected: Empty state message with link to /dashboard/promote

**TC-07: Analytics nav item**
- Check sidebar on desktop and bottom nav on mobile
- Expected: 'Analytics' item visible with BarChart2 icon

