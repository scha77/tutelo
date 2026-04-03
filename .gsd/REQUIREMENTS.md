# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### UI-01 — Teacher profile page visual overhaul
- Class: quality-attribute
- Status: active
- Description: The teacher public profile page (/[slug]) — hero, credentials bar, about section, reviews section, social links — gets a premium visual treatment. Polished typography, intentional spacing, refined card treatments, better visual hierarchy.
- Why it matters: This is the conversion page. Parents land here from a shared link — the first impression determines whether they book.
- Source: user
- Primary owning slice: M011/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Must feel premium and intentional, never like a generic template. The teacher's accent color should still work as a personalization layer.

### UI-02 — Booking calendar step flow restructure and polish
- Class: quality-attribute
- Status: active
- Description: The multi-step booking flow (date → time → form → payment) gets both structural refactoring and visual polish. Steps feel smooth and clear. The 935-line BookingCalendar monolith gets decomposed into cohesive sub-components.
- Why it matters: The booking flow is where conversion happens. A heavy or confusing flow loses parents. Structural refactoring makes the component maintainable.
- Source: user
- Primary owning slice: M011/S02
- Supporting slices: none
- Validation: unmapped
- Notes: All existing booking paths must continue to work — deferred, direct, recurring. Session type selection, child selector, recurring options all still functional.

### UI-03 — Mobile navigation overhaul with labeled primary tabs and More menu
- Class: core-capability
- Status: active
- Description: Teacher mobile bottom nav (currently 11 unlabeled icons + sign out) replaced with 4-5 labeled primary tabs and a "More" menu for remaining items. Parent mobile nav (5 unlabeled icons + sign out) similarly gets visible labels. Users can navigate without guessing what icons mean.
- Why it matters: The current mobile nav is a barrier to navigation — users must guess or tap randomly to discover features.
- Source: user
- Primary owning slice: M011/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Primary tabs should be the most-used destinations. "More" menu surfaces remaining items with labels and descriptions.

### UI-04 — Teacher dashboard visual polish
- Class: quality-attribute
- Status: active
- Description: All teacher dashboard pages (overview, sessions, requests, students, waitlist, page, availability, promote, analytics, messages, settings) get premium visual treatment — better card designs, visual hierarchy, stats presentation, empty states, spacing.
- Why it matters: Teachers use the dashboard daily. It should feel professional and easy to scan.
- Source: user
- Primary owning slice: M011/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Must maintain all existing functionality. Focus on visual hierarchy, card treatments, and information density.

### UI-05 — Parent dashboard visual polish
- Class: quality-attribute
- Status: active
- Description: All parent dashboard pages (overview, children, bookings, payment, messages) get the same premium treatment as the teacher dashboard.
- Why it matters: Parents are paying customers — their dashboard should feel as polished as the teacher side.
- Source: user
- Primary owning slice: M011/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Smaller surface area than teacher dashboard (5 pages vs 11), can be done in same slice.

### UI-06 — Landing page visual tightening
- Class: quality-attribute
- Status: active
- Description: The marketing landing page gets a tightening pass — sharper typography, more intentional spacing, refined micro-interactions. No structural changes.
- Why it matters: Landing page is the first touchpoint for teachers discovering Tutelo.
- Source: user
- Primary owning slice: M011/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Landing page already got design attention in M003. This is refinement, not redesign.

### UI-07 — Global consistency pass across all surfaces
- Class: quality-attribute
- Status: active
- Description: Typography scale, spacing rhythm, border radii, shadow treatment, and component patterns are consistent across every surface — landing, profile, both dashboards, booking flow, login, onboarding, directory.
- Why it matters: The app should feel like one cohesive product, not 10 milestones of accumulated features.
- Source: user
- Primary owning slice: M011/S05
- Supporting slices: M011/S01, M011/S02, M011/S03, M011/S04
- Validation: unmapped
- Notes: May involve updating globals.css, establishing a spacing scale, and auditing component usage.

