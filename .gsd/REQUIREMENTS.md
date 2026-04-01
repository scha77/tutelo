# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### PARENT-04 — Parent can manage multiple children under one account
- Class: core-capability
- Status: active
- Description: Parent account can add multiple children (name, grade level). Booking form allows selecting which child the session is for.
- Why it matters: Many families have multiple children needing tutoring. One account per family, not per child.
- Source: user
- Primary owning slice: M010/S01
- Supporting slices: none
- Validation: unmapped
- Notes: New children table. Replaces the current free-text student_name field in booking form with a child selector for logged-in parents.

### PARENT-05 — Parent can save payment methods for faster rebooking
- Class: quality-attribute
- Status: active
- Description: After first payment, parent's card is saved via Stripe Customer object. Future bookings can use saved card with one click.
- Why it matters: Reduces booking friction. Parent doesn't re-enter card details every time.
- Source: user
- Primary owning slice: M010/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Single saved card per parent. Auto-saved on first Stripe booking. Viewable/removable from parent dashboard.

### PARENT-06 — In-app messaging between parent and teacher
- Class: core-capability
- Status: active
- Description: Text-only messaging thread between parent and teacher within the app. One thread per teacher-parent relationship. New message notifications via email.
- Why it matters: Teachers and parents need to coordinate logistics (rescheduling, homework focus areas, progress updates) without exchanging personal phone numbers.
- Source: user
- Primary owning slice: M010/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Supabase Realtime for live updates. Per-relationship thread (not per-child or per-booking).

### PARENT-07 — Parent gets a login-required dashboard with booking history and upcoming sessions
- Class: core-capability
- Status: active
- Description: Authenticated parent dashboard at /parent with sidebar nav showing My Children, My Bookings (upcoming + history), Saved Card, and Messages. Layout mirrors teacher dashboard patterns.
- Why it matters: Parents need a home base to manage their tutoring relationships across multiple teachers and children.
- Source: inferred
- Primary owning slice: M010/S01
- Supporting slices: M010/S03, M010/S04
- Validation: unmapped
- Notes: Separate route group from teacher dashboard. Must handle dual-role users (someone who is both a teacher and a parent).

### PARENT-08 — Booking form child selector replaces free-text student name for logged-in parents
- Class: core-capability
- Status: active
- Description: When a logged-in parent with children on file books a session, the booking form shows a child dropdown instead of the free-text "Student's name" field. Guest bookings (no account) continue using free text.
- Why it matters: Ties bookings to structured child records for history and analytics. Reduces typos and inconsistencies.
- Source: inferred
- Primary owning slice: M010/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Backward compatible — existing bookings with free-text student_name stay as-is. New bookings from logged-in parents get child_id FK.

### PARENT-09 — Parent Stripe Customer created at account level for saved card reuse across teachers
- Class: core-capability
- Status: active
- Description: A Stripe Customer is created per parent account (not per teacher or per recurring schedule). The saved payment method is reusable across any teacher booking.
- Why it matters: Parents booking with multiple teachers shouldn't re-enter card details for each one.
- Source: inferred
- Primary owning slice: M010/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Existing recurring schedule Stripe Customers (per-schedule) stay as-is for backward compatibility. New parent-level Customer is the primary going forward.

### MSG-01 — One messaging thread per teacher-parent relationship with text messages
- Class: core-capability
- Status: active
- Description: A conversations table links teacher_id + parent_id. A messages table stores sender, body, and timestamp. Thread is auto-created on first message. Both teacher and parent can initiate.
- Why it matters: Structured threads prevent message sprawl and enable read-state tracking.
- Source: inferred
- Primary owning slice: M010/S04
- Supporting slices: none
- Validation: unmapped
- Notes: No file attachments. Text only.

### MSG-02 — Real-time message delivery via Supabase Realtime postgres_changes
- Class: quality-attribute
- Status: active
- Description: New messages appear instantly in the recipient's open chat without page refresh. Uses Supabase Realtime subscription on the messages table filtered by conversation_id.
- Why it matters: Real-time messaging is table stakes — polling or refresh-to-see-new-messages would feel broken.
- Source: inferred
- Primary owning slice: M010/S04
- Supporting slices: none
- Validation: unmapped
- Notes: First use of Supabase Realtime in the project. Requires enabling Realtime on the messages table in Supabase.

### MSG-03 — Email notification to recipient on new message
- Class: quality-attribute
- Status: active
- Description: When a message is sent, the recipient gets an email notification with a preview of the message and a link to the conversation. Rate-limited to prevent spam (e.g., batch messages within a 5-minute window into one email).
- Why it matters: Parents and teachers aren't always in the app. Email notification closes the loop.
- Source: inferred
- Primary owning slice: M010/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Uses existing Resend email infrastructure. New React Email template.

