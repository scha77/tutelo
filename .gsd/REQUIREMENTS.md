# Requirements

This file is the explicit capability and coverage contract for the project.

## Validated

### R001 — All test files pass with 0 failures. No mock drift, no stale assertions.
- Class: quality-attribute
- Status: validated
- Description: All test files pass with 0 failures. No mock drift, no stale assertions.
- Why it matters: A red test suite masks real regressions and erodes confidence in the verification layer.
- Source: execution
- Primary owning slice: M013/S01
- Supporting slices: M013/S03
- Validation: npx vitest run: 52 files, 490 tests, 0 failures. All 14 mock-drift failures resolved in M013/S01.
- Notes: Root causes were mock drift from M010-M012 code changes: (1) admin layout switched auth import chain, (2) conversations route refactored to batch query, (3) parent-phone-storage added slug revalidation, (4) recurring-charges idempotencyKey format changed.

### R002 — Sentry SDK captures client-side and server-side errors with stack traces, breadcrumbs, and source maps. Error boundaries report to Sentry before rendering fallback UI.
- Class: operability
- Status: validated
- Description: Sentry SDK captures client-side and server-side errors with stack traces, breadcrumbs, and source maps. Error boundaries report to Sentry before rendering fallback UI.
- Why it matters: Production errors are currently invisible unless a user reports them. Console.error is not monitoring.
- Source: user
- Primary owning slice: M013/S02
- Supporting slices: none
- Validation: Sentry SDK initialized on client/server/edge. Error boundaries call captureException. Source maps configured with errorHandler fallback. sendDefaultPii: false. 44 catch blocks instrumented in M013/S02.
- Notes: Free tier sufficient for current traffic. No PII in error payloads.

### R003 — Every catch block in production code either re-throws, reports to Sentry, or logs with structured context. No empty catch blocks, no catch-and-ignore patterns.
- Class: failure-visibility
- Status: validated
- Description: Every catch block in production code either re-throws, reports to Sentry, or logs with structured context. No empty catch blocks, no catch-and-ignore patterns.
- Why it matters: Silent failures are the hardest bugs to diagnose. A catch block without reporting is a hole in observability.
- Source: inferred
- Primary owning slice: M013/S02
- Supporting slices: none
- Validation: 44 catch blocks instrumented across 18 files. Catch block audit confirms no silent catch-and-ignore patterns. Fire-and-forget patterns upgraded. Validated in M013/S02.
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

### R005 — REQUIREMENTS.md documents all 124+ validated capabilities from M001–M012 with stable IDs, ownership, and traceability table.
- Class: operability
- Status: validated
- Description: REQUIREMENTS.md documents all 124+ validated capabilities from M001–M012 with stable IDs, ownership, and traceability table.
- Why it matters: The capability contract was hollowed out during M011 restructuring. Without it, there's no single source of truth for what the product can do.
- Source: user
- Primary owning slice: M013/S04
- Supporting slices: none
- Validation: REQUIREMENTS.md contains 151 entries with stable IDs, ownership traceability, and coverage summary. All M001–M012 capabilities documented.
- Notes: Rebuild from milestone summaries in PROJECT.md and .gsd/DECISIONS.md.

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

### R066 — Review prompt via email
- Class: functional
- Status: validated
- Description: Review prompt via email
- Why it matters: Reviews build social proof
- Source: M001
- Primary owning slice: M001
- Validation: Submit review, display on profile, email prompt — tests + browser
- Notes: Legacy: REVIEW-03

### R067 — Marketing landing page (hero, how-it-works, problem/solution, CTA)
- Class: functional
- Status: validated
- Description: Marketing landing page (hero, how-it-works, problem/solution, CTA)
- Why it matters: Marketing landing page drives teacher signups
- Source: M003
- Primary owning slice: M003
- Validation: Marketing landing page with hero, how-it-works, problem/solution, CTA
- Notes: Legacy: LAND-01

### R068 — Interactive teacher page mock on landing
- Class: functional
- Status: validated
- Description: Interactive teacher page mock on landing
- Why it matters: Marketing landing page drives teacher signups
- Source: M003
- Primary owning slice: M003
- Validation: Interactive TeacherMockSection with hover/transition effects
- Notes: Legacy: LAND-02

### R069 — 'Start your page' CTA links to /login
- Class: functional
- Status: validated
- Description: 'Start your page' CTA links to /login
- Why it matters: Marketing landing page drives teacher signups
- Source: M003
- Primary owning slice: M003
- Validation: Start your page CTA links to /login
- Notes: Legacy: LAND-03

### R070 — Brand palette + logo in navigation
- Class: functional
- Status: validated
- Description: Brand palette + logo in navigation
- Why it matters: Marketing landing page drives teacher signups
- Source: M003
- Primary owning slice: M003
- Validation: Brand palette applied; logo in all nav surfaces
- Notes: Legacy: LAND-04

### R071 — Shareable slug URLs in landing copy
- Class: functional
- Status: validated
- Description: Shareable slug URLs in landing copy
- Why it matters: Marketing landing page drives teacher signups
- Source: M003
- Primary owning slice: M003
- Validation: Shareable slug URLs showcased in multiple landing sections
- Notes: Legacy: LAND-05

### R072 — Scroll-triggered reveals on landing sections
- Class: quality-attribute
- Status: validated
- Description: Scroll-triggered reveals on landing sections
- Why it matters: Animations add polish and perceived quality
- Source: M003
- Primary owning slice: M003
- Validation: Scroll-triggered reveals on all landing sections
- Notes: Legacy: ANIM-01

