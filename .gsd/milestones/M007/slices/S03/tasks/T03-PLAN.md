---
estimated_steps: 37
estimated_files: 1
skills_used: []
---

# T03: BookingCalendar session type selector, slot duration filtering, and backward-compat guards

Extend `BookingCalendar` to support session types. This is the main UI integration task.

**Props:**
Add optional `sessionTypes` prop to `BookingCalendarProps`:
```ts
sessionTypes?: Array<{
  id: string
  label: string
  price: number | string
  duration_minutes: number | null
  sort_order: number
}>
```

**State:**
Add `selectedSessionType` state (initially null). Type can be imported from `SessionTypeManager` or defined inline.

**Session type selector (calendar step guard):**
In the `step === 'calendar'` branch, when `sessionTypes && sessionTypes.length > 0 && !selectedSessionType`, show a session type selector panel instead of the calendar grid. Each session type is a clickable card/button showing label, price ($XX), and duration (XX min) if set. When a session type is clicked, set `selectedSessionType` and the calendar grid appears normally.

Add a "Change session type" link/button above the calendar when a session type IS selected, allowing the user to go back and pick a different type.

**Slot duration filtering:**
In the `timeSlotsForDay` useMemo, pass the selected session type's duration to `getSlotsForDate`:
```ts
const duration = selectedSessionType?.duration_minutes ?? undefined
return getSlotsForDate(selectedDate, slots, teacherTimezone, visitorTimezone, overrides, duration)
```
`getSlotsForDate` already accepts `durationMinutes` as the 7th param with a default of 30. No changes to slots.ts.

**Subject field guard (SESS-04 backward compat):**
In the booking form, the subject dropdown currently shows when `subjects.length > 1`. Add a guard: only show when `!(sessionTypes && sessionTypes.length > 0)`. When session types exist, hide the subject dropdown entirely — the session type label will be used as the subject.

**Subject pre-population:**
When `selectedSessionType` is set, pre-populate `form.subject` with `selectedSessionType.label`. Do this in the session type selector click handler (when setting `selectedSessionType`, also update form.subject).

**createPaymentIntent body extension:**
In the `createPaymentIntent` function, add `sessionTypeId: selectedSessionType?.id` to the JSON body. The create-intent route (T01) already accepts this.

**Price display:**
In the form step header area (the `border-b px-6 py-4` div), when a session type is selected, show the price: e.g. `$60 · SAT Prep` alongside the date and time.

**handleBookAnother reset:**
In `handleBookAnother`, add `setSelectedSessionType(null)` to the reset logic.

**Deferred path (submitAction):**
In the deferred path (`!stripeConnected`), add `session_type_id: selectedSessionType?.id` to the submitAction data object. The BookingRequestSchema (T01) already accepts optional session_type_id.

**Requirements advanced:** SESS-02 (session type selector with correct price), SESS-04 (backward compat — no session types = unchanged flow)

## Inputs

- ``src/components/profile/BookingCalendar.tsx` — existing 688-line BookingCalendar component to extend`
- ``src/app/api/direct-booking/create-intent/route.ts` — T01 output: accepts sessionTypeId in body`
- ``src/lib/schemas/booking.ts` — T01 output: BookingRequestSchema with optional session_type_id`
- ``src/app/[slug]/page.tsx` — T02 output: passes sessionTypes prop to BookingCalendar`

## Expected Output

- ``src/components/profile/BookingCalendar.tsx` — extended with sessionTypes prop, session type selector, slot duration filtering, subject guards, price display, createPaymentIntent sessionTypeId`

## Verification

npx tsc --noEmit && npm run build
