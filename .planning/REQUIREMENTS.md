# Requirements: Tutelo

**Defined:** 2026-03-03
**Core Value:** Teachers publish a professional tutoring page in under 7 minutes with zero upfront cost — payment setup triggers only when real money is waiting.

---

## v1 Requirements

### Auth

- [ ] **AUTH-01**: Teacher or parent can sign up with email + password or Google SSO
- [ ] **AUTH-02**: User session persists across browser refresh

### Onboarding

- [ ] **ONBOARD-01**: Teacher completes setup wizard (name, school, city/state, years experience, optional profile photo) with no payment required to publish
- [ ] **ONBOARD-02**: Teacher selects tutoring subjects (multi-select: Math, Reading/ELA, Science, etc.)
- [ ] **ONBOARD-03**: Teacher selects grade range(s) they teach (multi-select: K-2, 3-5, 6-8, 9-12)
- [ ] **ONBOARD-04**: Teacher sets their IANA timezone (required, used for availability storage and viewer conversion)
- [ ] **ONBOARD-05**: Teacher sets weekly availability via visual calendar (defaults to weekday evenings + weekends; teacher adjusts)
- [ ] **ONBOARD-06**: Teacher sets hourly rate with local benchmark range shown ("most teachers in your area charge $X–Y/hr")
- [ ] **ONBOARD-07**: Teacher receives a shareable public URL (`tutelo.app/[slug]`) immediately on publish — no Stripe required

### Teacher Landing Page

- [ ] **PAGE-01**: Auto-generated public page at teacher's slug URL (`tutelo.app/[slug]`)
- [ ] **PAGE-02**: Page displays: name, profile photo (or initials avatar), school name, city/state
- [ ] **PAGE-03**: Page displays: credential bar (verified teacher badge, years experience, subjects, grade levels)
- [ ] **PAGE-04**: Page displays: auto-generated bio if teacher skips writing one
- [ ] **PAGE-05**: Page displays: subjects + hourly rate, interactive availability calendar, reviews section
- [ ] **PAGE-06**: Sticky "Book Now" CTA visible at all times on mobile
- [ ] **PAGE-07**: Page applies teacher's chosen accent color / theme throughout
- [ ] **PAGE-08**: Page displays teacher's custom headline / tagline below their name (if set)
- [ ] **PAGE-09**: Page displays teacher's banner image at the top (if uploaded)
- [ ] **PAGE-10**: Page displays teacher's social / contact links (if set)

### Page Customization

- [ ] **CUSTOM-01**: Teacher can select an accent color / theme from a preset palette (5–6 colors) from their dashboard
- [ ] **CUSTOM-02**: Teacher can add a custom headline / tagline (short one-liner displayed below their name)
- [ ] **CUSTOM-03**: Teacher can add social / contact links (Instagram, school email, personal website — all optional)
- [ ] **CUSTOM-04**: Teacher can upload a banner image for the top of their landing page

### Availability

- [ ] **AVAIL-01**: Teacher can view and edit their weekly availability from their dashboard
- [ ] **AVAIL-02**: Available time slots are displayed on the public landing page
- [ ] **AVAIL-03**: Public landing page auto-detects the viewer's browser timezone and displays available times converted from the teacher's set timezone

### Page Visibility

- [ ] **VIS-01**: Teacher can toggle their public page between "Active" (publicly visible) and "Draft / Hidden" (hidden from public) at any time without losing configured data
- [ ] **VIS-02**: Visiting a hidden page returns a graceful "not available" state (not a 404)

### Booking System

- [ ] **BOOK-01**: Parent can submit a booking request (no payment) by selecting a time slot, entering student name, subject, optional note, and email — no parent account required
- [ ] **BOOK-02**: Parent sees a pending confirmation screen after request submission
- [ ] **BOOK-03**: Booking has an explicit state machine: `requested → pending → confirmed → completed → cancelled`
- [ ] **BOOK-04**: Booking creation is atomic — double-booking is impossible (DB-level unique constraint + atomic function)
- [ ] **BOOK-05**: Parent can complete direct booking (time slot → account creation → payment) when teacher already has Stripe connected
- [ ] **BOOK-06**: Teacher can accept or decline booking requests from their dashboard

### Payments (Stripe Connect)

- [ ] **STRIPE-01**: Teacher is NOT required to connect Stripe to publish their page or receive booking requests
- [ ] **STRIPE-02**: Teacher receives "money waiting" notification (email + in-app) when first booking request arrives, with a direct CTA to connect Stripe
- [ ] **STRIPE-03**: Teacher can complete Stripe Connect Express onboarding (2–3 min) via the "money waiting" notification link
- [ ] **STRIPE-04**: Unconfirmed booking requests auto-cancel after 48 hours if teacher has not connected Stripe, with notification to both parties
- [ ] **STRIPE-05**: Payment is authorized (not captured) at booking time using `capture_method: manual`
- [ ] **STRIPE-06**: Teacher marking a session as complete triggers automatic payment capture
- [ ] **STRIPE-07**: Platform applies a 7% application fee on every captured payment via Stripe Connect

