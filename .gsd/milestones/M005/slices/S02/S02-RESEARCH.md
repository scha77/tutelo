# S02: Parent Phone Collection & Booking SMS — Research

**Date:** 2026-03-16
**Slice:** M005/S02
**Depends on:** S01 (complete)

## Summary

S02 is straightforward UI wiring. S01 delivered everything at the infrastructure layer: DB columns (`bookings.parent_phone`, `bookings.parent_sms_opt_in` via migration 0008), Zod schema extensions in `BookingRequestSchema`, `sendSmsReminder` and `sendSmsCancellation` in `src/lib/sms.ts`, cron extended with `sendSmsReminder`, and `cancelSession` extended with `sendSmsCancellation`. **None of it was wired to the UI.**

The booking form in `BookingCalendar.tsx` currently collects name, subject, email, and notes — it does not render phone or consent fields, and it does not pass them to `submitAction`. The `submitBookingRequest` server action passes data through to `create_booking()` (a Postgres RPC) which does not accept phone/opt-in parameters — those columns are set separately. The direct-booking path (`create-intent/route.ts`) also does not set `parent_phone`/`parent_sms_opt_in` on the booking row it creates.

S02 delivers: phone + consent fields in the deferred booking form, `submitBookingRequest` storing those values post-insert, and the `create-intent` route storing them on the direct booking row. No new tests needed for sms.ts (S01 already has 9 tests); S02 needs tests for the schema validation and the storage path.

## Recommendation

Three targeted file edits plus one migration for the `create_booking()` function:

1. **`BookingCalendar.tsx`** — add optional phone input + consent checkbox below the Notes field in the booking form. Both paths (deferred `submitAction` and direct `createPaymentIntent`) need to forward these values.
2. **`submitBookingRequest` in `src/actions/bookings.ts`** — after `create_booking()` RPC succeeds, run a follow-up `UPDATE bookings SET parent_phone, parent_sms_opt_in WHERE id = bookingId` using `supabaseAdmin` (bypasses RLS) to store the phone fields, since the `create_booking()` Postgres function signature does not include these parameters.
3. **`create-intent/route.ts`** — add `parent_phone` and `parent_sms_opt_in` to the direct-booking INSERT body.
4. **Migration 0009** — add `p_parent_phone` and `p_parent_sms_opt_in` params to the `create_booking()` Postgres function, OR accept the post-insert UPDATE pattern (simpler, no migration needed). **Recommendation: use the post-insert UPDATE** — avoids migration complexity on the Postgres function and is consistent with the pattern already used for `stripe_payment_intent` updates.

## Implementation Landscape

### Key Files

- `src/components/profile/BookingCalendar.tsx` — The booking form (step `'form'`) collects `name`, `subject`, `email`, `notes`. The `form` state object needs `phone` and `smsOptIn` fields. Two call sites need updating: the deferred path in `handleSubmit` (passes to `submitAction`) and the direct path in `createPaymentIntent` (passes to fetch body). Both paths currently omit phone fields entirely.
- `src/actions/bookings.ts` `submitBookingRequest` — After `create_booking()` returns `booking_id`, add `supabaseAdmin.from('bookings').update({ parent_phone, parent_sms_opt_in }).eq('id', bookingId)` when phone was provided. Use `supabaseAdmin` not `supabase` — the RLS policy for bookings doesn't grant anon UPDATE. This is fire-and-forget; phone storage failure should not block the booking confirmation.
- `src/lib/schemas/booking.ts` — `BookingRequestSchema` already has `parent_phone: z.string().optional()` and `parent_sms_opt_in: z.boolean().optional().default(false)`. No changes needed to the schema itself. The phone validation (libphonenumber-js) is handled in `sms.ts` at send time; the schema accepts any string (or none) for storage.
- `src/app/api/direct-booking/create-intent/route.ts` — The booking INSERT at line ~44 needs `parent_phone` and `parent_sms_opt_in` added to the insert object. Pull them from `body` alongside the existing destructured fields.
- `supabase/migrations/0008_sms_and_verification.sql` — Already adds `parent_phone TEXT` and `parent_sms_opt_in BOOLEAN DEFAULT FALSE` to the `bookings` table. No further migration needed for S02.
- `supabase/migrations/0003_create_booking_fn.sql` — The `create_booking()` Postgres function does NOT include phone params. **Do not modify this function** — use the post-insert UPDATE pattern instead to avoid resetting the function signature and re-granting permissions.

