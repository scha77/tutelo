# S01 Research: Schema & Recurring Booking Creation

**Slice:** M009/S01 — Schema & Recurring Booking Creation  
**Requirements owned:** RECUR-01, RECUR-02, RECUR-05 (primary); RECUR-03, RECUR-06 (setup for S02)  
**Depth:** Deep research — new Stripe API surface (SetupIntent + Customer), new schema pattern, non-trivial conflict detection across N future dates

---

## Summary

This slice introduces the `recurring_schedules` table, a `recurring_schedule_id` FK on `bookings`, a new UI step in `BookingCalendar` for recurring options, multi-date conflict detection, and the Stripe Customer + SetupIntent flow for card saving. The first session uses the existing PI authorize flow; the card-saving step is tightly coupled to the first payment. This is the load-bearing slice — S02 (auto-charge cron) and S03 (cancellation UX) depend on the schema, the `recurring_schedule_id` linkage, and the saved `stripe_payment_method_id` that this slice establishes.

---

## Recommendation

**Build in this order:**  
1. Migration (`recurring_schedules` table + `bookings.recurring_schedule_id` + `bookings.stripe_payment_method_id` + `bookings.stripe_customer_id`)  
2. Pure function `generateRecurringDates(startDate, frequency, count)` + unit tests  
3. Pure function `checkDateConflicts(teacherId, dates, startTime, endTime)` against existing bookings + availability + unit tests  
4. New API route `/api/direct-booking/create-recurring` — creates schedule row, inserts N booking rows, saves Stripe Customer + SetupIntent, creates first-session PI  
5. UI: RecurringOptions step in BookingCalendar (between form and payment)  
6. Skipped-dates summary in success state  

The pure functions are the unit-testable core of this slice and must be isolated in `src/lib/utils/recurring.ts`.

---

## Implementation Landscape

### Files That Exist and Must Change

