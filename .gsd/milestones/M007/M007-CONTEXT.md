# M007: Capacity & Pricing

**Gathered:** 2026-03-25
**Status:** Ready for planning

## Project Description

Tutelo needs capacity management and variable pricing. Side-hustling teachers may only have room for 3 students — they need a way to cap bookings without removing their link. Some teachers want to charge differently for different session types (e.g., SAT Prep vs General Math). This milestone adds both.

## Why This Milestone

Capacity limits prevent teacher burnout and parent frustration (no more booking into an empty calendar). Variable pricing unlocks higher revenue per teacher and more accurate pricing for specialized sessions. Both touch the booking flow, so they're natural to build together. Depends on M006 (Growth Tools) being complete.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Teacher sets a max-students capacity limit in dashboard settings; when reached, their profile page shows "Currently at capacity" with a waitlist signup form instead of the booking calendar
- Parent joins a teacher's waitlist when at capacity, and receives an email with a direct booking link when a spot frees up
- Teacher creates session types (e.g. "SAT Prep $60 / 90 min", "Homework Help $35 / 60 min") in dashboard settings
- Parent selects a session type when booking, sees the correct per-session price, and is charged that amount through Stripe
- Teachers who never create session types continue working exactly as before — hourly_rate fallback, subject selector, prorated payment

### Entry point / environment

- Entry point: Dashboard settings (capacity + session types), teacher profile page (at-capacity state + waitlist form + session type selector in booking flow)
- Environment: Browser (production-like)
- Live dependencies involved: Supabase (DB + RLS), Stripe (PaymentIntent with session-type pricing), Resend (waitlist notification emails)

## Completion Class

- Contract complete means: migration applies cleanly, session types CRUD works, capacity limit enforced, waitlist join/notify works, booking form shows session type selector, Stripe PI uses session-type price, backward compatibility preserved — all provable by unit tests and `npm run build`
- Integration complete means: booking flow end-to-end with session-type pricing through Stripe, waitlist email fires on capacity change, profile page toggles between booking calendar and at-capacity state based on real DB counts
- Operational complete means: existing teachers with no session types and no capacity limit experience zero behavior change after migration

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A teacher with capacity_limit=3 and exactly 3 active students → profile page shows "at capacity" + waitlist form; a 4th parent joins waitlist, one booking is cancelled, all waitlisted parents receive an email with a direct booking link, and the next parent who clicks through can book successfully
- A teacher with 2 session types → parent visits profile, selects "SAT Prep $60 / 90 min", books a 90-min slot, Stripe PaymentIntent is created for $60 (not computed from hourly_rate × duration)
- A teacher with no session types and no capacity limit → booking flow works exactly as it does today (subject selector, hourly_rate proration, no capacity check)

## Risks and Unknowns

- **Race condition on waitlist booking:** Multiple waitlisted parents get emailed simultaneously and try to book the same slot — mitigated by existing `bookings_unique_slot` constraint (loser gets "slot taken" error)
- **90-day active student window aging:** A student can "age out" of the 90-day window without an explicit event, silently changing capacity — acceptable at MVP scale; no cron needed for this edge case
- **Session type + hourly_rate coexistence:** Two pricing paths in the booking flow (session-type flat price vs hourly_rate proration) must not interfere — `computeSessionAmount` stays for hourly_rate path, new flat-price path added alongside it
- **Waitlist email deliverability:** Blast email to all waitlisted parents at once — Resend handles volume, but large waitlists could hit rate limits — unlikely at MVP scale

## Existing Codebase / Prior Art

- `src/app/api/direct-booking/create-intent/route.ts` — Current PaymentIntent creation; fetches `teacher.hourly_rate`, calls `computeSessionAmount()`. Must be extended to check for session_type_id and use flat price when present
- `src/lib/utils/booking.ts` — `computeSessionAmount(startTime, endTime, hourlyRate)` — stays for hourly_rate fallback; session-type path bypasses this entirely
- `src/components/profile/BookingCalendar.tsx` — Multi-step booking form (calendar → form → auth → payment → success). Must add session type selector step and at-capacity state
- `src/app/[slug]/page.tsx` — Teacher profile RSC; fetches teacher data and renders BookingCalendar. Must fetch capacity status and conditionally render at-capacity state
- `src/app/(dashboard)/dashboard/settings/page.tsx` — Currently has AccountSettings + SchoolEmailVerification. Will add CapacitySettings and SessionTypeManager components
- `src/app/(dashboard)/dashboard/students/page.tsx` — Groups students by (student_name, parent_email) from completed bookings. Active student counting for capacity will use a similar pattern but include confirmed status and 90-day window
- `src/lib/email.ts` — Resend-based email functions. Will add `sendWaitlistNotificationEmail()`
- `supabase/migrations/` — Latest is `0010_email_verification_tokens.sql`. M007 migration will be `0011_capacity_and_session_types.sql`
- `src/actions/bookings.ts` — `submitBookingRequest()` for deferred path and `cancelSession` action. Cancellation is a capacity-change trigger for waitlist notifications

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- CAP-01 — Teacher can set max active students in dashboard settings (capacity_limit column, nullable)
- CAP-02 — Profile page shows "at capacity" state when limit reached (hides calendar, shows waitlist form)
- WAIT-01 — Parent can join waitlist when teacher is at capacity (email collection form)
- WAIT-02 — Teacher sees waitlist in dashboard and can manage entries
- WAIT-03 — Waitlisted parents auto-notified via email with direct booking link when capacity frees up
- SESS-01 — Teacher can define session types with labels, flat per-session prices, and locked durations
- SESS-02 — Booking form shows session type selector with correct price per type
- SESS-03 — Stripe PaymentIntent uses session-type flat price (not hourly_rate × duration)
- SESS-04 — Teachers without session types continue using hourly_rate fallback (backward compatible)

