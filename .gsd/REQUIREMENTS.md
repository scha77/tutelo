# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R005 — REQUIREMENTS.md documents all 124+ validated capabilities from M001–M012 with stable IDs, ownership, and traceability table.
- Class: operability
- Status: active
- Description: REQUIREMENTS.md documents all 124+ validated capabilities from M001–M012 with stable IDs, ownership, and traceability table.
- Why it matters: The capability contract was hollowed out during M011 restructuring. Without it, there's no single source of truth for what the product can do.
- Source: user
- Primary owning slice: M013/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Rebuild from milestone summaries in PROJECT.md and .gsd/DECISIONS.md.

## Validated

### R001 — All test files pass with 0 failures. No mock drift, no stale assertions.
- Class: quality-attribute
- Status: validated
- Description: All test files pass with 0 failures. No mock drift, no stale assertions.
- Why it matters: A red test suite masks real regressions and erodes confidence in the verification layer.
- Source: execution
- Primary owning slice: M013/S01
- Supporting slices: M013/S03
- Validation: 48 test files pass, 470 tests pass, 0 failures. All 14 failures across 4 files (admin-dashboard, messaging, parent-phone-storage, recurring-charges) resolved via mock realignment. Verified by `npx vitest run` on 2026-04-07.
- Notes: Root causes were mock drift from M010-M012 code changes: (1) admin layout switched auth import chain, (2) conversations route refactored to batch query, (3) parent-phone-storage added slug revalidation, (4) recurring-charges idempotencyKey format changed.

### R002 — Sentry SDK captures client-side and server-side errors with stack traces, breadcrumbs, and source maps. Error boundaries report to Sentry before rendering fallback UI.
- Class: operability
- Status: validated
- Description: Sentry SDK captures client-side and server-side errors with stack traces, breadcrumbs, and source maps. Error boundaries report to Sentry before rendering fallback UI.
- Why it matters: Production errors are currently invisible unless a user reports them. Console.error is not monitoring.
- Source: user
- Primary owning slice: M013/S02
- Supporting slices: none
- Validation: Sentry SDK installed and initialized on client, server, and edge runtimes. Error boundaries (error.tsx, global-error.tsx) call Sentry.captureException in useEffect. Source maps configured with graceful fallback (errorHandler). sendDefaultPii: false for student data protection. tunnelRoute /monitoring for ad-blocker bypass. Build passes clean without SENTRY_AUTH_TOKEN. 470 tests pass with Sentry mocked.
- Notes: Free tier sufficient for current traffic. No PII in error payloads.

### R003 — Every catch block in production code either re-throws, reports to Sentry, or logs with structured context. No empty catch blocks, no catch-and-ignore patterns.
- Class: failure-visibility
- Status: validated
- Description: Every catch block in production code either re-throws, reports to Sentry, or logs with structured context. No empty catch blocks, no catch-and-ignore patterns.
- Why it matters: Silent failures are the hardest bugs to diagnose. A catch block without reporting is a hole in observability.
- Source: inferred
- Primary owning slice: M013/S02
- Supporting slices: none
- Validation: 44 catch blocks across 18 production files instrumented with Sentry.captureException. Fire-and-forget .catch(console.error) patterns upgraded to include Sentry. Known-safe catches (JSON parse guards, timezone fallbacks, cookie read-only, redirect throws) correctly left untouched. Catch block audit confirmed full coverage — no silent catch-and-ignore patterns remain.
- Notes: 46 catch blocks in production code. Audit each for appropriate error handling.

### R004 — All 45 it.todo() stubs in tests/ directory resolved — either deleted (if covered by src/__tests__/) or converted to real passing tests.
- Class: quality-attribute
- Status: validated
- Description: All 45 it.todo() stubs in tests/ directory resolved — either deleted (if covered by src/__tests__/) or converted to real passing tests.
- Why it matters: Orphaned stubs create false confidence about coverage and clutter the test report.
- Source: user
- Primary owning slice: M013/S03
- Supporting slices: none
- Validation: 52 test files, 490 tests pass, 0 it.todo(), 0 it.skip(), 0 failures. Verified by `npx vitest run` and `rg 'it\.(todo|skip)\('` on 2026-04-07. 7 pure-stub files deleted, 6 stubs removed from mixed files, 16 stubs converted to real passing tests, 4 skipped tests fixed.
- Notes: 11 test files with todo stubs across tests/bookings/, tests/stripe/, tests/auth/, tests/onboarding/, tests/unit/.

