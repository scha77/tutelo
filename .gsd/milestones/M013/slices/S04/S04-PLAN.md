# S04: Requirements Rebuild

**Goal:** REQUIREMENTS.md documents all validated capabilities from M001–M012 with stable IDs, ownership traceability, and coverage summary. R005 is validated.
**Demo:** After this: REQUIREMENTS.md contains 124+ validated requirements with stable IDs, ownership traceability, and coverage summary.

## Tasks
- [x] **T01: Registered 59 M001 MVP requirements (R006–R064) across 12 capability groups with validated status and legacy ID traceability** — Register all 59 M001 MVP capability requirements in the GSD database using `gsd_requirement_save`. No code changes — only GSD tool calls.

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
  - Estimate: 15m
  - Files: .gsd/REQUIREMENTS.md
  - Verify: grep -c '^### ' .gsd/REQUIREMENTS.md returns >= 74
- [x] **T02: Registered 59 M003–M009 capability requirements (R067–R125) across 7 milestones with validated status and legacy ID traceability** — Register all 59 M003–M009 capability requirements in the GSD database using `gsd_requirement_save`. No code changes — only GSD tool calls.

## Tool Pattern

Same pattern as T01. For each requirement:
- `class`: as specified per group
- `description`: from the Description column
- `why`: from the Why column
- `source`: milestone ID (M003, M004, etc.)
- `status`: "validated"
- `validation`: from the Validation column
- `primary_owner`: milestone ID
- `notes`: "Legacy: {LEGACY-ID}"

## Requirements to Register

### M003 — Landing, Animation, Mobile, Brand, SEO (17 entries)

**LAND (5) — class: functional — why: "Marketing landing page drives teacher signups"**
- LAND-01: Marketing landing page (hero, how-it-works, problem/solution, CTA) — validation: "Marketing landing page with hero, how-it-works, problem/solution, CTA"
- LAND-02: Interactive teacher page mock on landing — validation: "Interactive TeacherMockSection with hover/transition effects"
- LAND-03: 'Start your page' CTA links to /login — validation: "Start your page CTA links to /login"
- LAND-04: Brand palette + logo in navigation — validation: "Brand palette applied; logo in all nav surfaces"
- LAND-05: Shareable slug URLs in landing copy — validation: "Shareable slug URLs showcased in multiple landing sections"

**ANIM (6) — class: quality-attribute — why: "Animations add polish and perceived quality"**
- ANIM-01: Scroll-triggered reveals on landing sections — validation: "Scroll-triggered reveals on all landing sections"
- ANIM-02: Route transitions via template.tsx — validation: "Route transitions via template.tsx + PageTransition"
- ANIM-03: Onboarding step directional slides — validation: "Onboarding step directional slides"
- ANIM-04: Dashboard card/list stagger animations — validation: "Dashboard card/list stagger animations"
- ANIM-05: Teacher profile section sequential fades — validation: "Teacher profile section sequential fades"
- ANIM-06: Micro-interaction press/hover on CTAs — validation: "Micro-interaction press/hover on primary CTAs"

**MOBILE-01 — class: functional — why: "Mobile-first dashboard navigation"**
- MOBILE-01: Mobile bottom tab bar for dashboard — validation: "Bottom tab bar on mobile, all 7 tabs functional"

**BRAND (2) — class: quality-attribute — why: "Visual brand consistency"**
- BRAND-01: Global brand palette, teacher accent preserved — validation: "Global brand palette, teacher accent color preserved"
- BRAND-02: Logo in NavBar, Sidebar, MobileHeader — validation: "Logo in NavBar, Sidebar, MobileHeader"

**SEO (2) — class: non-functional — why: "Discoverability and social sharing"**
- SEO-01: Dynamic OG tags + 1200x630 image per teacher — validation: "Dynamic OG tags + 1200x630 image per teacher"
- SEO-02: Landing page OG meta tags — validation: "Landing page OG meta tags"

**FIX-01 — class: functional — why: "Data integrity for teacher contact"**
- FIX-01: social_email auto-populated from auth email — validation: "social_email auto-populated from auth email"

### M004 — Availability & Cancellation (5 entries)