### R073 — Route transitions via template.tsx
- Class: quality-attribute
- Status: validated
- Description: Route transitions via template.tsx
- Why it matters: Animations add polish and perceived quality
- Source: M003
- Primary owning slice: M003
- Validation: Route transitions via template.tsx + PageTransition
- Notes: Legacy: ANIM-02

### R074 — Onboarding step directional slides
- Class: quality-attribute
- Status: validated
- Description: Onboarding step directional slides
- Why it matters: Animations add polish and perceived quality
- Source: M003
- Primary owning slice: M003
- Validation: Onboarding step directional slides
- Notes: Legacy: ANIM-03

### R075 — Dashboard card/list stagger animations
- Class: quality-attribute
- Status: validated
- Description: Dashboard card/list stagger animations
- Why it matters: Animations add polish and perceived quality
- Source: M003
- Primary owning slice: M003
- Validation: Dashboard card/list stagger animations
- Notes: Legacy: ANIM-04

### R076 — Teacher profile section sequential fades
- Class: quality-attribute
- Status: validated
- Description: Teacher profile section sequential fades
- Why it matters: Animations add polish and perceived quality
- Source: M003
- Primary owning slice: M003
- Validation: Teacher profile section sequential fades
- Notes: Legacy: ANIM-05

### R077 — Micro-interaction press/hover on CTAs
- Class: quality-attribute
- Status: validated
- Description: Micro-interaction press/hover on CTAs
- Why it matters: Animations add polish and perceived quality
- Source: M003
- Primary owning slice: M003
- Validation: Micro-interaction press/hover on primary CTAs
- Notes: Legacy: ANIM-06

### R078 — Mobile bottom tab bar for dashboard
- Class: functional
- Status: validated
- Description: Mobile bottom tab bar for dashboard
- Why it matters: Mobile-first dashboard navigation
- Source: M003
- Primary owning slice: M003
- Validation: Bottom tab bar on mobile, all 7 tabs functional
- Notes: Legacy: MOBILE-01

### R079 — Global brand palette, teacher accent preserved
- Class: quality-attribute
- Status: validated
- Description: Global brand palette, teacher accent preserved
- Why it matters: Visual brand consistency
- Source: M003
- Primary owning slice: M003
- Validation: Global brand palette, teacher accent color preserved
- Notes: Legacy: BRAND-01

### R080 — Logo in NavBar, Sidebar, MobileHeader
- Class: quality-attribute
- Status: validated
- Description: Logo in NavBar, Sidebar, MobileHeader
- Why it matters: Visual brand consistency
- Source: M003
- Primary owning slice: M003
- Validation: Logo in NavBar, Sidebar, MobileHeader
- Notes: Legacy: BRAND-02

### R081 — Dynamic OG tags + 1200x630 image per teacher
- Class: non-functional
- Status: validated
- Description: Dynamic OG tags + 1200x630 image per teacher
- Why it matters: Discoverability and social sharing
- Source: M003
- Primary owning slice: M003
- Validation: Dynamic OG tags + 1200x630 image per teacher
- Notes: Legacy: SEO-01

### R082 — Landing page OG meta tags
- Class: non-functional
- Status: validated
- Description: Landing page OG meta tags
- Why it matters: Discoverability and social sharing
- Source: M003
- Primary owning slice: M003
- Validation: Landing page OG meta tags
- Notes: Legacy: SEO-02

### R083 — social_email auto-populated from auth email
- Class: functional
- Status: validated
- Description: social_email auto-populated from auth email
- Why it matters: Data integrity for teacher contact
- Source: M003
- Primary owning slice: M003
- Validation: social_email auto-populated from auth email
- Notes: Legacy: FIX-01

### R084 — 5-minute granularity availability editor
- Class: functional
- Status: validated
- Description: 5-minute granularity availability editor
- Why it matters: Advanced scheduling precision
- Source: M004
- Primary owning slice: M004
- Validation: Validated in M004 — 5-minute granularity availability editor
- Notes: Legacy: AVAIL-04

### R085 — Per-date availability overrides
- Class: functional
- Status: validated
- Description: Per-date availability overrides
- Why it matters: Advanced scheduling precision
- Source: M004
- Primary owning slice: M004
- Validation: Validated in M004 — per-date availability overrides
- Notes: Legacy: AVAIL-05

### R086 — Future-date planning via overrides
- Class: functional
- Status: validated
- Description: Future-date planning via overrides
- Why it matters: Advanced scheduling precision
- Source: M004
- Primary owning slice: M004
- Validation: Validated in M004 — future-date planning via overrides
- Notes: Legacy: AVAIL-06

### R087 — Time-range picker editor rewrite
- Class: functional
- Status: validated
- Description: Time-range picker editor rewrite
- Why it matters: Advanced scheduling precision
- Source: M004
- Primary owning slice: M004
- Validation: Validated in M004 — time-range picker editor rewrite
- Notes: Legacy: AVAIL-07

### R088 — Session cancellation with Stripe void + email
- Class: functional
- Status: validated
- Description: Session cancellation with Stripe void + email
- Why it matters: Clean session cancellation flow
- Source: M004
- Primary owning slice: M004
- Validation: Validated in M004 — session cancellation with Stripe void + email
- Notes: Legacy: CANCEL-01