### R006 — Sign up with email+password or Google SSO
- Class: functional
- Status: validated
- Description: Sign up with email+password or Google SSO
- Why it matters: Core authentication for all users
- Source: M001
- Primary owning slice: M001
- Validation: Auth signup/login + session persistence — verified via test suite and browser
- Notes: Legacy: AUTH-01

### R007 — Session persists across browser refresh
- Class: functional
- Status: validated
- Description: Session persists across browser refresh
- Why it matters: Core authentication for all users
- Source: M001
- Primary owning slice: M001
- Validation: Auth signup/login + session persistence — verified via test suite and browser
- Notes: Legacy: AUTH-02

### R008 — 3-step setup wizard with no payment to publish
- Class: functional
- Status: validated
- Description: 3-step setup wizard with no payment to publish
- Why it matters: Teacher onboarding enables profile creation
- Source: M001
- Primary owning slice: M001
- Validation: Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified
- Notes: Legacy: ONBOARD-01

### R009 — Subject multi-select
- Class: functional
- Status: validated
- Description: Subject multi-select
- Why it matters: Teacher onboarding enables profile creation
- Source: M001
- Primary owning slice: M001
- Validation: Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified
- Notes: Legacy: ONBOARD-02

### R010 — Grade range multi-select
- Class: functional
- Status: validated
- Description: Grade range multi-select
- Why it matters: Teacher onboarding enables profile creation
- Source: M001
- Primary owning slice: M001
- Validation: Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified
- Notes: Legacy: ONBOARD-03

### R011 — IANA timezone required
- Class: functional
- Status: validated
- Description: IANA timezone required
- Why it matters: Teacher onboarding enables profile creation
- Source: M001
- Primary owning slice: M001
- Validation: Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified
- Notes: Legacy: ONBOARD-04

### R012 — Weekly availability visual calendar
- Class: functional
- Status: validated
- Description: Weekly availability visual calendar
- Why it matters: Teacher onboarding enables profile creation
- Source: M001
- Primary owning slice: M001
- Validation: Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified
- Notes: Legacy: ONBOARD-05

### R013 — Hourly rate with local benchmarks
- Class: functional
- Status: validated
- Description: Hourly rate with local benchmarks
- Why it matters: Teacher onboarding enables profile creation
- Source: M001
- Primary owning slice: M001
- Validation: Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified
- Notes: Legacy: ONBOARD-06

### R014 — Shareable URL immediately on publish
- Class: functional
- Status: validated
- Description: Shareable URL immediately on publish
- Why it matters: Teacher onboarding enables profile creation
- Source: M001
- Primary owning slice: M001
- Validation: Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified
- Notes: Legacy: ONBOARD-07

### R015 — Public page at /[slug]
- Class: functional
- Status: validated
- Description: Public page at /[slug]
- Why it matters: Public teacher profile is the core product surface
- Source: M001
- Primary owning slice: M001
- Validation: Public profile with all display elements, mobile CTA, accent theming — browser verified
- Notes: Legacy: PAGE-01

### R016 — Page displays name, photo/avatar, school, city/state
- Class: functional
- Status: validated
- Description: Page displays name, photo/avatar, school, city/state
- Why it matters: Public teacher profile is the core product surface
- Source: M001
- Primary owning slice: M001
- Validation: Public profile with all display elements, mobile CTA, accent theming — browser verified
- Notes: Legacy: PAGE-02

### R017 — Credential bar with badge, experience, subjects, grades
- Class: functional
- Status: validated
- Description: Credential bar with badge, experience, subjects, grades
- Why it matters: Public teacher profile is the core product surface
- Source: M001
- Primary owning slice: M001
- Validation: Public profile with all display elements, mobile CTA, accent theming — browser verified
- Notes: Legacy: PAGE-03

### R018 — Auto-generated bio fallback
- Class: functional
- Status: validated
- Description: Auto-generated bio fallback
- Why it matters: Public teacher profile is the core product surface
- Source: M001
- Primary owning slice: M001
- Validation: Public profile with all display elements, mobile CTA, accent theming — browser verified
- Notes: Legacy: PAGE-04

### R019 — Subjects, rate, availability calendar, reviews on page
- Class: functional
- Status: validated
- Description: Subjects, rate, availability calendar, reviews on page
- Why it matters: Public teacher profile is the core product surface
- Source: M001
- Primary owning slice: M001
- Validation: Public profile with all display elements, mobile CTA, accent theming — browser verified
- Notes: Legacy: PAGE-05

