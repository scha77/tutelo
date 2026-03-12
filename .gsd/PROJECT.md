# Tutelo

## What This Is

Tutelo is a web application that gives K-12 classroom teachers a professional tutoring landing page — with scheduling, payments, and booking — in under 7 minutes, at zero upfront cost. Parents discover and book verified classroom teachers through those pages. Teachers own their client relationships and pay only when they earn (7% platform fee, no monthly cost).

Tagline: "Shopify for teacher side hustles."

## Core Value

**The deferred Stripe model:** teachers publish a professional page and share it with zero financial commitment — payment setup is triggered only when a real parent with real money is waiting. This eliminates the single biggest drop-off in competing products (entering bank info before seeing any value).

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Teacher Onboarding**
- [ ] Teacher can sign up and generate a live landing page in under 7 minutes
- [ ] Onboarding requires no payment setup to publish (Stripe deferred)
- [ ] Teacher can set profile: name, school, city/state, subjects, grade range, years experience, optional photo
- [ ] Teacher can set weekly availability via visual calendar (defaults to weekday evenings + weekends)
- [ ] Teacher can set hourly rate (shown with area rate benchmarks)
- [ ] Teacher gets shareable URL on publish (tutelo.com/ms-johnson)

**Teacher Landing Page**
- [ ] Auto-generated, mobile-first public page from onboarding answers
- [ ] Page shows: name, school, credentials bar, subjects/rates, availability calendar, reviews, Book Now CTA
- [ ] Auto-generated bio if teacher skips writing one
- [ ] Sticky "Book Now" button on mobile

**Booking System**
- [ ] Parent can submit a booking request (pre-Stripe): student name, time slot, subject, optional note, email
- [ ] "Money waiting" notification triggers Stripe Connect onboarding for teacher when first booking request arrives
- [ ] Parent receives pending confirmation; teacher has time-pressure urgency to connect
- [ ] Direct booking flow (post-Stripe): parent creates account, enters payment, booking confirmed with payment authorization
- [ ] Teacher can mark session complete, triggering payment capture
- [ ] 24hr reminder emails to both parties before session

**Teacher Dashboard**
- [ ] Teacher sees upcoming sessions, pending requests, earnings, and student list
- [ ] Teacher can accept/decline booking requests

**Parent Account**
- [ ] Parent can view bookings, payment history, and rebook

**Reviews**
- [ ] Parent can leave star rating + text review after completed session
- [ ] Reviews displayed on teacher landing page

**Email Notifications**
- [ ] Booking request received (teacher)
- [ ] "Money waiting" trigger with urgency copy (teacher)
- [ ] 24/48/72hr follow-up if teacher hasn't connected Stripe after first request
- [ ] Booking confirmation (both)
- [ ] Session reminders (both)
- [ ] Cancellation (both)
- [ ] Session complete + review prompt (parent)

**Payments**
- [ ] Stripe Connect Express for teacher payouts
- [ ] 7% platform fee deducted from teacher payout
- [ ] Stripe handles payment authorization at booking, capture at session completion

### Out of Scope

- Discovery/search directory — teachers share their own links at launch; search is Phase 2
- In-app messaging — teachers/parents communicate externally for MVP; Phase 2
- Session notes / progress tracking — post-session notes and skill tracking is Phase 2
- Recurring bookings — manual rebooking for MVP; automation is Phase 2
- Cancellation policy enforcement — handled informally at MVP
- School/district pages — Phase 2
- SEO city/subject landing pages — Phase 2
- Credential verification — self-reported at MVP; formal verification is Phase 2+
- Video conferencing — teachers use Zoom/Meet; not Tutelo's problem
- Group sessions, digital products, workshops — Phase 3
- Mobile app — web-first, mobile app later

## Context

**Founder background:** Former K-12 teacher, now full-time at LiveSchool (edtech). Building solo. 10-15 hrs/week available. Baby due July 2026 — MVP must be live and validated by end of June 2026. Uses Claude Code for maximum velocity.

**Distribution advantage:** The @eyes_on_meme Instagram audience — an existing, engaged teacher following. First 50-500 teachers at zero CAC. No competing product has this. First cohort = "Founding Teachers" with a badge on their page.

**Market gap:** Existing options are either exploitative marketplaces (Wyzant 18-33% commission, platform owns the client) or DIY chaos (Venmo + Google Cal + text messages). No product is designed for the exhausted classroom teacher doing 2-5 hours/week tutoring as a side hustle.

**Revenue model:** 7% platform fee on completed sessions (teacher pays). Stripe takes ~2.9% + $0.30. Total teacher cost ~10%. At $40/hr, teacher keeps ~$36. Far better than any marketplace alternative.

**Validation target (90 days post-launch):**
- 50+ teachers complete onboarding
- 25+ teachers receive ≥1 booking request
- 80%+ teachers connect Stripe after receiving a request
- 100+ completed paid sessions
- 30%+ repeat booking rate

## Constraints

- **Timeline:** MVP live by end of June 2026 — baby due July 2026; this is a hard deadline
- **Development capacity:** Solo build, 10-15 hrs/week, ~80-120 total hours budgeted
- **Tech stack:** Next.js + Tailwind (frontend), Supabase (DB + auth), Stripe Connect Express (payments), Vercel (hosting), Resend (email) — pre-decided, do not deviate
- **Budget:** Near-zero fixed cost. All chosen services are free at MVP scale. No paid infra until significant scale.
- **Auth:** Supabase Auth (Google SSO + email). No custom auth.
- **Payments:** Stripe Connect Express only. No custom payment logic.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Defer Stripe Connect to first booking request | Removes friction at lowest motivation point; adds it at highest (real parent waiting to pay) | — Pending |
| Booking request model before teacher connects Stripe | Parent submits request without payment; teacher activates payments in response to urgency | — Pending |
| No marketplace / discovery at MVP | Teachers bring their own students; platform professionalizes existing relationships, not new matchmaking | — Pending |
| 7% platform fee (teacher-side only) | Below all major competitors; justified by full stack (page + booking + payments + trust layer) | — Pending |
| Next.js + Supabase + Vercel | Full-stack JS, minimal ops overhead, generous free tiers, founder already knows React | — Pending |
| Vanity URL slug (tutelo.com/ms-johnson) | Shareable, professional, memorable — core to the "own your page" value prop | — Pending |

---
*Last updated: 2026-03-03 after initialization*
