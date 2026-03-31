# S03: Cancellation & Dashboard Series UX — UAT

**Milestone:** M009
**Written:** 2026-03-31T14:53:38.345Z

## Preconditions

- Local dev server running with `.env.local` configured (Supabase, Stripe, Resend)
- A teacher account exists with a published profile and available recurring slots
- Stripe test mode active; test card `4242 4242 4242 4242` available
- At least one recurring booking has been created via the booking flow (creates a `recurring_schedules` row with `cancel_token` populated)

---

## Test Cases

### TC-01: cancel_token generated at recurring booking creation

**Steps:**
1. Complete a recurring booking through the booking flow (select frequency=weekly, count=4)
2. Check the Supabase `recurring_schedules` table for the newly created row

**Expected:** `cancel_token` is a 64-char hex string (non-null), `cancel_token_created_at` is set to creation time.

---

### TC-02: Parent confirmation email contains "Manage your series" link

**Steps:**
1. After TC-01, check the parent's confirmation email in Resend logs or email inbox
2. Look for a "Manage your series" link in the email body

**Expected:** The email contains a hyperlink to `https://tutelo.app/manage/<64-char-hex-token>`. The teacher variant of the same email does NOT contain this link.

---

### TC-03: /manage/[token] shows valid sessions for parent

**Steps:**
1. Copy the manage URL from the parent email (or construct it from the DB token)
2. Open the URL in a browser (not logged in)

**Expected:** Page loads without requiring login. Shows a list of upcoming sessions in the recurring series with date, student name, and status badge (Confirmed or Payment Failed). Shows "Cancel This Session" button per row and "Cancel All Remaining" button at the bottom.

---

### TC-04: /manage/[token] invalid token shows error state

**Steps:**
1. Navigate to `/manage/invalidtoken123abc`

**Expected:** Page shows "Invalid or expired link" error message. No session list rendered.

---

### TC-05: /manage/[token] all-cancelled state

**Steps:**
1. Cancel all sessions in a recurring series (either via TC-06 or TC-07)
2. Navigate to the manage URL again

**Expected:** Page shows "All sessions in this series have already been cancelled" message instead of the form.

---

### TC-06: Parent cancels a single session via /manage/[token]

**Steps:**
1. Open the manage URL (TC-03)
2. Click "Cancel This Session" on the first row
3. Confirm in the dialog

**Expected:**
- The cancelled session row disappears from the list
- A success message appears
- The booking status in Supabase changes to 'cancelled'
- A cancellation email is sent to the parent (visible in Resend logs)
- If the booking had a Stripe PaymentIntent in status 'requires_capture', it is cancelled/voided in Stripe dashboard

---

### TC-07: Parent cancels entire series via /manage/[token]

**Steps:**
1. Open the manage URL with multiple upcoming sessions
2. Click "Cancel All Remaining"
3. Confirm in the dialog

**Expected:**
- All sessions disappear from the list; "All sessions cancelled" completion state shown
- All future bookings (booking_date >= today) in the series change to 'cancelled' in Supabase
- Past sessions (booking_date < today) are NOT changed
- A series cancellation email is sent to both parent and teacher (visible in Resend logs)
- Stripe PIs voided where present (check Stripe dashboard for voided payment intents)

---

### TC-08: Teacher sees "Recurring" badge on dashboard sessions

**Steps:**
1. Log in as the teacher
2. Navigate to Dashboard → Sessions

**Expected:** Sessions that belong to a recurring schedule show an amber/blue "Recurring" pill badge on the session card. One-off sessions show no badge.

---

### TC-09: Teacher sees "Payment Failed" badge on failed recurring session

**Steps:**
1. Trigger a payment failure on a recurring session (e.g., update booking status to 'payment_failed' directly in Supabase for testing)
2. Reload Dashboard → Sessions

**Expected:** The session card shows an amber "Payment Failed" badge instead of the green "Confirmed" badge.

---

### TC-10: Teacher cancels single recurring session from dashboard

**Steps:**
1. On Dashboard → Sessions, find a recurring session card
2. Click the existing "Cancel Session" button (individual cancel)
3. Confirm in the dialog

**Expected:**
- Session is removed from the upcoming sessions list (or shows as cancelled on next refresh)
- Booking status changes to 'cancelled' in Supabase
- Stripe PI voided if present (non-blocking — dashboard action succeeds even if Stripe call fails)
- Single cancellation email sent to parent

---

### TC-11: Teacher cancels entire recurring series from dashboard

**Steps:**
1. On Dashboard → Sessions, find a recurring session card
2. Click the "Cancel Series" button
3. Confirm in the dialog

**Expected:**
- All future recurring sessions in that series disappear from the dashboard list
- All future bookings (booking_date >= today) in `recurring_schedules.id` group update to 'cancelled'
- Past sessions remain unchanged
- Series cancellation email sent to both parent and teacher
- Stripe PIs voided for all affected bookings (non-blocking)

---

### TC-12: Stripe error resilience — cancellation still succeeds

**Steps:**
1. Using a test Stripe key where PI void will fail (e.g., already-cancelled PI), attempt TC-06 or TC-10

**Expected:** The booking still updates to 'cancelled' in Supabase and the cancellation email is still sent. The Stripe error is logged to console but does not surface as a user-facing error.

---

### TC-13: Token ownership — cannot cancel another schedule's booking

**Steps:**
1. Note the cancel_token for Schedule A and a booking_id from Schedule B
2. POST to `/api/manage/cancel-session` with `{ token: <schedule-A-token>, bookingId: <schedule-B-booking-id> }`

**Expected:** API returns 404 — the booking does not belong to the schedule identified by the token.

---

### TC-14: Already-cancelled bookings not re-cancelled

**Steps:**
1. POST to `/api/manage/cancel-session` with a booking that is already `status='cancelled'`

**Expected:** API returns 400 with an error indicating the booking is not in a cancellable state.

---

## Edge Cases

- **Empty future bookings for cancel-series**: If all bookings in a series are already past or already cancelled, `/api/manage/cancel-series` returns `{ success: true, cancelledCount: 0 }` — no error.
- **Teacher email not set**: `sendRecurringCancellationEmail` only sends the teacher email if `social_email` is present; missing teacher email is not an error.
- **Manage URL shown only to parent**: RecurringBookingConfirmationEmail with `isTeacher=true` must not render the manageUrl link — verify in Resend email preview or email test harness.