### R020 — Sticky Book Now CTA on mobile
- Class: functional
- Status: validated
- Description: Sticky Book Now CTA on mobile
- Why it matters: Public teacher profile is the core product surface
- Source: M001
- Primary owning slice: M001
- Validation: Public profile with all display elements, mobile CTA, accent theming — browser verified
- Notes: Legacy: PAGE-06

### R021 — Teacher's accent color applied throughout
- Class: functional
- Status: validated
- Description: Teacher's accent color applied throughout
- Why it matters: Public teacher profile is the core product surface
- Source: M001
- Primary owning slice: M001
- Validation: Public profile with all display elements, mobile CTA, accent theming — browser verified
- Notes: Legacy: PAGE-07

### R022 — Custom headline/tagline below name
- Class: functional
- Status: validated
- Description: Custom headline/tagline below name
- Why it matters: Public teacher profile is the core product surface
- Source: M001
- Primary owning slice: M001
- Validation: Public profile with all display elements, mobile CTA, accent theming — browser verified
- Notes: Legacy: PAGE-08

### R023 — Banner image at top
- Class: functional
- Status: validated
- Description: Banner image at top
- Why it matters: Public teacher profile is the core product surface
- Source: M001
- Primary owning slice: M001
- Validation: Public profile with all display elements, mobile CTA, accent theming — browser verified
- Notes: Legacy: PAGE-09

### R024 — Social/contact links displayed
- Class: functional
- Status: validated
- Description: Social/contact links displayed
- Why it matters: Public teacher profile is the core product surface
- Source: M001
- Primary owning slice: M001
- Validation: Public profile with all display elements, mobile CTA, accent theming — browser verified
- Notes: Legacy: PAGE-10

### R025 — Accent color from preset palette
- Class: functional
- Status: validated
- Description: Accent color from preset palette
- Why it matters: Teacher personalization drives engagement
- Source: M001
- Primary owning slice: M001
- Validation: Dashboard customization (color, tagline, banner, social links) — browser verified
- Notes: Legacy: CUSTOM-01

### R026 — Custom headline/tagline
- Class: functional
- Status: validated
- Description: Custom headline/tagline
- Why it matters: Teacher personalization drives engagement
- Source: M001
- Primary owning slice: M001
- Validation: Dashboard customization (color, tagline, banner, social links) — browser verified
- Notes: Legacy: CUSTOM-02

### R027 — Social/contact links
- Class: functional
- Status: validated
- Description: Social/contact links
- Why it matters: Teacher personalization drives engagement
- Source: M001
- Primary owning slice: M001
- Validation: Dashboard customization (color, tagline, banner, social links) — browser verified
- Notes: Legacy: CUSTOM-03

### R028 — Banner image upload
- Class: functional
- Status: validated
- Description: Banner image upload
- Why it matters: Teacher personalization drives engagement
- Source: M001
- Primary owning slice: M001
- Validation: Dashboard customization (color, tagline, banner, social links) — browser verified
- Notes: Legacy: CUSTOM-04

### R029 — View and edit weekly availability
- Class: functional
- Status: validated
- Description: View and edit weekly availability
- Why it matters: Availability is core to the booking flow
- Source: M001
- Primary owning slice: M001
- Validation: Weekly availability CRUD + timezone-aware public display — unit tests + browser
- Notes: Legacy: AVAIL-01

### R030 — Time slots displayed on public page
- Class: functional
- Status: validated
- Description: Time slots displayed on public page
- Why it matters: Availability is core to the booking flow
- Source: M001
- Primary owning slice: M001
- Validation: Weekly availability CRUD + timezone-aware public display — unit tests + browser
- Notes: Legacy: AVAIL-02

### R031 — Auto-detect visitor timezone, convert times
- Class: functional
- Status: validated
- Description: Auto-detect visitor timezone, convert times
- Why it matters: Availability is core to the booking flow
- Source: M001
- Primary owning slice: M001
- Validation: Weekly availability CRUD + timezone-aware public display — unit tests + browser
- Notes: Legacy: AVAIL-03

### R032 — Toggle page Active/Draft
- Class: functional
- Status: validated
- Description: Toggle page Active/Draft
- Why it matters: Teachers need control over page visibility
- Source: M001
- Primary owning slice: M001
- Validation: Active/Draft toggle + graceful hidden page state — unit tests + browser
- Notes: Legacy: VIS-01

### R033 — Hidden page shows graceful unavailable state
- Class: functional
- Status: validated
- Description: Hidden page shows graceful unavailable state
- Why it matters: Teachers need control over page visibility
- Source: M001
- Primary owning slice: M001
- Validation: Active/Draft toggle + graceful hidden page state — unit tests + browser
- Notes: Legacy: VIS-02

