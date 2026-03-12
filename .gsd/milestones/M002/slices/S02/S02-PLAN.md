# S02: Integration Verification

**Goal:** Verify all critical user flows work end-to-end on the live URL and fix any integration issues discovered.
**Demo:** A real teacher account exists on the live app with a published profile page. A booking request has been submitted and a real email was received.

## Must-Haves

- Auth flow works (signup, login, session persistence, Google SSO)
- Onboarding wizard completes and produces a live /[slug] page
- Booking request creates a DB record and sends an email
- Stripe Connect link generates correctly (test mode)
- Dashboard loads with correct data
- No silent failures (errors are visible in Vercel logs)

## Proof Level

- This slice proves: operational (real user flows on live infrastructure)
- Real runtime required: yes
- Human/UAT required: yes (manual walkthrough of teacher and parent flows)

## Verification

- Teacher signup → onboarding → publish → live /[slug] page accessible
- Parent booking request → DB record created → teacher email received via Resend
- Stripe Connect "Connect with Stripe" → redirects to Stripe onboarding (test mode)
- Dashboard shows the booking request in Pending Requests
- No 500 errors in Vercel function logs during the walkthrough

## Observability / Diagnostics

- Runtime signals: Vercel function logs for each route/action invoked
- Inspection surfaces: Supabase Dashboard > Table Editor (teachers, bookings rows), Resend Dashboard > Emails (delivery logs), Stripe Dashboard > Events
- Failure visibility: Vercel logs show uncaught exceptions; Supabase logs show RLS denials; Resend shows bounce/failure status
- Redaction constraints: do not log user passwords or Stripe payment details

## Integration Closure

- Upstream surfaces consumed: live Vercel deployment from S01 with all env vars and services configured
- New wiring introduced: none (verification only, fixes as needed)
- What remains before the milestone is truly usable end-to-end: S03 (error hardening, documentation)

## Tasks

- [ ] **T01: Teacher flow walkthrough** `est:20m`
  - Why: The core product flow must work. Teacher signup → onboarding → publish is the highest-priority path.
  - Files: source files only if bugs are found and fixed
  - Do:
    1. Visit the live URL `/login`
    2. Sign up with a test email account
    3. Complete the 3-step onboarding wizard (name, school, subjects, availability)
    4. Publish the profile
    5. Visit the public `/[slug]` URL — verify all sections render (hero, credentials, availability, Book Now)
    6. Visit `/dashboard` — verify sidebar navigation works, all pages load
    7. Test page customization: change accent color, add tagline, toggle Active/Draft
    8. If any step fails: diagnose via Vercel logs, fix the issue, redeploy, and retry
  - Verify: Public /[slug] page is live and accessible. Dashboard shows correct data.
  - Done when: A complete teacher profile exists on the live app with a functional dashboard

- [ ] **T02: Booking and notification flow walkthrough** `est:15m`
  - Why: The booking request flow is the core value loop — parents submitting requests is what makes the product useful.
  - Files: source files only if bugs are found and fixed
  - Do:
    1. Visit the teacher's public /[slug] page (as an anonymous/incognito user)
    2. Select a time slot and fill in the booking request form (student name, subject, email, note)
    3. Submit the request — verify success state shown
    4. Check Supabase Dashboard > bookings table — verify row created with status `requested`
    5. Check Resend Dashboard > Emails — verify teacher notification email was sent
    6. Check email inbox — verify the email arrived with correct content
    7. Log back into teacher account → `/dashboard/requests` — verify booking appears as pending
    8. Accept the booking request — verify status changes
    9. If any step fails: diagnose, fix, redeploy, retry
  - Verify: Booking row exists in DB. Email was delivered. Request appears on teacher dashboard.
  - Done when: Complete booking request cycle verified with real email delivery

- [ ] **T03: Stripe Connect and payment flow verification** `est:15m`
  - Why: The payment flow is the revenue path. Even in test mode, the Stripe Connect link and webhook must function.
  - Files: source files only if bugs are found and fixed
  - Do:
    1. As the test teacher, visit `/dashboard/connect-stripe`
    2. Click "Connect with Stripe" — verify redirect to Stripe Express onboarding (test mode)
    3. Complete Stripe test onboarding (use Stripe's test data)
    4. Verify webhook fires: check Stripe Dashboard > Events for `account.updated`
    5. Check Vercel logs for webhook handler execution
    6. Verify teacher record updated: `stripe_charges_enabled = true` in Supabase
    7. If Stripe checkout sessions were created for pending bookings, verify in Stripe Dashboard
    8. If any step fails: check Stripe webhook logs, Vercel function logs, diagnose and fix
  - Verify: Stripe Connect onboarding link works. Webhook is received and processed. Teacher record updated.
  - Done when: Stripe integration verified end-to-end in test mode

## Files Likely Touched

- Source files only if bugs are discovered — no planned code changes
- Potential fix areas based on M001 forward intelligence: auth redirects, webhook URL handling, Supabase RLS edge cases