### R089 — School email verification flow (OTP token → email → callback → verified_at stamp)
- Class: functional
- Status: validated
- Description: School email verification flow (OTP token → email → callback → verified_at stamp)
- Why it matters: Trust signal for parents
- Source: M005
- Primary owning slice: M005
- Validation: Validated in M005 — school email verification flow with OTP
- Notes: Legacy: VERIFY-01

### R090 — CredentialsBar badge gated on verified_at
- Class: functional
- Status: validated
- Description: CredentialsBar badge gated on verified_at
- Why it matters: Trust signal for parents
- Source: M005
- Primary owning slice: M005
- Validation: Validated in M005 — CredentialsBar badge gated on verified_at
- Notes: Legacy: VERIFY-02

### R091 — SMS session reminders for opted-in recipients
- Class: functional
- Status: validated
- Description: SMS session reminders for opted-in recipients
- Why it matters: Multi-channel notifications improve engagement
- Source: M005
- Primary owning slice: M005
- Validation: Validated in M005 — SMS session reminders for opted-in
- Notes: Legacy: SMS-01

### R092 — Cancellation SMS alongside email
- Class: functional
- Status: validated
- Description: Cancellation SMS alongside email
- Why it matters: Multi-channel notifications improve engagement
- Source: M005
- Primary owning slice: M005
- Validation: Validated in M005 — cancellation SMS alongside email
- Notes: Legacy: SMS-02

### R093 — Parent phone + SMS consent on booking form
- Class: functional
- Status: validated
- Description: Parent phone + SMS consent on booking form
- Why it matters: Multi-channel notifications improve engagement
- Source: M005
- Primary owning slice: M005
- Validation: Validated in M005 — parent phone + SMS consent on booking form
- Notes: Legacy: SMS-03

### R094 — Teacher phone + SMS opt-in in onboarding/settings
- Class: functional
- Status: validated
- Description: Teacher phone + SMS opt-in in onboarding/settings
- Why it matters: Multi-channel notifications improve engagement
- Source: M005
- Primary owning slice: M005
- Validation: Validated in M005 — teacher phone + SMS opt-in in onboarding/settings
- Notes: Legacy: SMS-04

### R095 — cancelSession sends SMS alongside email
- Class: functional
- Status: validated
- Description: cancelSession sends SMS alongside email
- Why it matters: SMS channel for cancellation notifications
- Source: M005
- Primary owning slice: M005
- Validation: Validated in M005 — cancelSession sends SMS alongside email
- Notes: Legacy: CANCEL-02

### R096 — High-res QR code PNG download
- Class: functional
- Status: validated
- Description: High-res QR code PNG download
- Why it matters: Offline marketing for teachers
- Source: M006
- Primary owning slice: M006
- Validation: Validated in M006 — high-res QR code PNG download
- Notes: Legacy: QR-01

### R097 — Printable mini-flyer PNG
- Class: functional
- Status: validated
- Description: Printable mini-flyer PNG
- Why it matters: Offline marketing for teachers
- Source: M006
- Primary owning slice: M006
- Validation: Validated in M006 — printable mini-flyer PNG
- Notes: Legacy: QR-02

### R098 — Pre-written announcement templates
- Class: functional
- Status: validated
- Description: Pre-written announcement templates
- Why it matters: Social media marketing enablement
- Source: M006
- Primary owning slice: M006
- Validation: Validated in M006 — pre-written announcement templates
- Notes: Legacy: SWIPE-01

### R099 — One-click copy-to-clipboard
- Class: functional
- Status: validated
- Description: One-click copy-to-clipboard
- Why it matters: Social media marketing enablement
- Source: M006
- Primary owning slice: M006
- Validation: Validated in M006 — one-click copy-to-clipboard
- Notes: Legacy: SWIPE-02

### R100 — OG image unfurl across platforms
- Class: non-functional
- Status: validated
- Description: OG image unfurl across platforms
- Why it matters: Link preview quality across platforms
- Source: M006
- Primary owning slice: M006
- Validation: Validated in M006 — OG image unfurl across platforms
- Notes: Legacy: OG-01

### R101 — Teacher capacity limit setting
- Class: functional
- Status: validated
- Description: Teacher capacity limit setting
- Why it matters: Capacity management prevents overcommitment
- Source: M007
- Primary owning slice: M007
- Validation: Validated in M007 — teacher capacity limit setting
- Notes: Legacy: CAP-01

### R102 — Profile at-capacity state with waitlist form
- Class: functional
- Status: validated
- Description: Profile at-capacity state with waitlist form
- Why it matters: Capacity management prevents overcommitment
- Source: M007
- Primary owning slice: M007
- Validation: Validated in M007 — profile at-capacity state with waitlist form
- Notes: Legacy: CAP-02

### R103 — Anonymous waitlist signup
- Class: functional
- Status: validated
- Description: Anonymous waitlist signup
- Why it matters: Waitlist captures demand when at capacity
- Source: M007
- Primary owning slice: M007
- Validation: Validated in M007 — anonymous waitlist signup
- Notes: Legacy: WAIT-01

### R104 — Teacher waitlist dashboard
- Class: functional
- Status: validated
- Description: Teacher waitlist dashboard
- Why it matters: Waitlist captures demand when at capacity
- Source: M007
- Primary owning slice: M007
- Validation: Validated in M007 — teacher waitlist dashboard
- Notes: Legacy: WAIT-02

### R105 — Waitlist notifications on capacity freed
- Class: functional
- Status: validated
- Description: Waitlist notifications on capacity freed
- Why it matters: Waitlist captures demand when at capacity
- Source: M007
- Primary owning slice: M007
- Validation: Validated in M007 — waitlist notifications on capacity freed
- Notes: Legacy: WAIT-03