### R034 — Submit booking request (no payment, no account required)
- Class: functional
- Status: validated
- Description: Submit booking request (no payment, no account required)
- Why it matters: Booking is the core transaction
- Source: M001
- Primary owning slice: M001
- Validation: Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser
- Notes: Legacy: BOOK-01

### R035 — Pending confirmation screen after request
- Class: functional
- Status: validated
- Description: Pending confirmation screen after request
- Why it matters: Booking is the core transaction
- Source: M001
- Primary owning slice: M001
- Validation: Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser
- Notes: Legacy: BOOK-02

### R036 — Booking state machine: requested → pending → confirmed → completed → cancelled
- Class: functional
- Status: validated
- Description: Booking state machine: requested → pending → confirmed → completed → cancelled
- Why it matters: Booking is the core transaction
- Source: M001
- Primary owning slice: M001
- Validation: Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser
- Notes: Legacy: BOOK-03

### R037 — Atomic booking creation, double-booking impossible
- Class: functional
- Status: validated
- Description: Atomic booking creation, double-booking impossible
- Why it matters: Booking is the core transaction
- Source: M001
- Primary owning slice: M001
- Validation: Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser
- Notes: Legacy: BOOK-04

### R038 — Direct booking when teacher has Stripe
- Class: functional
- Status: validated
- Description: Direct booking when teacher has Stripe
- Why it matters: Booking is the core transaction
- Source: M001
- Primary owning slice: M001
- Validation: Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser
- Notes: Legacy: BOOK-05

### R039 — Accept or decline bookings from dashboard
- Class: functional
- Status: validated
- Description: Accept or decline bookings from dashboard
- Why it matters: Booking is the core transaction
- Source: M001
- Primary owning slice: M001
- Validation: Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser
- Notes: Legacy: BOOK-06

### R040 — No Stripe required to publish or receive bookings
- Class: functional
- Status: validated
- Description: No Stripe required to publish or receive bookings
- Why it matters: Payment processing enables revenue
- Source: M001
- Primary owning slice: M001
- Validation: Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser
- Notes: Legacy: STRIPE-01

### R041 — 'Money waiting' notification with Stripe Connect CTA
- Class: functional
- Status: validated
- Description: 'Money waiting' notification with Stripe Connect CTA
- Why it matters: Payment processing enables revenue
- Source: M001
- Primary owning slice: M001
- Validation: Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser
- Notes: Legacy: STRIPE-02

### R042 — Stripe Connect Express onboarding
- Class: functional
- Status: validated
- Description: Stripe Connect Express onboarding
- Why it matters: Payment processing enables revenue
- Source: M001
- Primary owning slice: M001
- Validation: Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser
- Notes: Legacy: STRIPE-03

### R043 — 48hr auto-cancel for unconfirmed bookings
- Class: functional
- Status: validated
- Description: 48hr auto-cancel for unconfirmed bookings
- Why it matters: Payment processing enables revenue
- Source: M001
- Primary owning slice: M001
- Validation: Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser
- Notes: Legacy: STRIPE-04

### R044 — Payment authorized at booking (manual capture)
- Class: functional
- Status: validated
- Description: Payment authorized at booking (manual capture)
- Why it matters: Payment processing enables revenue
- Source: M001
- Primary owning slice: M001
- Validation: Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser
- Notes: Legacy: STRIPE-05

### R045 — Mark complete triggers payment capture
- Class: functional
- Status: validated
- Description: Mark complete triggers payment capture
- Why it matters: Payment processing enables revenue
- Source: M001
- Primary owning slice: M001
- Validation: Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser
- Notes: Legacy: STRIPE-06

### R046 — 7% platform fee on every captured payment
- Class: functional
- Status: validated
- Description: 7% platform fee on every captured payment
- Why it matters: Payment processing enables revenue
- Source: M001
- Primary owning slice: M001
- Validation: Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser
- Notes: Legacy: STRIPE-07

### R047 — Teacher email on booking request
- Class: functional
- Status: validated
- Description: Teacher email on booking request
- Why it matters: Notifications drive engagement and trust
- Source: M001
- Primary owning slice: M001
- Validation: All 6 email notification types implemented via Resend — unit tests
- Notes: Legacy: NOTIF-01

### R048 — 24hr and 48hr follow-up emails if Stripe not connected
- Class: functional
- Status: validated
- Description: 24hr and 48hr follow-up emails if Stripe not connected
- Why it matters: Notifications drive engagement and trust
- Source: M001
- Primary owning slice: M001
- Validation: All 6 email notification types implemented via Resend — unit tests
- Notes: Legacy: NOTIF-02

