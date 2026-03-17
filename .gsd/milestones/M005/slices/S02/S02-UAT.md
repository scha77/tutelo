# S02: Parent Phone Collection & Booking SMS — UAT

**Milestone:** M005
**Written:** 2026-03-17

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice wires storage only — no new email/SMS delivery logic. The deferred and direct booking paths are server actions / API routes with complete unit test coverage (6 tests). DB writes are verified through mocked Supabase. The UI was browser-verified during T01 execution. Live SMS delivery was already proved in S01.

## Preconditions

- Dev server running: `npm run dev` at `http://localhost:3000`
- A teacher account exists with a published public page (e.g. `/[slug]`)
- At least one available time slot is visible on that teacher's public page
- `npm run build` passes (confirmed ✓)
- `npx vitest run` passes 402 tests (confirmed ✓)

## Smoke Test

Navigate to a teacher's public page → select a time slot → open the booking form → scroll below the Notes field. **A "US phone number (optional)" input must be visible.**

---

## Test Cases

### 1. Phone input and consent checkbox render correctly

1. Navigate to a teacher's public booking page (`/[slug]`).
2. Select any available time slot to open the booking form.
3. Scroll below the Notes textarea.
4. **Expected:** A phone input labeled "US phone number (optional)" with placeholder "(555) 555-1234" is visible. No SMS consent checkbox is visible yet.

### 2. Consent checkbox only appears after phone is entered

1. In the booking form, leave the phone field empty.
2. Confirm no consent checkbox is shown.
3. Type any value into the phone field (e.g. `(555) 123-4567`).
4. **Expected:** The SMS consent checkbox appears below the phone field with text including "Send me text message reminders about this session" and "Msg & data rates may apply. Reply STOP to opt out."
5. Confirm the checkbox is **unchecked by default**.

### 3. Clearing phone hides consent checkbox

1. Type `(555) 123-4567` into the phone field — confirm checkbox appears.
2. Check the consent checkbox.
3. Clear the phone field entirely.
4. **Expected:** The SMS consent checkbox disappears from the DOM.

### 4. Deferred path: phone stored on bookings row (unit test coverage)

Verified by `src/__tests__/parent-phone-storage.test.ts` test: "stores parent phone when provided"

Steps (automated):
1. `submitBookingRequest` called with `parent_phone: '(555) 123-4567'` and `parent_sms_opt_in: true`.
2. `create_booking()` RPC returns `{ success: true, booking_id: 'test-uuid' }`.
3. `supabaseAdmin.from('bookings').update({ parent_phone: '(555) 123-4567', parent_sms_opt_in: true }).eq('id', 'test-uuid')` is called.
4. **Expected:** Function returns `{ success: true, bookingId: 'test-uuid' }`. Update called with correct values.

### 5. Deferred path: phone UPDATE skipped when phone absent

Verified by `src/__tests__/parent-phone-storage.test.ts` test: "skips phone UPDATE when parent_phone is absent" and "skips phone UPDATE when parent_phone is empty string"

1. `submitBookingRequest` called without `parent_phone` (or with `parent_phone: ''`).
2. **Expected:** `supabaseAdmin.from` is never called. Booking still succeeds.

### 6. Deferred path: booking succeeds even when phone UPDATE fails

Verified by `src/__tests__/parent-phone-storage.test.ts` test: "returns success even when phone UPDATE fails"

1. `submitBookingRequest` called with a phone number.
2. `supabaseAdmin.from('bookings').update(...).eq(...)` throws `Error('DB connection failed')`.
3. **Expected:** Function still returns `{ success: true, bookingId: '...' }`. `console.warn` emitted with `[submitBookingRequest] Failed to store parent phone`, the booking ID, and the error. No phone number in the warn message.

### 7. Direct path: phone included in INSERT when provided

Verified by `src/__tests__/parent-phone-storage.test.ts` test: "includes phone fields in booking INSERT when provided"

1. POST to `/api/direct-booking/create-intent` with body `{ ..., parentPhone: '(555) 222-3333', parentSmsOptIn: true }`.
2. **Expected:** `supabaseAdmin.from('bookings').insert(...)` called with object containing `parent_phone: '(555) 222-3333'` and `parent_sms_opt_in: true`.

### 8. Direct path: phone defaults to null/false when absent

Verified by `src/__tests__/parent-phone-storage.test.ts` test: "defaults phone to null and opt-in to false when absent"

