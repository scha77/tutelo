---
estimated_steps: 2
estimated_files: 3
skills_used: []
---

# T01: Create-intent pricing fork + session type unit tests

Extend the create-intent API route to accept an optional `sessionTypeId` in the request body. When present, fetch the session type from `session_types` table via `supabaseAdmin`, verify it belongs to the teacher (security check), and use its `price` as the flat amount in cents. When absent, fall back to the existing `computeSessionAmount` hourly_rate path. Add `session_type_id` to PI metadata. Also extend `BookingRequestSchema` with optional `session_type_id`. Write unit tests covering: flat-price path, hourly-rate fallback, wrong-teacher security rejection, and correct amount calculation.

**Requirements advanced:** SESS-03 (Stripe payment intent uses session-type price), SESS-04 (backward compat — hourly_rate path unchanged when no session type)

## Inputs

- ``src/app/api/direct-booking/create-intent/route.ts` — existing create-intent route to extend with sessionTypeId fork`
- ``src/lib/schemas/booking.ts` — existing BookingRequestSchema to add session_type_id field`
- ``src/lib/utils/booking.ts` — computeSessionAmount function (unchanged, used for fallback path)`

## Expected Output

- ``src/app/api/direct-booking/create-intent/route.ts` — extended with sessionTypeId → flat price fork, security check, PI metadata`
- ``src/lib/schemas/booking.ts` — BookingRequestSchema with optional session_type_id: z.string().uuid().optional()`
- ``tests/unit/session-type-pricing.test.ts` — unit tests for pricing fork (flat price, hourly fallback, wrong-teacher 400, amount calculation)`

## Verification

npx vitest run tests/unit/session-type-pricing.test.ts && npx tsc --noEmit
