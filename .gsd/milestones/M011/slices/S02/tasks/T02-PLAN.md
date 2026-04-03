---
estimated_steps: 9
estimated_files: 4
skills_used: []
---

# T02: Extract SessionTypeSelector, CalendarGrid, TimeSlotsPanel — complete decomposition

Extract the remaining 3 presentational sub-components from BookingCalendar.tsx, completing the monolith decomposition. After this task, BookingCalendar.tsx is a ~250-line orchestrator that owns state + handlers and delegates rendering to sub-components.

Steps:
1. Create `src/components/profile/SessionTypeSelector.tsx` (~60 lines). Props: sessionTypes, accentColor, onSelect. Visual upgrade: change cards from `border rounded-lg px-5 py-4 hover:bg-muted/50` to `border rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow`. Price uses accent color. Duration shown in muted text.
2. Create `src/components/profile/CalendarGrid.tsx` (~100 lines). Props: calendarDays, currentMonth, selectedDate, today, accentColor, hasSessionTypes, selectedSessionType, onDateClick, onPrevMonth, onNextMonth, onChangeSessionType. Includes month navigation, day-of-week headers, date grid, and the 'Change session type' link.
3. Create `src/components/profile/TimeSlotsPanel.tsx` (~70 lines). Props: selectedDate, timeSlotsForDay, accentColor, onSlotClick. Includes the TimeSlotButton internal component (manages its own hover state). Panel has `bg-muted/20` background.
4. Update BookingCalendar.tsx to import and render all 3 new components plus BookingForm from T01. The calendar step JSX (session type selector OR calendar+timeslots) is replaced with component calls. Success/error/recurring/auth/payment steps remain inline in the orchestrator (they're small and tightly coupled to state transitions).
5. Verify BookingCalendar.tsx is approximately 250 lines (state declarations + handlers + step router rendering sub-components).
6. Run `npx vitest run --reporter=dot` — 474 tests must pass.
7. Run `npx tsc --noEmit` — must exit 0.

## Inputs

- ``src/components/profile/BookingCalendar.tsx` — modified by T01, source of remaining JSX to extract`
- ``src/components/profile/BookingForm.tsx` — created in T01, already imported by BookingCalendar`

## Expected Output

- ``src/components/profile/SessionTypeSelector.tsx` — new sub-component with elevated card design (rounded-xl, shadow-sm, hover:shadow-md)`
- ``src/components/profile/CalendarGrid.tsx` — new sub-component with month navigation, day headers, date grid`
- ``src/components/profile/TimeSlotsPanel.tsx` — new sub-component with time slot buttons and hover state`
- ``src/components/profile/BookingCalendar.tsx` — reduced to ~250-line orchestrator importing all sub-components`

## Verification

npx vitest run --reporter=dot && npx tsc --noEmit
