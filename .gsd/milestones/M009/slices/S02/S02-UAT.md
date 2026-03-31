# S02: Saved Cards & Auto-Charge Cron — UAT

**Milestone:** M009
**Written:** 2026-03-31T14:28:33.239Z

## Preconditions

- Stripe test mode keys configured (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- `CRON_SECRET` env var set
- A recurring schedule exists in DB with a confirmed first booking (from S01)
- Teacher has `stripe_account_id` and `hourly_rate` set
- Parent booking row has `is_recurring_first=false`, `status='requested'`, `booking_date=tomorrow`, `recurring_schedule_id` populated

---

## Test Cases

### TC-01: Stripe Webhook Stores Payment Method on First Session Confirm

**Preconditions:** A `payment_intent.amount_capturable_updated` event is delivered with `metadata.recurring_schedule_id` set and `payment_method` non-null. The target `recurring_schedules` row has `stripe_payment_method_id = null`.

**Steps:**
1. Simulate webhook delivery to `/api/stripe/webhook` with a PI event containing `metadata: { booking_id: "...", recurring_schedule_id: "rs-uuid" }` and `payment_method: "pm_test_xxx"`.
2. Verify the webhook returns HTTP 200.
3. Query `recurring_schedules` for the row with `id = "rs-uuid"`.

**Expected:** `stripe_payment_method_id = "pm_test_xxx"`.

---

### TC-02: Webhook Idempotency — Re-delivery Does Not Overwrite PM

**Preconditions:** Same PI event as TC-01, but `recurring_schedules.stripe_payment_method_id` is already set to `"pm_test_xxx"`.

**Steps:**
1. Deliver the same webhook event again.
2. Verify HTTP 200 returned.
3. Query `recurring_schedules.stripe_payment_method_id`.

**Expected:** Value remains `"pm_test_xxx"` (`.is('stripe_payment_method_id', null)` guard prevented overwrite). No duplicate DB write.

---

### TC-03: Webhook No-Op When No recurring_schedule_id in Metadata

**Preconditions:** A `payment_intent.amount_capturable_updated` event with `metadata: { booking_id: "..." }` only (no `recurring_schedule_id`).

**Steps:**
1. Deliver webhook event.
2. Verify HTTP 200.
3. Verify no `UPDATE` on `recurring_schedules` table occurred.

**Expected:** Booking confirmed normally; `recurring_schedules` untouched.

---

### TC-04: Cron Returns 401 Without CRON_SECRET

**Steps:**
1. `GET /api/cron/recurring-charges` with no `Authorization` header.
2. Check response status.

**Expected:** HTTP 401, body "Unauthorized". No Stripe calls made.

---

### TC-05: Cron No-Op When No Recurring Sessions Tomorrow

**Preconditions:** No bookings in DB with `booking_date=tomorrow`, `status='requested'`, `is_recurring_first=false`, `recurring_schedule_id IS NOT NULL`.

**Steps:**
1. `GET /api/cron/recurring-charges` with `Authorization: Bearer {CRON_SECRET}`.
2. Read response body.

**Expected:** HTTP 200, `{ "charged": 0, "failed": 0, "skipped": 0, "checked": 0 }`.

---

### TC-06: Successful Auto-Charge — Booking Confirmed

**Preconditions:** One booking row: `booking_date=tomorrow`, `status='requested'`, `is_recurring_first=false`, `recurring_schedule_id` pointing to a schedule with `stripe_customer_id` and `stripe_payment_method_id` set.

**Steps:**
1. `GET /api/cron/recurring-charges` with valid CRON_SECRET.
2. Check Stripe dashboard for new PaymentIntent.
3. Query `bookings` table for the booking.

**Expected:**
- Stripe PI created with `off_session: true`, `confirm: true`, `capture_method: 'manual'`, `application_fee_amount = Math.round(amount * 0.07)`.
- `idempotencyKey` = `recurring-charge-{bookingId}-{tomorrow}`.
- Booking `status = 'confirmed'`, `stripe_payment_intent = pi.id`.
- Response: `{ "charged": 1, "failed": 0, "skipped": 0, "checked": 1 }`.

---

### TC-07: Failed Charge — Booking Marked payment_failed + Emails Sent

**Preconditions:** Same as TC-06 but use a Stripe test card that declines (e.g., `pm_card_chargeDeclined`).

**Steps:**
1. `GET /api/cron/recurring-charges` with valid CRON_SECRET.
2. Query `bookings` table for the booking.
3. Check parent email inbox (test email address on booking).
4. Check teacher email inbox (teacher's `social_email`).

**Expected:**
- Booking `status = 'payment_failed'`.
- Parent receives email: subject contains `"Payment failed for {studentName}'s session on {date}"`. Body includes link to update payment method.
- Teacher receives email (if `social_email` set): subject contains `"Payment failed for {studentName}'s recurring session"`. No CTA link in teacher variant.
- Response: `{ "charged": 0, "failed": 1, "skipped": 0, "checked": 1 }`.

---

### TC-08: Null Payment Method — Session Skipped, Not Charged

**Preconditions:** Booking row as in TC-06 but `recurring_schedules.stripe_payment_method_id = null`.

**Steps:**
1. `GET /api/cron/recurring-charges` with valid CRON_SECRET.

**Expected:**
- No Stripe PI created.
- Booking `status` remains `'requested'` (not changed).
- Response: `{ "charged": 0, "failed": 0, "skipped": 1, "checked": 1 }`.
- Console log: `[recurring-charges] Skipped booking {id} — no payment method`.

---

### TC-09: Cron Idempotency — Already-Confirmed Sessions Not Re-Charged

**Preconditions:** Same booking as TC-06, but cron already ran and booking is now `status='confirmed'`.

**Steps:**
1. `GET /api/cron/recurring-charges` again with valid CRON_SECRET.

**Expected:**
- Cron query finds 0 sessions (`.eq('status','requested')` excludes confirmed bookings).
- No Stripe PI created.
- Response: `{ "charged": 0, "failed": 0, "skipped": 0, "checked": 0 }`.

---

### TC-10: First Session Not Charged by Cron (is_recurring_first=true)

**Preconditions:** A booking with `is_recurring_first=true`, `booking_date=tomorrow`, `status='requested'`.

**Steps:**
1. `GET /api/cron/recurring-charges` with valid CRON_SECRET.

**Expected:** Cron query excludes this booking (`.eq('is_recurring_first', false)` filter). No Stripe PI. Response `checked=0`.

---

### TC-11: Application Fee Is 7% of Session Amount

**Preconditions:** Session with `start_time='14:00'`, `end_time='15:00'`, teacher `hourly_rate=60`. Expected amount: `$60.00 = 6000 cents`. Expected fee: `Math.round(6000 * 0.07) = 420 cents`.

**Steps:**
1. Run cron with valid CRON_SECRET.
2. Inspect Stripe PI in test dashboard.

**Expected:** PI `application_fee_amount = 420` (7% of 6000).

---

### TC-12: payment_failed Status Accepted by DB Constraint

**Preconditions:** Migration 0015 applied to the database.

**Steps:**
1. Attempt to UPDATE a booking row directly: `UPDATE bookings SET status='payment_failed' WHERE id='{id}'`.

**Expected:** Update succeeds without constraint violation. Confirm the status reads back as `'payment_failed'`.

---

## Edge Cases

- **Teacher with no social_email**: Failed charge cron sends parent email only; no error thrown for missing teacher email.
- **Stripe returns unexpected PI status** (not `requires_capture`): Booking left as `requested` for next cron run; logged as warning.
- **Double cron invocation** (Vercel race on cold start): Stripe idempotencyKey returns same PI; `.eq('status','requested')` DB guard prevents double confirm.
- **Booking cancelled between cron query and Stripe create**: Stripe PI created but DB update finds 0 rows (status no longer `requested`); PI authorization will auto-expire after 7 days.

