---
estimated_steps: 4
estimated_files: 3
---

# T02: Prorate payment amount by session duration in create-intent and verify build

**Slice:** S03 — Booking Calendar Integration
**Milestone:** M004

## Description

With 30-min booking slots, the `create-intent` route must charge a duration-prorated amount instead of the full hourly rate. Extract a pure `computeSessionAmount(startTime, endTime, hourlyRate)` function, replace the hardcoded calculation, write unit tests, and run the full build to close out S03.

## Steps

1. Extract `computeSessionAmount(startTime: string, endTime: string, hourlyRate: number): number` as a pure exported function in `src/lib/utils/booking.ts` (new file). Logic: parse `startTime` and `endTime` as `HH:MM`, compute `durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)`, return `Math.round((durationMinutes / 60) * hourlyRate * 100)` (cents). Handle edge case: if `durationMinutes <= 0`, return 0.
2. Update `src/app/api/direct-booking/create-intent/route.ts`: import `computeSessionAmount`, replace `const amountInCents = Math.round((teacher.hourly_rate ?? 0) * 100)` with `const amountInCents = computeSessionAmount(startTime, endTime, teacher.hourly_rate ?? 0)`.
3. Create `tests/unit/payment-proration.test.ts` with test cases:
   - 30-min slot (e.g., `"15:00"` to `"15:30"`, rate $60) → 3000 cents ($30)
   - 60-min slot (`"15:00"` to `"16:00"`, rate $60) → 6000 cents ($60)
   - 45-min slot (`"15:00"` to `"15:45"`, rate $60) → 4500 cents ($45)
   - Zero hourly rate → 0 cents
   - Non-standard duration (`"09:00"` to `"09:20"`, rate $60) → 2000 cents ($20)
4. Run `npx vitest run` (full suite) and `npm run build` to confirm zero regressions and zero build errors.

## Must-Haves

- [ ] `computeSessionAmount()` extracted as a pure, exported, unit-testable function
- [ ] `create-intent` uses `computeSessionAmount(startTime, endTime, hourlyRate)` instead of `hourlyRate * 100`
- [ ] 30-min slot charges exactly half the hourly rate
- [ ] 60-min slot charges exactly the full hourly rate (backward compatible)
- [ ] Unit tests cover at least 4 duration scenarios
- [ ] Full test suite passes (`npx vitest run`)
- [ ] `npm run build` passes with zero errors

## Verification

- `npx vitest run tests/unit/payment-proration.test.ts` — all proration tests pass
- `npx vitest run` — full suite passes
- `npm run build` — zero errors

## Observability Impact

- Signals added/changed: None — `computeSessionAmount` is pure math; existing `console.error` in `create-intent` already logs payment failures
- How a future agent inspects this: Run `payment-proration.test.ts`; test names identify each duration scenario
- Failure state exposed: Incorrect proration produces a specific test failure (e.g., "30-min slot charges half the hourly rate: expected 3000, received 6000")

## Inputs

- `src/app/api/direct-booking/create-intent/route.ts` — current hardcoded `hourly_rate * 100` on line ~70; `startTime`/`endTime` already in request body
- T01 output — `slots.ts` now produces 30-min slots with correct `startRaw`/`endRaw` that flow through to `create-intent` via the booking form

## Expected Output

- `src/lib/utils/booking.ts` — new file with exported `computeSessionAmount()` pure function
- `src/app/api/direct-booking/create-intent/route.ts` — uses `computeSessionAmount()` for payment amount
- `tests/unit/payment-proration.test.ts` — new file with ≥4 passing proration tests
- Full test suite passes, `npm run build` succeeds
