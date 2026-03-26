# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### QR-01 — Teacher can download a high-res QR code PNG of their profile URL from dashboard
- Class: core-capability
- Status: validated
- Description: Dashboard page shows a preview of the teacher's QR code encoding their tutelo.app/[slug] URL, with a download button for high-res PNG.
- Why it matters: Education is paper-heavy — take-home folders, back-to-school flyers, syllabi. Teachers need a dead-simple way to get their booking link onto print materials.
- Source: user
- Primary owning slice: M006/S01
- Supporting slices: none
- Validation: M006/S01 — QRCodeCard renders 192px live preview and hidden 512px canvas for high-res PNG download via toDataURL; npx tsc --noEmit exits 0; npm run build passes; /dashboard/promote in route manifest.
- Notes: No DB changes needed — purely derived from existing slug.

### QR-02 — Teacher can download a printable mini-flyer (QR + name + subjects + CTA)
- Class: differentiator
- Status: validated
- Description: A styled, print-ready flyer template featuring the QR code, teacher name, subjects, hourly rate, and "Book a session" CTA. Downloadable as PNG or PDF.
- Why it matters: Teachers shouldn't have to design their own flyer — give them something ready to print and hand out at back-to-school night.
- Source: user
- Primary owning slice: M006/S01
- Supporting slices: none
- Validation: M006/S01 — /api/flyer/[slug] returns 1200×1600 ImageResponse PNG with teacher name, subject pill tags, hourly rate, QR code, and 'Scan to book a session' CTA; /api/flyer/[slug] in route manifest; npm run build passes.
- Notes: Uses existing teacher profile data. No DB changes.

### SWIPE-01 — Dashboard shows pre-written announcement templates interpolated with teacher data
- Class: differentiator
- Status: validated
- Description: A dashboard page or section showing pre-written announcement templates (email signature block, parent newsletter blurb, Facebook/social post, back-to-school night handout text) with the teacher's name, subjects, link, and rate interpolated.
- Why it matters: Teachers experience decision fatigue by 3:30 PM. They shouldn't have to figure out how to announce their tutoring business. Give them exact scripts.
- Source: user
- Primary owning slice: M006/S02
- Supporting slices: none
- Validation: M006/S02 — 4 announcement templates (Email Signature, Newsletter Blurb, Social Media Post, Back-to-School Handout) rendered in promote page with teacher data interpolated; 59 unit tests pass covering all edge cases
- Notes: No DB changes. Content writing: craft compelling, teacher-voice templates.

### SWIPE-02 — One-click copy-to-clipboard for each template
- Class: quality-attribute
- Status: validated
- Description: Each announcement template has a copy button that copies the interpolated text to clipboard with a "Copied!" confirmation.
- Why it matters: Friction kills adoption. One click from template to paste.
- Source: user
- Primary owning slice: M006/S02
- Supporting slices: none
- Validation: M006/S02 — SwipeFileCard copy button uses navigator.clipboard with execCommand fallback; shows "Copied!" for 2 seconds then resets; microPress animation on button; npm run build passes
- Notes: Uses navigator.clipboard API.