### R106 — Session types CRUD
- Class: functional
- Status: validated
- Description: Session types CRUD
- Why it matters: Session types enable structured service offering
- Source: M007
- Primary owning slice: M007
- Validation: Validated in M007 — session types CRUD
- Notes: Legacy: SESS-01

### R107 — Booking form session type selector with duration filtering
- Class: functional
- Status: validated
- Description: Booking form session type selector with duration filtering
- Why it matters: Session types enable structured service offering
- Source: M007
- Primary owning slice: M007
- Validation: Validated in M007 — booking form session type selector with duration filtering
- Notes: Legacy: SESS-02

### R108 — Flat session-type price for Stripe PI
- Class: functional
- Status: validated
- Description: Flat session-type price for Stripe PI
- Why it matters: Session types enable structured service offering
- Source: M007
- Primary owning slice: M007
- Validation: Validated in M007 — flat session-type price for Stripe PI
- Notes: Legacy: SESS-03

### R109 — Unchanged flow for teachers without session types
- Class: functional
- Status: validated
- Description: Unchanged flow for teachers without session types
- Why it matters: Session types enable structured service offering
- Source: M007
- Primary owning slice: M007
- Validation: Validated in M007 — unchanged flow for teachers without session types
- Notes: Legacy: SESS-04

### R110 — Teacher directory at /tutors
- Class: functional
- Status: validated
- Description: Teacher directory at /tutors
- Why it matters: Teacher discovery drives marketplace growth
- Source: M008
- Primary owning slice: M008
- Validation: Validated in M008 — teacher directory at /tutors
- Notes: Legacy: DIR-01

### R111 — Directory filters (subject, grade, city, price)
- Class: functional
- Status: validated
- Description: Directory filters (subject, grade, city, price)
- Why it matters: Teacher discovery drives marketplace growth
- Source: M008
- Primary owning slice: M008
- Validation: Validated in M008 — directory filters
- Notes: Legacy: DIR-02

### R112 — Full-text search
- Class: functional
- Status: validated
- Description: Full-text search
- Why it matters: Teacher discovery drives marketplace growth
- Source: M008
- Primary owning slice: M008
- Validation: Validated in M008 — full-text search
- Notes: Legacy: DIR-03

### R113 — XML sitemap covering all teacher URLs
- Class: non-functional
- Status: validated
- Description: XML sitemap covering all teacher URLs
- Why it matters: Organic search traffic
- Source: M008
- Primary owning slice: M008
- Validation: Validated in M008 — XML sitemap
- Notes: Legacy: SEO-03

### R114 — SEO category pages with unique meta + ISR
- Class: non-functional
- Status: validated
- Description: SEO category pages with unique meta + ISR
- Why it matters: Organic search traffic
- Source: M008
- Primary owning slice: M008
- Validation: Validated in M008 — SEO category pages with ISR
- Notes: Legacy: SEO-04

### R115 — Page view tracking with bot filtering
- Class: functional
- Status: validated
- Description: Page view tracking with bot filtering
- Why it matters: Teachers need performance visibility
- Source: M008
- Primary owning slice: M008
- Validation: Validated in M008 — page view tracking with bot filtering
- Notes: Legacy: ANALYTICS-01

### R116 — Dashboard analytics funnel
- Class: functional
- Status: validated
- Description: Dashboard analytics funnel
- Why it matters: Teachers need performance visibility
- Source: M008
- Primary owning slice: M008
- Validation: Validated in M008 — dashboard analytics funnel
- Notes: Legacy: ANALYTICS-02

### R117 — Parent selects recurring schedule (weekly/biweekly)
- Class: functional
- Status: validated
- Description: Parent selects recurring schedule (weekly/biweekly)
- Why it matters: Recurring sessions are key for retention and revenue predictability
- Source: M009
- Primary owning slice: M009
- Validation: Validated in M009 — parent selects recurring schedule
- Notes: Legacy: RECUR-01

### R118 — System auto-creates future booking rows
- Class: functional
- Status: validated
- Description: System auto-creates future booking rows
- Why it matters: Recurring sessions are key for retention and revenue predictability
- Source: M009
- Primary owning slice: M009
- Validation: Validated in M009 — system auto-creates future booking rows
- Notes: Legacy: RECUR-02

### R119 — Per-session payment handling
- Class: functional
- Status: validated
- Description: Per-session payment handling
- Why it matters: Recurring sessions are key for retention and revenue predictability
- Source: M009
- Primary owning slice: M009
- Validation: Validated in M009 — per-session payment handling
- Notes: Legacy: RECUR-03

### R120 — Cancel individual/series
- Class: functional
- Status: validated
- Description: Cancel individual/series
- Why it matters: Recurring sessions are key for retention and revenue predictability
- Source: M009
- Primary owning slice: M009
- Validation: Validated in M009 — cancel individual/series
- Notes: Legacy: RECUR-04

### R121 — Availability + double-booking prevention for recurring
- Class: functional
- Status: validated
- Description: Availability + double-booking prevention for recurring
- Why it matters: Recurring sessions are key for retention and revenue predictability
- Source: M009
- Primary owning slice: M009
- Validation: Validated in M009 — availability + double-booking prevention for recurring
- Notes: Legacy: RECUR-05

