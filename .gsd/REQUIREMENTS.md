# Requirements

## Active

(No active requirements — all M003 requirements validated.)

## Validated

### LAND-01 — Marketing landing page at tutelo.app/ with hero, how-it-works, problem/solution, and CTA

- Class: launchability
- Status: validated
- Source: user
- Primary Slice: M003/S01
- Validated by: M003 — landing page built with 6 section components; npm run build passes

### LAND-02 — Interactive teacher page mock/preview on landing page

- Class: differentiator
- Status: validated
- Source: user
- Primary Slice: M003/S01
- Validated by: M003 — TeacherMockSection is 'use client' with interactive hover/transition effects

### LAND-03 — "Start your page" CTA links to signup flow

- Class: primary-user-loop
- Status: validated
- Source: user
- Primary Slice: M003/S01
- Validated by: M003 — CTA in HeroSection and CTASection links to /login

### LAND-04 — Landing page uses brand identity (#3b4d3e primary, #f6f5f0 secondary, Tutelo logo)

- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M003/S01
- Validated by: M003 — Brand CSS custom properties in globals.css; logo in NavBar, Sidebar, MobileHeader

### LAND-05 — Landing page highlights shareable slug links as key value prop

- Class: differentiator
- Status: validated
- Source: user
- Primary Slice: M003/S01
- Validated by: M003 — Slug URL showcased in HeroSection, ProblemSolutionSection, TeacherMockSection, CTASection

### ANIM-01 — Smooth scroll-triggered section reveals on landing page

- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M003/S02
- Validated by: M003 — AnimatedSection wrapper with fadeSlideUp + whileInView viewport once on all 5 sections

### ANIM-02 — Animated page transitions between routes

- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M003/S02
- Validated by: M003 — PageTransition + template.tsx at root and dashboard levels with pageFade variant

### ANIM-03 — Onboarding wizard step transitions

- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M003/S02
- Validated by: M003 — OnboardingWizard uses AnimatePresence + slideStep with directionRef

### ANIM-04 — Dashboard card and list animations

- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M003/S02
- Validated by: M003 — AnimatedList/AnimatedListItem on dashboard pages; StatsBar stagger animation

### ANIM-05 — Teacher profile /[slug] page section entrance animations

- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M003/S02
- Validated by: M003 — AnimatedProfile wrapper on hero, credentials, about, reviews with sequential delays

### ANIM-06 — Micro-interactions: button hovers, toggle animations, form focus states

- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M003/S02
- Validated by: M003 — AnimatedButton wrapper with microPress on landing CTAs and dashboard action buttons

### MOBILE-01 — Mobile bottom navigation bar replacing hidden sidebar on dashboard

- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M003/S03
- Validated by: M003 — MobileBottomNav with 7 icon-only tabs + sign out verified at 375px/390px viewports

### BRAND-01 — Global brand palette applied to app

- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M003/S01
- Validated by: M003 — --primary=#3b4d3e in :root; --accent untouched; teacher accent_color still applied on [slug] page

### BRAND-02 — Tutelo logo integrated into navigation/header across the app

- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M003/S01
- Validated by: M003 — Logo in NavBar (landing), Sidebar (desktop), MobileHeader (mobile)

### SEO-01 — Dynamic OG meta tags on teacher /[slug] pages

- Class: differentiator
- Status: validated
- Source: user
- Primary Slice: M003/S04
- Validated by: M003 — generateMetadata() + opengraph-image.tsx; 4 unit tests pass

### SEO-02 — Proper OG meta tags on landing page

- Class: launchability
- Status: validated
- Source: inferred
- Primary Slice: M003/S01
- Validated by: M003 — Landing page metadata export with openGraph title, description, type, image

### FIX-01 — Auto-populate social_email from signup email

- Class: continuity
- Status: validated
- Source: execution
- Primary Slice: M003/S04
- Validated by: M003 — saveWizardStep INSERT sets social_email from getUser().email; 5 unit tests pass

