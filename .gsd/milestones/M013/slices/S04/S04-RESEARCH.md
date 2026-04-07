# S04: Requirements Rebuild — Research

**Researched:** 2026-04-07
**Depth:** Light — this is a documentation-only task extracting validated capabilities from existing milestone summaries. No code changes, no new technology.

---

## Summary

The current `REQUIREMENTS.md` has **15 entries** (R001–R005, UI-01 through UI-09, PERF-02). The target is **124+ validated requirements** covering all capabilities delivered across M001–M012. After reading all 12 milestone summaries and their slice research files, the actual inventory is **~141 discrete requirements** across 12 milestones.

This is mechanical extraction work: read each milestone summary's `requirement_outcomes` section, create a `gsd_requirement_save` entry for each, and update the 10 existing entries that need descriptions (UI-01–UI-09, PERF-02). No code changes. Verification is `wc -l` on the regenerated REQUIREMENTS.md.

## Recommendation

Break into **3 tasks by milestone grouping** (each task handles ~45–50 requirements):

1. **T01: M001 requirements (59 entries)** — AUTH, ONBOARD, PAGE, CUSTOM, AVAIL, VIS, BOOK, STRIPE, NOTIF, DASH, PARENT, REVIEW
2. **T02: M003–M009 requirements (59 entries)** — LAND, ANIM, MOBILE, BRAND, SEO, FIX, AVAIL-04–07, CANCEL, VERIFY, SMS, QR, SWIPE, OG, CAP, WAIT, SESS, DIR, ANALYTICS, RECUR
3. **T03: M010–M012 requirements + existing entry updates + verification (23 new + 10 updates)** — PARENT-04–09, MSG, ADMIN, AUTH-03–04, PERF, UI updates; final count verification

## Implementation Landscape

### Current DB State

15 entries exist in the GSD requirements DB:
- **R001–R005** — M013 quality requirements (fully populated, correct, no changes needed)
- **UI-01 through UI-09** — M011 design polish requirements (descriptions say "Untitled", validation fields populated) → need `gsd_requirement_update` to add proper descriptions
- **PERF-02** — M012 directory ISR (partially described) → needs `gsd_requirement_update` for full description

### Tools

- **`gsd_requirement_save`** — creates new requirement with auto-assigned ID (R006, R007, ...). Required fields: `class`, `description`, `why`, `source`. Optional: `status`, `validation`, `primary_owner`, `supporting_slices`, `notes`.
- **`gsd_requirement_update`** — updates existing requirement by ID. Only the `id` field is required; all others are optional partial updates.

### Requirement Inventory by Milestone

**M001 (59 requirements) — all validated**