### R049 — Booking confirmation emails to both parties
- Class: functional
- Status: validated
- Description: Booking confirmation emails to both parties
- Why it matters: Notifications drive engagement and trust
- Source: M001
- Primary owning slice: M001
- Validation: All 6 email notification types implemented via Resend — unit tests
- Notes: Legacy: NOTIF-03

### R050 — 24hr session reminder to both parties
- Class: functional
- Status: validated
- Description: 24hr session reminder to both parties
- Why it matters: Notifications drive engagement and trust
- Source: M001
- Primary owning slice: M001
- Validation: All 6 email notification types implemented via Resend — unit tests
- Notes: Legacy: NOTIF-04

### R051 — Cancellation notifications to both parties
- Class: functional
- Status: validated
- Description: Cancellation notifications to both parties
- Why it matters: Notifications drive engagement and trust
- Source: M001
- Primary owning slice: M001
- Validation: All 6 email notification types implemented via Resend — unit tests
- Notes: Legacy: NOTIF-05

### R052 — Session-complete email with review prompt
- Class: functional
- Status: validated
- Description: Session-complete email with review prompt
- Why it matters: Notifications drive engagement and trust
- Source: M001
- Primary owning slice: M001
- Validation: All 6 email notification types implemented via Resend — unit tests
- Notes: Legacy: NOTIF-06

### R053 — View upcoming sessions
- Class: functional
- Status: validated
- Description: View upcoming sessions
- Why it matters: Dashboard is the teacher's operational hub
- Source: M001
- Primary owning slice: M001
- Validation: Overview, requests, sessions, students, mark complete, page toggle — browser verified
- Notes: Legacy: DASH-01

### R054 — View and action pending requests
- Class: functional
- Status: validated
- Description: View and action pending requests
- Why it matters: Dashboard is the teacher's operational hub
- Source: M001
- Primary owning slice: M001
- Validation: Overview, requests, sessions, students, mark complete, page toggle — browser verified
- Notes: Legacy: DASH-02

### R055 — View earnings
- Class: functional
- Status: validated
- Description: View earnings
- Why it matters: Dashboard is the teacher's operational hub
- Source: M001
- Primary owning slice: M001
- Validation: Overview, requests, sessions, students, mark complete, page toggle — browser verified
- Notes: Legacy: DASH-03

### R056 — View student list
- Class: functional
- Status: validated
- Description: View student list
- Why it matters: Dashboard is the teacher's operational hub
- Source: M001
- Primary owning slice: M001
- Validation: Overview, requests, sessions, students, mark complete, page toggle — browser verified
- Notes: Legacy: DASH-04

### R057 — Mark session complete
- Class: functional
- Status: validated
- Description: Mark session complete
- Why it matters: Dashboard is the teacher's operational hub
- Source: M001
- Primary owning slice: M001
- Validation: Overview, requests, sessions, students, mark complete, page toggle — browser verified
- Notes: Legacy: DASH-05

### R058 — Toggle page Active/Draft from dashboard
- Class: functional
- Status: validated
- Description: Toggle page Active/Draft from dashboard
- Why it matters: Dashboard is the teacher's operational hub
- Source: M001
- Primary owning slice: M001
- Validation: Overview, requests, sessions, students, mark complete, page toggle — browser verified
- Notes: Legacy: DASH-06. Overlaps VIS-01 — same capability from dashboard surface.

### R059 — Parent account creation
- Class: functional
- Status: validated
- Description: Parent account creation
- Why it matters: Parent experience drives rebooking
- Source: M001
- Primary owning slice: M001
- Validation: Account creation, booking history, rebook — browser verified
- Notes: Legacy: PARENT-01

### R060 — Parent booking history and upcoming
- Class: functional
- Status: validated
- Description: Parent booking history and upcoming
- Why it matters: Parent experience drives rebooking
- Source: M001
- Primary owning slice: M001
- Validation: Account creation, booking history, rebook — browser verified
- Notes: Legacy: PARENT-02

### R061 — Rebook with same teacher
- Class: functional
- Status: validated
- Description: Rebook with same teacher
- Why it matters: Parent experience drives rebooking
- Source: M001
- Primary owning slice: M001
- Validation: Account creation, booking history, rebook — browser verified
- Notes: Legacy: PARENT-03

### R062 — 1-5 star rating and text review
- Class: functional
- Status: validated
- Description: 1-5 star rating and text review
- Why it matters: Reviews build social proof
- Source: M001
- Primary owning slice: M001
- Validation: Submit review, display on profile, email prompt — tests + browser
- Notes: Legacy: REVIEW-01