### Build Order

1. **`BookingCalendar.tsx` UI** — Add phone + consent fields to the form. Update `form` state. Pass through both paths. This is the user-visible change and also the test harness entry point.
2. **`submitBookingRequest` post-insert UPDATE** — After `create_booking()` succeeds, update the row with phone/opt-in if provided. This wires parent SMS to the deferred booking path.
3. **`create-intent/route.ts` INSERT extension** — Add phone fields to the direct booking INSERT. This wires parent SMS to the direct booking path.
4. **Tests** — Unit tests for: schema accepts/rejects phone values; `submitBookingRequest` calls the update when phone provided; `submitBookingRequest` skips update when phone absent.

### Verification Approach

```bash
# Build must pass
npm run build

# All existing tests still pass; new tests for S02 pass
npx vitest run

# Manual: open a teacher's public page → select a slot → confirm phone field renders
# Manual: submit booking with phone + opt-in checked → verify bookings row has parent_phone set
```

The SMS delivery itself (reminder + cancellation) is already wired in S01 — `sendSmsReminder` reads `parent_phone` and `parent_sms_opt_in` from the bookings row, and `cancelSession` calls `sendSmsCancellation`. Once the UI stores the values, the full pipeline is live. No additional wiring needed for reminders or cancellations.

## Constraints

- **`create_booking()` Postgres RPC does not accept phone params** — The function signature is `(UUID, TEXT, TEXT, TEXT, DATE, TIME, TIME, TEXT)`. Do not add a new migration to modify it. Use a post-insert UPDATE in the server action instead. This is consistent with how `stripe_payment_intent` is set later on the booking row.
- **`supabaseAdmin` required for the post-insert UPDATE** — The RLS `bookings_anon_insert` policy is INSERT-only. Anon clients cannot UPDATE existing rows. Use `supabaseAdmin` (service role) for the phone field update.
- **Phone is optional — must not break existing flows** — The deferred form submit and direct booking both work today with no phone fields. Adding them must be purely additive. The submit handler must guard on `form.phone` being non-empty before including it.
- **Consent must be explicit — checkbox, not pre-checked** — TCPA compliance requires user-initiated opt-in. The checkbox must start unchecked and be clearly labeled. Only send `parent_sms_opt_in: true` if the checkbox is checked AND a phone number was entered.
- **US-only phone at MVP** — The UI should label the field as "US phone number (optional)" and the placeholder should reflect US format. `libphonenumber-js` validation happens at send time in `sms.ts`, not at storage time.

## Common Pitfalls

- **Sending `parent_sms_opt_in: true` without a phone** — If the user checks the consent box but leaves the phone blank, `parent_sms_opt_in` must be forced to `false`. Gate consent on `phone.trim().length > 0`.
- **Post-insert UPDATE failure is silent** — The phone update runs after `create_booking()` succeeds. If the update fails, the booking is still confirmed and the parent gets no SMS — which is the correct graceful fallback. Log the failure but do not surface it to the user.
- **Direct booking path (create-intent) needs phone too** — It's easy to add phone to the deferred path and miss the direct path. Both paths must be updated: `submitAction` call in `handleSubmit` AND the `fetch` body in `createPaymentIntent`.
- **Form state initialization** — The `form` state in `BookingCalendar` is reset in `handleBookAnother`. Add `phone: ''` and `smsOptIn: false` to the reset object to avoid stale values on rebook.

## Open Risks

- **Phone field UX friction** — Adding a phone input to the booking form adds friction. The field must be visually clearly optional, appear below the main required fields, and have low visual weight. The consent checkbox must be compact and subordinate to the submit CTA.
- **`supabaseAdmin` UPDATE race** — In theory the UPDATE happens immediately after INSERT, so the phone fields will be set before any cron checks the row. Reminder cron only fires 24h before the session. No realistic race condition.
