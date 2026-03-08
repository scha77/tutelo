---
phase: 03-stripe-connect-deferred-payment
verified: 2026-03-06T14:55:00Z
status: human_needed
score: 5/5 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "A booking request not confirmed within 48 hours is automatically cancelled and both parties receive a cancellation notification (STRIPE-04 / NOTIF-05)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Stripe Connect Express onboarding flow"
    expected: "Teacher clicks Connect with Stripe, is redirected to Stripe, completes Express onboarding, returns to /dashboard?stripe=connected"
    why_human: "Requires real Stripe credentials and an active network. Cannot verify the redirect chain or Stripe's hosted onboarding UI programmatically."
  - test: "Checkout flow — parent authorizes payment"
    expected: "Parent receives an email with a unique Stripe Checkout URL, clicks it, enters card details, and is redirected to /booking-confirmed showing their session details"
    why_human: "Requires active Stripe test keys, a real checkout session, and real email delivery via Resend."
  - test: "Mark Complete payment capture"
    expected: "Teacher clicks Mark Complete on a confirmed session, the card disappears, Stripe captures the payment with a 7% platform fee, and the parent receives a session-complete email"
    why_human: "Requires an actual Stripe PaymentIntent in authorized state and active Resend delivery."
---

# Phase 3: Stripe Connect + Deferred Payment Verification Report

**Phase Goal:** A teacher can connect Stripe Express in response to a "money waiting" notification, which immediately creates a PaymentIntent for all waiting requests; a parent can authorize payment; and the teacher capturing a session completion triggers automatic payment capture with the 7% platform fee applied.

**Verified:** 2026-03-06T14:55:00Z
**Status:** human_needed (all automated checks passed; 3 items require live Stripe/Resend testing)
**Re-verification:** Yes — after gap closure plan 03-04

---

## Re-Verification Summary

**Previous status:** gaps_found (4/5 — auto-cancel email never dispatched)
**Current status:** human_needed (5/5 — all automated checks pass)

**Gap closed:** The Supabase JS v2 silent `count: null` bug in `src/app/api/cron/auto-cancel/route.ts` has been fixed. The `.update()` call now chains `.select('id')` so Supabase returns the affected rows. The idempotency guard was rewritten from `if (count && count > 0)` to `if (updated && updated.length > 0)`. `sendCancellationEmail` is now reachable and called for every booking whose status actually transitions to `cancelled`. Idempotency is preserved: a second cron run returns `updated = []` because `.eq('status', 'requested')` no longer matches an already-cancelled booking. Commit: `6c0837a`.

**Regressions:** None. All previously-verified artifacts are unchanged. TypeScript compiles clean.

---

## Goal Achievement

### Observable Truths (Success Criteria from ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Teacher completes Stripe Connect Express onboarding via CTA; platform webhook (account.updated + charges_enabled: true) sets stripe_charges_enabled and creates PaymentIntents for all waiting requests | VERIFIED | `src/actions/stripe.ts` creates Express account + account link, redirects teacher. `src/app/api/stripe/webhook/route.ts` handles `account.updated` with idempotency guard, calls `createCheckoutSessionsForTeacher()`. `capture_method: 'manual'` confirmed. `supabaseAdmin` used throughout. |
| 2 | Two separate Stripe webhook endpoints exist — /api/stripe/webhook (platform) and /api/stripe-connect/webhook (connected-account) — each with own signing secret, both using req.text() | VERIFIED | Both files exist. `webhook/route.ts` uses `req.text()` at line 88, `stripe-connect/webhook/route.ts` at line 6. Platform uses `STRIPE_WEBHOOK_SECRET`, connect uses `STRIPE_CONNECT_WEBHOOK_SECRET`. |
| 3 | A booking request not confirmed within 48 hours is automatically cancelled and both parties receive a cancellation notification | VERIFIED | DB update correct and idempotent. `.select('id')` chain at line 51 returns affected rows. `if (updated && updated.length > 0)` guard at line 53 now evaluates correctly. `sendCancellationEmail(booking.id)` called at line 56. Old `count &&` guard removed entirely (confirmed by grep). |
| 4 | Teacher receives follow-up reminder emails at 24hr and 48hr if they have not connected Stripe | VERIFIED | `src/app/api/cron/stripe-reminders/route.ts` queries bookings older than 24hr, branches on 24-48hr (sendFollowUpEmail) vs 48hr+ (sendUrgentFollowUpEmail). CRON_SECRET auth guard present. Both email templates substantive. `vercel.json` schedules both crons hourly. |
| 5 | When teacher marks session complete, payment is captured with 7% application fee; both parties receive completion/review notifications | VERIFIED | `markSessionComplete` in `src/actions/bookings.ts` retrieves PaymentIntent, computes `Math.round(amountToCapture * 0.07)`, passes `application_fee_amount` to `stripe.paymentIntents.capture()`. Calls `sendSessionCompleteEmail(bookingId)` fire-and-forget. |

