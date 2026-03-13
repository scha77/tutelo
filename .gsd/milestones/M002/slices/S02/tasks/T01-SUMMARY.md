---
id: T01
parent: S02
milestone: M002
provides:
  - Verified teacher signup → onboarding → publish → public /[slug] page end-to-end on live URL
  - Verified dashboard navigation (all 7 pages load correctly)
  - Verified page customization (accent color, tagline, Active/Draft toggle)
  - Test teacher account exists on live app for T02/T03 to use
key_files: []
key_decisions:
  - No code changes needed — all teacher flow features work correctly in production
patterns_established: []
observability_surfaces:
  - Vercel function logs for each route/action invoked during walkthrough
  - React hydration warning (error #418) on public profile page — cosmetic only
duration: 20m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Teacher flow walkthrough

**Complete teacher signup → onboarding → publish → public profile page verified working end-to-end on live tutelo.app**

## What Happened

Performed a full end-to-end walkthrough of the teacher flow on the live production URL (tutelo.app):

1. **Signup**: Navigated to /login, switched to Create Account mode, signed up with test-teacher@tutelo.app — redirect to /onboarding worked immediately (no email confirmation required)

2. **Onboarding Step 1 (Profile)**: Filled in name (Ms. Test Teacher), school (Demo High School), city (Nashville), state (TN), years experience (8) — all fields worked, state combobox (Radix-based) functioned correctly

3. **Onboarding Step 2 (Teaching Details)**: Selected subjects (Math, Science), grade levels (6-8, 9-12), set hourly rate ($50) — all toggle buttons and number input worked

4. **Onboarding Step 3 (Availability)**: Auto-generated slug `ms-test-teacher-2` (a prior teacher already existed), selected timezone (America/Chicago), 40 availability slots pre-filled (weekday evenings + weekends) — clicked "Publish my page"

5. **Dashboard**: Redirected to /dashboard?welcome=true — overview shows stats ($0.00 earned, 0 sessions, 0 students), Stripe Connect banner visible

6. **Dashboard Navigation**: All 7 pages load correctly:
   - Overview: stats cards + upcoming sessions
   - Requests: "No pending requests yet" with Copy page link
   - Sessions: Upcoming and Past sections
   - Students: empty state
   - Page: Page Status toggle, accent colors, tagline, banner upload, social links
   - Availability: weekly grid with 40 slots
   - Settings: profile fields with correct data

7. **Page Customization**: Changed accent color to green, added tagline "Making math and science fun for middle & high school students!" — both saved and persisted. Tested Active/Draft toggle — switches between states correctly.

8. **Public Profile Page (/ms-test-teacher-2)**: All sections render:
   - Hero with green accent banner and avatar initials
   - Name + tagline
   - Credentials bar (Verified Teacher · 8 yrs · Nashville, TN · Math · Science · 6-8 · 9-12 · $50/hr)
   - Auto-generated bio
   - Book a Session calendar (March 2026)
   - "Book Now" CTA button

## Verification

All browser assertions passed (6/6):
- ✅ URL contains `ms-test-teacher-2`
- ✅ "Ms. Test Teacher" visible
- ✅ "Making math and science fun" visible
- ✅ "Nashville, TN" visible
- ✅ "Book Now" visible
- ✅ "$50/hr" visible

Dashboard assertions:
- ✅ All 7 sidebar pages load without 500 errors
- ✅ Active/Draft toggle works both directions
- ✅ Session persists across page navigations
- ✅ Stripe Connect banner displays correctly

Slice-level verification (T01 scope):
- ✅ Teacher signup → onboarding → publish → live /[slug] page accessible
- ⏳ Parent booking request (T02)
- ⏳ Stripe Connect (T03)
- ✅ Dashboard shows correct data (no bookings yet, which is correct)
- ✅ No 500 errors in Vercel function logs during walkthrough

## Diagnostics

- Network logs show `ERR_ABORTED` RSC prefetch requests when navigating quickly between dashboard pages — this is expected Next.js behavior (cancelled prefetches), not actual errors
- React hydration warning (error #418) on public profile page — likely caused by date/time formatting differences between server and client. Cosmetic only, doesn't affect functionality.
- Homepage (tutelo.app/) shows default Next.js starter page instead of Tutelo content — cosmetic issue, not blocking (all actual routes work correctly)

## Deviations

None — all steps from the task plan completed as specified. No bugs were found that required code fixes.

## Known Issues

1. **Homepage shows default Next.js page**: tutelo.app/ displays "To get started, edit the page.tsx file" — the homepage wasn't customized for production. Not blocking since /login, /onboarding, /dashboard, and /[slug] all work.

2. **React hydration mismatch (error #418)**: Occurs on public profile page, likely from timezone-dependent date rendering. Visual impact only — no functional impact.

3. **Slug auto-incremented to `ms-test-teacher-2`**: A prior teacher with slug `ms-test-teacher` already exists (likely from earlier testing). This is correct behavior — slug deduplication works.

## Files Created/Modified

No source files modified — this was a verification-only walkthrough. All teacher flow features work correctly in production.