1. POST to `/api/direct-booking/create-intent` without `parentPhone` or `parentSmsOptIn`.
2. **Expected:** INSERT object contains `parent_phone: null` and `parent_sms_opt_in: false`.

### 9. handleBookAnother resets phone and consent state

1. Complete a booking submission (deferred path) to reach the success screen.
2. Click "Book Another Session" (or equivalent reset button).
3. **Expected:** The booking form resets. Phone field is empty. SMS consent checkbox is not visible.

### 10. Build passes with no errors

```bash
npm run build
```
**Expected:** Zero TypeScript or build errors. All routes compile.

---

## Edge Cases

### Phone entered then cleared before submit

1. Enter `(555) 123-4567` in phone field — consent checkbox appears.
2. Check the consent checkbox.
3. Clear the phone field.
4. Submit the booking form.
5. **Expected:** `parent_phone` is `undefined`/`null` and `parent_sms_opt_in` is `false` in the submitted payload — consent cannot be true without a phone number.

### Phone entered, consent left unchecked, form submitted

1. Enter `(555) 123-4567` in phone field.
2. Leave consent checkbox unchecked.
3. Submit the booking form.
4. **Expected:** `parent_sms_opt_in` is `false` in the payload. Phone is stored but opt-in is `false`. Parent will not receive SMS.

### Phone entered, consent checked, form submitted (deferred path)

1. Fill all required booking fields.
2. Enter a phone number and check the consent checkbox.
3. Submit.
4. **Expected:** Booking succeeds. `bookings` row has `parent_phone` set and `parent_sms_opt_in = true`. (Verify in Supabase dashboard or via SQL: `SELECT parent_phone, parent_sms_opt_in FROM bookings ORDER BY created_at DESC LIMIT 1`.)

---

## Failure Signals

- Phone input not visible below Notes → BookingCalendar.tsx was not modified or form state missing
- Consent checkbox visible when phone is empty → Conditional render guard (`form.phone.trim().length > 0`) removed
- Consent checkbox checked by default → State initialization changed from `smsOptIn: false`
- `supabaseAdmin.from` called on deferred path when phone absent → Guard condition `parsed.data.parent_phone?.trim()` is broken
- Booking fails when phone UPDATE throws → try/catch wrapper removed from deferred path
- `parent_phone` missing from direct path INSERT → Destructuring or INSERT object missing the fields
- Any of the 6 unit tests failing → Core storage logic regressed
- `npm run build` errors → TypeScript type mismatch in new fields

---

## Requirements Proved By This UAT

- **SMS-03** (parent phone collection on booking form) — phone input + consent UI exists; both booking paths store the data; opt-in guard is enforced
- **SMS-01** (SMS session reminders, parent leg) — parent_phone/parent_sms_opt_in now readable by sendSmsReminder from the bookings row
- **SMS-02** / **CANCEL-02** (SMS cancellation alerts, parent leg) — cancelSession → sendSmsCancellation can now reach opted-in parents

---

## Not Proven By This UAT

- **Actual SMS delivery** — requires Twilio credentials, a verified sender number, and A2P 10DLC registration (or toll-free number). SMS code is complete and tested with mocked Twilio client (S01), but production delivery to non-test numbers is blocked on carrier registration.
- **End-to-end booking flow in live browser** — the direct booking path (Stripe-connected teacher) requires a live Stripe test environment and an authenticated parent account. The deferred path can be exercised in a local dev environment.
- **S03 (school email verification + badge gating)** — independent of this slice; not covered here.

---

## Notes for Tester

- The phone field is **optional** — the booking form submits normally without it. Do not expect any validation error if phone is omitted.
- The TCPA consent text ("Msg & data rates may apply. Reply STOP to opt out.") must appear alongside the checkbox — this is a legal requirement, not cosmetic.
- Phone numbers are stored as-is (no E.164 normalization) — whatever the user types is stored. The placeholder `(555) 555-1234` is guidance only.
- The post-insert UPDATE on the deferred path is fire-and-forget — if it silently fails, the booking still succeeds and the parent just won't receive SMS. Check `console.warn` in server logs for `[submitBookingRequest] Failed to store parent phone` if you suspect phone is not being stored.
- All 6 unit tests in `src/__tests__/parent-phone-storage.test.ts` are the authoritative spec for storage behavior — read them before modifying the server-side logic.