**Score: 5/5 success criteria verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(dashboard)/dashboard/connect-stripe/page.tsx` | Connect Stripe page with button + guard redirect | VERIFIED | Server-side redirect if stripe_charges_enabled. Form action calls connectStripe. |
| `src/actions/stripe.ts` | connectStripe Server Action — account creation + account link | VERIFIED | Exports connectStripe. Creates Express account, saves stripe_account_id, generates account link, redirects. |
| `src/app/api/stripe/webhook/route.ts` | Platform webhook — account.updated + checkout.session.completed | VERIFIED | Both event handlers substantive. account.updated sets stripe_charges_enabled and creates Checkout sessions. checkout.session.completed confirms booking + calls sendBookingConfirmationEmail. |
| `src/app/api/stripe-connect/webhook/route.ts` | Connected-account webhook — own signing secret | VERIFIED | Exists, uses STRIPE_CONNECT_WEBHOOK_SECRET, exports POST, uses req.text(). |
| `supabase/migrations/0004_stripe_checkout_url.sql` | Adds stripe_checkout_url column to bookings | VERIFIED | ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT |
| `src/app/api/cron/auto-cancel/route.ts` | 48hr auto-cancel cron with CRON_SECRET auth + idempotency + email dispatch | VERIFIED | DB update correct. `.select('id')` chain returns affected rows. `updated && updated.length > 0` guard fires sendCancellationEmail. CRON_SECRET guard present. |
| `src/app/api/cron/stripe-reminders/route.ts` | 24hr/48hr reminder cron with CRON_SECRET auth | VERIFIED | CRON_SECRET guard, 24hr/48hr branching, skips connected teachers, sends correct templates. |
| `src/emails/FollowUpEmail.tsx` | 24hr warm reminder email template | VERIFIED | Substantive react-email template with teacher name, parent email, date, CTA button. |
| `src/emails/UrgentFollowUpEmail.tsx` | 48hr urgent email with auto-cancel warning | VERIFIED | Substantive react-email template with red urgency styling, cancelDeadline, session details. |
| `src/emails/BookingConfirmationEmail.tsx` | NOTIF-03 dual-recipient booking confirmation | VERIFIED | isTeacher flag, session details, both teacher and parent copy. |
| `src/emails/CancellationEmail.tsx` | NOTIF-05 cancellation for both parties | VERIFIED | isTeacher flag, empathetic copy for parent, reconnect suggestion for teacher. |
| `src/emails/SessionCompleteEmail.tsx` | NOTIF-06 session-complete with review prompt | VERIFIED | parentFirstName, studentName, teacherName, reviewUrl. CTA button: "Leave a Review" linking to /review?booking=. |
| `src/actions/bookings.ts` (markSessionComplete) | markSessionComplete with 7% fee capture | VERIFIED | Exports markSessionComplete. Retrieves PaymentIntent, computes 7% fee, calls paymentIntents.capture() with application_fee_amount. |
| `src/app/(dashboard)/dashboard/requests/page.tsx` | Requests page with Confirmed Sessions section | VERIFIED | Second query for status='confirmed'. ConfirmedSessionCard rendered with markSessionComplete wired. |
| `src/app/booking-confirmed/page.tsx` | Public receipt page — async searchParams | VERIFIED | Reads ?session=cs_xxx, retrieves Checkout Session from Stripe, shows booking details. Async searchParams (Next.js 16 pattern). Graceful fallback. |
| `src/components/dashboard/ConfirmedSessionCard.tsx` | Mark Complete button with pending state | VERIFIED | useTransition, toast feedback, green button. Card shows student name, subject, date, parent email. |
| `vercel.json` | Two hourly cron schedules | VERIFIED | 0 * * * * (auto-cancel) and 30 * * * * (reminders). |
| `src/lib/email.ts` | All email dispatch functions | VERIFIED | sendCheckoutLinkEmail, sendFollowUpEmail, sendUrgentFollowUpEmail, sendBookingConfirmationEmail, sendCancellationEmail, sendSessionCompleteEmail. All use supabaseAdmin for DB access. |
| `tests/stripe/` (8 test files) | Test scaffolds — 35 it.todo() stubs | VERIFIED | All 8 files exist. auto-cancel test file: 5 todos, zero failures. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `connect-stripe/page.tsx` | `src/actions/stripe.ts` | `<form action={connectStripe}>` | WIRED | connectStripe imported and used as form action |
| `src/app/api/stripe/webhook/route.ts` | `src/lib/supabase/service.ts` | supabaseAdmin (service role) | WIRED | supabaseAdmin imported at line 2, used throughout all handlers |
| `src/app/api/stripe/webhook/route.ts` | teachers table (stripe_charges_enabled) | `.update({ stripe_charges_enabled: true })` on account.updated | WIRED | Line 112-115 |
| `src/app/api/stripe/webhook/route.ts` | `src/lib/email.ts` (sendBookingConfirmationEmail) | checkout.session.completed handler | WIRED | Line 150 — real call, not a stub |
| `src/app/api/stripe/webhook/route.ts` | `src/lib/email.ts` (sendCheckoutLinkEmail) | createCheckoutSessionsForTeacher | WIRED | Line 73 |
| `src/app/api/cron/auto-cancel/route.ts` | `src/lib/email.ts` (sendCancellationEmail) | `if (updated && updated.length > 0)` guard after `.select('id')` chain | WIRED | Line 56 — previously NOT_WIRED due to count null bug; now fixed in commit 6c0837a |
| `src/app/api/cron/stripe-reminders/route.ts` | `src/lib/email.ts` (sendFollowUpEmail, sendUrgentFollowUpEmail) | time-based branching | WIRED | Both calls wired correctly |
| `src/app/(dashboard)/dashboard/requests/page.tsx` | `src/actions/bookings.ts` (markSessionComplete) | `markCompleteAction={markSessionComplete}` | WIRED | Imported, passed to ConfirmedSessionCard |
| `src/actions/bookings.ts` (markSessionComplete) | `stripe.paymentIntents.capture()` | 7% fee calculation + capture | WIRED | `Math.round(amountToCapture * 0.07)` passed as application_fee_amount |
| `src/actions/bookings.ts` (markSessionComplete) | `src/lib/email.ts` (sendSessionCompleteEmail) | fire-and-forget after capture | WIRED | Called after successful capture |
| `vercel.json` | `src/app/api/cron/auto-cancel/route.ts` | schedule: "0 * * * *" | WIRED | Path "/api/cron/auto-cancel" in crons config |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| STRIPE-03 | 03-01 | Teacher can complete Stripe Connect Express onboarding via "money waiting" CTA | SATISFIED | connectStripe action + connect-stripe page + account.updated webhook |
| STRIPE-04 | 03-02, 03-04 | Unconfirmed bookings auto-cancel after 48hr with notification to both parties | SATISFIED | DB cancellation correct and idempotent. Email now dispatched via .select('id') fix (gap closure 03-04). |
| STRIPE-05 | 03-02 | Payment authorized (not captured) at booking time using capture_method: manual | SATISFIED | Checkout session created with `capture_method: 'manual'` in `payment_intent_data` |
| STRIPE-06 | 03-03 | Teacher marking session complete triggers automatic payment capture | SATISFIED | markSessionComplete calls stripe.paymentIntents.capture() with correct amount |
| STRIPE-07 | 03-03 | Platform applies 7% application fee on every captured payment | SATISFIED | `Math.round(amountToCapture * 0.07)` passed as application_fee_amount |
| NOTIF-02 | 03-02 | Teacher receives follow-up emails at 24hr and 48hr if Stripe not connected | SATISFIED | stripe-reminders cron sends FollowUpEmail (24hr) and UrgentFollowUpEmail (48hr) |
| NOTIF-03 | 03-03 | Both teacher and parent receive booking confirmation emails | SATISFIED | sendBookingConfirmationEmail called from checkout.session.completed handler, dual-recipient with isTeacher flag |
| NOTIF-05 | 03-03, 03-04 | Both teacher and parent receive cancellation notifications | SATISFIED | sendCancellationEmail is substantive. Now called correctly from auto-cancel cron after gap closure 03-04. |
| NOTIF-06 | 03-03 | Parent receives session-complete email with review prompt | SATISFIED | sendSessionCompleteEmail called fire-and-forget from markSessionComplete. SessionCompleteEmail has "Leave a Review" CTA. |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/stripe-connect/webhook/route.ts` | 17 | `// Stub: future connected-account events handled here` | Info | Intentional stub per plan design. Not a blocker for Phase 3 goal. |
| `tests/stripe/` (all 8 files) | all | All 35 tests are `it.todo()` stubs | Warning | Tests pass green but provide zero behavioral coverage. Acceptable for MVP if documented. |