**AVAIL (4) — class: functional — why: "Advanced scheduling precision"**
- AVAIL-04: 5-minute granularity availability editor — validation: "Validated in M004 — 5-minute granularity availability editor"
- AVAIL-05: Per-date availability overrides — validation: "Validated in M004 — per-date availability overrides"
- AVAIL-06: Future-date planning via overrides — validation: "Validated in M004 — future-date planning via overrides"
- AVAIL-07: Time-range picker editor rewrite — validation: "Validated in M004 — time-range picker editor rewrite"

**CANCEL-01 — class: functional — why: "Clean session cancellation flow"**
- CANCEL-01: Session cancellation with Stripe void + email — validation: "Validated in M004 — session cancellation with Stripe void + email"

### M005 — Verification & SMS (7 entries)

**VERIFY (2) — class: functional — why: "Trust signal for parents"**
- VERIFY-01: School email verification flow (OTP token → email → callback → verified_at stamp) — validation: "Validated in M005 — school email verification flow with OTP"
- VERIFY-02: CredentialsBar badge gated on verified_at — validation: "Validated in M005 — CredentialsBar badge gated on verified_at"

**SMS (4) — class: functional — why: "Multi-channel notifications improve engagement"**
- SMS-01: SMS session reminders for opted-in recipients — validation: "Validated in M005 — SMS session reminders for opted-in"
- SMS-02: Cancellation SMS alongside email — validation: "Validated in M005 — cancellation SMS alongside email"
- SMS-03: Parent phone + SMS consent on booking form — validation: "Validated in M005 — parent phone + SMS consent on booking form"
- SMS-04: Teacher phone + SMS opt-in in onboarding/settings — validation: "Validated in M005 — teacher phone + SMS opt-in in onboarding/settings"

**CANCEL-02 — class: functional — why: "SMS channel for cancellation notifications"**
- CANCEL-02: cancelSession sends SMS alongside email — validation: "Validated in M005 — cancelSession sends SMS alongside email"

### M006 — Promotion Tools (5 entries)

**QR (2) — class: functional — why: "Offline marketing for teachers"**
- QR-01: High-res QR code PNG download — validation: "Validated in M006 — high-res QR code PNG download"
- QR-02: Printable mini-flyer PNG — validation: "Validated in M006 — printable mini-flyer PNG"

**SWIPE (2) — class: functional — why: "Social media marketing enablement"**
- SWIPE-01: Pre-written announcement templates — validation: "Validated in M006 — pre-written announcement templates"
- SWIPE-02: One-click copy-to-clipboard — validation: "Validated in M006 — one-click copy-to-clipboard"

**OG-01 — class: non-functional — why: "Link preview quality across platforms"**
- OG-01: OG image unfurl across platforms — validation: "Validated in M006 — OG image unfurl across platforms"

### M007 — Capacity, Waitlist, Session Types (9 entries)

**CAP (2) — class: functional — why: "Capacity management prevents overcommitment"**
- CAP-01: Teacher capacity limit setting — validation: "Validated in M007 — teacher capacity limit setting"
- CAP-02: Profile at-capacity state with waitlist form — validation: "Validated in M007 — profile at-capacity state with waitlist form"

**WAIT (3) — class: functional — why: "Waitlist captures demand when at capacity"**
- WAIT-01: Anonymous waitlist signup — validation: "Validated in M007 — anonymous waitlist signup"
- WAIT-02: Teacher waitlist dashboard — validation: "Validated in M007 — teacher waitlist dashboard"
- WAIT-03: Waitlist notifications on capacity freed — validation: "Validated in M007 — waitlist notifications on capacity freed"

**SESS (4) — class: functional — why: "Session types enable structured service offering"**
- SESS-01: Session types CRUD — validation: "Validated in M007 — session types CRUD"
- SESS-02: Booking form session type selector with duration filtering — validation: "Validated in M007 — booking form session type selector with duration filtering"
- SESS-03: Flat session-type price for Stripe PI — validation: "Validated in M007 — flat session-type price for Stripe PI"
- SESS-04: Unchanged flow for teachers without session types — validation: "Validated in M007 — unchanged flow for teachers without session types"

### M008 — Directory, SEO, Analytics (7 entries)

