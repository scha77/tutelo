# S03: Booking Calendar Integration

**Goal:** The parent-facing booking calendar presents bookable 30-minute time slots expanded from availability windows, with correct override-wins-recurring precedence, and payment amounts are prorated to session duration.
**Demo:** A teacher with 3:00–6:00 PM recurring availability shows six 30-min slots (3:00, 3:30, 4:00, 4:30, 5:00, 5:30) in the calendar. A per-date override of 3:30–4:45 PM shows two slots (3:30, 4:00). A parent booking a 30-min slot is charged half the hourly rate.

## Must-Haves

- `getSlotsForDate()` expands each availability window into 30-minute booking increment slots
- 30-min expansion applies to both recurring and override paths
- Past-slot filtering applied per 30-min increment (not per window)
- Windows shorter than 30 minutes produce zero slots (not a crash)
- `slotId` uses `${dateStr}-${startRaw}` pattern for both recurring and override slots (unique per 30-min increment)
- `create-intent` computes payment amount from actual session duration (`endTime - startTime`) instead of hardcoding 1-hour
- All existing override-precedence tests continue to pass (updated for 30-min expansion output)
- New unit tests cover 30-min expansion edge cases
- `npm run build` passes with zero errors

## Proof Level

- This slice proves: integration
- Real runtime required: no (unit tests exercise pure functions; create-intent change is arithmetic)
- Human/UAT required: no (slot expansion is deterministic; visual verification deferred to milestone UAT)

## Verification

- `npx vitest run tests/unit/booking-slots.test.ts` — new test file covering 30-min expansion edge cases (window < 30 min, exactly 30 min, non-aligned boundaries, large window, multiple windows, past-slot filtering per increment)
- `npx vitest run tests/unit/override-precedence.test.ts` — existing tests updated for 30-min expansion output
- `npx vitest run tests/unit/payment-proration.test.ts` — new test file covering duration-prorated payment amount in create-intent logic
- `npx vitest run` — full suite passes (all 40+ existing tests + new tests)
- `npm run build` — zero errors

## Observability / Diagnostics

- Runtime signals: `console.error` in `create-intent` route already logs payment failures with booking/teacher IDs; no new structured logging needed for this slice
- Inspection surfaces: Unit tests serve as the diagnostic surface — each expansion edge case is named and independently verifiable
- Failure visibility: If slot expansion produces wrong count, test names identify exact scenario (e.g., "window shorter than 30 min produces zero slots")
- Redaction constraints: none — no secrets involved in slot math or payment amount computation

## Integration Closure

- Upstream surfaces consumed: `src/lib/utils/slots.ts` (getSlotsForDate from S02), `src/app/api/direct-booking/create-intent/route.ts` (payment intent creation), `tests/unit/override-precedence.test.ts` (existing test patterns)
- New wiring introduced in this slice: none — `getSlotsForDate()` contract is unchanged (same inputs/outputs), `BookingCalendar` and `[slug]/page.tsx` are not modified. The expansion is internal to `slots.ts`. `create-intent` payment math is self-contained.
- What remains before the milestone is truly usable end-to-end: S04 (last-minute cancellation) — independent feature, no dependency on S03 output

## Tasks

- [x] **T01: Expand availability windows into 30-min booking slots and update existing tests** `est:45m`
  - Why: Core S03 deliverable — transforms raw availability windows into parent-friendly 30-min increment slots. Also updates existing override-precedence tests whose assertions assume one-slot-per-window output.
  - Files: `src/lib/utils/slots.ts`, `tests/unit/override-precedence.test.ts`, `tests/unit/booking-slots.test.ts`
  - Do: Extract `generateSlotsFromWindow()` helper in `slots.ts` that loops from window start to end in 30-min increments, applies past-slot filtering per increment, and produces `TimeSlot[]`. Replace both flatMap bodies in `getSlotsForDate()` with calls to this helper. Use `${dateStr}-${startRaw}` slotId for both paths. Create `tests/unit/booking-slots.test.ts` with edge cases: window < 30 min, exactly 30 min, non-aligned (3:30–4:45), large window (3:00–6:00), multiple windows per day, past-slot filtering per increment. Update existing tests in `override-precedence.test.ts` to expect expanded 30-min slots.
  - Verify: `npx vitest run tests/unit/booking-slots.test.ts && npx vitest run tests/unit/override-precedence.test.ts && npx vitest run`
  - Done when: All new and existing unit tests pass, `getSlotsForDate()` returns 30-min increment slots for any availability window

- [x] **T02: Prorate payment amount by session duration in create-intent and verify build** `est:30m`
  - Why: With 30-min slots, charging the full hourly rate is a billing bug. Also the final build verification for the slice.
  - Files: `src/app/api/direct-booking/create-intent/route.ts`, `tests/unit/payment-proration.test.ts`
  - Do: Extract `computeSessionAmount(startTime: string, endTime: string, hourlyRate: number): number` as a pure function (exported from `create-intent/route.ts` or a shared util). Replace hardcoded `hourly_rate * 100` with the computed amount. Create `tests/unit/payment-proration.test.ts` with cases: 30-min = half rate, 60-min = full rate, 45-min = 3/4 rate, edge case with zero rate. Run full test suite and `npm run build`.
  - Verify: `npx vitest run tests/unit/payment-proration.test.ts && npx vitest run && npm run build`
  - Done when: `create-intent` charges duration-prorated amount, all tests pass, `npm run build` succeeds with zero errors

## Files Likely Touched

- `src/lib/utils/slots.ts`
- `tests/unit/booking-slots.test.ts` (new)
- `tests/unit/override-precedence.test.ts`
- `src/app/api/direct-booking/create-intent/route.ts`
- `tests/unit/payment-proration.test.ts` (new)
