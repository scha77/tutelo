---
id: T01
parent: S03
milestone: M007
provides: []
requires: []
affects: []
key_files: ["src/app/api/direct-booking/create-intent/route.ts", "src/lib/schemas/booking.ts", "tests/unit/session-type-pricing.test.ts"]
key_decisions: ["Session type price (NUMERIC dollars) converted to cents via Math.round(Number(price) * 100) at PI creation time", "Session type label overrides request subject in booking row when sessionTypeId is provided", "session_type_id conditionally spread into PI metadata only when present"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Ran `npx vitest run tests/unit/session-type-pricing.test.ts` — all 8 tests pass. Ran `npx tsc --noEmit` — clean output (only pre-existing qrcode type declaration errors unrelated to this change)."
completed_at: 2026-03-27T02:17:16.075Z
blocker_discovered: false
---

# T01: Extended create-intent API with session type flat-price fork, teacher ownership security check, and 8 unit tests covering all pricing paths

> Extended create-intent API with session type flat-price fork, teacher ownership security check, and 8 unit tests covering all pricing paths

## What Happened
---
id: T01
parent: S03
milestone: M007
key_files:
  - src/app/api/direct-booking/create-intent/route.ts
  - src/lib/schemas/booking.ts
  - tests/unit/session-type-pricing.test.ts
key_decisions:
  - Session type price (NUMERIC dollars) converted to cents via Math.round(Number(price) * 100) at PI creation time
  - Session type label overrides request subject in booking row when sessionTypeId is provided
  - session_type_id conditionally spread into PI metadata only when present
duration: ""
verification_result: passed
completed_at: 2026-03-27T02:17:16.076Z
blocker_discovered: false
---

# T01: Extended create-intent API with session type flat-price fork, teacher ownership security check, and 8 unit tests covering all pricing paths

**Extended create-intent API with session type flat-price fork, teacher ownership security check, and 8 unit tests covering all pricing paths**

## What Happened

Modified three files to implement the session type pricing fork. The create-intent route now accepts an optional sessionTypeId; when present, it fetches the session type, verifies teacher ownership, and uses its flat price (dollars converted to cents). When absent, the existing hourly_rate proration path runs unchanged. BookingRequestSchema was extended with optional session_type_id. Eight unit tests cover flat-price, hourly fallback, wrong-teacher rejection, not-found, dollar-to-cent conversion, application fee calculation, prorated amount, and label-as-subject behavior.

## Verification

Ran `npx vitest run tests/unit/session-type-pricing.test.ts` — all 8 tests pass. Ran `npx tsc --noEmit` — clean output (only pre-existing qrcode type declaration errors unrelated to this change).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx vitest run tests/unit/session-type-pricing.test.ts` | 0 | ✅ pass | 2800ms |
| 2 | `npx tsc --noEmit` | 0 | ✅ pass | 2800ms |


## Deviations

None.

## Known Issues

The session_types table migration (0011) exists only in .gsd/worktrees/M007/ and has not been copied to the main project's migrations folder. This is expected to be handled by a prior slice (S01).

## Files Created/Modified

- `src/app/api/direct-booking/create-intent/route.ts`
- `src/lib/schemas/booking.ts`
- `tests/unit/session-type-pricing.test.ts`


## Deviations
None.

## Known Issues
The session_types table migration (0011) exists only in .gsd/worktrees/M007/ and has not been copied to the main project's migrations folder. This is expected to be handled by a prior slice (S01).