**DIR (3) — class: functional — why: "Teacher discovery drives marketplace growth"**
- DIR-01: Teacher directory at /tutors — validation: "Validated in M008 — teacher directory at /tutors"
- DIR-02: Directory filters (subject, grade, city, price) — validation: "Validated in M008 — directory filters"
- DIR-03: Full-text search — validation: "Validated in M008 — full-text search"

**SEO (2) — class: non-functional — why: "Organic search traffic"**
- SEO-03: XML sitemap covering all teacher URLs — validation: "Validated in M008 — XML sitemap"
- SEO-04: SEO category pages with unique meta + ISR — validation: "Validated in M008 — SEO category pages with ISR"

**ANALYTICS (2) — class: functional — why: "Teachers need performance visibility"**
- ANALYTICS-01: Page view tracking with bot filtering — validation: "Validated in M008 — page view tracking with bot filtering"
- ANALYTICS-02: Dashboard analytics funnel — validation: "Validated in M008 — dashboard analytics funnel"

### M009 — Recurring Bookings (9 entries)

**RECUR (9) — class: functional — why: "Recurring sessions are key for retention and revenue predictability"**
- RECUR-01: Parent selects recurring schedule (weekly/biweekly) — validation: "Validated in M009 — parent selects recurring schedule"
- RECUR-02: System auto-creates future booking rows — validation: "Validated in M009 — system auto-creates future booking rows"
- RECUR-03: Per-session payment handling — validation: "Validated in M009 — per-session payment handling"
- RECUR-04: Cancel individual/series — validation: "Validated in M009 — cancel individual/series"
- RECUR-05: Availability + double-booking prevention for recurring — validation: "Validated in M009 — availability + double-booking prevention for recurring"
- RECUR-06: Saved card via Stripe Customer — validation: "Validated in M009 — saved card via Stripe Customer"
- RECUR-07: Cron charges upcoming recurring sessions — validation: "Validated in M009 — cron charges upcoming recurring sessions"
- RECUR-08: Parent self-service cancellation via secure email link — validation: "Validated in M009 — parent self-service cancellation via secure email link"
- RECUR-09: Recurring sessions in dashboard with series badge — validation: "Validated in M009 — recurring sessions in dashboard with series badge"

## Steps

1. Call `gsd_requirement_save` for each of the 59 requirements listed above, working through milestones sequentially (M003 → M004 → M005 → M006 → M007 → M008 → M009).
2. After all 59 calls complete, verify: `grep -c '^### ' .gsd/REQUIREMENTS.md` shows at least 133 entries (74 from T01 + 59 new).
  - Estimate: 15m
  - Files: .gsd/REQUIREMENTS.md
  - Verify: grep -c '^### ' .gsd/REQUIREMENTS.md returns >= 133
- [x] **T03: Registered 17 M010/M012 requirements (R126–R142), fixed 9 Untitled UI entries, updated PERF-02, and validated R005 — REQUIREMENTS.md now contains 151 entries with full traceability** — Register 17 new M010/M012 requirements, update 10 existing entries (UI-01–UI-09 descriptions + PERF-02), and validate R005. No code changes — only GSD tool calls.

## Part 1: New Requirements (17 entries)

Use `gsd_requirement_save` for each.

### M010 — Parent Features, Messaging, Admin, Auth (14 entries)

**PARENT (6) — class: functional — why: "Parent experience drives retention" — source: M010**
- PARENT-04: Multi-child management (CRUD) — validation: "Validated in M010 — multi-child management CRUD"
- PARENT-05: Saved payment methods (Stripe Customer per parent) — validation: "Validated in M010 — saved payment methods via Stripe Customer per parent"
- PARENT-06: Real-time teacher-parent messaging — validation: "Validated in M010 — real-time teacher-parent messaging"
- PARENT-07: Auth-guarded parent dashboard — validation: "Validated in M010 — auth-guarded parent dashboard"
- PARENT-08: Child selector in booking calendar — validation: "Validated in M010 — child selector in booking calendar"
- PARENT-09: Parent-level Stripe Customer — validation: "Validated in M010 — parent-level Stripe Customer"