### AUTH-01 — Teacher or parent can sign up with email + password or Google SSO

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher or parent can sign up with email + password or Google SSO

### AUTH-02 — User session persists across browser refresh

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

User session persists across browser refresh

### ONBOARD-01 — Teacher completes setup wizard (name, school, city/state, years experience, optional profile photo) with no payment required to publish

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher completes setup wizard (name, school, city/state, years experience, optional profile photo) with no payment required to publish

### ONBOARD-02 — Teacher selects tutoring subjects (multi-select: Math, Reading/ELA, Science, etc.)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher selects tutoring subjects (multi-select: Math, Reading/ELA, Science, etc.)

### ONBOARD-03 — Teacher selects grade range(s) they teach (multi-select: K-2, 3-5, 6-8, 9-12)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher selects grade range(s) they teach (multi-select: K-2, 3-5, 6-8, 9-12)

### ONBOARD-04 — Teacher sets their IANA timezone (required, used for availability storage and viewer conversion)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher sets their IANA timezone (required, used for availability storage and viewer conversion)

### ONBOARD-05 — Teacher sets weekly availability via visual calendar (defaults to weekday evenings + weekends; teacher adjusts)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher sets weekly availability via visual calendar (defaults to weekday evenings + weekends; teacher adjusts)

### ONBOARD-06 — Teacher sets hourly rate with local benchmark range shown ("most teachers in your area charge $X–Y/hr")

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher sets hourly rate with local benchmark range shown ("most teachers in your area charge $X–Y/hr")

### ONBOARD-07 — Teacher receives a shareable public URL (`tutelo.app/[slug]`) immediately on publish — no Stripe required

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher receives a shareable public URL (`tutelo.app/[slug]`) immediately on publish — no Stripe required

### PAGE-01 — Auto-generated public page at teacher's slug URL (`tutelo.app/[slug]`)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Auto-generated public page at teacher's slug URL (`tutelo.app/[slug]`)

### PAGE-02 — Page displays: name, profile photo (or initials avatar), school name, city/state

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Page displays: name, profile photo (or initials avatar), school name, city/state

### PAGE-03 — Page displays: credential bar (verified teacher badge, years experience, subjects, grade levels)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Page displays: credential bar (verified teacher badge, years experience, subjects, grade levels)

### PAGE-04 — Page displays: auto-generated bio if teacher skips writing one

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Page displays: auto-generated bio if teacher skips writing one

### PAGE-05 — Page displays: subjects + hourly rate, interactive availability calendar, reviews section

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Page displays: subjects + hourly rate, interactive availability calendar, reviews section

### PAGE-06 — Sticky "Book Now" CTA visible at all times on mobile

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Sticky "Book Now" CTA visible at all times on mobile

### PAGE-07 — Page applies teacher's chosen accent color / theme throughout

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Page applies teacher's chosen accent color / theme throughout

### PAGE-08 — Page displays teacher's custom headline / tagline below their name (if set)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Page displays teacher's custom headline / tagline below their name (if set)

### PAGE-09 — Page displays teacher's banner image at the top (if uploaded)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Page displays teacher's banner image at the top (if uploaded)

### PAGE-10 — Page displays teacher's social / contact links (if set)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Page displays teacher's social / contact links (if set)

### CUSTOM-01 — Teacher can select an accent color / theme from a preset palette (5–6 colors) from their dashboard

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can select an accent color / theme from a preset palette (5–6 colors) from their dashboard

### CUSTOM-02 — Teacher can add a custom headline / tagline (short one-liner displayed below their name)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can add a custom headline / tagline (short one-liner displayed below their name)

### CUSTOM-03 — Teacher can add social / contact links (Instagram, school email, personal website — all optional)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can add social / contact links (Instagram, school email, personal website — all optional)

### CUSTOM-04 — Teacher can upload a banner image for the top of their landing page

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can upload a banner image for the top of their landing page

### AVAIL-01 — Teacher can view and edit their weekly availability from their dashboard

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can view and edit their weekly availability from their dashboard

