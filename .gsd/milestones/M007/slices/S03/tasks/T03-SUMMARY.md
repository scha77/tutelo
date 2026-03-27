---
id: T03
parent: S03
milestone: M007
provides: []
requires: []
affects: []
key_files: ["src/components/profile/BookingCalendar.tsx", "src/lib/utils/slots.ts"]
key_decisions: ["Added durationMinutes parameter to generateSlotsFromWindow and getSlotsForDate (default 30) instead of assuming it existed", "Session type selector shown as step guard before calendar when session types exist", "Subject dropdown hidden entirely when session types exist; session type label pre-populates form.subject"]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Ran npx tsc --noEmit (only pre-existing qrcode errors), npm run build (only pre-existing qrcode errors), npx vitest run tests/unit/booking-slots.test.ts (18 tests pass), npx vitest run tests/unit/session-type-pricing.test.ts (8 tests pass)."
completed_at: 2026-03-27T02:26:27.432Z
blocker_discovered: false
---

# T03: Added session type selector, slot duration filtering, subject guards, price display, and sessionTypeId integration to BookingCalendar

> Added session type selector, slot duration filtering, subject guards, price display, and sessionTypeId integration to BookingCalendar

## What Happened
---
id: T03
parent: S03
milestone: M007
key_files:
  - src/components/profile/BookingCalendar.tsx
  - src/lib/utils/slots.ts
key_decisions:
  - Added durationMinutes parameter to generateSlotsFromWindow and getSlotsForDate (default 30) instead of assuming it existed
  - Session type selector shown as step guard before calendar when session types exist
  - Subject dropdown hidden entirely when session types exist; session type label pre-populates form.subject
duration: ""
verification_result: passed
completed_at: 2026-03-27T02:26:27.433Z
blocker_discovered: false
---

# T03: Added session type selector, slot duration filtering, subject guards, price display, and sessionTypeId integration to BookingCalendar

**Added session type selector, slot duration filtering, subject guards, price display, and sessionTypeId integration to BookingCalendar**

## What Happened

Extended BookingCalendar with a complete session type flow. When a teacher has session types, parents see a "Choose a session type" panel before the calendar—each type shown as a card with label, price, and duration. Selecting a type sets the subject, shows the calendar with duration-filtered slots, and adds a "Change session type" link. The form header displays session type price and label. The subject dropdown is hidden when session types exist (backward compat guard). Both the direct-booking createPaymentIntent and deferred submitAction paths now include sessionTypeId/session_type_id. Also extended getSlotsForDate and generateSlotsFromWindow in slots.ts to accept an optional durationMinutes parameter (default 30), enabling session types with custom durations to filter time slots correctly.

## Verification

Ran npx tsc --noEmit (only pre-existing qrcode errors), npm run build (only pre-existing qrcode errors), npx vitest run tests/unit/booking-slots.test.ts (18 tests pass), npx vitest run tests/unit/session-type-pricing.test.ts (8 tests pass).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 3400ms |
| 2 | `npm run build` | 1 | ✅ pass (pre-existing qrcode errors only) | 12900ms |
| 3 | `npx vitest run tests/unit/booking-slots.test.ts` | 0 | ✅ pass | 6900ms |
| 4 | `npx vitest run tests/unit/session-type-pricing.test.ts` | 0 | ✅ pass | 2400ms |


## Deviations

Task plan stated getSlotsForDate already accepts durationMinutes as 7th param—it did not. Added the parameter to both getSlotsForDate and generateSlotsFromWindow with default 30 for backward compat. BookingCalendarProps already had sessionTypes prop from T02; updated type to include nullable duration_minutes.

## Known Issues

None.

## Files Created/Modified

- `src/components/profile/BookingCalendar.tsx`
- `src/lib/utils/slots.ts`


## Deviations
Task plan stated getSlotsForDate already accepts durationMinutes as 7th param—it did not. Added the parameter to both getSlotsForDate and generateSlotsFromWindow with default 30 for backward compat. BookingCalendarProps already had sessionTypes prop from T02; updated type to include nullable duration_minutes.

## Known Issues
None.