No blocker anti-patterns remain. The `count &&` guard that blocked email dispatch has been removed (confirmed by grep returning no matches).

---

## Human Verification Required

### 1. Stripe Connect Express Onboarding

**Test:** With STRIPE_SECRET_KEY configured, visit /dashboard/connect-stripe as a logged-in teacher who has not connected Stripe. Click "Connect with Stripe."
**Expected:** Browser redirects to Stripe's hosted Express onboarding. After completing onboarding, teacher is returned to /dashboard?stripe=connected. The platform webhook fires account.updated with charges_enabled: true, updating stripe_charges_enabled to true in the database.
**Why human:** Requires real Stripe API credentials and network connectivity. Cannot verify the redirect chain, Stripe's hosted UI, or webhook delivery programmatically.

### 2. Parent Checkout Flow

**Test:** After teacher connects Stripe, the parent's pending booking should receive an email with a Stripe Checkout URL. Open the email (Resend), click the URL, complete checkout with a Stripe test card.
**Expected:** Parent lands on /booking-confirmed showing student name, session date, and teacher name. Both teacher and parent receive BookingConfirmationEmail.
**Why human:** Requires Resend API key, Stripe test mode active, and end-to-end network delivery.

### 3. Mark Complete Payment Capture

**Test:** As a teacher with a confirmed booking (booking.status = 'confirmed', stripe_payment_intent set), click "Mark Complete" on the ConfirmedSessionCard.
**Expected:** Button shows "Capturing payment..." then disappears. Toast: "Session marked complete — payment captured!" Parent receives SessionCompleteEmail with "Leave a Review" link. Stripe dashboard shows captured PaymentIntent with 7% application fee.
**Why human:** Requires an actual PaymentIntent in authorized state and live Resend delivery.

---

## Gaps Summary

No gaps. All 5 success criteria are verified. The single gap from the initial verification (auto-cancel cron not dispatching cancellation emails) was closed by plan 03-04 via commit `6c0837a`. The fix chains `.select('id')` on the Supabase update call so affected rows are returned, and replaces the always-false `count && count > 0` guard with `updated && updated.length > 0`. STRIPE-04 and NOTIF-05 are now fully satisfied.

Phase 3 is complete pending human verification of the three live Stripe/Resend flows listed above.

---

*Verified: 2026-03-06T14:55:00Z*
*Verifier: Claude (gsd-verifier)*
*Re-verification after gap closure plan 03-04*