### R122 — Saved card via Stripe Customer
- Class: functional
- Status: validated
- Description: Saved card via Stripe Customer
- Why it matters: Recurring sessions are key for retention and revenue predictability
- Source: M009
- Primary owning slice: M009
- Validation: Validated in M009 — saved card via Stripe Customer
- Notes: Legacy: RECUR-06

### R123 — Cron charges upcoming recurring sessions
- Class: functional
- Status: validated
- Description: Cron charges upcoming recurring sessions
- Why it matters: Recurring sessions are key for retention and revenue predictability
- Source: M009
- Primary owning slice: M009
- Validation: Validated in M009 — cron charges upcoming recurring sessions
- Notes: Legacy: RECUR-07

### R124 — Parent self-service cancellation via secure email link
- Class: functional
- Status: validated
- Description: Parent self-service cancellation via secure email link
- Why it matters: Recurring sessions are key for retention and revenue predictability
- Source: M009
- Primary owning slice: M009
- Validation: Validated in M009 — parent self-service cancellation via secure email link
- Notes: Legacy: RECUR-08

### R125 — Recurring sessions in dashboard with series badge
- Class: functional
- Status: validated
- Description: Recurring sessions in dashboard with series badge
- Why it matters: Recurring sessions are key for retention and revenue predictability
- Source: M009
- Primary owning slice: M009
- Validation: Validated in M009 — recurring sessions in dashboard with series badge
- Notes: Legacy: RECUR-09

### R126 — Multi-child management (CRUD)
- Class: functional
- Status: validated
- Description: Multi-child management (CRUD)
- Why it matters: Parent experience drives retention
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — multi-child management CRUD
- Notes: Legacy: PARENT-04

### R127 — Saved payment methods (Stripe Customer per parent)
- Class: functional
- Status: validated
- Description: Saved payment methods (Stripe Customer per parent)
- Why it matters: Parent experience drives retention
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — saved payment methods via Stripe Customer per parent
- Notes: Legacy: PARENT-05

### R128 — Real-time teacher-parent messaging
- Class: functional
- Status: validated
- Description: Real-time teacher-parent messaging
- Why it matters: Parent experience drives retention
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — real-time teacher-parent messaging
- Notes: Legacy: PARENT-06

### R129 — Auth-guarded parent dashboard
- Class: functional
- Status: validated
- Description: Auth-guarded parent dashboard
- Why it matters: Parent experience drives retention
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — auth-guarded parent dashboard
- Notes: Legacy: PARENT-07

### R130 — Child selector in booking calendar
- Class: functional
- Status: validated
- Description: Child selector in booking calendar
- Why it matters: Parent experience drives retention
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — child selector in booking calendar
- Notes: Legacy: PARENT-08

### R131 — Parent-level Stripe Customer
- Class: functional
- Status: validated
- Description: Parent-level Stripe Customer
- Why it matters: Parent experience drives retention
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — parent-level Stripe Customer
- Notes: Legacy: PARENT-09

### R132 — One-thread-per-pair messaging
- Class: functional
- Status: validated
- Description: One-thread-per-pair messaging
- Why it matters: Communication channel between teacher and parent
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — one-thread-per-pair messaging
- Notes: Legacy: MSG-01

### R133 — Real-time messages via Supabase Realtime
- Class: functional
- Status: validated
- Description: Real-time messages via Supabase Realtime
- Why it matters: Communication channel between teacher and parent
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — real-time messages via Supabase Realtime
- Notes: Legacy: MSG-02

### R134 — New message email notification with rate limiting
- Class: functional
- Status: validated
- Description: New message email notification with rate limiting
- Why it matters: Communication channel between teacher and parent
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — new message email notification with rate limiting
- Notes: Legacy: MSG-03

### R135 — Admin metrics dashboard
- Class: operability
- Status: validated
- Description: Admin metrics dashboard
- Why it matters: Platform operator visibility
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — admin metrics dashboard
- Notes: Legacy: ADMIN-01

### R136 — Admin activity feed
- Class: operability
- Status: validated
- Description: Admin activity feed
- Why it matters: Platform operator visibility
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — admin activity feed
- Notes: Legacy: ADMIN-02

### R137 — Admin access gate (notFound for non-admins)
- Class: operability
- Status: validated
- Description: Admin access gate (notFound for non-admins)
- Why it matters: Platform operator visibility
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — admin access gate using notFound() for non-admins
- Notes: Legacy: ADMIN-04

### R138 — Google SSO working end-to-end
- Class: functional
- Status: validated
- Description: Google SSO working end-to-end
- Why it matters: Authentication completeness
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — Google SSO working end-to-end
- Notes: Legacy: AUTH-03

### R139 — School email verification is provider-agnostic
- Class: functional
- Status: validated
- Description: School email verification is provider-agnostic
- Why it matters: Authentication completeness
- Source: M010
- Primary owning slice: M010
- Validation: Validated in M010 — school email verification is provider-agnostic
- Notes: Legacy: AUTH-04

### R140 — Profile page ISR with on-demand revalidation
- Class: non-functional
- Status: validated
- Description: Profile page ISR with on-demand revalidation
- Why it matters: Page load performance and caching
- Source: M012
- Primary owning slice: M012
- Validation: Validated in M012 — profile page ISR with on-demand revalidation
- Notes: Legacy: PERF-01

### R141 — ISR within Vercel Hobby plan limits
- Class: non-functional
- Status: validated
- Description: ISR within Vercel Hobby plan limits
- Why it matters: Page load performance and caching
- Source: M012
- Primary owning slice: M012
- Validation: Validated in M012 — ISR within Vercel Hobby plan limits
- Notes: Legacy: PERF-06