### R063 — Reviews on public profile
- Class: functional
- Status: validated
- Description: Reviews on public profile
- Why it matters: Reviews build social proof
- Source: M001
- Primary owning slice: M001
- Validation: Submit review, display on profile, email prompt — tests + browser
- Notes: Legacy: REVIEW-02

### R064 — Review prompt via email
- Class: functional
- Status: validated
- Description: Review prompt via email
- Why it matters: Reviews build social proof
- Source: M001
- Primary owning slice: M001
- Validation: Submit review, display on profile, email prompt — tests + browser
- Notes: Legacy: REVIEW-03

### R065 — Reviews on public profile
- Class: functional
- Status: validated
- Description: Reviews on public profile
- Why it matters: Reviews build social proof
- Source: M001
- Primary owning slice: M001
- Validation: Submit review, display on profile, email prompt — tests + browser
- Notes: Legacy: REVIEW-02

### UI-01 — Untitled
- Status: validated
- Validation: Validated by M011/S01 — HeroSection, CredentialsBar, ReviewsSection, AboutSection all rebuilt with premium visual treatment. Two-row CredentialsBar layout, taller hero banner with ring-inset avatar, inline SVG star ratings, dynamic --accent color throughout. Build passes.

### UI-02 — Untitled
- Status: validated
- Validation: Validated by M011/S02 — BookingCalendar decomposed into BookingForm, SessionTypeSelector, CalendarGrid, TimeSlotsPanel sub-components. All booking paths (direct, recurring, deferred) confirmed functional. Build passes.

### UI-03 — Untitled
- Status: validated
- Validation: Validated by M011/S03 — MobileBottomNav rebuilt with 4 labeled primary tabs + More panel. ParentMobileNav confirmed with visible text-[10px] labels on all 5 tabs. Build passes.

### UI-04 — Untitled
- Status: validated
- Validation: Validated by M011/S04 — All 11 teacher dashboard pages upgraded: premium card standard (rounded-xl border bg-card shadow-sm), avatar initial circles, empty state pattern, color-mix tinting, tracking-tight headers. Build passes.

### UI-05 — Untitled
- Status: validated
- Validation: Validated by M011/S04 — All 5 parent dashboard pages upgraded with same premium card standard as teacher dashboard. Build passes.

### UI-06 — Untitled
- Status: validated
- Validation: Validated by M011/S05 — Landing page tightening pass applied. SocialLinks always renders attribution footer regardless of teacher social links.

### UI-07 — Untitled
- Status: validated
- Validation: Validated by M011 overall — KNOWLEDGE.md documents Premium Dashboard Card Standard, Avatar Initial Circle Pattern, color-mix canonical tinting, and Premium Page Header Pattern applied consistently across all surfaces. Build passes.

### UI-08 — Untitled
- Status: validated
- Validation: Validated by M011 — All surfaces use bespoke Tutelo patterns (color-mix tinting, tracking-tight headers, custom empty states, avatar circles). No default shadcn/ui spacing or generic template patterns visible.