| Legacy ID | Description (short) |
|-----------|-------------------|
| AUTH-01 | Sign up with email+password or Google SSO |
| AUTH-02 | Session persists across browser refresh |
| ONBOARD-01 | 3-step setup wizard with no payment to publish |
| ONBOARD-02 | Subject multi-select |
| ONBOARD-03 | Grade range multi-select |
| ONBOARD-04 | IANA timezone required |
| ONBOARD-05 | Weekly availability visual calendar |
| ONBOARD-06 | Hourly rate with local benchmarks |
| ONBOARD-07 | Shareable URL immediately on publish |
| PAGE-01 | Public page at /[slug] |
| PAGE-02 | Page: name, photo/avatar, school, city/state |
| PAGE-03 | Page: credential bar (badge, experience, subjects, grades) |
| PAGE-04 | Page: auto-generated bio fallback |
| PAGE-05 | Page: subjects, rate, availability calendar, reviews |
| PAGE-06 | Sticky Book Now CTA on mobile |
| PAGE-07 | Teacher's accent color applied throughout |
| PAGE-08 | Custom headline/tagline below name |
| PAGE-09 | Banner image at top |
| PAGE-10 | Social/contact links displayed |
| CUSTOM-01 | Accent color from preset palette |
| CUSTOM-02 | Custom headline/tagline |
| CUSTOM-03 | Social/contact links |
| CUSTOM-04 | Banner image upload |
| AVAIL-01 | View and edit weekly availability |
| AVAIL-02 | Time slots displayed on public page |
| AVAIL-03 | Auto-detect visitor timezone, convert times |
| VIS-01 | Toggle page Active/Draft |
| VIS-02 | Hidden page shows graceful unavailable state |
| BOOK-01 | Submit booking request (no payment, no account required) |
| BOOK-02 | Pending confirmation screen after request |
| BOOK-03 | Booking state machine: requested → pending → confirmed → completed → cancelled |
| BOOK-04 | Atomic booking creation, double-booking impossible |
| BOOK-05 | Direct booking when teacher has Stripe |
| BOOK-06 | Accept or decline bookings from dashboard |
| STRIPE-01 | No Stripe required to publish or receive bookings |
| STRIPE-02 | "Money waiting" notification with Stripe Connect CTA |
| STRIPE-03 | Stripe Connect Express onboarding |
| STRIPE-04 | 48hr auto-cancel for unconfirmed bookings |
| STRIPE-05 | Payment authorized at booking (manual capture) |
| STRIPE-06 | Mark complete triggers payment capture |
| STRIPE-07 | 7% platform fee on every captured payment |
| NOTIF-01 | Teacher email on booking request |
| NOTIF-02 | 24hr and 48hr follow-up emails if Stripe not connected |
| NOTIF-03 | Booking confirmation emails to both parties |
| NOTIF-04 | 24hr session reminder to both parties |
| NOTIF-05 | Cancellation notifications to both parties |
| NOTIF-06 | Session-complete email with review prompt |
| DASH-01 | View upcoming sessions |
| DASH-02 | View and action pending requests |
| DASH-03 | View earnings |
| DASH-04 | View student list |
| DASH-05 | Mark session complete |
| DASH-06 | Toggle page Active/Draft from dashboard |
| PARENT-01 | Parent account creation |
| PARENT-02 | Parent booking history and upcoming |
| PARENT-03 | Rebook with same teacher |
| REVIEW-01 | 1–5 star rating and text review |
| REVIEW-02 | Reviews on public profile |
| REVIEW-03 | Review prompt via email |

**Source:** `.gsd/milestones/M001/slices/S01/S01-RESEARCH.md`, `.gsd/milestones/M001/slices/S02/S02-RESEARCH.md`, `.gsd/milestones/M001/slices/S03/S03-RESEARCH.md`, `.gsd/milestones/M001/slices/S04/S04-RESEARCH.md`, `.gsd/milestones/M001/slices/S05/S05-RESEARCH.md`

**M003 (17 requirements) — all validated**

| Legacy ID | Description (short) |
|-----------|-------------------|
| LAND-01 | Marketing landing page (hero, how-it-works, problem/solution, CTA) |
| LAND-02 | Interactive teacher page mock on landing |
| LAND-03 | "Start your page" CTA links to /login |
| LAND-04 | Brand palette + logo in navigation |
| LAND-05 | Shareable slug URLs in landing copy |
| ANIM-01 | Scroll-triggered reveals on landing sections |
| ANIM-02 | Route transitions via template.tsx |
| ANIM-03 | Onboarding step directional slides |
| ANIM-04 | Dashboard card/list stagger animations |
| ANIM-05 | Teacher profile section sequential fades |
| ANIM-06 | Micro-interaction press/hover on CTAs |
| MOBILE-01 | Mobile bottom tab bar for dashboard |
| BRAND-01 | Global brand palette, teacher accent preserved |
| BRAND-02 | Logo in NavBar, Sidebar, MobileHeader |
| SEO-01 | Dynamic OG tags + 1200×630 image per teacher |
| SEO-02 | Landing page OG meta tags |
| FIX-01 | social_email auto-populated from auth email |

**Source:** `.gsd/milestones/M003/M003-SUMMARY.md` requirement_outcomes

**M004 (5 requirements) — all validated**

| Legacy ID | Description (short) |
|-----------|-------------------|
| AVAIL-04 | 5-minute granularity availability editor |
| AVAIL-05 | Per-date availability overrides |
| AVAIL-06 | Future-date planning via overrides |
| AVAIL-07 | Time-range picker editor rewrite |
| CANCEL-01 | Session cancellation with Stripe void + email |

**Source:** `.gsd/milestones/M004/M004-SUMMARY.md` requirement_outcomes

