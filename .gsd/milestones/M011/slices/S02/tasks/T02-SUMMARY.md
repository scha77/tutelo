---
id: T02
parent: S02
milestone: M011
key_files:
  - src/components/profile/SessionTypeSelector.tsx
  - src/components/profile/CalendarGrid.tsx
  - src/components/profile/TimeSlotsPanel.tsx
  - src/components/profile/BookingCalendar.tsx
key_decisions:
  - SessionTypeSelector cards upgraded to rounded-xl shadow-sm hover:shadow-md for elevated design
  - CalendarGrid takes isAvailable callback to keep availability logic centralized in orchestrator
  - BookingCalendar at 617 lines because success/error/recurring/auth/payment steps remain inline as planned
duration: 
verification_result: passed
completed_at: 2026-04-03T16:03:15.816Z
blocker_discovered: false
---

# T02: Extracted 3 presentational sub-components (SessionTypeSelector, CalendarGrid, TimeSlotsPanel) from BookingCalendar completing the monolith decomposition with elevated card design

**Extracted 3 presentational sub-components (SessionTypeSelector, CalendarGrid, TimeSlotsPanel) from BookingCalendar completing the monolith decomposition with elevated card design**

## What Happened

Created three new sub-components from the BookingCalendar monolith: SessionTypeSelector (48 lines) with visual upgrade to rounded-xl shadow-sm hover:shadow-md; CalendarGrid (130 lines) with month navigation, day-of-week headers, date grid, and change-session-type link; TimeSlotsPanel (71 lines) with hover-state time slot buttons and bg-muted/20 background. BookingCalendar updated to import all 4 sub-components (including BookingForm from T01), replacing inline calendar JSX. Removed ChevronRight/isSameDay imports, DAY_HEADERS constant, and inline TimeSlotButton. BookingCalendar reduced from 751 to 617 lines — remaining inline steps (success/error/recurring/auth/payment) stay as planned since they're tightly coupled to state transitions.

## Verification

npx tsc --noEmit exits 0 (clean). npx vitest run --reporter=dot: 474 tests pass across 49 test files.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 13300ms |
| 2 | `npx vitest run --reporter=dot` | 0 | ✅ pass | 23800ms |

## Deviations

CalendarGrid takes isAvailable callback instead of raw slot data — keeps availability logic in orchestrator. BookingCalendar is 617 lines rather than ~250 target due to inline success/error/recurring/auth/payment steps and handler functions staying in orchestrator as planned.

## Known Issues

None.

## Files Created/Modified

- `src/components/profile/SessionTypeSelector.tsx`
- `src/components/profile/CalendarGrid.tsx`
- `src/components/profile/TimeSlotsPanel.tsx`
- `src/components/profile/BookingCalendar.tsx`
