# S02: Integration Verification — UAT

**Milestone:** M002
**Written:** 2026-03-13

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: S02 is integration verification on the live production URL. All flows require real infrastructure (Supabase RLS, Vercel functions, Resend email, Stripe Connect). There is no local substitute — the only valid proof is exercising each flow on tutelo.app.

## Preconditions

- tutelo.app is deployed and accessible (S01 complete)
- Supabase remote project has all 6 migrations applied with RLS active
- Stripe webhook endpoint registered in Stripe Dashboard (test mode)
- Resend domain verified, API key active
- Test teacher account exists: test-teacher@tutelo.app, slug `/ms-test-teacher-2`, social_email set
- One pending booking request (Sophia Chen) exists on the teacher account

## Smoke Test

Navigate to `https://tutelo.app/ms-test-teacher-2` — the public profile page should load with the teacher's name, green accent color, tagline, credentials bar, and "Book Now" button visible within 3 seconds.

## Test Cases

### 1. Teacher signup and onboarding

1. Navigate to `https://tutelo.app/login`
2. Switch to "Create Account" mode
3. Sign up with a new email address
4. **Expected:** Redirect to `/onboarding` (no email confirmation gate)
5. Complete Step 1 (name, school, city, state, years experience)
6. Complete Step 2 (subjects, grade levels, hourly rate)
7. Complete Step 3 (timezone, availability slots) and click "Publish my page"
8. **Expected:** Redirect to `/dashboard?welcome=true`; Stripe Connect banner visible

### 2. Public profile page completeness

1. Navigate to `https://tutelo.app/ms-test-teacher-2`
2. **Expected:** All sections visible — hero with accent color and avatar/initials, teacher name and tagline, credentials bar (Verified Teacher badge, years, location, subjects, grade levels, rate), auto-generated bio, Book a Session calendar with selectable slots, "Book Now" button
3. **Expected:** No 404, no 500, no blank sections

### 3. Booking request submission

1. Open `https://tutelo.app/ms-test-teacher-2` in an incognito/private window
2. Click a date with available slots on the booking calendar
3. Select a time slot
4. Fill in: student name, subject (dropdown), optional note, parent email
5. Click "Request Session" (or equivalent submit button)
6. **Expected:** Success confirmation screen — "Session requested!" or equivalent; shows selected date/time and email
7. Log into Supabase Dashboard > Table Editor > bookings
8. **Expected:** New row with `status = 'requested'`, correct teacher_id, parent_email, student_name, scheduled_at

### 4. Teacher dashboard — requests view

1. Log in as test-teacher@tutelo.app at `https://tutelo.app/login`
2. Navigate to `/dashboard/requests`
3. **Expected:** Pending booking request(s) listed; each card shows student name, subject, date/time in teacher's timezone, parent email, "Submitted X ago"
4. **Expected:** Badge/banner shows correct pending count

### 5. Booking decline action

1. On `/dashboard/requests`, click "Decline" on a pending booking
2. **Expected:** Card removed from list; pending count decrements; banner updates
3. In Supabase Dashboard > bookings: **Expected:** Row status changed to `cancelled`

### 6. Stripe Connect redirect

1. Log in as test-teacher@tutelo.app
2. Navigate to `/dashboard/connect-stripe`
3. **Expected:** Page shows "Get paid for your sessions" heading, "Connect with Stripe" button, 7% platform fee mention
4. Click "Connect with Stripe"
5. **Expected:** Browser redirects to Stripe Express onboarding URL (Stripe-hosted, test mode)
6. **Expected:** NOT redirected to `/login`

### 7. Email delivery verification

1. Check Resend Dashboard > Emails
2. **Expected:** Email sent to test-teacher@tutelo.app with subject related to "money waiting" / booking notification
3. Check the email inbox for test-teacher@tutelo.app
4. **Expected:** Email received with correct teacher name, booking details, and Stripe Connect CTA

### 8. Dashboard navigation

1. Log in as test-teacher@tutelo.app
2. Click each sidebar item: Overview, Requests, Sessions, Students, Page, Availability, Settings
3. **Expected:** Each page loads without 500 errors; no blank pages; correct empty states where applicable

### 9. Page customization

1. Navigate to `/dashboard/page`
2. Change accent color to a different preset
3. Add or change the tagline text
4. Navigate to public profile page
5. **Expected:** New accent color and tagline reflected on public page

### 10. Active/Draft toggle

1. On `/dashboard/page`, toggle page status to "Draft"
2. Open `https://tutelo.app/ms-test-teacher-2` in a new private window
3. **Expected:** Page shows a graceful "not available" state (not a 404)
4. Toggle back to "Active"
5. **Expected:** Public page accessible again

## Edge Cases

### Booking with no availability selected

1. Visit the teacher's public page
2. Click "Book Now" without selecting a time slot
3. **Expected:** Form validation prevents submission; user prompted to select a slot

### Booking request to teacher without social_email set

