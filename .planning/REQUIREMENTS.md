# Requirements: Tutelo

**Defined:** 2026-03-03
**Core Value:** Teachers publish a professional tutoring page in under 7 minutes with zero upfront cost — payment setup triggers only when real money is waiting.

---

## v1 Requirements

### Auth

- [x] **AUTH-01**: Teacher or parent can sign up with email + password or Google SSO
- [x] **AUTH-02**: User session persists across browser refresh

### Onboarding

- [x] **ONBOARD-01**: Teacher completes setup wizard (name, school, city/state, years experience, optional profile photo) with no payment required to publish
- [x] **ONBOARD-02**: Teacher selects tutoring subjects (multi-select: Math, Reading/ELA, Science, etc.)
- [x] **ONBOARD-03**: Teacher selects grade range(s) they teach (multi-select: K-2, 3-5, 6-8, 9-12)
- [x] **ONBOARD-04**: Teacher sets their IANA timezone (required, used for availability storage and viewer conversion)
- [x] **ONBOARD-05**: Teacher sets weekly availability via visual calendar (defaults to weekday evenings + weekends; teacher adjusts)
- [x] **ONBOARD-06**: Teacher sets hourly rate with local benchmark range shown ("most teachers in your area charge $X–Y/hr")
- [x] **ONBOARD-07**: Teacher receives a shareable public URL (`tutelo.app/[slug]`) immediately on publish — no Stripe required

### Teacher Landing Page

- [x] **PAGE-01**: Auto-generated public page at teacher's slug URL (`tutelo.app/[slug]`)
- [x] **PAGE-02**: Page displays: name, profile photo (or initials avatar), school name, city/state
- [x] **PAGE-03**: Page displays: credential bar (verified teacher badge, years experience, subjects, grade levels)
- [x] **PAGE-04**: Page displays: auto-generated bio if teacher skips writing one
- [x] **PAGE-05**: Page displays: subjects + hourly rate, interactive availability calendar, reviews section
- [x] **PAGE-06**: Sticky "Book Now" CTA visible at all times on mobile
- [x] **PAGE-07**: Page applies teacher's chosen accent color / theme throughout
- [x] **PAGE-08**: Page displays teacher's custom headline / tagline below their name (if set)
- [x] **PAGE-09**: Page displays teacher's banner image at the top (if uploaded)
- [x] **PAGE-10**: Page displays teacher's social / contact links (if set)

### Page Customization

- [x] **CUSTOM-01**: Teacher can select an accent color / theme from a preset palette (5–6 colors) from their dashboard
- [x] **CUSTOM-02**: Teacher can add a custom headline / tagline (short one-liner displayed below their name)
- [x] **CUSTOM-03**: Teacher can add social / contact links (Instagram, school email, personal website — all optional)
- [x] **CUSTOM-04**: Teacher can upload a banner image for the top of their landing page

### Availability

- [x] **AVAIL-01**: Teacher can view and edit their weekly availability from their dashboard
- [x] **AVAIL-02**: Available time slots are displayed on the public landing page
- [x] **AVAIL-03**: Public landing page auto-detects the viewer's browser timezone and displays available times converted from the teacher's set timezone

### Page Visibility

- [x] **VIS-01**: Teacher can toggle their public page between "Active" (publicly visible) and "Draft / Hidden" (hidden from public) at any time without losing configured data
- [x] **VIS-02**: Visiting a hidden page returns a graceful "not available" state (not a 404)

### Booking System

- [x] **BOOK-01**: Parent can submit a booking request (no payment) by selecting a time slot, entering student name, subject, optional note, and email — no parent account required
- [x] **BOOK-02**: Parent sees a pending confirmation screen after request submission
- [x] **BOOK-03**: Booking has an explicit state machine: `requested → pending → confirmed → completed → cancelled`
- [x] **BOOK-04**: Booking creation is atomic — double-booking is impossible (DB-level unique constraint + atomic function)
- [x] **BOOK-05**: Parent can complete direct booking (time slot → account creation → payment) when teacher already has Stripe connected
- [x] **BOOK-06**: Teacher can accept or decline booking requests from their dashboard

### Payments (Stripe Connect)

- [x] **STRIPE-01**: Teacher is NOT required to connect Stripe to publish their page or receive booking requests
- [x] **STRIPE-02**: Teacher receives "money waiting" notification (email + in-app) when first booking request arrives, with a direct CTA to connect Stripe
- [x] **STRIPE-03**: Teacher can complete Stripe Connect Express onboarding (2–3 min) via the "money waiting" notification link
- [x] **STRIPE-04**: Unconfirmed booking requests auto-cancel after 48 hours if teacher has not connected Stripe, with notification to both parties
- [x] **STRIPE-05**: Payment is authorized (not captured) at booking time using `capture_method: manual`
- [x] **STRIPE-06**: Teacher marking a session as complete triggers automatic payment capture
- [x] **STRIPE-07**: Platform applies a 7% application fee on every captured payment via Stripe Connect