### AVAIL-02 — Available time slots are displayed on the public landing page

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Available time slots are displayed on the public landing page

### AVAIL-03 — Public landing page auto-detects the viewer's browser timezone and displays available times converted from the teacher's set timezone

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Public landing page auto-detects the viewer's browser timezone and displays available times converted from the teacher's set timezone

### VIS-01 — Teacher can toggle their public page between "Active" (publicly visible) and "Draft / Hidden" (hidden from public) at any time without losing configured data

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can toggle their public page between "Active" (publicly visible) and "Draft / Hidden" (hidden from public) at any time without losing configured data

### VIS-02 — Visiting a hidden page returns a graceful "not available" state (not a 404)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Visiting a hidden page returns a graceful "not available" state (not a 404)

### BOOK-01 — Parent can submit a booking request (no payment) by selecting a time slot, entering student name, subject, optional note, and email — no parent account required

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Parent can submit a booking request (no payment) by selecting a time slot, entering student name, subject, optional note, and email — no parent account required

### BOOK-02 — Parent sees a pending confirmation screen after request submission

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Parent sees a pending confirmation screen after request submission

### BOOK-03 — Booking has an explicit state machine: `requested → pending → confirmed → completed → cancelled`

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Booking has an explicit state machine: `requested → pending → confirmed → completed → cancelled`

### BOOK-04 — Booking creation is atomic — double-booking is impossible (DB-level unique constraint + atomic function)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Booking creation is atomic — double-booking is impossible (DB-level unique constraint + atomic function)

### BOOK-05 — Parent can complete direct booking (time slot → account creation → payment) when teacher already has Stripe connected

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Parent can complete direct booking (time slot → account creation → payment) when teacher already has Stripe connected

### BOOK-06 — Teacher can accept or decline booking requests from their dashboard

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can accept or decline booking requests from their dashboard

### STRIPE-01 — Teacher is NOT required to connect Stripe to publish their page or receive booking requests

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher is NOT required to connect Stripe to publish their page or receive booking requests

### STRIPE-02 — Teacher receives "money waiting" notification (email + in-app) when first booking request arrives, with a direct CTA to connect Stripe

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher receives "money waiting" notification (email + in-app) when first booking request arrives, with a direct CTA to connect Stripe

### STRIPE-03 — Teacher can complete Stripe Connect Express onboarding (2–3 min) via the "money waiting" notification link

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can complete Stripe Connect Express onboarding (2–3 min) via the "money waiting" notification link

### STRIPE-04 — Unconfirmed booking requests auto-cancel after 48 hours if teacher has not connected Stripe, with notification to both parties

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Unconfirmed booking requests auto-cancel after 48 hours if teacher has not connected Stripe, with notification to both parties

### STRIPE-05 — Payment is authorized (not captured) at booking time using `capture_method: manual`

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Payment is authorized (not captured) at booking time using `capture_method: manual`

### STRIPE-06 — Teacher marking a session as complete triggers automatic payment capture

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher marking a session as complete triggers automatic payment capture

### STRIPE-07 — Platform applies a 7% application fee on every captured payment via Stripe Connect

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Platform applies a 7% application fee on every captured payment via Stripe Connect

### NOTIF-01 — Teacher receives email when a booking request is submitted

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher receives email when a booking request is submitted

### NOTIF-02 — Teacher receives follow-up emails (at 24hr and 48hr) if Stripe has not been connected after a booking request arrives

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher receives follow-up emails (at 24hr and 48hr) if Stripe has not been connected after a booking request arrives

### NOTIF-03 — Both teacher and parent receive booking confirmation emails

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Both teacher and parent receive booking confirmation emails

### NOTIF-04 — Both teacher and parent receive a 24-hour reminder before each scheduled session

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Both teacher and parent receive a 24-hour reminder before each scheduled session

### NOTIF-05 — Both teacher and parent receive a cancellation notification

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Both teacher and parent receive a cancellation notification

