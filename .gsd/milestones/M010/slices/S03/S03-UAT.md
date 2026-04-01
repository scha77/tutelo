# S03: Saved Payment Methods — UAT

**Milestone:** M010
**Written:** 2026-04-01T13:53:52.601Z

# S03 UAT: Saved Payment Methods

## Preconditions

- Supabase local dev running with migration 0018 applied (`supabase/migrations/0018_parent_profiles.sql`)
- Stripe test mode keys configured; Stripe webhook forwarding active (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)
- Test parent account created and logged in at `/parent`
- At least one published teacher with Stripe Connect configured
- `parent_profiles` table empty for the test parent user

---

## Test Cases

### TC-01: First booking auto-saves card to parent_profiles

**Preconditions:** Parent has no existing `parent_profiles` row. Parent is logged in.

**Steps:**
1. Navigate to a published teacher's `/[slug]` page
2. Click "Book a Session", complete the booking form (select date/time, fill student name)
3. In Stripe PaymentElement, enter test card `4242 4242 4242 4242`, expiry `12/30`, CVC `123`
4. Click "Confirm Booking"
5. Stripe webhook fires `payment_intent.amount_capturable_updated`

**Expected outcomes:**
- Booking confirmation appears; session is created in `bookings` table
- `parent_profiles` row exists for the parent's `user_id` with `stripe_customer_id` populated
- `card_brand = 'visa'`, `card_last4 = '4242'`, `card_exp_month = 12`, `card_exp_year = 2030` in `parent_profiles`
- No duplicate Stripe Customer is created (verified: `stripe.customers.list` shows one Customer for the parent email)

---

### TC-02: /parent/payment page shows saved card

**Preconditions:** TC-01 completed; parent has a saved card in `parent_profiles`.

**Steps:**
1. Navigate to `/parent/payment`
2. Observe the card display section

**Expected outcomes:**
- Page shows card brand (e.g., "Visa"), `•••• 4242`, `Expires 12/2030`
- "Remove Card" button is visible
- No error state; no "no card saved" empty state

---

### TC-03: Second booking reuses Stripe Customer (no duplicate Customer created)

**Preconditions:** TC-01 completed; parent has `stripe_customer_id` in `parent_profiles`.

**Steps:**
1. Navigate to a different (or same) teacher's `/[slug]` page
2. Book another session (complete booking form, confirm payment with any test card)
3. In Stripe dashboard (test mode), check Customer list for the parent's email

**Expected outcomes:**
- Only one Stripe Customer exists for the parent email
- The new booking's PaymentIntent has `customer` set to the same Customer ID as TC-01
- `parent_profiles` row has `updated_at` refreshed after the second booking's webhook fires

---

### TC-04: Remove Card action clears saved card

**Preconditions:** Parent has a saved card from TC-01.

**Steps:**
1. Navigate to `/parent/payment`
2. Click "Remove Card"
3. Confirm in the confirmation dialog

**Expected outcomes:**
- API call to `DELETE /api/parent/payment-method` returns 200
- Page refreshes to show the empty state: "No card saved. Cards are auto-saved when you complete your first booking."
- `parent_profiles` row still exists but `stripe_payment_method_id`, `card_brand`, `card_last4`, `card_exp_month`, `card_exp_year` are all `null`
- Stripe API: `stripe.paymentMethods.detach()` was called (PM is detached from the Customer)

---

### TC-05: Payment nav item appears in sidebar and mobile nav

**Preconditions:** Parent is logged in.

**Steps:**
1. Open the parent dashboard at `/parent` on desktop (sidebar visible)
2. Observe the sidebar navigation links
3. Resize to mobile viewport (≤768px)
4. Observe the mobile bottom nav

**Expected outcomes:**
- "Payment" link with CreditCard icon appears in the sidebar after "My Bookings"
- "Payment" link appears in the mobile bottom nav
- Clicking "Payment" navigates to `/parent/payment`

---

### TC-06: GET /api/parent/payment-method returns 401 for unauthenticated requests

**Preconditions:** No active session.

**Steps:**
1. Make a `GET /api/parent/payment-method` request with no auth cookie (e.g., `curl -X GET http://localhost:3000/api/parent/payment-method`)

**Expected outcomes:**
- Response status 401
- Response body: `{ "error": "Unauthorized" }` or similar

---

### TC-07: GET /api/parent/payment-method returns { card: null } when no card saved

**Preconditions:** Parent is logged in but has no `parent_profiles` row (or row with null card fields).

**Steps:**
1. Make an authenticated `GET /api/parent/payment-method` request (or navigate to `/parent/payment` with no saved card)

**Expected outcomes:**
- Response: `{ "card": null }` (not a 404 or error)
- `/parent/payment` page shows empty state

---

### TC-08: DELETE /api/parent/payment-method returns 404 when no card saved

**Preconditions:** Parent is logged in, no saved card in `parent_profiles`.

**Steps:**
1. Make an authenticated `DELETE /api/parent/payment-method` request

**Expected outcomes:**
- Response status 404
- No Stripe API call made (no `stripe.paymentMethods.detach()` invocation)

---

### TC-09: Pre-S03 bookings (no parent_id in PI metadata) don't cause webhook errors

**Preconditions:** A booking exists that was created before S03 (PI metadata has no `parent_id`).

**Steps:**
1. Simulate a `payment_intent.amount_capturable_updated` webhook event for a pre-S03 PI (metadata: `{ teacher_id, booking_id, session_type }` — no `parent_id`)
2. Observe webhook logs

**Expected outcomes:**
- Webhook handler completes successfully (2xx response)
- Booking confirmation proceeds normally
- No PM upsert attempted; no error logged
- `parent_profiles` table unaffected

---

### TC-10: Recurring booking reuses parent-level Customer from parent_profiles

**Preconditions:** Parent has a `stripe_customer_id` in `parent_profiles` from a previous booking.

**Steps:**
1. Book a recurring session with a teacher
2. Complete the booking flow including first-session payment
3. Check Stripe test dashboard for Customers

**Expected outcomes:**
- `create-recurring` reuses the existing `parent_profiles.stripe_customer_id` (no new Customer created)
- `recurring_schedules.stripe_customer_id` is also set (backward compat for cron auto-charges)
- Only one Stripe Customer exists for the parent email

---

## Edge Cases

| Scenario | Expected behavior |
|---|---|
| Stripe `paymentMethods.retrieve()` fails in webhook | Error logged; webhook still returns 200; booking confirmed; `parent_profiles` PM fields remain as-is |
| Parent's `stripe_customer_id` on `parent_profiles` was deleted from Stripe directly | `create-intent` calls `stripe.customers.retrieve()` → Stripe returns 404 → route creates a new Customer and upserts to `parent_profiles` |
| Two simultaneous first bookings from the same parent | Second upsert overwrites first in `parent_profiles` (upsert with `onConflict: 'user_id'`); both bookings succeed; only one Customer row in Stripe (first to succeed creates it; second reuses it or creates a duplicate — acceptable at MVP) |
| Parent removes card then books again | Card field null check in `/parent/payment` shows empty state; next booking auto-saves new card via webhook |