### UI-08 — App never looks like a generic template
- Class: constraint
- Status: active
- Description: Every surface must have intentional, premium design choices. No default shadcn/ui with default spacing. Card treatments, typography, colors, and layout should feel bespoke to Tutelo.
- Why it matters: User's explicit negative constraint — the app must never look like a template.
- Source: user
- Primary owning slice: M011/all
- Supporting slices: none
- Validation: unmapped
- Notes: Quality constraint applied across all slices, not a standalone deliverable.

### UI-09 — App never feels clunky or confusing
- Class: constraint
- Status: active
- Description: Interactions are smooth, navigation is clear, affordances are obvious, transitions are intentional. No mystery icons, no jarring layout shifts, no walls of undifferentiated content.
- Why it matters: User's explicit negative constraint — the app must never feel clunky or confusing.
- Source: user
- Primary owning slice: M011/all
- Supporting slices: none
- Validation: unmapped
- Notes: Quality constraint applied across all slices, not a standalone deliverable.

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
- Validated by: M003 — --primary=#3b4d3e in :root; teacher accent_color still applied on [slug] page

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
- Primary Slice: M001/S01

### AUTH-02 — User session persists across browser refresh
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S01

### ONBOARD-01 — Teacher completes setup wizard with no payment required to publish
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S02

### ONBOARD-02 — Teacher selects tutoring subjects
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S02

### ONBOARD-03 — Teacher selects grade ranges
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S02

### ONBOARD-04 — Teacher sets IANA timezone
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S02

### ONBOARD-05 — Teacher sets weekly availability via visual calendar
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S02

### ONBOARD-06 — Teacher sets hourly rate with local benchmark
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S02

### ONBOARD-07 — Teacher receives shareable public URL on publish
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S02

### PAGE-01 — Auto-generated public page at slug URL
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S03

### PAGE-02 — Page displays name, photo, school, city/state
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S03

### PAGE-03 — Page displays credential bar
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S03

### PAGE-04 — Page displays auto-generated bio
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S03

### PAGE-05 — Page displays subjects, rate, calendar, reviews
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S03

### PAGE-06 — Sticky "Book Now" CTA on mobile
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S03

### PAGE-07 — Page applies teacher's accent color
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S03

### PAGE-08 — Page displays teacher's custom headline
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S03

### PAGE-09 — Page displays teacher's banner image
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S03

### PAGE-10 — Page displays teacher's social/contact links
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S03

### CUSTOM-01 — Teacher can select accent color from preset palette
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S04

### CUSTOM-02 — Teacher can add custom headline
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S04

### CUSTOM-03 — Teacher can add social/contact links
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S04

### CUSTOM-04 — Teacher can upload banner image
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S04

### AVAIL-01 — Teacher can view and edit weekly availability from dashboard
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S05

### AVAIL-02 — Available time slots displayed on public page
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S05

### AVAIL-03 — Public page auto-detects viewer timezone
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S05

### VIS-01 — Teacher can toggle page Active/Draft
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S04

### VIS-02 — Hidden page shows graceful "not available" state
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S04

### BOOK-01 — Parent can submit booking request without account
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S06

### BOOK-02 — Parent sees pending confirmation screen
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S06

### BOOK-03 — Booking state machine: requested → pending → confirmed → completed → cancelled
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S06

### BOOK-04 — Atomic booking creation prevents double-booking
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S06

### BOOK-05 — Direct booking with payment when Stripe connected
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S07

### BOOK-06 — Teacher can accept or decline requests
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S06

### STRIPE-01 — Teacher NOT required to connect Stripe to publish
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S07

### STRIPE-02 — "Money waiting" notification on first booking
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S07

### STRIPE-03 — Teacher completes Stripe Connect Express onboarding
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S07

### STRIPE-04 — Unconfirmed requests auto-cancel after 48 hours
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S07

### STRIPE-05 — Payment authorized (not captured) at booking time
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S07