### NOTIF-06 — Parent receives a session-complete email with a review prompt

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Parent receives a session-complete email with a review prompt

### DASH-01 — Teacher can view upcoming sessions

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can view upcoming sessions

### DASH-02 — Teacher can view and action pending booking requests (accept / decline)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can view and action pending booking requests (accept / decline)

### DASH-03 — Teacher can view earnings (completed sessions and total payout)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can view earnings (completed sessions and total payout)

### DASH-04 — Teacher can view their student list (name, subject, sessions completed)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can view their student list (name, subject, sessions completed)

### DASH-05 — Teacher can mark a session as complete

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can mark a session as complete

### DASH-06 — Teacher can toggle page Active / Draft from the dashboard (see VIS-01)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Teacher can toggle page Active / Draft from the dashboard (see VIS-01)

### PARENT-01 — Parent can create an account (email + password or Google SSO)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Parent can create an account (email + password or Google SSO)

### PARENT-02 — Parent can view booking history and upcoming sessions

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Parent can view booking history and upcoming sessions

### PARENT-03 — Parent can rebook a session with the same teacher

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Parent can rebook a session with the same teacher

### REVIEW-01 — Parent can leave a 1–5 star rating and optional text review after a completed session

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Parent can leave a 1–5 star rating and optional text review after a completed session

### REVIEW-02 — Reviews are displayed on the teacher's public landing page

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Reviews are displayed on the teacher's public landing page

### REVIEW-03 — Review prompt is delivered via email after session completion

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Review prompt is delivered via email after session completion

## Deferred

### AVAIL-04 — 5-minute granularity for availability slots

- Class: core-capability
- Status: deferred
- Description: Teachers can set availability in 5-minute increments instead of 1-hour blocks.
- Why it matters: Teachers with tight schedules need precise control over their available windows.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Requires DB schema change and migration of existing availability data.

### AVAIL-05 — Per-date availability overrides (not just recurring weekly)

- Class: core-capability
- Status: deferred
- Description: Teachers can set availability for specific dates, overriding their recurring weekly pattern.
- Why it matters: Real life isn't perfectly recurring — teachers have school events, holidays, personal commitments.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: New table or column needed. Current schema is purely recurring weekly.

### AVAIL-06 — Teachers can set availability weeks in advance

- Class: core-capability
- Status: deferred
- Description: Teachers can plan and publish their availability multiple weeks ahead to enable advance booking.
- Why it matters: Parents want to book ahead. Teachers want to plan their tutoring schedule alongside their school schedule.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Related to AVAIL-05 — per-date overrides enable week-by-week planning.

### AVAIL-07 — Redesigned availability editor with intuitive UX

- Class: quality-attribute
- Status: deferred
- Description: The availability editor is rebuilt to be super intuitive — easy to navigate, fast to set hours, visually clear.
- Why it matters: Current editor is a basic grid of 1-hour blocks. Needs to support 5-min granularity without being overwhelming.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Must support both recurring weekly and per-date override workflows.

### CANCEL-01 — Teacher can send last-minute cancellation notification to parent (email)

- Class: core-capability
- Status: deferred
- Description: Teacher can trigger an immediate cancellation notification to the parent via email when they can't make a session.
- Why it matters: Life happens. Teachers need a fast, one-tap way to notify parents of cancellations.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Email-only in M004. SMS added in M005.

### VERIFY-01 — Teacher identity verification system

- Class: differentiator
- Status: deferred
- Description: A mechanism to confirm that people signing up are actual current or former teachers, adding a trust layer for parents.
- Why it matters: Trust is the core value prop. Parents need to know they're booking verified educators.
- Source: user
- Primary owning slice: M005
- Supporting slices: none
- Validation: unmapped
- Notes: Research-dependent. No obvious turnkey API for teacher credential verification. State licensing databases are fragmented.

### SMS-01 — SMS session reminders to teachers and parents