| File | Role | Change needed |
|------|------|---------------|
| `supabase/migrations/0001_initial_schema.sql` | Defines `bookings` table + `bookings_unique_slot` constraint | Read-only — new migration will ADD columns |
| `src/app/api/direct-booking/create-intent/route.ts` | Current PI creation — single booking | New sibling route `create-recurring/route.ts` for multi-booking path |
| `src/components/profile/BookingCalendar.tsx` | 750-line state machine (calendar → form → auth → payment → success) | Add `recurring` step between `form` and `auth/payment` |
| `src/actions/bookings.ts` | `cancelSession` action | Minor: needs `recurring_schedule_id` awareness for S03 |
| `src/lib/utils/slots.ts` | `getSlotsForDate` — availability for one date | No change; called per-date in conflict check |
| `src/lib/schemas/booking.ts` | `BookingRequestSchema` (Zod) | New schema `RecurringBookingSchema` for new route |
| `src/app/(dashboard)/dashboard/sessions/page.tsx` | Sessions list — ConfirmedSessionCard | Add `recurring_schedule_id` to select, pass to card for S03 badge |
| `vercel.json` | 3 cron definitions | S02 will extend `session-reminders` cron; no change in this slice |

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/0014_recurring_schedules.sql` | `recurring_schedules` table + FK on `bookings` + new `bookings` columns |
| `src/lib/utils/recurring.ts` | `generateRecurringDates()`, `checkDateConflicts()` — pure functions |
| `src/app/api/direct-booking/create-recurring/route.ts` | POST handler for multi-booking creation + Stripe Customer + SetupIntent + first-session PI |
| `src/__tests__/recurring-dates.test.ts` | Unit tests for `generateRecurringDates` edge cases |
| `src/__tests__/recurring-conflicts.test.ts` | Unit tests for `checkDateConflicts` (existing bookings, unavailability, overrides) |
| `src/__tests__/create-recurring.test.ts` | Integration tests for the new API route |
| `src/components/profile/RecurringOptions.tsx` | New client component — frequency + count picker, skipped-date summary |
| `src/emails/RecurringBookingConfirmationEmail.tsx` | Email with full series dates + skipped-date list |

---

## Schema Design

### `recurring_schedules` table (new)

```sql
CREATE TABLE recurring_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID NOT NULL REFERENCES teachers(id),
  parent_id       UUID REFERENCES auth.users(id),
  parent_email    TEXT NOT NULL,
  frequency       TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly')),
  total_sessions  SMALLINT NOT NULL CHECK (total_sessions BETWEEN 2 AND 26),
  start_date      DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  -- Stripe: Customer + saved payment method established at booking time
  stripe_customer_id      TEXT,
  stripe_payment_method_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Columns added to `bookings`

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_schedule_id UUID REFERENCES recurring_schedules(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_recurring_first BOOLEAN DEFAULT FALSE;
-- stripe_customer_id and stripe_payment_method_id stored on recurring_schedules, not per-booking
-- (S02 cron looks these up via JOIN when charging)
```

**Key constraint:** `bookings_unique_slot` (teacher_id, booking_date, start_time) already prevents double-booking naturally. The conflict detection pre-check determines which dates to skip; the insert will succeed for available dates and fail for conflicts (24505). The batch insert needs per-row error handling.

---

## Key Technical Findings

### 1. Stripe SetupIntent Flow (New Surface for Tutelo)

The existing flow: parent pays via `stripe.paymentIntents.create` with `capture_method: 'manual'`. For recurring, we need:

1. **Create Stripe Customer** for the parent (`stripe.customers.create({ email, name })`) — store `stripe_customer_id` on `recurring_schedules`
2. **Create SetupIntent** (`stripe.setupIntents.create({ customer, payment_method_types: ['card'], usage: 'off_session' })`) — returns `client_secret` for the browser
3. **Browser confirms SetupIntent** via `stripe.confirmSetup({ elements, confirmParams })` — attaches card to Customer
4. **First session PI** — created with `customer: stripe_customer_id` + `payment_method: stripe_payment_method_id` + `off_session: false` + `capture_method: 'manual'`
5. **Subsequent sessions (S02)** — cron creates PI with `customer`, `payment_method`, `off_session: true`, `confirm: true`

**Critical**: The SetupIntent and first PaymentIntent are created **server-side**; the browser only confirms them. The `create-recurring` route must return both `setupIntentClientSecret` (for card saving) and `firstSessionClientSecret` (for first payment). The browser performs two Stripe confirmations in sequence, or we use a **single PaymentIntent with setup_future_usage: 'off_session'** which saves the card AND authorizes the first session in one step.

**Preferred approach**: Use `payment_intent_data.setup_future_usage: 'off_session'` on the first PaymentIntent. This saves the card to the Stripe Customer automatically when the PI is confirmed. Eliminates the two-step flow and halves browser round-trips.

The `PaymentStep` component uses `confirmPayment()` — it works for both regular PIs and PIs with `setup_future_usage`. No new UI component needed for the payment confirmation itself.

### 2. BookingCalendar State Machine Extension

Current states: `'calendar' | 'form' | 'success' | 'error' | 'auth' | 'payment'`

Add one state: `'recurring'` — shown after `'form'`, before `'auth'`/'`payment'`.

The `recurring` step shows:
- Frequency selector (weekly / biweekly / one-time — default one-time preserves existing flow)
- Number of weeks picker (2–26 range; show calculated end date)
- Projected session dates list (filtered by availability + known conflicts)
- "Confirm" → advances to `auth` (if not logged in) or `createPaymentIntent` (if logged in)

**Important**: The existing form submit handler `handleSubmit` branches on `stripeConnected`. The recurring step sits between form and payment. The recurring state stores `{ frequency, count }` in component state; the `createPaymentIntent` function is replaced by `createRecurringIntent` which calls the new route.

**The 750-line file risk**: The recurring step is a separate `RecurringOptions` component imported into `BookingCalendar`. Only the state transitions, new state variables (`selectedFrequency`, `recurringCount`, `skippedDates`), and the `createRecurringIntent` call are added inline. This limits BookingCalendar growth to ~80 lines.

### 3. Conflict Detection Logic

For a series starting `startDate`, `frequency` (weekly = 7 days, biweekly = 14 days), `count` sessions:

```typescript
// generateRecurringDates(startDate, frequency, count) → Date[]
// Returns all N candidate dates

// checkDateConflicts(teacherId, dates, startTime, endTime) → { available: Date[], skipped: {date, reason}[] }
// Queries:
//   1. bookings WHERE teacher_id = X AND booking_date IN (...dates) AND start_time = startTime AND status NOT IN ('cancelled')
//      → slots already taken
//   2. availability WHERE teacher_id = X AND day_of_week = date.getDay()
//      → recurring availability (for dates not matching teacher's usual day)
//   3. availability_overrides WHERE teacher_id = X AND specific_date IN (...dates)
//      → override-wins-recurring: if override exists for date, check if startTime falls within it
```

**Override precedence** must match `getSlotsForDate` logic: if an override exists for a date, only override windows apply. This pure function should be in `src/lib/utils/recurring.ts` and reuse the existing `getSlotsForDate` logic by calling it per-date.

**Performance**: N = 26 max sessions. Dates are sparse (weekly/biweekly). Single `IN (...)` query for each of the 3 checks. No pagination needed.

### 4. Atomic Series Creation

The new API route must:
1. Insert `recurring_schedules` row → get `schedule_id`
2. For each available date: INSERT into `bookings` with `recurring_schedule_id = schedule_id`, `status = 'requested'`
3. Handle `23505` (unique constraint) gracefully — skip, add to `skippedDates` list
4. Create Stripe Customer (if not exists) + PaymentIntent with `setup_future_usage: 'off_session'`
5. Update `recurring_schedules` with `stripe_customer_id` (retrieved after PI creation)
6. Return `{ clientSecret, skippedDates[], sessionDates[], recurringScheduleId }`

**Atomicity gap**: Supabase doesn't support true multi-table transactions via the JS client without RPC. Options:
- Use an RPC (Postgres function) for the booking inserts only — gives atomicity for the booking rows
- OR: insert schedule first, insert bookings in JS with per-row error handling, roll back schedule if zero bookings succeed

**Recommended**: Write a Postgres RPC `create_recurring_series(p_schedule_id, p_dates, p_teacher_id, ...)` that inserts all booking rows and returns `{inserted: [], skipped: []}`. The JS layer handles Stripe. This matches the existing `create_booking` RPC pattern.

### 5. Vercel Cron Constraint (Clarified)

The context mentions "1 daily cron" but the actual Vercel Hobby limit was **2 cron jobs per team** (since relaxed). A January 2026 Vercel changelog confirmed the limit is now **100 per project on every plan**. The project already has 3 crons (`auto-cancel`, `stripe-reminders`, `session-reminders`) — all daily frequency, which Hobby permits.

**D013 direction**: Extend `session-reminders` (at `0 14 * * *`), not `stripe-reminders`. Rationale: `session-reminders` already queries `confirmed` bookings for tomorrow's date — exactly the same query pattern needed for the auto-charge cron. This extension lives in **S02**, not S01.

S01 does NOT touch any cron. S01's job is to create the data (`recurring_schedule_id`, `stripe_customer_id`, `stripe_payment_method_id` on `recurring_schedules`) that S02's cron will consume.

### 6. Existing Test Patterns

Tests use `vitest` + `jsdom`. Mocking pattern: `vi.hoisted` for Stripe class mock, chainable `vi.fn().mockReturnValue(chain)` for Supabase queries. Test files live in `src/__tests__/`. New tests: `recurring-dates.test.ts` (pure functions, no mocks needed), `recurring-conflicts.test.ts` (Supabase mock), `create-recurring.test.ts` (Stripe + Supabase mocks, follows `payment-intent.test.ts` pattern exactly).

---

## Natural Seams (Task Boundaries)

| Task | Files | Verifiable independently |
|------|-------|--------------------------|
| T01: Migration | `0014_recurring_schedules.sql` | `tsc` clean + `psql \d recurring_schedules` |
| T02: Pure functions | `src/lib/utils/recurring.ts` + tests | `vitest run recurring-dates recurring-conflicts` |
| T03: API route | `create-recurring/route.ts` + schema + tests | `vitest run create-recurring` |
| T04: RecurringOptions component | `RecurringOptions.tsx` + BookingCalendar wiring | tsc + storybook/manual |
| T05: Email template | `RecurringBookingConfirmationEmail.tsx` | tsc + visual |

T02 has no dependencies and can be written first — pure functions are easy to test and de-risk the core logic. T03 depends on T01 (needs column names) and T02 (imports conflict check). T04 depends on T03 (needs to call the new route). T05 can be done in parallel with T04.

---

## Risks and Unknowns

1. **`setup_future_usage: 'off_session'` + manual capture compatibility** — Stripe docs note that `setup_future_usage` may not be compatible with all capture_method settings. Specifically: using `capture_method: 'manual'` together with `setup_future_usage: 'off_session'` should work (Stripe confirms the card is saved after capture/cancel), but needs verification in T03 tests. If incompatible, use a separate SetupIntent flow.

2. **Webhook flow for recurring first session** — The existing `payment_intent.amount_capturable_updated` webhook handler confirms a booking by `booking_id` from PI metadata. For recurring, the `booking_id` in metadata must be the **first session's booking ID** only. The other N-1 sessions are confirmed differently (by the cron in S02). The webhook must not try to confirm all recurring sessions — confirmed by checking `is_recurring_first = true` on the first booking row.

3. **Race condition: parent books recurring slot while another booking is in-flight** — The pre-check for conflicts queries existing bookings, but another parent could book the same slot between the pre-check and the insert. The `bookings_unique_slot` constraint catches this (returns 23505). The JS handler skips that date and adds it to `skippedDates`. No silent corruption possible.

4. **BookingCalendar size** — currently 750 lines. Extracting `RecurringOptions` as a separate component keeps the addition manageable (~80 lines in BookingCalendar). Must verify `tsc` after every component boundary change.

5. **Teacher with no `stripe_account_id`** — the `create-recurring` route must check `stripe_charges_enabled`. Recurring booking only makes sense for Stripe-connected teachers (same guard as `create-intent`). Non-Stripe-connected teachers fall through to the deferred path — recurring is out of scope for deferred bookings in this milestone.

---

## What to Build First

**Risk #1 deserves a spike in T03**: Create a test that calls `stripe.paymentIntents.create({ ..., capture_method: 'manual', setup_future_usage: 'off_session' })` and verify the response shape includes `setup_future_usage`. If incompatible, fall back to two-step flow (SetupIntent first → PI second). This is the single highest-uncertainty item in S01.

---

## Skills Discovered

- `stripe/ai@stripe-best-practices` installed globally (5.6K installs) — covers SetupIntent, Customer API, off-session payment patterns, and idempotency best practices for payment flows.