### STRIPE-06 — Session completion triggers payment capture
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S07

### STRIPE-07 — 7% platform application fee on captured payments
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S07

### NOTIF-01 — Teacher receives email on booking request
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S08

### NOTIF-02 — Follow-up emails at 24hr and 48hr for Stripe connection
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S08

### NOTIF-03 — Booking confirmation emails to both parties
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S08

### NOTIF-04 — 24-hour session reminder emails
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S08

### NOTIF-05 — Cancellation notification emails
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S08

### NOTIF-06 — Session-complete email with review prompt
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S08

### DASH-01 — Teacher can view upcoming sessions
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S09

### DASH-02 — Teacher can action pending requests
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S09

### DASH-03 — Teacher can view earnings
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S09

### DASH-04 — Teacher can view student list
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S09

### DASH-05 — Teacher can mark session complete
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S09

### DASH-06 — Teacher can toggle page Active/Draft from dashboard
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S09

### PARENT-01 — Parent can create account
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S10

### PARENT-02 — Parent can view booking history and upcoming sessions
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S10

### PARENT-03 — Parent can rebook with same teacher
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S10

### REVIEW-01 — Parent can leave 1-5 star rating and text review
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S11

### REVIEW-02 — Reviews displayed on teacher's public page
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S11

### REVIEW-03 — Review prompt via email after session completion
- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: M001/S11

### AVAIL-04 — 5-minute granularity for availability slots
- Status: validated
- Class: core-capability
- Source: user
- Primary Slice: M004/S01
- Validated by: M004 — 5-min editor + 25 tests

### AVAIL-05 — Per-date availability overrides
- Status: validated
- Class: core-capability
- Source: user
- Primary Slice: M004/S02
- Validated by: M004 — overrides table + precedence logic

### AVAIL-06 — Teachers can set availability weeks in advance
- Status: validated
- Class: core-capability
- Source: user
- Primary Slice: M004/S02
- Validated by: M004 — per-date overrides + 90-day window

### AVAIL-07 — Redesigned availability editor with intuitive UX
- Status: validated
- Class: quality-attribute
- Source: user
- Primary Slice: M004/S01
- Validated by: M004 — editor rewrite + Tabs shell

### CANCEL-01 — Teacher can send last-minute cancellation notification
- Status: validated
- Class: core-capability
- Source: user
- Primary Slice: M004/S04
- Validated by: M004 — cancelSession + 8 tests

### VERIFY-01 — Teacher identity verification system
- Status: validated
- Class: differentiator
- Source: user
- Primary Slice: M005/S03
- Validated by: M005/S03 — school email verification flow; 9 unit tests

### SMS-01 — SMS session reminders
- Status: validated
- Class: core-capability
- Source: user
- Primary Slice: M005/S01
- Validated by: M005/S01 — Twilio SMS, cron extended, opt-in gated

### SMS-02 — SMS last-minute cancellation alerts
- Status: validated
- Class: core-capability
- Source: user
- Primary Slice: M005/S01
- Validated by: M005/S01+S02 — cancelSession sends SMS synchronously

### CANCEL-02 — Teacher last-minute cancellation via SMS
- Status: validated
- Class: core-capability
- Source: user
- Primary Slice: M005/S01
- Validated by: M005/S01+S02 — cancelSession: SMS + email in same request

### QR-01 — Teacher can download a high-res QR code PNG of their profile URL from dashboard
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M006/S01
- Validated by: M006/S01 — QRCodeCard renders 192px live preview and hidden 512px canvas for high-res PNG download

### QR-02 — Teacher can download a printable mini-flyer (QR + name + subjects + CTA)
- Class: differentiator
- Status: validated
- Source: user
- Primary Slice: M006/S01
- Validated by: M006/S01 — /api/flyer/[slug] returns 1200×1600 ImageResponse PNG