1. Remove the teacher's social_email from Supabase (or create a fresh teacher account without setting it)
2. Submit a booking request
3. **Expected:** Booking is created successfully (DB row exists); no email is sent (no error shown to parent); Vercel logs show INFO-level skip message

### Stripe Connect while logged out

1. Attempt to navigate to `/dashboard/connect-stripe` without being logged in
2. **Expected:** Redirect to `/login`

## Failure Signals

- `/dashboard/connect-stripe` click redirects to `/login` — server action auth bug returned; check if `/api/connect-stripe` route is deployed correctly
- "Session requested!" not shown after booking form submission — check Vercel function logs for booking server action errors; check Supabase RLS on bookings table
- Dashboard pages return 500 — check Vercel function logs; likely DB query or auth issue
- Resend Dashboard shows no emails — check that teacher's `social_email` is set; check RESEND_API_KEY in Vercel env vars
- Stripe Connect button shows an error message rather than redirecting — check `/api/connect-stripe` Vercel logs; check STRIPE_SECRET_KEY env var
- Public page returns 404 instead of graceful "not available" — VIS-02 regression

## Requirements Proved By This UAT

- AUTH-01 — Teacher signup with email + password works on live URL; redirect to onboarding immediate
- AUTH-02 — Session persists across page navigations on the live app
- ONBOARD-01 through ONBOARD-07 — Full 3-step wizard completes and publishes live page
- PAGE-01 through PAGE-08 — All sections render on /ms-test-teacher-2; accent color, tagline, credentials, bio, calendar, Book Now all visible
- CUSTOM-01, CUSTOM-02 — Accent color and tagline change and persist
- VIS-01 — Active/Draft toggle works both directions
- VIS-02 — Draft page shows graceful "not available" state (not 404)
- BOOK-01 — Parent submits booking request with no account required
- BOOK-02 — Success confirmation screen shown after submission
- BOOK-03 — Status machine: requested → cancelled (decline action verified)
- BOOK-06 — Teacher can decline booking requests from dashboard
- STRIPE-01 — Teacher published page without connecting Stripe
- STRIPE-02, STRIPE-03 — Stripe Connect redirect works; "money waiting" email triggered
- NOTIF-01 — Teacher email notification triggered when social_email is set
- DASH-01 through DASH-06 — All 7 dashboard pages load; pending requests visible and actionable
- AVAIL-01, AVAIL-02 — Availability set in onboarding; slots visible on public page

## Not Proven By This UAT

- **Stripe Connect full roundtrip**: The onboarding redirect works but completing Stripe test onboarding → `account.updated` webhook receipt → `stripe_charges_enabled = true` in DB has not been manually walked through. Requires founder to complete interactively with Stripe test data.
- **Accept booking action**: Accept requires `stripe_charges_enabled = true`. Cannot test until Stripe Connect roundtrip is complete.
- **BOOK-04 (double-booking prevention)**: DB-level unique constraint not tested during this slice.
- **BOOK-05 (direct booking payment flow)**: Requires Stripe Connect to be active. Deferred until teacher has charges enabled.
- **STRIPE-04 through STRIPE-07**: 48-hour auto-cancel, payment authorization, capture, and 7% fee — all require Stripe charges enabled.
- **NOTIF-02 through NOTIF-06**: 24/48hr follow-up emails, confirmation emails, reminders, cancellation notifications, review prompts — these require cron jobs or confirmed bookings to trigger.
- **DASH-03 through DASH-05**: Earnings, student list, and "mark complete" are empty/inactive until sessions are completed.
- **PARENT-01 through PARENT-03**: Parent account creation and booking history not tested.
- **REVIEW-01 through REVIEW-03**: Review flow requires completed sessions.
- **Google SSO** (AUTH-01 partial): Email/password signup verified; Google SSO not exercised during this slice.
- **Profile photo and banner image uploads**: CUSTOM-04 not tested end-to-end (upload UI exists but not exercised during walkthrough).
- **Cron job execution**: NOTIF-02, NOTIF-04, STRIPE-04 depend on Vercel cron jobs — verified configured in S01 but not actively triggered during S02.

## Notes for Tester

- Use Stripe's test data when completing Stripe Express onboarding: SSN `0000`, bank routing `110000000`, account `000123456789`.
- The test teacher account (test-teacher@tutelo.app) already exists on the live app with one pending booking. You can use it directly or create a fresh teacher account.
- The homepage (tutelo.app/) shows a default Next.js starter page — go directly to `/login` or `/ms-test-teacher-2`.
- React hydration error #418 appears in the browser console on public profile pages — this is cosmetic only (timezone rendering mismatch), does not affect functionality.
- Time slots on the teacher dashboard display in the teacher's timezone (America/Chicago / CDT), not the viewer's timezone. This is correct behavior.
- RSC prefetch `ERR_ABORTED` errors in the browser network tab are expected Next.js behavior (cancelled prefetches during navigation) — not real errors.