### Email Notifications

- [ ] **NOTIF-01**: Teacher receives email when a booking request is submitted
- [ ] **NOTIF-02**: Teacher receives follow-up emails (at 24hr and 48hr) if Stripe has not been connected after a booking request arrives
- [ ] **NOTIF-03**: Both teacher and parent receive booking confirmation emails
- [ ] **NOTIF-04**: Both teacher and parent receive a 24-hour reminder before each scheduled session
- [ ] **NOTIF-05**: Both teacher and parent receive a cancellation notification
- [ ] **NOTIF-06**: Parent receives a session-complete email with a review prompt

### Teacher Dashboard

- [ ] **DASH-01**: Teacher can view upcoming sessions
- [ ] **DASH-02**: Teacher can view and action pending booking requests (accept / decline)
- [ ] **DASH-03**: Teacher can view earnings (completed sessions and total payout)
- [ ] **DASH-04**: Teacher can view their student list (name, subject, sessions completed)
- [ ] **DASH-05**: Teacher can mark a session as complete
- [ ] **DASH-06**: Teacher can toggle page Active / Draft from the dashboard (see VIS-01)

### Parent Account

- [ ] **PARENT-01**: Parent can create an account (email + password or Google SSO)
- [ ] **PARENT-02**: Parent can view booking history and upcoming sessions
- [ ] **PARENT-03**: Parent can rebook a session with the same teacher

### Reviews

- [ ] **REVIEW-01**: Parent can leave a 1–5 star rating and optional text review after a completed session
- [ ] **REVIEW-02**: Reviews are displayed on the teacher's public landing page
- [ ] **REVIEW-03**: Review prompt is delivered via email after session completion

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

*Populated during roadmap creation.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| ONBOARD-01 | — | Pending |
| ONBOARD-02 | — | Pending |
| ONBOARD-03 | — | Pending |
| ONBOARD-04 | — | Pending |
| ONBOARD-05 | — | Pending |
| ONBOARD-06 | — | Pending |
| ONBOARD-07 | — | Pending |
| PAGE-01 | — | Pending |
| PAGE-02 | — | Pending |
| PAGE-03 | — | Pending |
| PAGE-04 | — | Pending |
| PAGE-05 | — | Pending |
| PAGE-06 | — | Pending |
| PAGE-07 | — | Pending |
| PAGE-08 | — | Pending |
| PAGE-09 | — | Pending |
| PAGE-10 | — | Pending |
| CUSTOM-01 | — | Pending |
| CUSTOM-02 | — | Pending |
| CUSTOM-03 | — | Pending |
| CUSTOM-04 | — | Pending |
| AVAIL-01 | — | Pending |
| AVAIL-02 | — | Pending |
| AVAIL-03 | — | Pending |
| VIS-01 | — | Pending |
| VIS-02 | — | Pending |
| BOOK-01 | — | Pending |
| BOOK-02 | — | Pending |
| BOOK-03 | — | Pending |
| BOOK-04 | — | Pending |
| BOOK-05 | — | Pending |
| BOOK-06 | — | Pending |
| STRIPE-01 | — | Pending |
| STRIPE-02 | — | Pending |
| STRIPE-03 | — | Pending |
| STRIPE-04 | — | Pending |
| STRIPE-05 | — | Pending |
| STRIPE-06 | — | Pending |
| STRIPE-07 | — | Pending |
| NOTIF-01 | — | Pending |
| NOTIF-02 | — | Pending |
| NOTIF-03 | — | Pending |
| NOTIF-04 | — | Pending |
| NOTIF-05 | — | Pending |
| NOTIF-06 | — | Pending |
| DASH-01 | — | Pending |
| DASH-02 | — | Pending |
| DASH-03 | — | Pending |
| DASH-04 | — | Pending |
| DASH-05 | — | Pending |
| DASH-06 | — | Pending |
| PARENT-01 | — | Pending |
| PARENT-02 | — | Pending |
| PARENT-03 | — | Pending |
| REVIEW-01 | — | Pending |
| REVIEW-02 | — | Pending |
| REVIEW-03 | — | Pending |

**Coverage:**
- v1 requirements: 57 total
- Mapped to phases: 0 (populated by roadmap)
- Unmapped: 57 ⚠️ (expected — roadmap not yet created)

---

*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after initial definition*