### R142 — On-demand revalidation via revalidatePath
- Class: non-functional
- Status: validated
- Description: On-demand revalidation via revalidatePath
- Why it matters: Page load performance and caching
- Source: M012
- Primary owning slice: M012
- Validation: Validated in M012 — on-demand revalidation via revalidatePath
- Notes: Legacy: PERF-07

### UI-01 — Teacher profile page premium visual treatment (hero, credentials, reviews, about)
- Status: validated
- Description: Teacher profile page premium visual treatment (hero, credentials, reviews, about)
- Primary owning slice: M011/S01
- Validation: Validated by M011/S01 — HeroSection, CredentialsBar, ReviewsSection, AboutSection all rebuilt with premium visual treatment. Two-row CredentialsBar layout, taller hero banner with ring-inset avatar, inline SVG star ratings, dynamic --accent color throughout. Build passes.

### UI-02 — BookingCalendar decomposed into sub-components
- Status: validated
- Description: BookingCalendar decomposed into sub-components
- Primary owning slice: M011/S02
- Validation: Validated by M011/S02 — BookingCalendar decomposed into BookingForm, SessionTypeSelector, CalendarGrid, TimeSlotsPanel sub-components. All booking paths (direct, recurring, deferred) confirmed functional. Build passes.

### UI-03 — Mobile navigation: labeled primary tabs + More panel
- Status: validated
- Description: Mobile navigation: labeled primary tabs + More panel
- Primary owning slice: M011/S03
- Validation: Validated by M011/S03 — MobileBottomNav rebuilt with 4 labeled primary tabs + More panel. ParentMobileNav confirmed with visible text-[10px] labels on all 5 tabs. Build passes.

### UI-04 — All 11 teacher dashboard pages premium card standard
- Status: validated
- Description: All 11 teacher dashboard pages premium card standard
- Primary owning slice: M011/S04
- Validation: Validated by M011/S04 — All 11 teacher dashboard pages upgraded: premium card standard (rounded-xl border bg-card shadow-sm), avatar initial circles, empty state pattern, color-mix tinting, tracking-tight headers. Build passes.

### UI-05 — All 5 parent dashboard pages premium card standard
- Status: validated
- Description: All 5 parent dashboard pages premium card standard
- Primary owning slice: M011/S04
- Validation: Validated by M011/S04 — All 5 parent dashboard pages upgraded with same premium card standard as teacher dashboard. Build passes.

### UI-06 — Landing page tightening (footer, hero badge, responsive nav)
- Status: validated
- Description: Landing page tightening (footer, hero badge, responsive nav)
- Primary owning slice: M011/S05
- Validation: Validated by M011/S05 — Landing page tightening pass applied. SocialLinks always renders attribution footer regardless of teacher social links.

### UI-07 — Design patterns documented (card standard, avatar circles, tinting, headers)
- Status: validated
- Description: Design patterns documented (card standard, avatar circles, tinting, headers)
- Primary owning slice: M011
- Validation: Validated by M011 overall — KNOWLEDGE.md documents Premium Dashboard Card Standard, Avatar Initial Circle Pattern, color-mix canonical tinting, and Premium Page Header Pattern applied consistently across all surfaces. Build passes.

### UI-08 — Bespoke Tutelo patterns replace generic shadcn/ui defaults
- Status: validated
- Description: Bespoke Tutelo patterns replace generic shadcn/ui defaults
- Primary owning slice: M011
- Validation: Validated by M011 — All surfaces use bespoke Tutelo patterns (color-mix tinting, tracking-tight headers, custom empty states, avatar circles). No default shadcn/ui spacing or generic template patterns visible.