### ADMIN-01 — Admin dashboard with teacher count, booking volume, revenue metrics
- Class: operability
- Status: active
- Description: Protected admin route showing platform-wide metrics: total teachers, active teachers, total bookings, revenue (captured payments), conversion rates.
- Why it matters: Platform operator needs visibility into business health without querying the database directly.
- Source: user
- Primary owning slice: M010/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Read-only. Admin access gated by ADMIN_USER_IDS env var.

### ADMIN-02 — Admin can view recent activity (signups, bookings, completions)
- Class: operability
- Status: active
- Description: Activity feed showing recent platform events: new teacher signups, booking requests, session completions, Stripe connections.
- Why it matters: Quick pulse check on platform activity without running queries.
- Source: user
- Primary owning slice: M010/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Derived from existing tables (teachers.created_at, bookings.created_at, etc.). No new event system needed.

### ADMIN-04 — Admin access gated by ADMIN_USER_IDS env var allowlist
- Class: operability
- Status: active
- Description: Admin dashboard access is controlled by a comma-separated list of Supabase user IDs in ADMIN_USER_IDS env var. Non-admin users see 404.
- Why it matters: Simple, no-migration access control that fits pre-scale stage.
- Source: inferred
- Primary owning slice: M010/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Can be upgraded to DB role later if needed.

### AUTH-03 — Teacher or parent can sign in with Google SSO
- Class: core-capability
- Status: active
- Description: A "Continue with Google" button on the login/signup page initiates OAuth via Supabase Google provider. On first sign-in, a new user record is created automatically. On return, the existing session is resumed. Works for both teacher and parent accounts.
- Why it matters: Google SSO removes the password barrier — teachers and parents already have Google accounts and trust the flow. Reduces signup abandonment and "forgot password" support burden.
- Source: user
- Primary owning slice: M010/S02
- Supporting slices: none
- Validation: unmapped
- Notes: LoginForm.tsx already has the Google OAuth button wired. Needs Supabase provider configured and end-to-end verification.

### AUTH-04 — Teacher can verify school affiliation via .edu email OTP after Google login
- Class: differentiator
- Status: active
- Description: After signing in with Google (or email+password), a teacher can still trigger the school email verification flow — entering their school email address, receiving a one-time code, and confirming it. The verified school email is stored independently of the auth provider email. A "verified" badge appears on their profile once confirmed.
- Why it matters: Many teachers have a personal Gmail they use for everything, but their credibility signal is their school email. Decoupling auth from verification means they get the convenience of Google login without losing the trust badge.
- Source: user
- Primary owning slice: M010/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Verification OTP flow already exists (VERIFY-01, M005/S03). This requirement tracks the guarantee that it works post-Google-login.

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
- Notes: Deferred until platform reaches scale where manual DB intervention is insufficient. Depends on ADMIN-01/ADMIN-02 foundation.

### A2P-01 — A2P 10DLC carrier registration for production SMS delivery
- Class: operability
- Status: deferred
- Description: Register with carriers for A2P 10DLC compliance so SMS messages reach non-test phone numbers.
- Why it matters: SMS code is complete and tested but production delivery is blocked until carrier registration (2-4 weeks external process).
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: External process, not a code task. Twilio campaign registration required.

## Out of Scope

(No items currently out of scope.)

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| PARENT-04 | core-capability | active | M010/S01 | none | unmapped |
| PARENT-05 | quality-attribute | active | M010/S03 | none | unmapped |
| PARENT-06 | core-capability | active | M010/S04 | none | unmapped |
| PARENT-07 | core-capability | active | M010/S01 | M010/S03, M010/S04 | unmapped |
| PARENT-08 | core-capability | active | M010/S01 | none | unmapped |
| PARENT-09 | core-capability | active | M010/S03 | none | unmapped |
| MSG-01 | core-capability | active | M010/S04 | none | unmapped |
| MSG-02 | quality-attribute | active | M010/S04 | none | unmapped |
| MSG-03 | quality-attribute | active | M010/S04 | none | unmapped |
| ADMIN-01 | operability | active | M010/S05 | none | unmapped |
| ADMIN-02 | operability | active | M010/S05 | none | unmapped |
| ADMIN-04 | operability | active | M010/S05 | none | unmapped |
| AUTH-03 | core-capability | active | M010/S02 | none | unmapped |
| AUTH-04 | differentiator | active | M010/S02 | none | unmapped |
| ADMIN-03 | operability | deferred | none | none | unmapped |
| A2P-01 | operability | deferred | none | none | unmapped |

## Coverage Summary

- Active requirements: 14
- Mapped to slices: 14
- Validated: 108
- Deferred: 2
- Unmapped active requirements: 0