**MSG (3) — class: functional — why: "Communication channel between teacher and parent" — source: M010**
- MSG-01: One-thread-per-pair messaging — validation: "Validated in M010 — one-thread-per-pair messaging"
- MSG-02: Real-time messages via Supabase Realtime — validation: "Validated in M010 — real-time messages via Supabase Realtime"
- MSG-03: New message email notification with rate limiting — validation: "Validated in M010 — new message email notification with rate limiting"

**ADMIN (3) — class: operability — why: "Platform operator visibility" — source: M010**
- ADMIN-01: Admin metrics dashboard — validation: "Validated in M010 — admin metrics dashboard"
- ADMIN-02: Admin activity feed — validation: "Validated in M010 — admin activity feed"
- ADMIN-04: Admin access gate (notFound for non-admins) — validation: "Validated in M010 — admin access gate using notFound() for non-admins"

**AUTH (2) — class: functional — why: "Authentication completeness" — source: M010**
- AUTH-03: Google SSO working end-to-end — validation: "Validated in M010 — Google SSO working end-to-end"
- AUTH-04: School email verification is provider-agnostic — validation: "Validated in M010 — school email verification is provider-agnostic"

### M012 — Performance (3 entries)

**PERF (3) — class: non-functional — why: "Page load performance and caching" — source: M012 — status: validated**
- PERF-01: Profile page ISR with on-demand revalidation — validation: "Validated in M012 — profile page ISR with on-demand revalidation"
- PERF-06: ISR within Vercel Hobby plan limits — validation: "Validated in M012 — ISR within Vercel Hobby plan limits"
- PERF-07: On-demand revalidation via revalidatePath — validation: "Validated in M012 — on-demand revalidation via revalidatePath"

## Part 2: Update Existing Entries (11 updates)

Use `gsd_requirement_update` for each. Only provide the fields that need changing.

### UI-01 through UI-09 — Add proper descriptions (currently say "Untitled")

For each, call `gsd_requirement_update` with `id` and `description`:
- UI-01: description="Teacher profile page premium visual treatment (hero, credentials, reviews, about)", class="quality-attribute", primary_owner="M011/S01"
- UI-02: description="BookingCalendar decomposed into sub-components", class="quality-attribute", primary_owner="M011/S02"
- UI-03: description="Mobile navigation: labeled primary tabs + More panel", class="quality-attribute", primary_owner="M011/S03"
- UI-04: description="All 11 teacher dashboard pages premium card standard", class="quality-attribute", primary_owner="M011/S04"
- UI-05: description="All 5 parent dashboard pages premium card standard", class="quality-attribute", primary_owner="M011/S04"
- UI-06: description="Landing page tightening (footer, hero badge, responsive nav)", class="quality-attribute", primary_owner="M011/S05"
- UI-07: description="Design patterns documented (card standard, avatar circles, tinting, headers)", class="quality-attribute", primary_owner="M011"
- UI-08: description="Bespoke Tutelo patterns replace generic shadcn/ui defaults", class="quality-attribute", primary_owner="M011"
- UI-09: description="Nav lag eliminated, all icons labeled, consistent across surfaces", class="quality-attribute", primary_owner="M011"

### PERF-02 — Update description and class
- PERF-02: description="Directory pages ISR with on-demand revalidation", class="non-functional", primary_owner="M012", why="Page load performance for directory browsing"

### R005 — Mark as validated
- R005: status="validated", validation="REQUIREMENTS.md contains 150 entries with stable IDs, ownership traceability, and coverage summary. All M001–M012 capabilities documented."

## Steps

1. Call `gsd_requirement_save` for each of the 17 new requirements (M010: 14, M012: 3).
2. Call `gsd_requirement_update` for each of the 11 existing entries (UI-01–UI-09, PERF-02, R005).
3. Verify final state:
   - `grep -c '^### ' .gsd/REQUIREMENTS.md` returns >= 146
   - `grep -c 'Untitled' .gsd/REQUIREMENTS.md` returns 0
   - Confirm R005 status shows "validated" in REQUIREMENTS.md
  - Estimate: 10m
  - Files: .gsd/REQUIREMENTS.md
  - Verify: grep -c '^### ' .gsd/REQUIREMENTS.md returns >= 146 AND grep -c 'Untitled' .gsd/REQUIREMENTS.md returns 0