### UI-09 — Nav lag eliminated, all icons labeled, consistent across surfaces
- Status: validated
- Description: Nav lag eliminated, all icons labeled, consistent across surfaces
- Primary owning slice: M011
- Validation: Validated by M011 + post-M011 perf work — nav lag eliminated (template.tsx removed, auth dedup, loading skeletons on all pages), all icons labeled, no mystery affordances. Consistent across teacher and parent surfaces.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| PERF-02 |  | partially-advanced | M012 | none | Partial: /tutors/[category] confirmed ISR in build output (● 1h). /tutors correctly dynamic (searchParams Next.js constraint, D059). supabaseAdmin in place, revalidation wiring complete, ready for client-side filtering pivot. M012 complete. |
| R001 | quality-attribute | validated | M013/S01 | M013/S03 | npx vitest run: 52 files, 490 tests, 0 failures. All 14 mock-drift failures resolved in M013/S01. |
| R002 | operability | validated | M013/S02 | none | Sentry SDK initialized on client/server/edge. Error boundaries call captureException. Source maps configured with errorHandler fallback. sendDefaultPii: false. 44 catch blocks instrumented in M013/S02. |
| R003 | failure-visibility | validated | M013/S02 | none | 44 catch blocks instrumented across 18 files. Catch block audit confirms no silent catch-and-ignore patterns. Fire-and-forget patterns upgraded. Validated in M013/S02. |
| R004 | quality-attribute | validated | M013/S03 | none | 52 test files, 490 tests pass, 0 it.todo(), 0 it.skip(), 0 failures. Verified by `npx vitest run` and `rg 'it\.(todo|skip)\('` on 2026-04-07. 7 pure-stub files deleted, 6 stubs removed from mixed files, 16 stubs converted to real passing tests, 4 skipped tests fixed. |
| R005 | operability | validated | M013/S04 | none | REQUIREMENTS.md contains 151 entries with stable IDs, ownership traceability, and coverage summary. All M001–M012 capabilities documented. |
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
| R066 | functional | validated | M001 | none | Submit review, display on profile, email prompt — tests + browser |
| R067 | functional | validated | M003 | none | Marketing landing page with hero, how-it-works, problem/solution, CTA |
| R068 | functional | validated | M003 | none | Interactive TeacherMockSection with hover/transition effects |
| R069 | functional | validated | M003 | none | Start your page CTA links to /login |
| R070 | functional | validated | M003 | none | Brand palette applied; logo in all nav surfaces |
| R071 | functional | validated | M003 | none | Shareable slug URLs showcased in multiple landing sections |
| R072 | quality-attribute | validated | M003 | none | Scroll-triggered reveals on all landing sections |
| R073 | quality-attribute | validated | M003 | none | Route transitions via template.tsx + PageTransition |
| R074 | quality-attribute | validated | M003 | none | Onboarding step directional slides |
| R075 | quality-attribute | validated | M003 | none | Dashboard card/list stagger animations |
| R076 | quality-attribute | validated | M003 | none | Teacher profile section sequential fades |
| R077 | quality-attribute | validated | M003 | none | Micro-interaction press/hover on primary CTAs |
| R078 | functional | validated | M003 | none | Bottom tab bar on mobile, all 7 tabs functional |
| R079 | quality-attribute | validated | M003 | none | Global brand palette, teacher accent color preserved |
| R080 | quality-attribute | validated | M003 | none | Logo in NavBar, Sidebar, MobileHeader |
| R081 | non-functional | validated | M003 | none | Dynamic OG tags + 1200x630 image per teacher |
| R082 | non-functional | validated | M003 | none | Landing page OG meta tags |
| R083 | functional | validated | M003 | none | social_email auto-populated from auth email |
| R084 | functional | validated | M004 | none | Validated in M004 — 5-minute granularity availability editor |
| R085 | functional | validated | M004 | none | Validated in M004 — per-date availability overrides |
| R086 | functional | validated | M004 | none | Validated in M004 — future-date planning via overrides |
| R087 | functional | validated | M004 | none | Validated in M004 — time-range picker editor rewrite |
| R088 | functional | validated | M004 | none | Validated in M004 — session cancellation with Stripe void + email |
| R089 | functional | validated | M005 | none | Validated in M005 — school email verification flow with OTP |
| R090 | functional | validated | M005 | none | Validated in M005 — CredentialsBar badge gated on verified_at |
| R091 | functional | validated | M005 | none | Validated in M005 — SMS session reminders for opted-in |
| R092 | functional | validated | M005 | none | Validated in M005 — cancellation SMS alongside email |
| R093 | functional | validated | M005 | none | Validated in M005 — parent phone + SMS consent on booking form |
| R094 | functional | validated | M005 | none | Validated in M005 — teacher phone + SMS opt-in in onboarding/settings |
| R095 | functional | validated | M005 | none | Validated in M005 — cancelSession sends SMS alongside email |
| R096 | functional | validated | M006 | none | Validated in M006 — high-res QR code PNG download |
| R097 | functional | validated | M006 | none | Validated in M006 — printable mini-flyer PNG |
| R098 | functional | validated | M006 | none | Validated in M006 — pre-written announcement templates |
| R099 | functional | validated | M006 | none | Validated in M006 — one-click copy-to-clipboard |
| R100 | non-functional | validated | M006 | none | Validated in M006 — OG image unfurl across platforms |
| R101 | functional | validated | M007 | none | Validated in M007 — teacher capacity limit setting |
| R102 | functional | validated | M007 | none | Validated in M007 — profile at-capacity state with waitlist form |
| R103 | functional | validated | M007 | none | Validated in M007 — anonymous waitlist signup |
| R104 | functional | validated | M007 | none | Validated in M007 — teacher waitlist dashboard |
| R105 | functional | validated | M007 | none | Validated in M007 — waitlist notifications on capacity freed |
| R106 | functional | validated | M007 | none | Validated in M007 — session types CRUD |
| R107 | functional | validated | M007 | none | Validated in M007 — booking form session type selector with duration filtering |
| R108 | functional | validated | M007 | none | Validated in M007 — flat session-type price for Stripe PI |
| R109 | functional | validated | M007 | none | Validated in M007 — unchanged flow for teachers without session types |
| R110 | functional | validated | M008 | none | Validated in M008 — teacher directory at /tutors |
| R111 | functional | validated | M008 | none | Validated in M008 — directory filters |
| R112 | functional | validated | M008 | none | Validated in M008 — full-text search |
| R113 | non-functional | validated | M008 | none | Validated in M008 — XML sitemap |
| R114 | non-functional | validated | M008 | none | Validated in M008 — SEO category pages with ISR |
| R115 | functional | validated | M008 | none | Validated in M008 — page view tracking with bot filtering |
| R116 | functional | validated | M008 | none | Validated in M008 — dashboard analytics funnel |
| R117 | functional | validated | M009 | none | Validated in M009 — parent selects recurring schedule |
| R118 | functional | validated | M009 | none | Validated in M009 — system auto-creates future booking rows |
| R119 | functional | validated | M009 | none | Validated in M009 — per-session payment handling |
| R120 | functional | validated | M009 | none | Validated in M009 — cancel individual/series |
| R121 | functional | validated | M009 | none | Validated in M009 — availability + double-booking prevention for recurring |
| R122 | functional | validated | M009 | none | Validated in M009 — saved card via Stripe Customer |
| R123 | functional | validated | M009 | none | Validated in M009 — cron charges upcoming recurring sessions |
| R124 | functional | validated | M009 | none | Validated in M009 — parent self-service cancellation via secure email link |
| R125 | functional | validated | M009 | none | Validated in M009 — recurring sessions in dashboard with series badge |
| R126 | functional | validated | M010 | none | Validated in M010 — multi-child management CRUD |
| R127 | functional | validated | M010 | none | Validated in M010 — saved payment methods via Stripe Customer per parent |
| R128 | functional | validated | M010 | none | Validated in M010 — real-time teacher-parent messaging |
| R129 | functional | validated | M010 | none | Validated in M010 — auth-guarded parent dashboard |
| R130 | functional | validated | M010 | none | Validated in M010 — child selector in booking calendar |
| R131 | functional | validated | M010 | none | Validated in M010 — parent-level Stripe Customer |
| R132 | functional | validated | M010 | none | Validated in M010 — one-thread-per-pair messaging |
| R133 | functional | validated | M010 | none | Validated in M010 — real-time messages via Supabase Realtime |
| R134 | functional | validated | M010 | none | Validated in M010 — new message email notification with rate limiting |
| R135 | operability | validated | M010 | none | Validated in M010 — admin metrics dashboard |
| R136 | operability | validated | M010 | none | Validated in M010 — admin activity feed |
| R137 | operability | validated | M010 | none | Validated in M010 — admin access gate using notFound() for non-admins |
| R138 | functional | validated | M010 | none | Validated in M010 — Google SSO working end-to-end |
| R139 | functional | validated | M010 | none | Validated in M010 — school email verification is provider-agnostic |
| R140 | non-functional | validated | M012 | none | Validated in M012 — profile page ISR with on-demand revalidation |
| R141 | non-functional | validated | M012 | none | Validated in M012 — ISR within Vercel Hobby plan limits |
| R142 | non-functional | validated | M012 | none | Validated in M012 — on-demand revalidation via revalidatePath |
| UI-01 |  | validated | M011/S01 | none | Validated by M011/S01 — HeroSection, CredentialsBar, ReviewsSection, AboutSection all rebuilt with premium visual treatment. Two-row CredentialsBar layout, taller hero banner with ring-inset avatar, inline SVG star ratings, dynamic --accent color throughout. Build passes. |
| UI-02 |  | validated | M011/S02 | none | Validated by M011/S02 — BookingCalendar decomposed into BookingForm, SessionTypeSelector, CalendarGrid, TimeSlotsPanel sub-components. All booking paths (direct, recurring, deferred) confirmed functional. Build passes. |
| UI-03 |  | validated | M011/S03 | none | Validated by M011/S03 — MobileBottomNav rebuilt with 4 labeled primary tabs + More panel. ParentMobileNav confirmed with visible text-[10px] labels on all 5 tabs. Build passes. |
| UI-04 |  | validated | M011/S04 | none | Validated by M011/S04 — All 11 teacher dashboard pages upgraded: premium card standard (rounded-xl border bg-card shadow-sm), avatar initial circles, empty state pattern, color-mix tinting, tracking-tight headers. Build passes. |
| UI-05 |  | validated | M011/S04 | none | Validated by M011/S04 — All 5 parent dashboard pages upgraded with same premium card standard as teacher dashboard. Build passes. |
| UI-06 |  | validated | M011/S05 | none | Validated by M011/S05 — Landing page tightening pass applied. SocialLinks always renders attribution footer regardless of teacher social links. |
| UI-07 |  | validated | M011 | none | Validated by M011 overall — KNOWLEDGE.md documents Premium Dashboard Card Standard, Avatar Initial Circle Pattern, color-mix canonical tinting, and Premium Page Header Pattern applied consistently across all surfaces. Build passes. |
| UI-08 |  | validated | M011 | none | Validated by M011 — All surfaces use bespoke Tutelo patterns (color-mix tinting, tracking-tight headers, custom empty states, avatar circles). No default shadcn/ui spacing or generic template patterns visible. |
| UI-09 |  | validated | M011 | none | Validated by M011 + post-M011 perf work — nav lag eliminated (template.tsx removed, auth dedup, loading skeletons on all pages), all icons labeled, no mystery affordances. Consistent across teacher and parent surfaces. |

## Coverage Summary

- Active requirements: 0
- Mapped to slices: 0
- Validated: 151 (R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R013, R014, R015, R016, R017, R018, R019, R020, R021, R022, R023, R024, R025, R026, R027, R028, R029, R030, R031, R032, R033, R034, R035, R036, R037, R038, R039, R040, R041, R042, R043, R044, R045, R046, R047, R048, R049, R050, R051, R052, R053, R054, R055, R056, R057, R058, R059, R060, R061, R062, R063, R064, R065, R066, R067, R068, R069, R070, R071, R072, R073, R074, R075, R076, R077, R078, R079, R080, R081, R082, R083, R084, R085, R086, R087, R088, R089, R090, R091, R092, R093, R094, R095, R096, R097, R098, R099, R100, R101, R102, R103, R104, R105, R106, R107, R108, R109, R110, R111, R112, R113, R114, R115, R116, R117, R118, R119, R120, R121, R122, R123, R124, R125, R126, R127, R128, R129, R130, R131, R132, R133, R134, R135, R136, R137, R138, R139, R140, R141, R142, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09)
- Unmapped active requirements: 0
