---
estimated_steps: 87
estimated_files: 1
skills_used: []
---

# T01: Register M001 MVP capability requirements (59 entries)

Register all 59 M001 MVP capability requirements in the GSD database using `gsd_requirement_save`. No code changes — only GSD tool calls.

## Tool Pattern

For each requirement below, call `gsd_requirement_save` with:
- `class`: as specified per group (mostly "functional")
- `description`: from the Description column
- `why`: from the Why column (shared per group)
- `source`: "M001"
- `status`: "validated"
- `validation`: from the Validation column (shared per group)
- `primary_owner`: "M001"
- `notes`: "Legacy: {LEGACY-ID}"

IDs are auto-assigned by the tool (R006, R007, ...). Never provide an ID manually.

## Requirements to Register

### AUTH (2) — class: functional — why: "Core authentication for all users" — validation: "Auth signup/login + session persistence — verified via test suite and browser"
- AUTH-01: Sign up with email+password or Google SSO
- AUTH-02: Session persists across browser refresh

### ONBOARD (7) — class: functional — why: "Teacher onboarding enables profile creation" — validation: "Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified"
- ONBOARD-01: 3-step setup wizard with no payment to publish
- ONBOARD-02: Subject multi-select
- ONBOARD-03: Grade range multi-select
- ONBOARD-04: IANA timezone required
- ONBOARD-05: Weekly availability visual calendar
- ONBOARD-06: Hourly rate with local benchmarks
- ONBOARD-07: Shareable URL immediately on publish

### PAGE (10) — class: functional — why: "Public teacher profile is the core product surface" — validation: "Public profile with all display elements, mobile CTA, accent theming — browser verified"
- PAGE-01: Public page at /[slug]
- PAGE-02: Page displays name, photo/avatar, school, city/state
- PAGE-03: Credential bar with badge, experience, subjects, grades
- PAGE-04: Auto-generated bio fallback
- PAGE-05: Subjects, rate, availability calendar, reviews on page
- PAGE-06: Sticky Book Now CTA on mobile
- PAGE-07: Teacher's accent color applied throughout
- PAGE-08: Custom headline/tagline below name
- PAGE-09: Banner image at top
- PAGE-10: Social/contact links displayed

### CUSTOM (4) — class: functional — why: "Teacher personalization drives engagement" — validation: "Dashboard customization (color, tagline, banner, social links) — browser verified"
- CUSTOM-01: Accent color from preset palette
- CUSTOM-02: Custom headline/tagline
- CUSTOM-03: Social/contact links
- CUSTOM-04: Banner image upload

### AVAIL (3) — class: functional — why: "Availability is core to the booking flow" — validation: "Weekly availability CRUD + timezone-aware public display — unit tests + browser"
- AVAIL-01: View and edit weekly availability
- AVAIL-02: Time slots displayed on public page
- AVAIL-03: Auto-detect visitor timezone, convert times

### VIS (2) — class: functional — why: "Teachers need control over page visibility" — validation: "Active/Draft toggle + graceful hidden page state — unit tests + browser"
- VIS-01: Toggle page Active/Draft
- VIS-02: Hidden page shows graceful unavailable state

### BOOK (6) — class: functional — why: "Booking is the core transaction" — validation: "Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser"
- BOOK-01: Submit booking request (no payment, no account required)
- BOOK-02: Pending confirmation screen after request
- BOOK-03: Booking state machine: requested → pending → confirmed → completed → cancelled
- BOOK-04: Atomic booking creation, double-booking impossible
- BOOK-05: Direct booking when teacher has Stripe
- BOOK-06: Accept or decline bookings from dashboard

### STRIPE (7) — class: functional — why: "Payment processing enables revenue" — validation: "Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser"
- STRIPE-01: No Stripe required to publish or receive bookings
- STRIPE-02: 'Money waiting' notification with Stripe Connect CTA
- STRIPE-03: Stripe Connect Express onboarding
- STRIPE-04: 48hr auto-cancel for unconfirmed bookings
- STRIPE-05: Payment authorized at booking (manual capture)
- STRIPE-06: Mark complete triggers payment capture
- STRIPE-07: 7% platform fee on every captured payment

### NOTIF (6) — class: functional — why: "Notifications drive engagement and trust" — validation: "All 6 email notification types implemented via Resend — unit tests"
- NOTIF-01: Teacher email on booking request
- NOTIF-02: 24hr and 48hr follow-up emails if Stripe not connected
- NOTIF-03: Booking confirmation emails to both parties
- NOTIF-04: 24hr session reminder to both parties
- NOTIF-05: Cancellation notifications to both parties
- NOTIF-06: Session-complete email with review prompt

### DASH (6) — class: functional — why: "Dashboard is the teacher's operational hub" — validation: "Overview, requests, sessions, students, mark complete, page toggle — browser verified"
- DASH-01: View upcoming sessions
- DASH-02: View and action pending requests
- DASH-03: View earnings
- DASH-04: View student list
- DASH-05: Mark session complete
- DASH-06: Toggle page Active/Draft from dashboard (note: overlaps VIS-01, same capability from dashboard surface)

### PARENT (3) — class: functional — why: "Parent experience drives rebooking" — validation: "Account creation, booking history, rebook — browser verified"
- PARENT-01: Parent account creation
- PARENT-02: Parent booking history and upcoming
- PARENT-03: Rebook with same teacher

### REVIEW (3) — class: functional — why: "Reviews build social proof" — validation: "Submit review, display on profile, email prompt — tests + browser"
- REVIEW-01: 1-5 star rating and text review
- REVIEW-02: Reviews on public profile
- REVIEW-03: Review prompt via email

## Steps

1. Call `gsd_requirement_save` for each of the 59 requirements listed above, working through groups sequentially (AUTH → ONBOARD → PAGE → CUSTOM → AVAIL → VIS → BOOK → STRIPE → NOTIF → DASH → PARENT → REVIEW).
2. After all 59 calls complete, verify: `grep -c '^### ' .gsd/REQUIREMENTS.md` shows at least 74 entries (15 existing + 59 new).

## Inputs

- `.gsd/REQUIREMENTS.md`

## Expected Output

- `.gsd/REQUIREMENTS.md`

## Verification

grep -c '^### ' .gsd/REQUIREMENTS.md returns >= 74