### SWIPE-01 — Dashboard shows pre-written announcement templates interpolated with teacher data
- Class: differentiator
- Status: validated
- Source: user
- Primary Slice: M006/S02
- Validated by: M006/S02 — 4 announcement templates rendered with teacher data; 59 unit tests pass

### SWIPE-02 — One-click copy-to-clipboard for each template
- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M006/S02
- Validated by: M006/S02 — SwipeFileCard copy button with navigator.clipboard + execCommand fallback

### OG-01 — OG image renders correctly across major platforms
- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M006/S03
- Validated by: M006/S03 — openGraph.url added to generateMetadata; 4 unit tests pass

### CAP-01 — Teacher can set max active students or max weekly sessions in dashboard settings
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M007/S01
- Validated by: M007/S01 — CapacitySettings component with toggle + number input; Zod-validated 1–100

### CAP-02 — Profile page shows "at capacity" state when limit reached
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M007/S01
- Validated by: M007/S01 — AtCapacitySection vs BookingCalendar conditional render; HeroSection always visible

### WAIT-01 — Parent can join waitlist when teacher is at capacity
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M007/S02
- Validated by: M007/S01+S02 — /api/waitlist POST with supabaseAdmin; unique constraint; 15 capacity tests

### WAIT-02 — Teacher sees waitlist in dashboard and can manually open spots
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M007/S02
- Validated by: M007/S02 — /dashboard/waitlist RSC page with removeWaitlistEntry server action

### WAIT-03 — Waitlisted parents auto-notified via email when capacity frees up
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M007/S02
- Validated by: M007/S02 — checkAndNotifyWaitlist utility; 7 unit + 1 integration test pass

### SESS-01 — Teacher can define session types with custom labels, prices, and optional durations
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M007/S03
- Validated by: M007/S03 — SessionTypeManager CRUD; 8 session-type-pricing unit tests pass

### SESS-02 — Booking flow shows session type selector with correct price per type
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M007/S03
- Validated by: M007/S03 — BookingCalendar session type picker; 18 booking-slots tests pass

### SESS-03 — Stripe payment intent uses session-type price instead of flat hourly_rate
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M007/S03
- Validated by: M007/S03 — 8 unit tests; dollar-to-cent Math.round(Number(price)*100)

### SESS-04 — Teachers without session types continue using single hourly_rate (backward compatible)
- Class: continuity
- Status: validated
- Source: user
- Primary Slice: M007/S03
- Validated by: M007/S03 — Hourly-rate fallback test passes; subject dropdown guard verified

### DIR-01 — Public /tutors directory page listing published teachers with filters
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M008/S01
- Validated by: M008/S01 — /tutors page with working filters

### DIR-02 — Filter by subject, grade level, location, and price range
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M008/S01
- Validated by: M008/S01 — URL query param filters on /tutors

### DIR-03 — Full-text search across teacher name, school, subjects, bio
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M008/S02
- Validated by: M008/S02 — tsvector + GIN index; 'SAT prep' search returns matching teachers

### SEO-03 — XML sitemap listing all published teacher profile URLs
- Class: launchability
- Status: validated
- Source: inferred
- Primary Slice: M008/S03
- Validated by: M008/S03 — /sitemap.xml lists all published teacher URLs

### SEO-04 — SEO-optimized category pages (/tutors/math, /tutors/chicago, etc.)
- Class: differentiator
- Status: validated
- Source: user
- Primary Slice: M008/S03
- Validated by: M008/S03 — /tutors/math shows only math teachers with correct page title

### ANALYTICS-01 — Track page views on teacher /[slug] pages
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M008/S04
- Validated by: M008/S04 — page_views table + /api/track-view endpoint

### ANALYTICS-02 — Teacher dashboard shows view count and booking conversion funnel
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M008/S04
- Validated by: M008/S04 — /dashboard/analytics with views, form opens, bookings, conversion rate