### OG-01 — OG image renders correctly across major platforms
- Class: quality-attribute
- Status: validated
- Description: Verify that the existing dynamic OG image (opengraph-image.tsx) renders correctly in iMessage, WhatsApp, Facebook, LinkedIn, Slack, and Discord link previews. Fix any platform-specific quirks.
- Why it matters: When a teacher texts their Tutelo link, it needs to unfurl into a professional preview card — not a grey box.
- Source: user
- Primary owning slice: M006/S03
- Supporting slices: none
- Validation: M006/S03 — openGraph.url added to generateMetadata in src/app/[slug]/page.tsx; 4 unit tests pass verifying og:url, og:title, og:type='profile', and twitter:card='summary_large_image' shape; npm run build passes. Manual platform unfurl verification (iMessage/WhatsApp/Facebook) is a UAT step post-deploy against live tutelo.app URL.
- Notes: OG infrastructure (opengraph-image.tsx, metadataBase) was complete from M003. Only the og:url field was missing — added in M006/S03. The hardcoded canonical URL (https://tutelo.app/${slug}) ensures Facebook deduplication/caching works correctly across deployments.

### CAP-01 — Teacher can set max active students or max weekly sessions in dashboard settings
- Class: core-capability
- Status: validated
- Description: Dashboard settings include a capacity limit field (nullable — null means unlimited). System counts active bookings/students against this limit.
- Why it matters: Side-hustling teachers may only have room for 3 students. They need to control capacity without removing their link.
- Source: user
- Primary owning slice: M007/S01
- Supporting slices: none
- Validation: M007/S01 — capacity_limit column added to teachers table (migration 0011); CapacitySettings component in dashboard/settings lets teachers set or clear limit (1–100); updateProfile action extended with z.number().int().min(1).max(100).nullable(); npx tsc --noEmit exits 0; npm run build passes.
- Notes: New capacity_limit column on teachers table.

### CAP-02 — Profile page shows "at capacity" state when limit reached
- Class: core-capability
- Status: validated
- Description: When a teacher's capacity is reached, the profile page shows "Currently at capacity" instead of the booking calendar. The teacher's info remains visible.
- Why it matters: Better than an empty calendar or a confusing "no slots available" message.
- Source: user
- Primary owning slice: M007/S01
- Supporting slices: M007/S02
- Validation: M007/S01 — Profile RSC checks capacity before rendering; AtCapacitySection shows 'Currently at capacity' with teacher name and WaitlistForm; BookingCalendar replaced when at capacity; BookNowCTA hidden; safe fallback to booking calendar on query error; /api/waitlist in route manifest; npm run build exits 0.
- Notes: Must handle edge cases: concurrent bookings near capacity, cancellations freeing capacity.

### WAIT-01 — Parent can join waitlist when teacher is at capacity
- Class: core-capability
- Status: validated
- Description: When a teacher is at capacity, parents can enter their email to be notified when a spot opens.
- Why it matters: Captures demand that would otherwise bounce. Teacher keeps their link active even when full.
- Source: user
- Primary owning slice: M007/S02
- Supporting slices: none
- Validation: M007/S01 — waitlist table created with RLS (anon insert, teacher-gated select/delete); WaitlistForm component POSTs to /api/waitlist; API route validates email, inserts via supabaseAdmin, returns 201/409/400/500 with appropriate messages; duplicate email returns friendly 'already on waitlist' state; npm run build passes with /api/waitlist in route manifest.
- Notes: New waitlist table: (id, teacher_id, parent_email, created_at, notified_at).

### WAIT-02 — Teacher sees waitlist in dashboard and can manually open spots
- Class: core-capability
- Status: active
- Description: Dashboard shows waitlisted parents with email and join date. Teacher can manually adjust capacity or remove waitlist entries.
- Why it matters: Teacher maintains control over their practice size.
- Source: user
- Primary owning slice: M007/S02
- Supporting slices: none
- Validation: unmapped
- Notes: none

### WAIT-03 — Waitlisted parents auto-notified via email when capacity frees up
- Class: core-capability
- Status: active
- Description: When a booking is cancelled or a student leaves, freeing capacity below the limit, waitlisted parents are automatically notified via email with a link to book.
- Why it matters: Closes the loop — parents who expressed interest shouldn't have to check back manually.
- Source: user
- Primary owning slice: M007/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Trigger on booking cancellation/completion. Email template needed.

### SESS-01 — Teacher can define session types with custom labels, prices, and optional durations
- Class: core-capability
- Status: active
- Description: Dashboard settings allow teachers to create session types (e.g., "SAT Prep $45", "General Math $35") with label, price, and optional duration. Ordered by sort_order.
- Why it matters: Some teachers charge differently for test prep vs homework help. A single flat rate is too limiting.
- Source: user
- Primary owning slice: M007/S03
- Supporting slices: none
- Validation: unmapped
- Notes: New session_types table: (id, teacher_id, label, price, duration_minutes, sort_order).

### SESS-02 — Booking flow shows session type selector with correct price per type
- Class: core-capability
- Status: active
- Description: When a teacher has session types defined, the booking form shows a session type selector. The displayed price updates based on selection.
- Why it matters: Parents need to know what they're paying for and how much before committing.
- Source: user
- Primary owning slice: M007/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Falls back to subject selector + hourly_rate when no session types defined.

### SESS-03 — Stripe payment intent uses session-type price instead of flat hourly_rate
- Class: core-capability
- Status: active
- Description: The create-intent API route uses the selected session type's price to compute the payment amount, replacing the flat hourly_rate calculation.
- Why it matters: Correct billing. Parents must be charged the price they saw.
- Source: user
- Primary owning slice: M007/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Must validate session_type_id belongs to the teacher. Falls back to hourly_rate when no session type selected.

### SESS-04 — Teachers without session types continue using single hourly_rate (backward compatible)
- Class: continuity
- Status: active
- Description: Existing teachers with no session types defined continue to work exactly as before — single hourly_rate, subject selector in booking form.
- Why it matters: No breaking change for existing teachers. Migration must be seamless.
- Source: user
- Primary owning slice: M007/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Default behavior when session_types is empty.

### DIR-01 — Public /tutors directory page listing published teachers with filters
- Class: core-capability
- Status: active
- Description: A browseable /tutors page showing published teachers as cards, with filters for subject, grade level, location (city/state), and price range.
- Why it matters: Right now parents can only find teachers via direct link. A directory enables organic discovery.
- Source: user
- Primary owning slice: M008/S01
- Supporting slices: M008/S02, M008/S03
- Validation: unmapped
- Notes: Only shows is_published=true teachers. Must be SEO-friendly with proper meta tags.

### DIR-02 — Filter by subject, grade level, location, and price range
- Class: core-capability
- Status: active
- Description: Directory filters work via URL query params (shareable/bookmarkable). Filters are subject (multi-select from known list), grade level (multi-select), city/state, and hourly_rate range.
- Why it matters: Parents need to narrow results to relevant teachers quickly.
- Source: user
- Primary owning slice: M008/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Supabase query filters. No full-text search needed for structured filters.

### DIR-03 — Full-text search across teacher name, school, subjects, bio
- Class: core-capability
- Status: active
- Description: Text search input on the directory page that searches across teacher name, school, subjects array, and bio text using Postgres full-text search with GIN index.
- Why it matters: Some parents will search by teacher name or school. Others will type "SAT prep" or "reading specialist."
- Source: user
- Primary owning slice: M008/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Requires tsvector column + GIN index migration. Supabase .textSearch() API.

### SEO-03 — XML sitemap listing all published teacher profile URLs
- Class: launchability
- Status: active
- Description: Auto-generated sitemap.xml at /sitemap.xml listing all published teacher /[slug] URLs plus the /tutors directory page and category pages.
- Why it matters: Google can't efficiently discover and index teacher pages without a sitemap.
- Source: inferred
- Primary owning slice: M008/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Next.js built-in sitemap generation via sitemap.ts route.

### SEO-04 — SEO-optimized category pages (/tutors/math, /tutors/chicago, etc.)
- Class: differentiator
- Status: active
- Description: Category pages for subjects (/tutors/math, /tutors/reading) and locations (/tutors/chicago, /tutors/texas) with proper titles, descriptions, and structured data. These pages are pre-rendered and indexable.
- Why it matters: Long-tail SEO. Parents searching "math tutor in Chicago" should land on a Tutelo page.
- Source: user
- Primary owning slice: M008/S03
- Supporting slices: M008/S01
- Validation: unmapped
- Notes: Category pages are filtered views of the directory. Dynamic route segments.

### ANALYTICS-01 — Track page views on teacher /[slug] pages
- Class: core-capability
- Status: active
- Description: Each visit to a teacher's public profile page is tracked. View counts are stored in a lightweight analytics table or counter.
- Why it matters: Teachers want to know if anyone is actually looking at their page after sharing their link.
- Source: user
- Primary owning slice: M008/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Must be lightweight — middleware counter or edge function, not a heavy analytics service. Needs bot filtering.

### ANALYTICS-02 — Teacher dashboard shows view count and booking conversion funnel
- Class: core-capability
- Status: active
- Description: Dashboard analytics section showing: total page views, unique visitors, booking starts (form opens), completed bookings, and conversion rate.
- Why it matters: Empowers teachers to understand their funnel and take action (share more, improve their page, adjust pricing).
- Source: user
- Primary owning slice: M008/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Funnel stages: view → booking form open → booking submitted. Data from analytics table + bookings table.

### RECUR-01 — Parent can set a recurring schedule when booking
- Class: core-capability
- Status: active
- Description: During the booking flow, parent can opt for a recurring schedule: weekly or biweekly, for N weeks (e.g., "Every Tuesday at 4pm for 8 weeks").
- Why it matters: Most tutoring relationships are ongoing. Rebooking manually every week is friction that kills retention.
- Source: user
- Primary owning slice: M009/S01
- Supporting slices: none
- Validation: unmapped
- Notes: UI shows recurring options after initial slot selection. Must validate all future slots are available.

### RECUR-02 — System auto-creates future booking rows for recurring schedule
- Class: core-capability
- Status: active
- Description: When a recurring schedule is confirmed, the system creates individual booking rows for each future session. Each has its own date, status, and payment.
- Why it matters: Individual rows enable per-session cancellation, payment tracking, and status management.
- Source: user
- Primary owning slice: M009/S01
- Supporting slices: M009/S02
- Validation: unmapped
- Notes: Linked via a recurring_schedule_id. Atomic creation to prevent partial series.

### RECUR-03 — Each recurring session has individual payment handling
- Class: core-capability
- Status: active
- Description: Each session in a recurring series has its own Stripe PaymentIntent. Payment is authorized per-session, not bulk upfront.
- Why it matters: Per-session billing is fairer (parent isn't locked in), simpler for refunds, and matches the existing payment flow.
- Source: user
- Primary owning slice: M009/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Payment authorization happens at series creation for near-term sessions. Future sessions may need "authorize on day-of" pattern.

### RECUR-04 — Teacher and parent can cancel individual sessions or entire recurring series
- Class: core-capability
- Status: active
- Description: Both teacher and parent can cancel a single session from a recurring series without affecting others, or cancel the entire remaining series at once.
- Why it matters: Life happens. Flexibility in cancellation prevents frustration.
- Source: user
- Primary owning slice: M009/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Cancelling a series cancels all future sessions with status != completed. Past sessions unaffected.

### RECUR-05 — Recurring bookings respect availability and prevent double-booking
- Class: continuity
- Status: active
- Description: When creating a recurring schedule, the system checks each future date against the teacher's availability (recurring + overrides) and the existing bookings unique constraint.
- Why it matters: Can't create recurring sessions that conflict with existing bookings or fall outside availability windows.
- Source: inferred
- Primary owning slice: M009/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Must handle the case where some future dates are unavailable (warn parent, skip those dates).

### PARENT-04 — Parent can manage multiple children under one account
- Class: core-capability
- Status: active
- Description: Parent account can add multiple children (name, grade level). Booking form allows selecting which child the session is for.
- Why it matters: Many families have multiple children needing tutoring. One account per family, not per child.
- Source: user
- Primary owning slice: M010/S01
- Supporting slices: none
- Validation: unmapped
- Notes: New children table. Replaces the current free-text student_name field in booking form with a child selector.

### PARENT-05 — Parent can save payment methods for faster rebooking
- Class: quality-attribute
- Status: active
- Description: After first payment, parent's card is saved via Stripe Customer object. Future bookings can use saved card with one click.
- Why it matters: Reduces booking friction. Parent doesn't re-enter card details every time.
- Source: user
- Primary owning slice: M010/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Requires creating Stripe Customer records for parents. SetupIntent flow for saving cards.

### PARENT-06 — In-app messaging between parent and teacher
- Class: core-capability
- Status: active
- Description: Real-time messaging thread between parent and teacher within the app. Linked to a booking or student relationship. New message notifications via email.
- Why it matters: Teachers and parents need to coordinate logistics (rescheduling, homework focus areas, progress updates) without exchanging personal phone numbers.
- Source: user
- Primary owning slice: M010/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Heaviest feature in the roadmap. Could use Supabase Realtime for live updates. Needs careful scoping.

### ADMIN-01 — Admin dashboard with teacher count, booking volume, revenue metrics
- Class: operability
- Status: active
- Description: Protected admin route showing platform-wide metrics: total teachers, active teachers, total bookings, revenue (captured payments), conversion rates.
- Why it matters: Platform operator needs visibility into business health without querying the database directly.
- Source: user
- Primary owning slice: M010/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Read-only. Admin access gated on specific user IDs or admin role, not a general feature.

### ADMIN-02 — Admin can view recent activity (signups, bookings, completions)
- Class: operability
- Status: active
- Description: Activity feed showing recent platform events: new teacher signups, booking requests, session completions, Stripe connections.
- Why it matters: Quick pulse check on platform activity without running queries.
- Source: user
- Primary owning slice: M010/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Derived from existing tables (teachers.created_at, bookings.created_at, etc.). No new event system needed.

### AUTH-03 — Teacher or parent can sign in with Google SSO
- Class: core-capability
- Status: active
- Description: A "Continue with Google" button on the login/signup page initiates OAuth via Supabase Google provider. On first sign-in, a new user record is created automatically. On return, the existing session is resumed. Works for both teacher and parent accounts.
- Why it matters: Google SSO removes the password barrier — teachers and parents already have Google accounts and trust the flow. Reduces signup abandonment and "forgot password" support burden.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: AUTH-01 is already validated for email+password; this requirement specifically tracks the Google OAuth implementation as a distinct deliverable since it requires Supabase provider config, OAuth consent screen setup, and login UI changes. See decision D003 for interaction with school email verification.

### AUTH-04 — Teacher can verify school affiliation via .edu email OTP after Google login
- Class: differentiator
- Status: active
- Description: After signing in with Google (or email+password), a teacher can still trigger the school email verification flow — entering their school email address, receiving a one-time code, and confirming it. The verified school email is stored independently of the auth provider email. A "verified" badge appears on their profile once confirmed.
- Why it matters: Many teachers have a personal Gmail they use for everything, but their credibility signal is their school email. Decoupling auth from verification means they get the convenience of Google login without losing the trust badge.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Verification OTP flow already exists (VERIFY-01, M005/S03). This requirement tracks the explicit guarantee that it works post-Google-login — no regression where Google-authed accounts are blocked from the verification flow. See decision D003.

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
| QR-01 | core-capability | validated | M006/S01 | none | M006/S01 |
| QR-02 | differentiator | validated | M006/S01 | none | M006/S01 |
| SWIPE-01 | differentiator | validated | M006/S02 | none | M006/S02 |
| SWIPE-02 | quality-attribute | validated | M006/S02 | none | M006/S02 |
| OG-01 | quality-attribute | validated | M006/S03 | none | M006/S03 |
| CAP-01 | core-capability | active | M007/S01 | none | unmapped |
| CAP-02 | core-capability | active | M007/S01 | M007/S02 | unmapped |
| WAIT-01 | core-capability | active | M007/S02 | none | unmapped |
| WAIT-02 | core-capability | active | M007/S02 | none | unmapped |
| WAIT-03 | core-capability | active | M007/S02 | none | unmapped |
| SESS-01 | core-capability | active | M007/S03 | none | unmapped |
| SESS-02 | core-capability | active | M007/S03 | none | unmapped |
| SESS-03 | core-capability | active | M007/S03 | none | unmapped |
| SESS-04 | continuity | active | M007/S03 | none | unmapped |
| DIR-01 | core-capability | active | M008/S01 | M008/S02, M008/S03 | unmapped |
| DIR-02 | core-capability | active | M008/S01 | none | unmapped |
| DIR-03 | core-capability | active | M008/S02 | none | unmapped |
| SEO-03 | launchability | active | M008/S03 | none | unmapped |
| SEO-04 | differentiator | active | M008/S03 | M008/S01 | unmapped |
| ANALYTICS-01 | core-capability | active | M008/S04 | none | unmapped |
| ANALYTICS-02 | core-capability | active | M008/S04 | none | unmapped |
| RECUR-01 | core-capability | active | M009/S01 | none | unmapped |
| RECUR-02 | core-capability | active | M009/S01 | M009/S02 | unmapped |
| RECUR-03 | core-capability | active | M009/S02 | none | unmapped |
| RECUR-04 | core-capability | active | M009/S03 | none | unmapped |
| RECUR-05 | continuity | active | M009/S01 | none | unmapped |
| PARENT-04 | core-capability | active | M010/S01 | none | unmapped |
| PARENT-05 | quality-attribute | active | M010/S02 | none | unmapped |
| PARENT-06 | core-capability | active | M010/S03 | none | unmapped |
| ADMIN-01 | operability | active | M010/S04 | none | unmapped |
| ADMIN-02 | operability | active | M010/S04 | none | unmapped |
| AUTH-03 | core-capability | active | none | none | unmapped |
| AUTH-04 | differentiator | active | none | none | unmapped |
| ADMIN-03 | operability | deferred | none | none | unmapped |
| A2P-01 | operability | deferred | none | none | unmapped |

## Coverage Summary

- Active requirements: 33
- Mapped to slices: 31
- Validated: 87
- Deferred: 2
- Unmapped active requirements: 2 (AUTH-03, AUTH-04 — pending milestone assignment)