- Class: core-capability
- Status: deferred
- Description: Session reminders sent via text message in addition to email.
- Why it matters: Text messages have much higher open rates than email. Critical for reducing no-shows.
- Source: user
- Primary owning slice: M005
- Supporting slices: none
- Validation: unmapped
- Notes: Requires Twilio or similar, phone number collection, opt-in consent. Ongoing cost.

### SMS-02 — SMS last-minute cancellation alerts

- Class: core-capability
- Status: deferred
- Description: Last-minute cancellation alerts sent via text message for immediate parent notification.
- Why it matters: Email may not be seen in time for a last-minute cancellation. Text is instant.
- Source: user
- Primary owning slice: M005
- Supporting slices: none
- Validation: unmapped
- Notes: Depends on SMS-01 infrastructure.

### CANCEL-02 — Teacher last-minute cancellation via text (SMS)

- Class: core-capability
- Status: deferred
- Description: The last-minute cancellation notification from CANCEL-01 is also sent via SMS.
- Why it matters: Parents need immediate notification — email alone may not be fast enough.
- Source: user
- Primary owning slice: M005
- Supporting slices: none
- Validation: unmapped
- Notes: Depends on SMS-01 and CANCEL-01.

## Out of Scope

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| LAND-01 | launchability | validated | M003/S01 | none | M003 — landing page built |
| LAND-02 | differentiator | validated | M003/S01 | none | M003 — interactive TeacherMockSection |
| LAND-03 | primary-user-loop | validated | M003/S01 | none | M003 — CTA links to /login |
| LAND-04 | quality-attribute | validated | M003/S01 | none | M003 — brand CSS + logo |
| LAND-05 | differentiator | validated | M003/S01 | none | M003 — slug URLs in multiple sections |
| ANIM-01 | quality-attribute | validated | M003/S02 | M003/S01 | M003 — AnimatedSection scroll reveals |
| ANIM-02 | quality-attribute | validated | M003/S02 | none | M003 — template.tsx page transitions |
| ANIM-03 | quality-attribute | validated | M003/S02 | none | M003 — OnboardingWizard AnimatePresence |
| ANIM-04 | quality-attribute | validated | M003/S02 | none | M003 — AnimatedList stagger |
| ANIM-05 | quality-attribute | validated | M003/S02 | none | M003 — AnimatedProfile fades |
| ANIM-06 | quality-attribute | validated | M003/S02 | none | M003 — AnimatedButton micro-interactions |
| MOBILE-01 | core-capability | validated | M003/S03 | none | M003 — MobileBottomNav 7 tabs |
| BRAND-01 | quality-attribute | validated | M003/S01 | M003/S02, M003/S03 | M003 — global palette, accent preserved |
| BRAND-02 | quality-attribute | validated | M003/S01 | M003/S03 | M003 — logo in all nav surfaces |
| SEO-01 | differentiator | validated | M003/S04 | none | M003 — generateMetadata + OG image route |
| SEO-02 | launchability | validated | M003/S01 | none | M003 — landing page OG tags |
| FIX-01 | continuity | validated | M003/S04 | none | M003 — social_email from getUser() |
| AVAIL-04 | core-capability | deferred | M004 | none | unmapped |
| AVAIL-05 | core-capability | deferred | M004 | none | unmapped |
| AVAIL-06 | core-capability | deferred | M004 | none | unmapped |
| AVAIL-07 | quality-attribute | deferred | M004 | none | unmapped |
| CANCEL-01 | core-capability | deferred | M004 | none | unmapped |
| VERIFY-01 | differentiator | deferred | M005 | none | unmapped |
| SMS-01 | core-capability | deferred | M005 | none | unmapped |
| SMS-02 | core-capability | deferred | M005 | none | unmapped |
| CANCEL-02 | core-capability | deferred | M005 | none | unmapped |

## Coverage Summary

- Active requirements: 0
- Validated: 76 (59 from M001/M002 + 17 from M003)
- Deferred: 9 (M004: 5, M005: 4)
- Unmapped active requirements: 0
