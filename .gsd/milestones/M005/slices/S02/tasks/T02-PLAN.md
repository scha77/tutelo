---
estimated_steps: 5
estimated_files: 3
---

# T02: Wire server-side phone storage for both booking paths and add unit tests

**Slice:** S02 — Parent Phone Collection & Booking SMS
**Milestone:** M005

## Description

T01 wired the UI to send `parent_phone` and `parent_sms_opt_in` from the booking form. This task makes the server store those values on the bookings row.

**Deferred path** (`submitBookingRequest` in `src/actions/bookings.ts`): The `create_booking()` Postgres RPC does not accept phone parameters. After the RPC succeeds and returns `booking_id`, run a follow-up `supabaseAdmin.from('bookings').update(...)` to set the phone fields. This is fire-and-forget — a failure must not block the booking confirmation. Use `supabaseAdmin` (service role) because the RLS `bookings_anon_insert` policy is INSERT-only (anon cannot UPDATE).

**Direct path** (`create-intent/route.ts`): This route uses a raw Supabase INSERT (not the RPC). Add `parent_phone` and `parent_sms_opt_in` directly to the insert object.

Unit tests verify both paths, including graceful failure on the deferred path.

## Steps

1. In `src/actions/bookings.ts` `submitBookingRequest`, after the `create_booking()` RPC succeeds and `result.booking_id` is available (around line 38, before the email send), add phone storage:
   ```ts
   // Store parent phone (post-insert — create_booking RPC doesn't accept phone params)
   if (parsed.data.parent_phone?.trim()) {
     try {
       await supabaseAdmin
         .from('bookings')
         .update({
           parent_phone: parsed.data.parent_phone.trim(),
           parent_sms_opt_in: parsed.data.parent_sms_opt_in ?? false,
         })
         .eq('id', result.booking_id!)
     } catch (err) {
       console.warn('[submitBookingRequest] Failed to store parent phone for booking', result.booking_id, err)
     }
   }
   ```
   **Important constraints:**
   - Use `supabaseAdmin` (already imported at top of file) — anon client cannot UPDATE bookings.
   - Guard on `parsed.data.parent_phone?.trim()` being non-empty — skip entirely when absent.
   - Wrap in try/catch — phone storage failure must NOT affect the booking result.
   - Place BEFORE the email send block but AFTER the `result.booking_id` check.

2. In `src/app/api/direct-booking/create-intent/route.ts`:
   - Add `parentPhone` and `parentSmsOptIn` to the destructured `body` (around line 22):
     ```ts
     const { teacherId, bookingDate, startTime, endTime, studentName, subject, notes, parentPhone, parentSmsOptIn } = body
     ```
   - Add the fields to the `.insert()` object (around line 48):
     ```ts
     parent_phone: parentPhone ?? null,
     parent_sms_opt_in: parentSmsOptIn ?? false,
     ```

3. Create `src/__tests__/parent-phone-storage.test.ts` with these test cases:

   **Test setup:** Mock `@/lib/supabase/service` (supabaseAdmin), `@/lib/supabase/server` (createClient), and `@/lib/email` (sendBookingEmail). Use `vi.mock()` with factory functions. The `supabaseAdmin` mock needs `.from().update().eq()` chain and `.from().insert().select().single()` chain.

   **Deferred path tests (submitBookingRequest):**
   - (a) "stores parent phone when provided" — call `submitBookingRequest` with `parent_phone: '(555) 123-4567'` and `parent_sms_opt_in: true`. Assert `supabaseAdmin.from('bookings').update()` was called with `{ parent_phone: '(555) 123-4567', parent_sms_opt_in: true }` and `.eq('id', bookingId)`.
   - (b) "skips phone UPDATE when parent_phone is absent" — call without `parent_phone`. Assert `.update()` was NOT called.
   - (c) "skips phone UPDATE when parent_phone is empty string" — call with `parent_phone: ''`. Assert `.update()` was NOT called.
   - (d) "returns success even when phone UPDATE fails" — make `.update().eq()` throw an error. Assert `submitBookingRequest` still returns `{ success: true }`.

   **Direct path tests (create-intent route handler):**
   - (e) "includes phone fields in booking INSERT when provided" — POST with `parentPhone` and `parentSmsOptIn` in body. Assert the insert object includes `parent_phone` and `parent_sms_opt_in`.
   - (f) "defaults phone to null and opt-in to false when absent" — POST without phone fields. Assert insert has `parent_phone: null` and `parent_sms_opt_in: false`.

   **Important:** The `create_booking` RPC mock should return `{ success: true, booking_id: 'test-uuid' }`. The `supabase.rpc` mock needs to be on the client created by `createClient()`, not on `supabaseAdmin`. For the create-intent tests, mock the POST handler by importing the `POST` function directly and passing a `Request` object.

4. Run `npx vitest run src/__tests__/parent-phone-storage.test.ts` to verify all tests pass.

5. Run `npm run build` and `npx vitest run` to verify no regressions.

## Must-Haves

- [ ] `submitBookingRequest` runs post-insert UPDATE with phone/consent when `parent_phone` is non-empty
- [ ] `submitBookingRequest` skips UPDATE when `parent_phone` is absent or empty
- [ ] `submitBookingRequest` still returns `{ success: true }` when phone UPDATE fails
- [ ] `create-intent` route includes `parent_phone` and `parent_sms_opt_in` in INSERT
- [ ] `create-intent` defaults `parent_phone` to null and `parent_sms_opt_in` to false when absent
- [ ] All 6 unit tests pass
- [ ] All existing tests still pass
- [ ] `npm run build` passes

## Verification

- `npx vitest run src/__tests__/parent-phone-storage.test.ts` — 6 tests pass
- `npx vitest run` — full suite passes, no regressions
- `npm run build` — zero errors

## Observability Impact

- Signals added/changed: `console.warn` on phone UPDATE failure in `submitBookingRequest` — includes booking ID (no PII)
- How a future agent inspects this: Query `bookings` table for `parent_phone IS NOT NULL` to see stored numbers; grep server logs for `[submitBookingRequest] Failed to store parent phone`
- Failure state exposed: Phone storage failure is logged with booking ID; booking still succeeds

## Inputs

- `src/components/profile/BookingCalendar.tsx` — T01 already wires phone/consent into both `submitAction` and `createPaymentIntent` payloads
- `src/actions/bookings.ts` — existing `submitBookingRequest` calls `create_booking()` RPC via `supabase.rpc()` and returns result; `supabaseAdmin` already imported
- `src/app/api/direct-booking/create-intent/route.ts` — existing POST handler with `.insert()` object that needs phone fields added
- `src/lib/schemas/booking.ts` — `BookingRequestSchema` already validates `parent_phone` (string, optional) and `parent_sms_opt_in` (boolean, optional, default false)

## Expected Output

- `src/actions/bookings.ts` — modified with post-insert phone UPDATE in `submitBookingRequest`
- `src/app/api/direct-booking/create-intent/route.ts` — modified with phone fields in INSERT
- `src/__tests__/parent-phone-storage.test.ts` — new test file with 6 passing tests