### Email Notifications

- [x] **NOTIF-01**: Teacher receives email when a booking request is submitted
- [x] **NOTIF-02**: Teacher receives follow-up emails (at 24hr and 48hr) if Stripe has not been connected after a booking request arrives
- [x] **NOTIF-03**: Both teacher and parent receive booking confirmation emails
- [x] **NOTIF-04**: Both teacher and parent receive a 24-hour reminder before each scheduled session
- [x] **NOTIF-05**: Both teacher and parent receive a cancellation notification
- [x] **NOTIF-06**: Parent receives a session-complete email with a review prompt

### Teacher Dashboard

- [x] **DASH-01**: Teacher can view upcoming sessions
- [x] **DASH-02**: Teacher can view and action pending booking requests (accept / decline)
- [x] **DASH-03**: Teacher can view earnings (completed sessions and total payout)
- [x] **DASH-04**: Teacher can view their student list (name, subject, sessions completed)
- [x] **DASH-05**: Teacher can mark a session as complete
- [x] **DASH-06**: Teacher can toggle page Active / Draft from the dashboard (see VIS-01)

### Parent Account

- [x] **PARENT-01**: Parent can create an account (email + password or Google SSO)
- [x] **PARENT-02**: Parent can view booking history and upcoming sessions
- [x] **PARENT-03**: Parent can rebook a session with the same teacher

### Reviews

- [x] **REVIEW-01**: Parent can leave a 1–5 star rating and optional text review after a completed session
- [x] **REVIEW-02**: Reviews are displayed on the teacher's public landing page
- [x] **REVIEW-03**: Review prompt is delivered via email after session completion

---

## v2 Requirements

### Messaging

- **MSG-01**: Secure in-app message thread per booking (parent ↔ teacher, no phone numbers required)
- **MSG-02**: Both parties notified via email when a new message arrives

### Session Notes & Progress

- **NOTES-01**: Teacher can write post-session notes visible to parent
- **NOTES-02**: Simple skill-progress tracker per student across sessions

### Growth / Discovery

- **DISC-01**: Local search directory — parents search by zip code, subject, and grade level
- **DISC-02**: SEO-optimized landing pages auto-generated for "math tutor in [City, State]" queries
- **DISC-03**: School / district page showing all Tutelo teachers at a given school

### Recurring Bookings

- **RECUR-01**: Parent can book a recurring weekly slot without rebooking each time
- **RECUR-02**: Teacher can pause or cancel a recurring series

### Cancellation Policy Enforcement

- **CANCEL-01**: Teacher can set a cancellation policy (e.g. 24hr notice required)
- **CANCEL-02**: Policy is enforced automatically on cancellations (partial refund logic)

### Credential Verification

- **CRED-01**: Optional school email verification (`@[district].edu`) as a trust signal during onboarding

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Video conferencing | Teachers use Zoom / Google Meet. Building video is a full product in itself. |
| In-app messaging (v1) | 3–5x complexity of everything else. "Text me" works for MVP. |
| Discovery / search (v1) | Requires 200+ teachers to be useful. Teachers bring their own clients at launch. |
| Credential verification (v1) | Background checks + license lookup add days to onboarding. Self-reported is acceptable with disclaimer. |
| Recurring bookings (v1) | DST edge cases, cancellation complexity, billing logic — Phase 2. |
| Package / bundle sales | Session credit ledgers, refund logic, expiration policies — Phase 2+. |
| Cancellation policy enforcement (v1) | Informal handling sufficient at MVP. Automate when volume creates support burden. |
| Group sessions / cohorts | Different pricing model, capacity management — Phase 3. |
| Digital product sales | File storage, fulfillment, download management — Phase 3. |
| Multi-teacher / studio accounts | Tutelo is for individual classroom teachers, not tutoring centers. |
| Native mobile app | Responsive web (PWA-quality) is sufficient. No native until a workflow genuinely requires it. |
| Session notes (v1) | Teacher can use Google Docs. Phase 2. |
| Analytics / marketing tools | The page IS the marketing tool. Phase 2+. |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend + API | Next.js 16 (App Router) + Tailwind v4 + shadcn/ui | `proxy.ts` (not `middleware.ts`); all dynamic APIs are async |
| Database + Auth | Supabase (PostgreSQL + RLS + Auth) | Use `@supabase/ssr`; NOT deprecated `@supabase/auth-helpers-nextjs` |
| Payments | Stripe Connect Express | Two webhook endpoints required: platform + connected-account |
| Email | Resend + react-email | Free tier: 3,000/month — sufficient for MVP |
| Hosting | Vercel | Standard deploy; set all env vars in dashboard |
| File Storage | Supabase Storage | Profile photos, banner images |
| Forms | React Hook Form + Zod | Multi-step onboarding wizard |
| Date/Time | date-fns + date-fns-tz | All timestamps stored as `timestamptz`; IANA timezone on teacher record |

