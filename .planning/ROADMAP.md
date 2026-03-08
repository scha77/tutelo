# Roadmap: Tutelo

## Overview

Tutelo ships in five phases that follow the dependency chain of the product itself: identity and public page come first (nothing else exists without them), then the booking request loop (proves the core value without payment complexity), then the Stripe deferred-payment path (the revenue innovation), then direct booking for established teachers and the parent account, and finally the dashboard and reviews layer that requires real booking data to populate meaningfully. Each phase delivers a coherent, independently testable slice of the product.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Auth, teacher onboarding wizard, public profile page, availability, page visibility
- [x] **Phase 2: Booking Requests** - Pre-payment booking loop, state machine, teacher accept/decline, booking notifications (completed 2026-03-06)
- [x] **Phase 3: Stripe Connect + Deferred Payment** - Revenue path, deferred Stripe onboarding, payment authorization + capture, webhook infrastructure (completed 2026-03-06)
- [ ] **Phase 4: Direct Booking + Parent Account** - Stripe-connected teacher direct booking flow, parent account, session reminders
- [ ] **Phase 5: Dashboard + Reviews** - Teacher dashboard (sessions, earnings, students), review collection, review display

## Phase Details

### Phase 1: Foundation

**Goal**: A teacher can complete onboarding, publish a live customized public page at their vanity URL, and a visitor can see their availability — all with no payment setup required.

**Depends on**: Nothing (first phase)

**Requirements**: AUTH-01, AUTH-02, ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04, ONBOARD-05, ONBOARD-06, ONBOARD-07, PAGE-01, PAGE-02, PAGE-03, PAGE-04, PAGE-05, PAGE-06, PAGE-07, PAGE-08, PAGE-09, PAGE-10, CUSTOM-01, CUSTOM-02, CUSTOM-03, CUSTOM-04, AVAIL-01, AVAIL-02, AVAIL-03, VIS-01, VIS-02, DASH-06

**Success Criteria** (what must be TRUE):
  1. A teacher can sign up with Google SSO or email+password, complete the onboarding wizard (name, school, subjects, grade range, timezone, availability, rate), and receive a shareable `tutelo.app/[slug]` URL — all without entering any payment information
  2. Visiting the published URL shows a mobile-first public page with the teacher's name, school, credentials, subjects, rate, availability calendar, and a sticky "Book Now" button — with availability times automatically converted to the visitor's local timezone
  3. A teacher can customize their page accent color, headline, banner image, and social links from the dashboard and see changes reflected on the public page immediately
  4. A teacher can toggle their page between Active and Draft from the dashboard; visiting a Draft page shows a graceful "not available" state rather than a 404
  5. All timestamps are stored as `timestamptz`, the teacher record has an IANA timezone field, and the Next.js project uses `proxy.ts` (not `middleware.ts`) with async params and cookies throughout

**Plans**: 5 plans

Plans:
- [x] 01-01: Project scaffolding — Next.js 16, Tailwind v4, shadcn/ui, Supabase, environment, proxy.ts, Supabase client setup (browser + server + proxy)
- [x] 01-02: Auth — Supabase Auth with Google SSO + email/password, session persistence, route protection for /dashboard and /onboarding
- [x] 01-03: Database schema — teachers, availability, bookings (state machine stub), reviews tables with RLS, all timestamptz, IANA timezone column, booking unique constraint
- [x] 01-04: Teacher onboarding wizard — multi-step form (React Hook Form + Zod), slug generation, photo upload (Supabase Storage), publish with no Stripe required
- [x] 01-05: Public profile page — /[slug] RSC, all PAGE-* display requirements, availability timezone conversion, page visibility enforcement

---

### Phase 2: Booking Requests

**Goal**: A parent can submit a booking request (no payment) from a teacher's public page, the teacher receives a "money waiting" email notification, and can accept or decline the request from their dashboard.

**Depends on**: Phase 1

**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-06, STRIPE-01, STRIPE-02, NOTIF-01, DASH-02

**Success Criteria** (what must be TRUE):
  1. A parent can select a time slot on a teacher's public page, fill in student name, subject, optional note, and email (no parent account required), and submit a booking request — the teacher is NOT required to have Stripe connected
  2. After submitting, the parent sees a pending confirmation screen; the booking is created atomically with no possibility of double-booking (enforced by DB-level unique constraint + atomic Postgres function via `supabase.rpc()`)
  3. The teacher receives a "money waiting" email the moment the first booking request arrives, with a direct CTA link to connect Stripe
  4. The teacher can accept or decline pending booking requests from their dashboard
  5. The booking state machine (`requested → pending → confirmed → completed → cancelled`) is enforced with DB-level CHECK constraints — no booking can skip or reverse states

**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — DB migration (create_booking fn + tighten RLS), Zod schema, Server Actions, BookingCalendar update with subjects/success/error states
- [ ] 02-02-PLAN.md — Dashboard requests page, RequestCard accept/decline, Sidebar Requests nav + badge, layout Stripe warning banner
- [ ] 02-03-PLAN.md — Resend install, MoneyWaitingEmail + BookingNotificationEmail templates, sendBookingEmail wired to submitBookingRequest

---

### Phase 3: Stripe Connect + Deferred Payment

**Goal**: A teacher can connect Stripe Express in response to a "money waiting" notification, which immediately creates a PaymentIntent for all waiting requests; a parent can authorize payment; and the teacher capturing a session completion triggers automatic payment capture with the 7% platform fee applied.

