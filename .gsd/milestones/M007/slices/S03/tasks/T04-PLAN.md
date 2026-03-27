# T04: Payment intent session-type pricing + booking FK + migration 0012 + tests

**Slice:** S03
**Milestone:** M007

## Goal
When a parent books with a session type, the Stripe PaymentIntent uses the session type's flat price. A new FK column on bookings links to the session type for receipt history.

## Must-Haves

### Truths
- Migration 0012 adds `session_type_id UUID REFERENCES session_types(id)` nullable column to bookings table
- `create-intent` route accepts optional `sessionTypeId` in request body
- When sessionTypeId is present: fetch session_type row, validate it belongs to teacher (teacher_id match), use `price * 100` as PI amount
- When sessionTypeId is absent: existing `computeSessionAmount(startTime, endTime, hourlyRate)` path unchanged
- Session type not found or doesn't belong to teacher → 400 error
- `session_type_id` stored on booking row when provided
- BookingCalendar's `createPaymentIntent` passes `sessionTypeId` when a session type was selected
- Unit tests: session type path (flat price), fallback path (hourly_rate), invalid session type (400), wrong teacher's session type (400)

### Artifacts
- `supabase/migrations/0012_booking_session_type_fk.sql` — adds session_type_id to bookings
- `src/app/api/direct-booking/create-intent/route.ts` — session type pricing branch
- `src/components/profile/BookingCalendar.tsx` — passes sessionTypeId in fetch body
- `tests/unit/session-types.test.ts` — payment intent tests

### Key Links
- `create-intent/route.ts` → `session_types` table for price lookup
- `create-intent/route.ts` → `computeSessionAmount()` fallback when no session type
- `BookingCalendar.tsx` → `createPaymentIntent()` → `create-intent` API route with sessionTypeId
- `bookings` table → `session_types` table via session_type_id FK

## Steps
1. Write migration 0012: `ALTER TABLE bookings ADD COLUMN session_type_id UUID REFERENCES session_types(id);`
2. In create-intent route: destructure `sessionTypeId` from request body
3. Add session type pricing branch:
   - If sessionTypeId present: fetch from session_types where id=sessionTypeId and teacher_id=teacher.id
   - If not found: return 400 "Invalid session type"
   - Use `Math.round(sessionType.price * 100)` as amountInCents
4. If sessionTypeId absent: existing computeSessionAmount path (no change)
5. Store session_type_id on booking insert when provided
6. Update BookingCalendar's createPaymentIntent: include `sessionTypeId` in POST body when selectedSessionType is set
7. Also update the deferred path (submitBookingRequest) to pass session_type_id if present — but the deferred path doesn't do Stripe, so just store it on the booking row via the RPC or post-insert update
8. Write unit tests for create-intent logic: mock supabaseAdmin, test both paths
9. Run all verification: vitest, tsc, build

## Context
- create-intent currently fetches `hourly_rate` from teacher: `select('id, stripe_account_id, stripe_charges_enabled, hourly_rate')`
- Need to also accept sessionTypeId and conditionally look up session_types
- Price in session_types is NUMERIC(10,2) — Supabase returns as string; parse with Number()
- The 7% application_fee_amount calculation stays the same regardless of pricing path
- Existing `computeSessionAmount` stays as the fallback — no changes to that utility
- BookingCalendar already stores selectedSessionType in state (from T03)
