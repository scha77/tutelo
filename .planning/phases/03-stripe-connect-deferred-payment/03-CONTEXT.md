# Phase 3: Stripe Connect + Deferred Payment - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

A teacher can connect Stripe Express in response to a "money waiting" notification; once connected, all waiting parents are immediately emailed a Stripe Checkout link to authorize payment; and the teacher marking a session complete on the dashboard triggers automatic payment capture with the 7% platform fee applied. Also covers 48hr auto-cancel for teachers who never connect, follow-up reminder emails at 24hr and 48hr, and booking confirmation and cancellation notifications.

</domain>

<decisions>
## Implementation Decisions

### Parent payment authorization
- Use **Stripe Checkout** (Stripe-hosted), not Stripe Elements — fast to build, battle-tested, no custom card UI needed
- Trigger: the moment the `account.updated` webhook confirms `charges_enabled: true`, all parents with `requested` bookings are emailed a Stripe Checkout link immediately — no additional teacher action required
- Parent non-payment: booking stays in pending state indefinitely — no auto-cancel for parent non-payment at MVP (handle edge cases informally)
- After parent completes payment: Stripe redirects to `/booking-confirmed?session=...` — our page shows booking details (date/time, teacher name) and "You'll get a reminder 24hrs before your session."

### Connect Stripe page (`/dashboard/connect-stripe`)
- Minimal UI: brief value prop ("Connect Stripe to confirm your bookings and get paid. Takes 2–3 minutes.") + single "Connect with Stripe" button — no pending request count, no earnings preview
- Return URL after Stripe Express onboarding completes: `/dashboard?stripe=connected` — dashboard shows a one-time success banner: "Payments activated! Your pending requests are being confirmed."
- Guard: if teacher already has `stripe_charges_enabled = true` when visiting the page, redirect to `/dashboard` immediately — don't render the connect UI again

### Follow-up email escalation (NOTIF-02)
- **24hr email**: still warm, gentle reminder — "Just a reminder — [student's parent] is still waiting. Connect Stripe to lock in this session." Same tone as the original money-waiting email.
- **48hr email**: explicitly mentions auto-cancel — "This booking will be cancelled if you don't connect before [time]. Don't lose this parent." — real urgency from a real consequence
- Dashboard warning banner: disappears automatically on next page load once `stripe_charges_enabled = true` is set by webhook — no separate "success" banner state needed

### Mark Complete — Phase 3 placement
- Lives on the existing `/dashboard/requests` page — add a "Confirmed" section below the pending requests section, showing confirmed sessions with a "Mark Complete" button per card
- One click, no confirmation dialog — consistent with the Phase 2 accept/decline pattern (no confirmation dialogs on the requests page)
- After marking complete: session card disappears from the list immediately — Phase 5's dashboard will show completed session history

### Claude's Discretion
- Exact layout and styling of the `/dashboard/connect-stripe` page
- `/booking-confirmed` page design (what details to show, what copy to use)
- Stripe Checkout session configuration details (description, metadata, etc.)
- Cron implementation for 48hr auto-cancel (Vercel Cron vs Supabase pg_cron)
- Cron implementation for 24hr/48hr follow-up emails
- Email template design for 24hr and 48hr follow-ups
- Booking confirmation email template (NOTIF-03) for parent and teacher
- Cancellation notification email template (NOTIF-05)
- Session-complete email template for parent (NOTIF-06)
- Loading states during Mark Complete action

</decisions>

<specifics>
## Specific Ideas

- The 48hr email is the highest-stakes teacher email in the product — it's the last chance before real money disappears. The copy should name the specific parent and session ("[parent's email]'s booking for [student] on [date] will be cancelled") — not generic.
- The `/booking-confirmed` page should feel like a receipt: clean, reassuring, with the session details clearly confirmed. Parent should feel like "this is locked in" even though payment isn't fully captured yet.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sendBookingEmail` (`src/lib/email.ts`): Already handles money-waiting vs standard notification branching based on `stripe_charges_enabled`. Phase 3 adds new email functions alongside it (follow-up, confirmation, cancellation, complete).
- `MoneyWaitingEmail.tsx` (`src/emails/`): Existing template with `connectStripeUrl` prop already wired to `/dashboard/connect-stripe`.
- `BookingNotificationEmail.tsx` (`src/emails/`): Standard booking notification for Stripe-connected teachers — already exists.
- Dashboard warning banner: already rendered layout-level in the dashboard when teacher has pending requests and `stripe_charges_enabled = false`. It already links to `/dashboard/connect-stripe`. Phase 3 just builds the destination.
- `/dashboard/requests` page: Already exists with Pending section and accept/decline cards. Phase 3 adds a Confirmed section below it.
- `createClient` (server): `src/lib/supabase/server.ts` — used for all DB calls in webhook handlers and Server Actions.

### Established Patterns
- Webhook handlers: `req.text()` not `req.json()` — required for Stripe signature verification (documented pitfall)
- Two separate webhook endpoints required: `/api/stripe/webhook` (platform events) and `/api/stripe-connect/webhook` (connected-account events), each with its own signing secret
- Never create PaymentIntent until `charges_enabled: true` confirmed via `account.updated` webhook
- Server Actions for teacher-triggered actions (accept/decline precedent from Phase 2)
- React Hook Form + Zod for any form validation
- `supabase.auth.getUser()` not `getSession()` in all server contexts

### Integration Points
- `/dashboard/connect-stripe` (new page) → Stripe Connect Express link generation → Stripe hosted onboarding → return to `/dashboard?stripe=connected`
- `/api/stripe/webhook` (new) — platform events: `account.updated` with `charges_enabled: true` → update `teachers.stripe_charges_enabled`, create PaymentIntents for all `requested` bookings, email waiting parents
- `/api/stripe-connect/webhook` (new) — connected-account events: payment events, future use
- `/booking-confirmed` (new page) — Stripe Checkout success redirect target; reads booking details from DB using `session_id`
- Cron job → 48hr auto-cancel: moves `requested` bookings to `cancelled` if teacher hasn't connected; emails both parties (NOTIF-05)
- Cron job → follow-up emails: sends 24hr and 48hr emails to teachers with pending requests and no Stripe connection
- `/dashboard/requests` page → new Confirmed section → "Mark Complete" Server Action → Stripe capture with 7% application fee → parent email (NOTIF-06)
- `teachers` table: `stripe_account_id` and `stripe_charges_enabled` columns already exist (from Phase 1 schema)
- `bookings` table: `stripe_payment_intent` column already exists

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-stripe-connect-deferred-payment*
*Context gathered: 2026-03-06*
