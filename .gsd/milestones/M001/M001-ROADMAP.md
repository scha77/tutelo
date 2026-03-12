# M001: Migration

**Vision:** Tutelo is a web application that gives K-12 classroom teachers a professional tutoring landing page — with scheduling, payments, and booking — in under 7 minutes, at zero upfront cost.

## Success Criteria


## Slices

- [x] **S01: Foundation** `risk:medium` `depends:[]`
  > Auth, teacher onboarding wizard, public profile page, availability, page visibility — a teacher can sign up, complete onboarding, and publish a live landing page at their vanity URL with no payment setup required.
- [x] **S02: Booking Requests** `risk:medium` `depends:[S01]`
  > Pre-payment booking loop — parent submits booking request, teacher receives "money waiting" email, accepts or declines from dashboard. Atomic booking creation with DB-level double-booking prevention.
- [x] **S03: Stripe Connect Deferred Payment** `risk:medium` `depends:[S02]`
  > Revenue path — Stripe Connect Express onboarding, deferred Checkout session creation for waiting parents, payment capture with 7% platform fee, 48hr auto-cancel cron, follow-up email escalation.
- [x] **S04: Direct Booking Parent Account** `risk:medium` `depends:[S03]`
  > Direct booking flow for Stripe-connected teachers (slot → auth → payment in one session), parent /account page with booking history and rebook, 24hr session reminder cron.
- [x] **S05: Dashboard Reviews** `risk:medium` `depends:[S04]`
  > Teacher dashboard (overview stats, sessions history, student list), token-based review flow (mark complete → email → submit review), reviews displayed on public profile.