## Scope

### In Scope

- `capacity_limit` nullable integer column on teachers table
- `capacity_type` fixed to 'max_students' (no selector needed — single mode decided)
- Active student counting: unique student_name with confirmed/completed booking within 90-day window
- Profile page "at capacity" state: hides booking calendar, shows waitlist signup form, teacher info/reviews remain visible
- `waitlist` table: id, teacher_id, parent_email, created_at, notified_at
- Waitlist signup form on at-capacity profile page (email collection)
- Teacher waitlist management in dashboard (view entries, remove entries)
- Waitlist notification: on cancellation or session completion events, recheck capacity, blast all waitlisted parents with email containing direct booking link (tutelo.app/[slug])
- `session_types` table: id, teacher_id, label, price (flat per-session in dollars), duration_minutes (locked), sort_order, created_at
- Dashboard UI for CRUD on session types
- Booking form session type selector with dynamic price display
- Payment intent using session-type flat price when session_type_id is present
- Backward compatibility: hourly_rate fallback when no session types defined, `computeSessionAmount` preserved for that path

### Out of Scope / Non-Goals

- Group session pricing
- Dynamic/surge pricing
- Waitlist priority ordering (FIFO queue logic) — notify all at once, first to book wins
- Auto-conversion of hourly_rate to a session type — hourly_rate stays permanently
- Capacity type toggle (max students vs max weekly sessions) — only max students
- Admin dashboard (ADMIN-01/02 are M010 scope)
- Capacity aging cron (90-day window expiry without event) — acceptable at MVP scale

## Technical Constraints

- Supabase RLS must allow anonymous reads on waitlist (for the signup form) and teacher-gated writes
- Session types must be publicly readable (parent sees them on profile page) but only editable by the owning teacher
- Migration must be additive — no destructive changes to existing tables
- `computeSessionAmount` stays in `src/lib/utils/booking.ts` for hourly_rate path; session-type path uses flat price directly
- Waitlist notification emails fire in the same request as the cancellation/completion event (fire-and-forget pattern, matching existing `sendCancellationEmail` approach)
- Session type `price` stored as NUMERIC(10,2) in dollars (matching `hourly_rate` convention), converted to cents at PaymentIntent creation

## Integration Points

- **Stripe** — `create-intent/route.ts` must branch: if session_type_id present, use `session_types.price × 100` for amount; else, keep `computeSessionAmount()` path. Application fee (7%) applies to both paths.
- **Resend** — New `sendWaitlistNotificationEmail()` template with teacher name, direct booking link, and unsubscribe affordance
- **Supabase** — New migration `0011_capacity_and_session_types.sql` adding: `capacity_limit` on teachers, `waitlist` table, `session_types` table. RLS policies for each.
- **BookingCalendar** — Session type selector injected before slot selection when types exist. Duration locked from session type → only shows slots that fit the locked duration window.
- **Profile page RSC** — Capacity check query: count distinct student_name from bookings where teacher_id matches, status in (confirmed, completed), and booking_date within 90 days. Compare to capacity_limit. Conditionally render calendar or at-capacity state.

## Open Questions

- None — all open questions resolved during discussion.

## Implementation Decisions

- **Capacity model:** Unique active students (distinct student_name with confirmed/completed booking within 90 days). Teacher sets a nullable integer limit. Null = unlimited.
- **At-capacity UX:** Hide booking calendar entirely. Show "Currently at capacity" message with waitlist email signup form below. Teacher info, reviews, and session types remain visible.
- **Waitlist notification strategy:** When capacity frees up (cancellation or completion event), blast all waitlisted parents simultaneously with an email containing a direct booking link (tutelo.app/[slug]). First to book gets the spot. No FIFO queue logic.
- **Session type pricing:** Flat per-session dollar amount (not hourly rate). Teacher enters "$60 for SAT Prep" — that's what the parent pays regardless of duration.
- **Session type duration:** Locked per type. Teacher sets "SAT Prep = 90 min" — parent picks a start time, system auto-selects end time. No parent-chosen duration when session type is selected.
- **hourly_rate interaction:** hourly_rate stays permanently as the fallback for teachers without session types. No auto-conversion. Two pricing paths coexist in the booking flow.
- **Capacity recheck trigger:** On booking cancellation and session completion events. No cron for 90-day aging — acceptable at MVP scale.

## Agent's Discretion

- Migration file naming and column ordering
- Dashboard UI layout for capacity settings and session type management
- Waitlist notification email template copy and design
- Session type form validation rules (min/max price, duration options)
- Capacity check query optimization (inline vs function vs RPC)
- Error handling when waitlisted parent tries to book but teacher is still at capacity (race condition between notification and booking)

## Deferred Ideas

- Capacity type toggle (max students vs max weekly sessions) — could add later if teachers request it
- FIFO waitlist priority — could add if fairness complaints arise
- Auto-archive session types (soft delete instead of hard delete)
- Session type categories or grouping
- Capacity warnings (e.g. "1 spot remaining") on profile page
- Waitlist position indicator for parents
