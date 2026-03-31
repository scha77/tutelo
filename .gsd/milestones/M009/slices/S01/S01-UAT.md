# S01: Schema & Recurring Booking Creation — UAT

**Milestone:** M009
**Written:** 2026-03-31T14:04:41.257Z

# S01 UAT: Schema & Recurring Booking Creation

## Preconditions
- Local dev environment running (`npm run dev`)
- Supabase local instance with migration 0014 applied (`supabase db reset` or `supabase migration up`)
- Teacher account with `stripe_charges_enabled=true` and `stripe_account_id` set
- Parent account (logged-in user with email)
- Stripe test mode with test card `4242 4242 4242 4242`
- Test start date: a future Tuesday (e.g. 2026-04-07)

---

## TC-01: Weekly recurring booking — happy path (6 sessions, 0 conflicts)

**Goal:** Parent books 6 weekly Tuesday sessions with no scheduling conflicts.

1. Navigate to teacher profile page as logged-in parent
2. Click a Tuesday time slot (e.g. 4:00 PM – 5:00 PM)
3. Fill in booking form: student name, subject → click Next
4. On RecurringOptions step: select "Weekly", set count to 6
5. **Expected:** 6 projected dates shown (every Tuesday for 6 weeks) with ✓ markers, end date displayed, "6 sessions total" summary
6. Click "Confirm recurring"
7. **Expected:** Stripe PaymentElement appears (payment step)
8. Enter test card 4242 4242 4242 4242, confirm payment
9. **Expected:** Success view shows "6 sessions scheduled" with numbered session dates, no skipped dates message
10. **DB check:** `recurring_schedules` has 1 new row; `bookings` has 6 new rows with matching `recurring_schedule_id`; first row has `is_recurring_first=true`; all rows have `status='requested'`
11. **Email check:** Parent receives RecurringBookingConfirmationEmail with 6 numbered sessions and auto-payment note; teacher receives notification email

---

## TC-02: Weekly recurring booking — partial conflict (1 of 6 dates skipped)

**Goal:** System creates sessions for available dates, skips conflict, shows parent what was skipped.

1. Pre-create an existing `requested` booking on the 3rd Tuesday in the series for the same teacher and time slot
2. Navigate to teacher profile as parent → select same Tuesday slot
3. Fill form → RecurringOptions: Weekly, 6 sessions
4. **Expected:** Projected dates list shows 5 ✓ and 1 ✗ (conflict date marked red/crossed), summary says "5 of 6 sessions available"
5. Click "Confirm recurring"
6. Enter test card → confirm payment
7. **Expected:** Success shows "5 sessions scheduled" + "1 date skipped: [date] — already booked"
8. **DB check:** `bookings` has 5 rows; skipped date has no booking row; `recurring_schedule_id` matches the schedule

---

## TC-03: Biweekly recurring booking (4 sessions)

1. Select slot → RecurringOptions: "Biweekly", count 4
2. **Expected:** Projected dates are every 2 weeks (not every week)
3. Confirm → payment → success
4. **DB check:** Date gaps between booking rows are ~14 days

---

## TC-04: One-time booking path unchanged

1. Select slot → RecurringOptions: "One-time" (default selection)
2. **Expected:** Clicking "Confirm" proceeds directly to auth/payment step (no conflict pre-check, no recurring UI)
3. Complete payment
4. **DB check:** Booking row has `recurring_schedule_id=NULL`, `is_recurring_first=FALSE`

---

## TC-05: All dates conflicted → 409

1. Pre-book all 4 Tuesdays in a 4-session weekly series for the teacher
2. Attempt create-recurring API call with those dates
3. **Expected:** API returns 409 `{ error: 'No available dates for the requested schedule' }`
4. **UI check:** RecurringOptions shows "No available dates" message; Confirm button disabled

---

## TC-06: Unauthenticated request → 401

1. Call `POST /api/direct-booking/create-recurring` without a valid session cookie
2. **Expected:** `{ error: 'Unauthorized' }` with status 401

---

## TC-07: Teacher not Stripe-connected → 400

1. Use a teacher with `stripe_charges_enabled=false`
2. Call create-recurring for that teacher
3. **Expected:** `{ error: 'Teacher is not accepting payments' }` with status 400

---

## TC-08: Invalid body validation → 400

1. POST to `/api/direct-booking/create-recurring` with `frequency` missing from body
2. **Expected:** Status 400 with Zod validation error message

---

## TC-09: Minimum and maximum session counts

1. RecurringOptions: set count to 2 → **Expected:** 2 projected dates shown, slider at minimum
2. Set count to 26 → **Expected:** 26 projected dates shown (extending ~6 months), slider at maximum
3. Count input below 2 → **Expected:** Clamped to 2; count above 26 → clamped to 26

---

## TC-10: Stripe failure → 502 + cleanup

1. Mock Stripe to throw on `paymentIntents.create`
2. Call create-recurring
3. **Expected:** Status 502 returned
4. **DB check:** No orphaned `recurring_schedules` row; no orphaned `bookings` rows (cleanup executed)

---

## TC-11: Email template rendering

1. Trigger a successful recurring booking (TC-01)
2. Inspect email sent to parent:
   - **Expected:** Preview text includes session count and start date
   - **Expected:** Numbered list of sessions formatted as "Tuesday, April 7, 2026 at 4:00 PM"
   - **Expected:** Auto-payment note visible for future sessions
   - **Expected:** No skipped-dates section (when 0 skipped)
3. If TC-02 path: skipped-dates amber section is visible with date + reason

---

## TC-12: check-conflicts endpoint (read-only pre-check)

1. POST `/api/direct-booking/check-conflicts` with `{ teacherId, dates: ['2026-04-07', '2026-04-14'], startTime: '16:00', endTime: '17:00' }`
2. **Expected:** Returns `{ available: [...], skipped: [...] }` with status 200
3. Pre-create conflict on 2026-04-07 → re-test → 2026-04-07 appears in `skipped` with `reason: 'already booked'`
4. Unauthenticated call → 401

---

## Edge Cases

- **Month boundary:** Start on last Tuesday of month → next session is first Tuesday of next month (date arithmetic correct)
- **Year boundary:** Start in late December → sessions span into January of next year
- **DST transition:** Series spanning a DST change (e.g. October/November) → all sessions on correct weekday, no date drift
- **Teacher with session types:** create-recurring uses session type price, not hourly_rate fallback
- **Teacher without session types:** create-recurring falls back to hourly_rate proration (same as create-intent)