> **Switched from Firebase to Supabase** — the relational booking data model (teachers → bookings → reviews → payments) and multi-role RLS are a better fit for PostgreSQL than Firestore.

---

## Traceability

*Populated during roadmap creation — 2026-03-03.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| ONBOARD-01 | Phase 1 | Complete |
| ONBOARD-02 | Phase 1 | Complete |
| ONBOARD-03 | Phase 1 | Complete |
| ONBOARD-04 | Phase 1 | Complete |
| ONBOARD-05 | Phase 1 | Complete |
| ONBOARD-06 | Phase 1 | Complete |
| ONBOARD-07 | Phase 1 | Complete |
| PAGE-01 | Phase 1 | Complete |
| PAGE-02 | Phase 1 | Complete |
| PAGE-03 | Phase 1 | Complete |
| PAGE-04 | Phase 1 | Complete |
| PAGE-05 | Phase 1 | Complete |
| PAGE-06 | Phase 1 | Complete |
| PAGE-07 | Phase 1 | Complete |
| PAGE-08 | Phase 1 | Complete |
| PAGE-09 | Phase 1 | Complete |
| PAGE-10 | Phase 1 | Complete |
| CUSTOM-01 | Phase 1 | Complete |
| CUSTOM-02 | Phase 1 | Complete |
| CUSTOM-03 | Phase 1 | Complete |
| CUSTOM-04 | Phase 1 | Complete |
| AVAIL-01 | Phase 1 | Complete |
| AVAIL-02 | Phase 1 | Complete |
| AVAIL-03 | Phase 1 | Complete |
| VIS-01 | Phase 1 | Complete |
| VIS-02 | Phase 1 | Complete |
| DASH-06 | Phase 1 | Complete |
| BOOK-01 | Phase 2 | Complete |
| BOOK-02 | Phase 2 | Complete |
| BOOK-03 | Phase 2 | Complete |
| BOOK-04 | Phase 2 | Complete |
| BOOK-06 | Phase 2 | Complete |
| STRIPE-01 | Phase 2 | Complete |
| STRIPE-02 | Phase 2 | Complete |
| NOTIF-01 | Phase 2 | Complete |
| DASH-02 | Phase 2 | Complete |
| STRIPE-03 | Phase 3 | Complete |
| STRIPE-04 | Phase 3 | Complete |
| STRIPE-05 | Phase 3 | Complete |
| STRIPE-06 | Phase 3 | Complete |
| STRIPE-07 | Phase 3 | Complete |
| NOTIF-02 | Phase 3 | Complete |
| NOTIF-03 | Phase 3 | Complete |
| NOTIF-05 | Phase 3 | Complete |
| NOTIF-06 | Phase 3 | Complete |
| BOOK-05 | Phase 4 | Complete |
| PARENT-01 | Phase 4 | Complete |
| PARENT-02 | Phase 4 | Complete |
| PARENT-03 | Phase 4 | Complete |
| NOTIF-04 | Phase 4 | Complete |
| DASH-01 | Phase 5 | Complete |
| DASH-03 | Phase 5 | Complete |
| DASH-04 | Phase 5 | Complete |
| DASH-05 | Phase 5 | Complete |
| REVIEW-01 | Phase 5 | Complete |
| REVIEW-02 | Phase 5 | Complete |
| REVIEW-03 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 59 total (count corrected from initial 57 — verified against actual requirement list)
- Mapped to phases: 59
- Unmapped: 0

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 1: Foundation | AUTH-01/02, ONBOARD-01–07, PAGE-01–10, CUSTOM-01–04, AVAIL-01–03, VIS-01/02, DASH-06 | 29 |
| Phase 2: Booking Requests | BOOK-01–04, BOOK-06, STRIPE-01/02, NOTIF-01, DASH-02 | 9 |
| Phase 3: Stripe Connect + Deferred Payment | STRIPE-03–07, NOTIF-02/03/05/06 | 9 |
| Phase 4: Direct Booking + Parent Account | BOOK-05, PARENT-01–03, NOTIF-04 | 5 |
| Phase 5: Dashboard + Reviews | DASH-01/03/04/05, REVIEW-01–03 | 7 |
| **Total** | | **59** |

---

*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after roadmap creation (traceability populated)*