**Depends on**: Phase 2

**Requirements**: STRIPE-03, STRIPE-04, STRIPE-05, STRIPE-06, STRIPE-07, NOTIF-02, NOTIF-03, NOTIF-05, NOTIF-06

**Success Criteria** (what must be TRUE):
  1. A teacher can complete Stripe Connect Express onboarding (2–3 min) by clicking the CTA link in the "money waiting" email; the platform webhook (`account.updated` with `charges_enabled: true`) updates `stripe_charges_enabled` on the teacher record and creates PaymentIntents for all `requested` bookings
  2. Two separate Stripe webhook endpoints are live — `/api/stripe/webhook` (platform events) and `/api/stripe-connect/webhook` (connected-account events) — each with its own signing secret, both using `req.text()` for raw body handling
  3. A booking request that has not been confirmed within 48 hours (teacher did not connect Stripe) is automatically cancelled and both parties receive a cancellation notification
  4. The teacher receives follow-up reminder emails at 24hr and 48hr if they have not yet connected Stripe after receiving a booking request
  5. When the teacher marks a session complete, payment is automatically captured with a 7% application fee applied via Stripe Connect; both parties receive appropriate completion/review notifications

**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Stripe Connect Express onboarding (/dashboard/connect-stripe, connectStripe Server Action, platform webhook + connected-account webhook stub)
- [ ] 03-02-PLAN.md — Deferred payment flow (Checkout session creation on account.updated, checkout.session.completed handler, 48hr auto-cancel cron, 24hr/48hr reminder emails, vercel.json)
- [ ] 03-03-PLAN.md — Payment capture + all email notifications (markSessionComplete with 7% fee, Confirmed section on requests page, /booking-confirmed page, 3 email templates)
- [ ] 03-04-PLAN.md — Gap closure: fix Supabase JS v2 count bug in auto-cancel cron so cancellation emails are dispatched (STRIPE-04, NOTIF-05)

---

### Phase 4: Direct Booking + Parent Account

**Goal**: A parent visiting a teacher who already has Stripe connected can go straight from time slot selection to account creation to payment authorization in one flow; and parents can log in to view their booking history and rebook.

**Depends on**: Phase 3

**Requirements**: BOOK-05, PARENT-01, PARENT-02, PARENT-03, NOTIF-04

**Success Criteria** (what must be TRUE):
  1. When a teacher already has Stripe connected (`stripe_charges_enabled = true`), the Book Now flow on their page takes a parent directly through time slot selection, account creation (or login), and Stripe Elements payment entry — booking is confirmed with payment authorization in one session
  2. A parent can create an account (email + password or Google SSO) and see their upcoming and past sessions in a parent dashboard view
  3. A parent can rebook a session with the same teacher (pre-filled with previous teacher, subject, and default time preference) without re-entering all details
  4. Both teacher and parent receive a 24-hour reminder email before each scheduled session

**Plans**: 4 plans

Plans:
- [ ] 04-01-PLAN.md — DB migration (reminder_sent_at column + index) + Wave 0 test scaffolds (7 stub files)
- [ ] 04-02-PLAN.md — Direct booking flow: create-intent API route, InlineAuthForm, PaymentStep, BookingCalendar extension (auth + payment steps), webhook extension (payment_intent.amount_capturable_updated), [slug]/page.tsx prop (BOOK-05, PARENT-01)
- [ ] 04-03-PLAN.md — Parent account: /account page, middleware /account protection, login ?redirect= param, rebook URL param pre-fill in BookingCalendar (PARENT-02, PARENT-03)
- [ ] 04-04-PLAN.md — 24hr session reminders: SessionReminderEmail, sendSessionReminderEmail, /api/cron/session-reminders, vercel.json cron (NOTIF-04)

---

### Phase 5: Dashboard + Reviews

**Goal**: A teacher can see their full business at a glance — upcoming sessions, completed sessions, earnings, and student list — and parents are prompted post-session to leave reviews that appear on the teacher's public profile.

**Depends on**: Phase 4

**Requirements**: DASH-01, DASH-03, DASH-04, DASH-05, REVIEW-01, REVIEW-02, REVIEW-03

**Success Criteria** (what must be TRUE):
  1. A teacher's dashboard shows upcoming confirmed sessions, total earnings from completed sessions, and a student list (name, subject, sessions completed count)
  2. A teacher can mark a session complete from the dashboard, which triggers payment capture and sends the parent a review prompt email
  3. A parent receives a review prompt email after their session is marked complete and can leave a 1–5 star rating and optional text review by following the email link
  4. Submitted reviews appear on the teacher's public profile page, visible to any visitor

**Plans**: 5 plans

Plans:
- [ ] 05-01: Teacher dashboard — DASH-01/03/04, upcoming sessions view, earnings display, student list (RSC shell with client islands)
- [ ] 05-02: Session completion + reviews — DASH-05, REVIEW-01/02/03, review prompt email (NOTIF-06 already wired in Phase 3 — connect to review flow here), review display on /[slug]

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 5/5 | Complete   | 2026-03-05 |
| 2. Booking Requests | 3/3 | Complete   | 2026-03-06 |
| 3. Stripe Connect + Deferred Payment | 3/4 | Gap closure pending | 2026-03-06 |
| 4. Direct Booking + Parent Account | 1/4 | In Progress|  |
| 5. Dashboard + Reviews | 0/2 | Not started | - |
