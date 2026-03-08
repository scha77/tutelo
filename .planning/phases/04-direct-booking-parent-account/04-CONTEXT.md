# Phase 4: Direct Booking + Parent Account - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

When a teacher already has Stripe connected (`stripe_charges_enabled = true`), a parent can go straight from time slot selection → account creation/login → Stripe Elements payment authorization — all inline within the existing BookingCalendar component. Parents can also create an account, view their booking history, and rebook with a previous teacher. Both teacher and parent receive a 24-hour reminder before each confirmed session.

Non-connected teachers still use the Phase 3 deferred path (booking request → teacher connects Stripe → parent gets emailed a Checkout link). The teacher's `stripe_charges_enabled` status determines which path is used; both paths authorize payment before the session and capture on session completion.

</domain>

<decisions>
## Implementation Decisions

### Direct booking UX — inline within BookingCalendar

- BookingCalendar gains extra steps **only** when `stripe_charges_enabled = true` on the teacher
- Flow: slot selection → booking details form → account/login → Stripe Elements payment → inline success state
- The component already has a `step` state machine (`'calendar' | 'form' | 'success' | 'error'`) — extend it with `'auth'` and `'payment'` steps
- Conditional routing: pass `stripeConnected: boolean` as a new prop; deferred path stays unchanged for `false`

### Auth step (after details, before payment)

- Auth step appears after the parent fills in booking details and before Stripe Elements
- If the parent already has an active session: skip the auth step entirely — jump directly to payment
- Auth step offers: create account (email + password or Google SSO) or log in
- Use existing Supabase Auth — same auth system as teachers, role distinguished by presence/absence of a `teachers` row

### Payment step (Stripe Elements inline)

- Stripe Elements card UI embedded inside the BookingCalendar card (same bordered container)
- Button label: "Confirm & Pay" — disabled + spinner while Stripe processes
- On success: switch to inline success state (matching existing `step === 'success'` pattern) — no redirect
- On failure: show inline error message, keep parent on payment step to retry

### Parent account — /account route

- Parent-facing area at `/account` — completely separate from `/dashboard` (teacher-only)
- Two sections: **Upcoming** (confirmed sessions, date/time/teacher/subject) and **Past** (completed sessions with Rebook button)
- Navigation: link in the booking confirmation email + direct URL — no entry point added to the teacher public page for MVP
- Protected route: parent must be logged in (same Supabase Auth session); if not logged in, redirect to `/login?redirect=/account`

### Rebook shortcut (PARENT-03)

- Rebook button on each past session navigates to `/[teacher-slug]#booking`
- Pre-fill in the booking form: teacher name visible on the page; subject pre-filled via URL param (e.g., `?subject=Math`) that BookingCalendar reads on mount
- Parent picks a new time slot — full normal booking flow from that point

### 24hr reminders (NOTIF-04)

- Nightly Vercel Cron job (existing cron infrastructure from Phase 3)
- Checks for confirmed sessions with `booking_date` in the next 24 hours (using teacher's stored timezone for accurate windowing)
- Sends reminder email to both teacher and parent
- Idempotency: track whether reminder has been sent (add `reminder_sent_at` column to `bookings`, or gate on cron window) to avoid duplicate sends on cron re-run

### Claude's Discretion

- Exact Stripe Elements configuration (appearance API, field layout)
- Styling of the auth step within the BookingCalendar card
- `/account` page layout and empty state design
- Login redirect flow for parents (vs. teachers) after auth
- Exact copy for the 24hr reminder email templates

</decisions>

<specifics>
## Specific Ideas

- Payment timing clarification (confirmed in discussion): parents always **authorize** payment at booking time (hold on card), actual charge happens when teacher marks session complete — true for both deferred and direct paths. The teacher's Stripe connection status determines the flow, not the payment timing.
- Rebook: teacher page and subject are pre-filled; parent still picks their new time slot via the full calendar. No suggestion of a specific time — keeps it simple.
- The `/account` page is MVP-minimal: upcoming + past. No payment history section for v1.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- `BookingCalendar.tsx` (`src/components/profile/BookingCalendar.tsx`): Full calendar + time slot selector + booking form. Has a `step` state machine already (`'calendar' | 'form' | 'success' | 'error'`). Needs new `stripeConnected: boolean` prop and two new steps: `'auth'` and `'payment'`. The `submitAction` prop pattern is already established — a `'payment'` step variant would call a new Server Action.
- `BookingRequestSchema` (`src/lib/schemas/booking.ts`): Existing Zod schema for booking data — reuse for the direct booking submission with an added `paymentMethodId` field.
- Existing login page (`/login`): Supabase Auth UI; parent login reuses same auth system. Need to support `?redirect=/account` param for post-login routing.
- `BookingConfirmationEmail.tsx` (`src/emails/`): Already exists from Phase 3 (NOTIF-03). Phase 4 can reuse or extend it to include the `/account` link.
- `SessionCompleteEmail.tsx` + existing email infrastructure in `src/lib/email.ts`: Pattern for all new email functions.
- Vercel Cron (`vercel.json`): Already configured from Phase 3 auto-cancel and follow-up jobs. Add a new cron path for 24hr reminders.

### Established Patterns

- `step` state machine in `BookingCalendar` — extend, don't replace
- Server Actions for teacher/parent-triggered mutations (bookings, accept/decline, mark complete)
- `supabase.auth.getUser()` not `getSession()` in all server contexts
- `supabase.rpc()` for atomic booking creation (BOOK-04 — already in place with DB unique constraint)
- Tailwind v4 CSS-first theming with `var(--accent)` for accent color (BookingCalendar already uses it inline via `accentColor` prop)
- No confirmation dialogs on single actions (consistent Phase 2/3 pattern)
- `supabaseAdmin` in cron/webhook handlers (no user session available)

### Integration Points

- `[slug]/page.tsx` — pass new `stripeConnected` prop to `BookingCalendar` (teacher's `stripe_charges_enabled` field)
- `/account` — new protected route for parent session view
- `bookings` table — add `reminder_sent_at` column (or equivalent idempotency mechanism) for NOTIF-04
- Stripe API — `PaymentIntent` creation requires teacher's `stripe_account_id` as the connected account; `application_fee_amount` for 7% fee at authorization time or capture time
- New cron endpoint — `/api/cron/session-reminders` added to `vercel.json`
- Booking confirmation email — add `/account` link so parents can bookmark it

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-direct-booking-parent-account*
*Context gathered: 2026-03-07*