**M005 (7 requirements) — all validated**

| Legacy ID | Description (short) |
|-----------|-------------------|
| VERIFY-01 | School email verification flow (OTP token → email → callback → verified_at stamp) |
| VERIFY-02 | CredentialsBar badge gated on verified_at |
| SMS-01 | SMS session reminders for opted-in recipients |
| SMS-02 | Cancellation SMS alongside email |
| SMS-03 | Parent phone + SMS consent on booking form |
| SMS-04 | Teacher phone + SMS opt-in in onboarding/settings |
| CANCEL-02 | cancelSession sends SMS alongside email |

**Source:** `.gsd/milestones/M005/M005-SUMMARY.md` requirement_outcomes

**M006 (5 requirements) — all validated**

| Legacy ID | Description (short) |
|-----------|-------------------|
| QR-01 | High-res QR code PNG download |
| QR-02 | Printable mini-flyer PNG |
| SWIPE-01 | Pre-written announcement templates |
| SWIPE-02 | One-click copy-to-clipboard |
| OG-01 | OG image unfurl across platforms |

**Source:** `.gsd/milestones/M006/M006-SUMMARY.md` requirement_outcomes

**M007 (9 requirements) — all validated**

| Legacy ID | Description (short) |
|-----------|-------------------|
| CAP-01 | Teacher capacity limit setting |
| CAP-02 | Profile at-capacity state with waitlist form |
| WAIT-01 | Anonymous waitlist signup |
| WAIT-02 | Teacher waitlist dashboard |
| WAIT-03 | Waitlist notifications on capacity freed |
| SESS-01 | Session types CRUD |
| SESS-02 | Booking form session type selector with duration filtering |
| SESS-03 | Flat session-type price for Stripe PI |
| SESS-04 | Unchanged flow for teachers without session types |

**Source:** `.gsd/milestones/M007/M007-SUMMARY.md` requirement_outcomes

**M008 (7 requirements) — all validated**

| Legacy ID | Description (short) |
|-----------|-------------------|
| DIR-01 | Teacher directory at /tutors |
| DIR-02 | Directory filters (subject, grade, city, price) |
| DIR-03 | Full-text search |
| SEO-03 | XML sitemap covering all teacher URLs |
| SEO-04 | SEO category pages with unique meta + ISR |
| ANALYTICS-01 | Page view tracking with bot filtering |
| ANALYTICS-02 | Dashboard analytics funnel |

**Source:** `.gsd/milestones/M008/M008-SUMMARY.md` requirement_outcomes

**M009 (9 requirements) — all validated**

| Legacy ID | Description (short) |
|-----------|-------------------|
| RECUR-01 | Parent selects recurring schedule (weekly/biweekly) |
| RECUR-02 | System auto-creates future booking rows |
| RECUR-03 | Per-session payment handling |
| RECUR-04 | Cancel individual/series |
| RECUR-05 | Availability + double-booking prevention for recurring |
| RECUR-06 | Saved card via Stripe Customer |
| RECUR-07 | Cron charges upcoming recurring sessions |
| RECUR-08 | Parent self-service cancellation via secure email link |
| RECUR-09 | Recurring sessions in dashboard with series badge |

**Source:** `.gsd/milestones/M009/M009-SUMMARY.md` requirement_outcomes

**M010 (14 requirements) — all validated**

| Legacy ID | Description (short) |
|-----------|-------------------|
| PARENT-04 | Multi-child management (CRUD) |
| PARENT-05 | Saved payment methods (Stripe Customer per parent) |
| PARENT-06 | Real-time teacher-parent messaging |
| PARENT-07 | Auth-guarded parent dashboard |
| PARENT-08 | Child selector in booking calendar |
| PARENT-09 | Parent-level Stripe Customer |
| MSG-01 | One-thread-per-pair messaging |
| MSG-02 | Real-time messages via Supabase Realtime |
| MSG-03 | New message email notification with rate limiting |
| ADMIN-01 | Admin metrics dashboard |
| ADMIN-02 | Admin activity feed |
| ADMIN-04 | Admin access gate (notFound for non-admins) |
| AUTH-03 | Google SSO working end-to-end |
| AUTH-04 | School email verification is provider-agnostic |