### UI-09 — Untitled
- Status: validated
- Validation: Validated by M011 + post-M011 perf work — nav lag eliminated (template.tsx removed, auth dedup, loading skeletons on all pages), all icons labeled, no mystery affordances. Consistent across teacher and parent surfaces.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| PERF-02 |  | partially-advanced | none | none | Partial: /tutors/[category] confirmed ISR in build output (● 1h). /tutors correctly dynamic (searchParams Next.js constraint, D059). supabaseAdmin in place, revalidation wiring complete, ready for client-side filtering pivot. M012 complete. |
| R001 | quality-attribute | validated | M013/S01 | M013/S03 | 48 test files pass, 470 tests pass, 0 failures. All 14 failures across 4 files (admin-dashboard, messaging, parent-phone-storage, recurring-charges) resolved via mock realignment. Verified by `npx vitest run` on 2026-04-07. |
| R002 | operability | validated | M013/S02 | none | Sentry SDK installed and initialized on client, server, and edge runtimes. Error boundaries (error.tsx, global-error.tsx) call Sentry.captureException in useEffect. Source maps configured with graceful fallback (errorHandler). sendDefaultPii: false for student data protection. tunnelRoute /monitoring for ad-blocker bypass. Build passes clean without SENTRY_AUTH_TOKEN. 470 tests pass with Sentry mocked. |
| R003 | failure-visibility | validated | M013/S02 | none | 44 catch blocks across 18 production files instrumented with Sentry.captureException. Fire-and-forget .catch(console.error) patterns upgraded to include Sentry. Known-safe catches (JSON parse guards, timezone fallbacks, cookie read-only, redirect throws) correctly left untouched. Catch block audit confirmed full coverage — no silent catch-and-ignore patterns remain. |
| R004 | quality-attribute | validated | M013/S03 | none | 52 test files, 490 tests pass, 0 it.todo(), 0 it.skip(), 0 failures. Verified by `npx vitest run` and `rg 'it\.(todo|skip)\('` on 2026-04-07. 7 pure-stub files deleted, 6 stubs removed from mixed files, 16 stubs converted to real passing tests, 4 skipped tests fixed. |
| R005 | operability | active | M013/S04 | none | unmapped |
| R006 | functional | validated | M001 | none | Auth signup/login + session persistence — verified via test suite and browser |
| R007 | functional | validated | M001 | none | Auth signup/login + session persistence — verified via test suite and browser |
| R008 | functional | validated | M001 | none | Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified |
| R009 | functional | validated | M001 | none | Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified |
| R010 | functional | validated | M001 | none | Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified |
| R011 | functional | validated | M001 | none | Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified |
| R012 | functional | validated | M001 | none | Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified |
| R013 | functional | validated | M001 | none | Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified |
| R014 | functional | validated | M001 | none | Complete wizard flow with all fields, no-Stripe publish, shareable URL — browser verified |
| R015 | functional | validated | M001 | none | Public profile with all display elements, mobile CTA, accent theming — browser verified |
| R016 | functional | validated | M001 | none | Public profile with all display elements, mobile CTA, accent theming — browser verified |
| R017 | functional | validated | M001 | none | Public profile with all display elements, mobile CTA, accent theming — browser verified |
| R018 | functional | validated | M001 | none | Public profile with all display elements, mobile CTA, accent theming — browser verified |
| R019 | functional | validated | M001 | none | Public profile with all display elements, mobile CTA, accent theming — browser verified |
| R020 | functional | validated | M001 | none | Public profile with all display elements, mobile CTA, accent theming — browser verified |
| R021 | functional | validated | M001 | none | Public profile with all display elements, mobile CTA, accent theming — browser verified |
| R022 | functional | validated | M001 | none | Public profile with all display elements, mobile CTA, accent theming — browser verified |
| R023 | functional | validated | M001 | none | Public profile with all display elements, mobile CTA, accent theming — browser verified |
| R024 | functional | validated | M001 | none | Public profile with all display elements, mobile CTA, accent theming — browser verified |
| R025 | functional | validated | M001 | none | Dashboard customization (color, tagline, banner, social links) — browser verified |
| R026 | functional | validated | M001 | none | Dashboard customization (color, tagline, banner, social links) — browser verified |
| R027 | functional | validated | M001 | none | Dashboard customization (color, tagline, banner, social links) — browser verified |
| R028 | functional | validated | M001 | none | Dashboard customization (color, tagline, banner, social links) — browser verified |
| R029 | functional | validated | M001 | none | Weekly availability CRUD + timezone-aware public display — unit tests + browser |
| R030 | functional | validated | M001 | none | Weekly availability CRUD + timezone-aware public display — unit tests + browser |
| R031 | functional | validated | M001 | none | Weekly availability CRUD + timezone-aware public display — unit tests + browser |
| R032 | functional | validated | M001 | none | Active/Draft toggle + graceful hidden page state — unit tests + browser |
| R033 | functional | validated | M001 | none | Active/Draft toggle + graceful hidden page state — unit tests + browser |
| R034 | functional | validated | M001 | none | Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser |
| R035 | functional | validated | M001 | none | Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser |
| R036 | functional | validated | M001 | none | Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser |
| R037 | functional | validated | M001 | none | Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser |
| R038 | functional | validated | M001 | none | Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser |
| R039 | functional | validated | M001 | none | Request flow, direct flow, state machine, atomic creation, accept/decline — tests + browser |
| R040 | functional | validated | M001 | none | Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser |
| R041 | functional | validated | M001 | none | Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser |
| R042 | functional | validated | M001 | none | Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser |
| R043 | functional | validated | M001 | none | Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser |
| R044 | functional | validated | M001 | none | Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser |
| R045 | functional | validated | M001 | none | Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser |
| R046 | functional | validated | M001 | none | Deferred Connect, 48hr cancel, auth/capture, 7% fee, status filter — tests + browser |
| R047 | functional | validated | M001 | none | All 6 email notification types implemented via Resend — unit tests |
| R048 | functional | validated | M001 | none | All 6 email notification types implemented via Resend — unit tests |
| R049 | functional | validated | M001 | none | All 6 email notification types implemented via Resend — unit tests |
| R050 | functional | validated | M001 | none | All 6 email notification types implemented via Resend — unit tests |
| R051 | functional | validated | M001 | none | All 6 email notification types implemented via Resend — unit tests |
| R052 | functional | validated | M001 | none | All 6 email notification types implemented via Resend — unit tests |
| R053 | functional | validated | M001 | none | Overview, requests, sessions, students, mark complete, page toggle — browser verified |
| R054 | functional | validated | M001 | none | Overview, requests, sessions, students, mark complete, page toggle — browser verified |
| R055 | functional | validated | M001 | none | Overview, requests, sessions, students, mark complete, page toggle — browser verified |
| R056 | functional | validated | M001 | none | Overview, requests, sessions, students, mark complete, page toggle — browser verified |
| R057 | functional | validated | M001 | none | Overview, requests, sessions, students, mark complete, page toggle — browser verified |
| R058 | functional | validated | M001 | none | Overview, requests, sessions, students, mark complete, page toggle — browser verified |
| R059 | functional | validated | M001 | none | Account creation, booking history, rebook — browser verified |
| R060 | functional | validated | M001 | none | Account creation, booking history, rebook — browser verified |
| R061 | functional | validated | M001 | none | Account creation, booking history, rebook — browser verified |
| R062 | functional | validated | M001 | none | Submit review, display on profile, email prompt — tests + browser |
| R063 | functional | validated | M001 | none | Submit review, display on profile, email prompt — tests + browser |
| R064 | functional | validated | M001 | none | Submit review, display on profile, email prompt — tests + browser |
| R065 | functional | validated | M001 | none | Submit review, display on profile, email prompt — tests + browser |
| UI-01 |  | validated | none | none | Validated by M011/S01 — HeroSection, CredentialsBar, ReviewsSection, AboutSection all rebuilt with premium visual treatment. Two-row CredentialsBar layout, taller hero banner with ring-inset avatar, inline SVG star ratings, dynamic --accent color throughout. Build passes. |
| UI-02 |  | validated | none | none | Validated by M011/S02 — BookingCalendar decomposed into BookingForm, SessionTypeSelector, CalendarGrid, TimeSlotsPanel sub-components. All booking paths (direct, recurring, deferred) confirmed functional. Build passes. |
| UI-03 |  | validated | none | none | Validated by M011/S03 — MobileBottomNav rebuilt with 4 labeled primary tabs + More panel. ParentMobileNav confirmed with visible text-[10px] labels on all 5 tabs. Build passes. |
| UI-04 |  | validated | none | none | Validated by M011/S04 — All 11 teacher dashboard pages upgraded: premium card standard (rounded-xl border bg-card shadow-sm), avatar initial circles, empty state pattern, color-mix tinting, tracking-tight headers. Build passes. |
| UI-05 |  | validated | none | none | Validated by M011/S04 — All 5 parent dashboard pages upgraded with same premium card standard as teacher dashboard. Build passes. |
| UI-06 |  | validated | none | none | Validated by M011/S05 — Landing page tightening pass applied. SocialLinks always renders attribution footer regardless of teacher social links. |
| UI-07 |  | validated | none | none | Validated by M011 overall — KNOWLEDGE.md documents Premium Dashboard Card Standard, Avatar Initial Circle Pattern, color-mix canonical tinting, and Premium Page Header Pattern applied consistently across all surfaces. Build passes. |
| UI-08 |  | validated | none | none | Validated by M011 — All surfaces use bespoke Tutelo patterns (color-mix tinting, tracking-tight headers, custom empty states, avatar circles). No default shadcn/ui spacing or generic template patterns visible. |
| UI-09 |  | validated | none | none | Validated by M011 + post-M011 perf work — nav lag eliminated (template.tsx removed, auth dedup, loading skeletons on all pages), all icons labeled, no mystery affordances. Consistent across teacher and parent surfaces. |

## Coverage Summary

- Active requirements: 1
- Mapped to slices: 1
- Validated: 73 (R001, R002, R003, R004, R006, R007, R008, R009, R010, R011, R012, R013, R014, R015, R016, R017, R018, R019, R020, R021, R022, R023, R024, R025, R026, R027, R028, R029, R030, R031, R032, R033, R034, R035, R036, R037, R038, R039, R040, R041, R042, R043, R044, R045, R046, R047, R048, R049, R050, R051, R052, R053, R054, R055, R056, R057, R058, R059, R060, R061, R062, R063, R064, R065, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09)
- Unmapped active requirements: 0