### RECUR-01 — Parent can set a recurring schedule when booking
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M009/S01
- Validated by: M009/S01 — RecurringOptions.tsx + check-conflicts endpoint; 8 tests pass

### RECUR-02 — System auto-creates future booking rows for recurring schedule
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M009/S01
- Validated by: M009/S01 — recurring_schedules table + create-recurring route; 9 tests pass

### RECUR-03 — Each recurring session has individual payment handling
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M009/S02
- Validated by: M009/S02 — per-session PI from saved card; 8 tests pass

### RECUR-04 — Teacher and parent can cancel individual sessions or entire recurring series
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M009/S03
- Validated by: M009/S03 — cancelSingleRecurringSession + cancelRecurringSeries; 16+10 tests pass

### RECUR-05 — Recurring bookings respect availability and prevent double-booking
- Class: continuity
- Status: validated
- Source: inferred
- Primary Slice: M009/S01
- Validated by: M009/S01 — checkDateConflicts utility; 8 conflict tests pass

### RECUR-06 — Saved card via Stripe Customer + SetupIntent for auto-charge
- Class: core-capability
- Status: validated
- Source: inferred
- Primary Slice: M009/S02
- Validated by: M009/S01+S02 — PI with setup_future_usage:'off_session'; webhook stores stripe_payment_method_id

### RECUR-07 — Cron charges upcoming recurring sessions 24h before
- Class: core-capability
- Status: validated
- Source: inferred
- Primary Slice: M009/S02
- Validated by: M009/S02 — /api/cron/recurring-charges at 0 12 * * *; 8 tests pass

### RECUR-08 — Parent self-service cancellation via secure link/page
- Class: core-capability
- Status: validated
- Source: inferred
- Primary Slice: M009/S03
- Validated by: M009/S03 — /manage/[token] + cancel routes; 10 tests pass

### RECUR-09 — Recurring sessions visible in dashboard with series badge
- Class: quality-attribute
- Status: validated
- Source: inferred
- Primary Slice: M009/S03
- Validated by: M009/S03 — Recurring + Payment Failed badges on ConfirmedSessionCard

### PARENT-04 — Parent can manage multiple children under one account
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M010/S01
- Validated by: M010/S01 — children table with RLS + child_id FK on bookings, /api/parent/children CRUD, child selector in BookingCalendar; 46 tests

### PARENT-05 — Parent can save payment methods for faster rebooking
- Class: quality-attribute
- Status: validated
- Source: user
- Primary Slice: M010/S03
- Validated by: M010/S03 — parent_profiles table, webhook PM upsert, /parent/payment page; 18 tests

### PARENT-06 — In-app messaging between parent and teacher
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M010/S04
- Validated by: M010/S04 — conversations + messages tables, Realtime subscription, ChatWindow; 21 tests

### PARENT-07 — Parent gets a login-required dashboard with booking history and upcoming sessions
- Class: core-capability
- Status: validated
- Source: inferred
- Primary Slice: M010/S01
- Validated by: M010/S01 — /parent route group with 3 pages, ParentSidebar + ParentMobileNav; 15 tests

### PARENT-08 — Booking form child selector replaces free-text student name for logged-in parents
- Class: core-capability
- Status: validated
- Source: inferred
- Primary Slice: M010/S01
- Validated by: M010/S01 — BookingCalendar child selector with useEffect + fetch pattern; 15 tests

### PARENT-09 — Parent Stripe Customer created at account level for saved card reuse across teachers
- Class: core-capability
- Status: validated
- Source: inferred
- Primary Slice: M010/S03
- Validated by: M010/S03 — parent_profiles.stripe_customer_id, Customer reuse across booking routes; 18 tests

### MSG-01 — One messaging thread per teacher-parent relationship with text messages
- Class: core-capability
- Status: validated
- Source: inferred
- Primary Slice: M010/S04
- Validated by: M010/S04 — conversations table with UNIQUE constraint, messages table, auto-creation; 21 tests

