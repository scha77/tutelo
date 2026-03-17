# S02: Parent Phone Collection & Booking SMS

**Goal:** Parent can provide a phone number with SMS opt-in consent on both deferred and direct booking forms; phone is stored on the bookings row; SMS reminders and cancellation alerts reach opted-in parents.
**Demo:** Open a teacher's public page → select a time slot → booking form shows optional phone input + consent checkbox below Notes → submit with phone + opt-in checked → bookings row has `parent_phone` and `parent_sms_opt_in = true` → existing `sendSmsReminder` and `sendSmsCancellation` (from S01) now reach the parent.

## Must-Haves

- Optional phone number input field appears below Notes in the booking form
- SMS consent checkbox (unchecked by default) with clear TCPA-compliant language
- Consent forced to `false` when phone field is empty (cannot opt in without a number)
- Phone + consent passed through deferred path (`submitAction` → `submitBookingRequest`)
- Phone + consent passed through direct path (`createPaymentIntent` → `create-intent` route)
- `submitBookingRequest` stores phone/consent via post-insert UPDATE using `supabaseAdmin`
- `create-intent` route includes phone/consent in the booking INSERT
- Phone storage failure on deferred path is silent — booking still succeeds
- `handleBookAnother` resets phone + consent state
- Checkbox UI component added to project (shadcn/ui)
- Build passes (`npm run build`)

## Proof Level

- This slice proves: integration
- Real runtime required: no (DB writes verified through unit tests with mocked Supabase)
- Human/UAT required: no (SMS delivery already tested in S01; this slice wires storage only)

## Verification

- `npx vitest run src/__tests__/parent-phone-storage.test.ts` — tests for deferred and direct phone storage paths
- `npm run build` — zero errors
- `npx vitest run` — all existing tests still pass

## Observability / Diagnostics

- Runtime signals: `console.warn` logged when post-insert UPDATE fails for phone fields (deferred path); `console.error` on unexpected errors
- Inspection surfaces: `bookings` table — `parent_phone` and `parent_sms_opt_in` columns
- Failure visibility: Phone UPDATE failure is logged but non-blocking; booking confirms regardless
- Redaction constraints: Phone numbers are PII — never log the actual number, only the booking ID

## Integration Closure

- Upstream surfaces consumed: `src/lib/sms.ts` (`sendSmsReminder`, `sendSmsCancellation` read `parent_phone`/`parent_sms_opt_in` from bookings row), `src/lib/schemas/booking.ts` (`BookingRequestSchema` already has `parent_phone`/`parent_sms_opt_in`), DB columns from migration 0008
- New wiring introduced in this slice: BookingCalendar form fields → server action/route handler → bookings row
- What remains before the milestone is truly usable end-to-end: S03 (school email verification + badge gating)

## Tasks

- [x] **T01: Add phone + consent UI fields to BookingCalendar and wire both submission paths** `est:45m`
  - Why: The booking form currently collects name, subject, email, and notes but has no phone or SMS consent fields. Both the deferred path (`submitAction`) and direct path (`createPaymentIntent` fetch) need to forward these values. This is the user-visible change that enables parent SMS.
  - Files: `src/components/profile/BookingCalendar.tsx`, `src/components/ui/checkbox.tsx`
  - Do: (1) Install shadcn/ui Checkbox component via `npx shadcn@latest add checkbox`. (2) Add `phone: ''` and `smsOptIn: false` to the `form` state object. (3) Add `phone` and `smsOptIn` to the `handleBookAnother` reset. (4) Add an optional phone input field below the Notes textarea, labeled "US phone number (optional)" with placeholder "(555) 555-1234". (5) Add an unchecked-by-default Checkbox below the phone input with label "Send me text message reminders about this session" — only visible when phone field is non-empty. (6) In `handleSubmit` deferred path, add `parent_phone: form.phone.trim() || undefined` and `parent_sms_opt_in: form.phone.trim() ? form.smsOptIn : false` to the `submitAction` call. (7) In `createPaymentIntent`, add the same two fields to the fetch body JSON. (8) Import `Checkbox` from `@/components/ui/checkbox`.
  - Verify: `npm run build` passes; visually inspect that form renders phone + checkbox fields
  - Done when: BookingCalendar form shows optional phone input + consent checkbox; both `submitAction` and `createPaymentIntent` calls include `parent_phone` and `parent_sms_opt_in` in their payloads; `npm run build` succeeds

- [ ] **T02: Wire server-side phone storage for both booking paths and add unit tests** `est:45m`
  - Why: The UI sends phone/consent values but neither server path stores them yet. The deferred path (`submitBookingRequest`) calls `create_booking()` RPC which doesn't accept phone params — needs a post-insert UPDATE. The direct path (`create-intent`) uses a raw Supabase INSERT that can include the fields directly. Unit tests verify both paths.
  - Files: `src/actions/bookings.ts`, `src/app/api/direct-booking/create-intent/route.ts`, `src/__tests__/parent-phone-storage.test.ts`
  - Do: (1) In `submitBookingRequest` (bookings.ts), after `create_booking()` succeeds and returns `booking_id`, check if `parsed.data.parent_phone` is a non-empty string. If so, run `supabaseAdmin.from('bookings').update({ parent_phone: parsed.data.parent_phone, parent_sms_opt_in: parsed.data.parent_sms_opt_in }).eq('id', result.booking_id!)`. Wrap in try/catch, log warning on failure, do NOT block the booking return. (2) In `create-intent/route.ts`, destructure `parentPhone` and `parentSmsOptIn` from `body`. Add `parent_phone: parentPhone ?? null` and `parent_sms_opt_in: parentSmsOptIn ?? false` to the `.insert()` object. (3) Create `src/__tests__/parent-phone-storage.test.ts` with tests: (a) submitBookingRequest calls UPDATE with phone when provided, (b) submitBookingRequest skips UPDATE when phone absent, (c) submitBookingRequest still returns success when UPDATE fails, (d) create-intent includes phone fields in INSERT when provided, (e) create-intent defaults phone fields when absent. Mock `supabaseAdmin`, `createClient`, and `BookingRequestSchema` as needed. (4) Verify existing tests still pass.
  - Verify: `npx vitest run src/__tests__/parent-phone-storage.test.ts` — all tests pass; `npx vitest run` — no regressions; `npm run build` — zero errors
  - Done when: Both deferred and direct booking paths store `parent_phone`/`parent_sms_opt_in` on the bookings row; unit tests verify storage and graceful failure; full test suite passes; build passes

## Files Likely Touched

- `src/components/profile/BookingCalendar.tsx`
- `src/components/ui/checkbox.tsx` (new — via shadcn)
- `src/actions/bookings.ts`
- `src/app/api/direct-booking/create-intent/route.ts`
- `src/__tests__/parent-phone-storage.test.ts` (new)