**Source:** `.gsd/milestones/M010/M010-SUMMARY.md` requirement_outcomes

**M011 (9 requirements) — already exist as UI-01 through UI-09, need description updates**

| Existing ID | Description needed |
|-------------|-------------------|
| UI-01 | Teacher profile page premium visual treatment (hero, credentials, reviews, about) |
| UI-02 | BookingCalendar decomposed into sub-components |
| UI-03 | Mobile navigation: labeled primary tabs + More panel |
| UI-04 | All 11 teacher dashboard pages premium card standard |
| UI-05 | All 5 parent dashboard pages premium card standard |
| UI-06 | Landing page tightening (footer, hero badge, responsive nav) |
| UI-07 | Design patterns documented (card standard, avatar circles, tinting, headers) |
| UI-08 | Bespoke Tutelo patterns replace generic shadcn/ui defaults |
| UI-09 | Nav lag eliminated, all icons labeled, consistent across surfaces |

**Source:** `.gsd/milestones/M011/M011-SUMMARY.md`, existing REQUIREMENTS.md validation fields

**M012 (4 requirements) — PERF-02 exists, 3 new**

| Legacy ID | Description (short) |
|-----------|-------------------|
| PERF-01 | Profile page ISR with on-demand revalidation |
| PERF-02 | Directory pages ISR (exists, needs update — partially-advanced) |
| PERF-06 | ISR within Vercel Hobby plan limits |
| PERF-07 | On-demand revalidation via revalidatePath |

**Source:** `.gsd/milestones/M012/M012-SUMMARY.md` requirement_outcomes

### Deduplication Notes

- **DASH-06 ≈ VIS-01** — Same capability (toggle Active/Draft). Create both with a cross-reference note.
- **CANCEL-02 ≈ SMS-02** — Both describe cancelSession sending SMS. CANCEL-02 is from M005 and emphasizes the cancellation aspect; SMS-02 emphasizes the SMS pipeline. Keep both — they were tracked separately in milestone summaries.
- **PARENT-01 (M001) vs. parent account in M010** — PARENT-01 was MVP (email+Google signup). PARENT-04+ from M010 expanded parent features. No overlap.

### Classification Guide

All requirements from M001–M010 should use `status: 'validated'` since they all transitioned to validated in their respective milestone summaries. The exceptions:
- **PERF-02** — status should remain `partially-advanced` per M012 summary
- **R001–R005** — already correct in DB, do not touch

### Per-Requirement Fields

For each `gsd_requirement_save` call:
- `class`: `functional` for features, `non-functional` for performance (PERF-*), `quality-attribute` for UI/design (UI-*), `operability` for observability/admin
- `description`: The requirement description from the table above
- `why`: Can be brief — "Core MVP feature" for M001, "Trust signal" for M005, etc. Use milestone context.
- `source`: The milestone ID where validated (e.g., "M001", "M003")
- `status`: `validated` for all except PERF-02
- `validation`: Pull from milestone summary's requirement_outcomes proof field
- `primary_owner`: The milestone/slice where delivered (e.g., "M001/S01")
- `notes`: Legacy ID (e.g., "Legacy: AUTH-01")

### Constraints and Risks

1. **Volume** — ~131 new `gsd_requirement_save` calls + ~10 `gsd_requirement_update` calls. Each call is cheap (DB insert + file render). But context window for a single task may strain with 50+ calls. Breaking into 3 tasks of ~44 each is safe.
2. **File regeneration** — `gsd_requirement_save` regenerates REQUIREMENTS.md on every call. This means each call writes the file. For 131 calls, the file is written 131 times. The last write is the one that matters. This is fine — the tool handles it.
3. **No code changes** — This slice touches only `.gsd/REQUIREMENTS.md` (auto-generated) and the GSD database. No source files modified. No tests to run.

### Verification

- Count requirements in regenerated REQUIREMENTS.md (target: 141+)
- Verify all status=validated entries have non-empty validation fields
- Verify coverage summary shows 0 unmapped active requirements
- Cross-reference with PROJECT.md's claim of "124+ validated requirements"

---

## Skills Discovered

No new skills needed — this is pure GSD tool usage (gsd_requirement_save, gsd_requirement_update).