### MSG-02 — Real-time message delivery via Supabase Realtime postgres_changes
- Class: quality-attribute
- Status: validated
- Source: inferred
- Primary Slice: M010/S04
- Validated by: M010/S04 — Supabase Realtime subscription with dedup, migration 0019 Realtime publication

### MSG-03 — Email notification to recipient on new message
- Class: quality-attribute
- Status: validated
- Source: inferred
- Primary Slice: M010/S04
- Validated by: M010/S04 — NewMessageEmail template, 5-min rate limit, Resend delivery

### ADMIN-01 — Admin dashboard with teacher count, booking volume, revenue metrics
- Class: operability
- Status: validated
- Source: user
- Primary Slice: M010/S05
- Validated by: M010/S05 — 6 stat cards, Promise.all queries; 9 tests

### ADMIN-02 — Admin can view recent activity (signups, bookings, completions)
- Class: operability
- Status: validated
- Source: user
- Primary Slice: M010/S05
- Validated by: M010/S05 — 15-item activity feed, derived from existing tables

### ADMIN-04 — Admin access gated by ADMIN_USER_IDS env var allowlist
- Class: operability
- Status: validated
- Source: inferred
- Primary Slice: M010/S05
- Validated by: M010/S05 — notFound() for non-admins, ADMIN_USER_IDS env var; 9 tests

### AUTH-03 — Teacher or parent can sign in with Google SSO
- Class: core-capability
- Status: validated
- Source: user
- Primary Slice: M010/S02
- Validated by: M010/S02 — Fixed OAuth redirectTo bug, 7 tests

### AUTH-04 — Teacher can verify school affiliation via .edu email OTP after Google login
- Class: differentiator
- Status: validated
- Source: user
- Primary Slice: M010/S02
- Validated by: M010/S02 — Provider-agnostic smoke test confirms no provider-specific logic

## Deferred

### ADMIN-03 — Admin moderation (suspend teachers, remove reviews, refund bookings)
- Class: operability
- Status: deferred
- Description: Full admin moderation actions including teacher suspension, review removal, and booking refunds.
- Why it matters: Will be needed as the platform scales, but premature at current stage.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred until platform reaches scale where manual DB intervention is insufficient.

### A2P-01 — A2P 10DLC carrier registration for production SMS delivery
- Class: operability
- Status: deferred
- Description: Register with carriers for A2P 10DLC compliance so SMS messages reach non-test phone numbers.
- Why it matters: SMS code is complete and tested but production delivery is blocked until carrier registration.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: External process, not a code task.

### UI-10 — Dark mode support across all surfaces
- Class: quality-attribute
- Status: deferred
- Description: Full dark mode support with theme toggle, verified across all 30 pages and 65 components.
- Why it matters: CSS variable foundation exists but no component has been tested against it.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred by user decision. Foundation is in place for a future milestone.

## Out of Scope

(No items currently out of scope.)

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| UI-01 | quality-attribute | active | M011/S01 | none | unmapped |
| UI-02 | quality-attribute | active | M011/S02 | none | unmapped |
| UI-03 | core-capability | active | M011/S03 | none | unmapped |
| UI-04 | quality-attribute | active | M011/S04 | none | unmapped |
| UI-05 | quality-attribute | active | M011/S04 | none | unmapped |
| UI-06 | quality-attribute | active | M011/S05 | none | unmapped |
| UI-07 | quality-attribute | active | M011/S05 | M011/S01-S04 | unmapped |
| UI-08 | constraint | active | M011/all | none | unmapped |
| UI-09 | constraint | active | M011/all | none | unmapped |
| ADMIN-03 | operability | deferred | none | none | unmapped |
| A2P-01 | operability | deferred | none | none | unmapped |
| UI-10 | quality-attribute | deferred | none | none | unmapped |

## Coverage Summary

- Active requirements: 9
- Mapped to slices: 9
- Validated: 115
- Deferred: 3
- Unmapped active requirements: 0
