# Phase 2: Booking Requests - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

A parent can submit a booking request (no payment) from a teacher's public page, the teacher receives a "money waiting" email notification, and can accept or decline the request from their dashboard. Stripe Connect onboarding itself (the actual payment activation flow) is Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Post-submit parent experience
- Inline success state inside the BookingCalendar card — no route change, no redirect
- Success state shows: checkmark, date/time booked, subject, "We'll email [parent email] when confirmed"
- A "Book another time" link at the bottom lets parent reset the calendar if they want to rebook; success state otherwise persists until page reload
- Double-booking error (slot taken by DB constraint): show inline error message in the form — "This time slot was just booked. Please choose another." — with back button returning to calendar; no page change

### Booking form fields
- Subject: dropdown populated from teacher's subjects array (passed as a new prop to BookingCalendar)
  - If teacher has only one subject: auto-select and hide the dropdown
- Student name label: "Student's name" (not "your child's name")
- Notes: keep existing single textarea, no new DB columns; update placeholder to be specific: guide parent to share grade level, what the student is struggling with, and goals for the first session
- Field order: Student's name → Subject (if visible) → Email → Notes (optional)

### Dashboard requests layout
- "Requests" appears as the first item in the sidebar nav, above Page, Availability, Settings
- Badge count on sidebar item shows number of pending requests when > 0
- Each pending request card shows: student name, subject, requested date/time (in teacher's timezone), parent email, submitted-ago timestamp
- Accept and Decline are inline buttons on the card — no confirmation dialog, no reason required for Decline
- Accepting changes booking status to `pending`; Declining changes to `cancelled`
- Empty state: "No pending requests yet. Share your page to get bookings!" + copy-link button (copies teacher's tutelo.app/[slug] URL)

### "Money waiting" email + in-app notification
- Every booking request triggers an email to the teacher if they have not yet connected Stripe — not just the first request
- Email tone: urgent + warm (not aggressive, not formal)
  - Subject: "A parent wants to book you — connect Stripe to confirm"
  - Body includes: teacher's first name, student name, subject, date/time, parent email; one CTA button: "Activate Payments →" (links to `/dashboard/connect-stripe` — Phase 3 will build the destination)
- If teacher HAS connected Stripe: send a standard booking notification email (NOTIF-01) without the Stripe CTA
- In-app notification: sticky warning banner at the top of the dashboard (not a separate notification system)
  - Shows when teacher has ≥1 pending request AND has not connected Stripe
  - Copy: "You have X pending request(s)! Connect Stripe to confirm them." with "Activate Payments →" CTA
  - Badge count on Requests sidebar item serves as secondary indicator

### Claude's Discretion
- Exact email template design / react-email layout
- Animation/transition for the inline success state in BookingCalendar
- Styling of the dashboard warning banner
- Loading states during accept/decline actions
- Exact wording of the notes textarea placeholder (keep the intent: grade level + struggles + goals)

</decisions>

<specifics>
## Specific Ideas

- The "money waiting" email is the single highest-stakes conversion moment in the product — the urgency must feel real (a named parent with a real session waiting), not generic spam
- Notes placeholder should feel like teacher-to-teacher advice: "Let Ms. Johnson know what grade level, what [student] is working on, and what you'd most like to focus on in the first session."

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BookingCalendar.tsx` (src/components/profile/BookingCalendar.tsx): Full calendar + time slot selector + booking form UI already exists. `handleSubmit` is a stub (Phase 2 wires it). Missing: subject field, `subjects` prop. Needs: new `subjects: string[]` prop, subject dropdown, focused notes placeholder, inline success state, inline error state.
- `BookNowCTA.tsx`: Already scrolls to `#booking` anchor — no changes needed in Phase 2. Phase 1 context confirmed: "Phase 2 wires the same CTA to the booking form — no label or layout change needed."
- `Button`, `Input`, `Label`, `Textarea`, `Select` — shadcn/ui components already installed and used in the form
- `sonner` (toast) — already used; inline success state replaces the current toast approach
- Dashboard sidebar layout — left sidebar + main content (src/app/(dashboard)/dashboard/layout.tsx); adding "Requests" as first sidebar item
- `createClient` (server) — src/lib/supabase/server.ts, used for all server-side Supabase calls

### Established Patterns
- React Hook Form + Zod for schema validation (booking form can add a Zod schema in src/lib/schemas/)
- Atomic booking creation via `supabase.rpc()` — required (BOOK-04); DB unique constraint on `(teacher_id, booking_date, start_time)` already in place
- `supabase.auth.getUser()` not `getSession()`; RLS enabled on bookings table from day one
- Tailwind v4 CSS-first theming with `var(--accent)` for accent color
- `bookings_anon_insert` RLS policy is deliberately permissive (`WITH CHECK (true)`) — Phase 2 should tighten to validate teacher is published and slot is available

### Integration Points
- `BookingCalendar.tsx` → new Server Action or `/api/bookings` route → `supabase.rpc('create_booking', {...})`
- Dashboard → new `/dashboard/requests` page (or section) for DASH-02
- Resend email → triggered server-side on successful booking creation
- `/dashboard/connect-stripe` — placeholder route; Phase 3 builds the actual Stripe Connect flow; Phase 2 just links to it
- State machine: `requested → pending → confirmed → completed → cancelled` — DB CHECK constraint already in place; Phase 2 handles `requested` (on creation) and teacher accept (`pending`) / decline (`cancelled`)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-booking-requests*
*Context gathered: 2026-03-05*
