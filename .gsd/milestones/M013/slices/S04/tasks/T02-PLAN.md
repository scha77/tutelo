---
estimated_steps: 102
estimated_files: 1
skills_used: []
---

# T02: Register M003–M009 capability requirements (59 entries)

Register all 59 M003–M009 capability requirements in the GSD database using `gsd_requirement_save`. No code changes — only GSD tool calls.

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

## Inputs

- `.gsd/REQUIREMENTS.md`

## Expected Output

- `.gsd/REQUIREMENTS.md`

## Verification

grep -c '^### ' .gsd/REQUIREMENTS.md returns >= 133
