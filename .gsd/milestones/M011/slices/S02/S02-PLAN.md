# S02: Booking Calendar Restructure & Polish

**Goal:** The 933-line BookingCalendar monolith is decomposed into cohesive sub-components (BookingForm, SessionTypeSelector, CalendarGrid, TimeSlotsPanel) and the orchestrator is ~250 lines. Every visual surface in the booking flow — session type cards, form area, payment step, recurring options — gets premium treatment matching the S01 visual language (rounded-xl cards, accent chips, elevated shadows). All 3 booking paths (deferred, direct, recurring) continue to work. 474 tests pass, tsc clean, next build success.
**Demo:** After this: After this: the booking flow from date selection → time slot → form → payment feels smooth and intentional. The calendar, time slots, form fields, and payment step are visually cohesive with the new profile page. The 935-line monolith is decomposed into maintainable sub-components.

## Tasks
- [x] **T01: Extract BookingForm sub-component from BookingCalendar with accent-colored session type chip and subtle card background** — Extract the booking form step (student name/child selector, subject dropdown, email, notes, phone/SMS, submit button) from BookingCalendar.tsx into a new BookingForm.tsx sub-component. The step header (back button + date/time/session breadcrumb) is included in BookingForm. Apply visual polish: wrap form in a subtle card treatment, display session type as an accent-colored chip in the header (matching S01's color-mix pattern). BookingCalendar passes form state, setForm, and onSubmit as props — no logic changes.

Steps:
1. Create `src/components/profile/BookingForm.tsx` with the form JSX extracted from BookingCalendar lines ~700-930. Props: form, setForm, onSubmit, submitting, creatingIntent, firstName, subjects, hasSessionTypes, children, childrenLoaded, selectedDate, selectedSlot, selectedSessionType, stripeConnected, accentColor, onBack.
2. Include the step header (back button + date/time/session type breadcrumb) inside BookingForm, with visual upgrade: session type shown as accent-colored chip using `style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}`.
3. Wrap the form body in a subtle bg treatment: add `bg-muted/5` or similar subtle background to differentiate from header.
4. In BookingCalendar.tsx, replace the form JSX block (the else branch at the bottom of the step router) with `<BookingForm ...props />`. Keep all state and handlers in BookingCalendar.
5. Run `npx vitest run --reporter=dot` — 474 tests must pass. The booking-child-selector tests render BookingCalendar and assert on the form; since BookingForm is not mocked, it's rendered normally through BookingCalendar.
6. Run `npx tsc --noEmit` — must exit 0.
  - Estimate: 45m
  - Files: src/components/profile/BookingForm.tsx, src/components/profile/BookingCalendar.tsx
  - Verify: npx vitest run --reporter=dot && npx tsc --noEmit
- [x] **T02: Extracted 3 presentational sub-components (SessionTypeSelector, CalendarGrid, TimeSlotsPanel) from BookingCalendar completing the monolith decomposition with elevated card design** — Extract the remaining 3 presentational sub-components from BookingCalendar.tsx, completing the monolith decomposition. After this task, BookingCalendar.tsx is a ~250-line orchestrator that owns state + handlers and delegates rendering to sub-components.

Steps:
1. Create `src/components/profile/SessionTypeSelector.tsx` (~60 lines). Props: sessionTypes, accentColor, onSelect. Visual upgrade: change cards from `border rounded-lg px-5 py-4 hover:bg-muted/50` to `border rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow`. Price uses accent color. Duration shown in muted text.
2. Create `src/components/profile/CalendarGrid.tsx` (~100 lines). Props: calendarDays, currentMonth, selectedDate, today, accentColor, hasSessionTypes, selectedSessionType, onDateClick, onPrevMonth, onNextMonth, onChangeSessionType. Includes month navigation, day-of-week headers, date grid, and the 'Change session type' link.
3. Create `src/components/profile/TimeSlotsPanel.tsx` (~70 lines). Props: selectedDate, timeSlotsForDay, accentColor, onSlotClick. Includes the TimeSlotButton internal component (manages its own hover state). Panel has `bg-muted/20` background.
4. Update BookingCalendar.tsx to import and render all 3 new components plus BookingForm from T01. The calendar step JSX (session type selector OR calendar+timeslots) is replaced with component calls. Success/error/recurring/auth/payment steps remain inline in the orchestrator (they're small and tightly coupled to state transitions).
5. Verify BookingCalendar.tsx is approximately 250 lines (state declarations + handlers + step router rendering sub-components).
6. Run `npx vitest run --reporter=dot` — 474 tests must pass.
7. Run `npx tsc --noEmit` — must exit 0.
  - Estimate: 45m
  - Files: src/components/profile/SessionTypeSelector.tsx, src/components/profile/CalendarGrid.tsx, src/components/profile/TimeSlotsPanel.tsx, src/components/profile/BookingCalendar.tsx
  - Verify: npx vitest run --reporter=dot && npx tsc --noEmit
- [x] **T03: Applied premium visual treatment to RecurringOptions (rounded-xl projected dates, Repeat icon, refined toggles), PaymentStep (Shield trust signal, heading), and auth/payment step headers (accent chip for session type) completing booking flow visual cohesion** — Apply premium visual treatment to the remaining booking flow surfaces: RecurringOptions projected dates, PaymentStep trust signal, and step headers in auth/payment panels. This completes the visual cohesion between the booking flow and the S01 profile page.

Steps:
1. In `RecurringOptions.tsx`: upgrade projected dates list from `rounded-lg border divide-y` to `rounded-xl border divide-y shadow-sm`. Add `Repeat` icon paired with 'Schedule type' label (matching S01 icon-paired meta pattern). Refine frequency toggle button corners to `rounded-xl` for consistency.
2. In `PaymentStep.tsx`: add a trust signal above the Stripe PaymentElement — a `Shield` or `Lock` icon from lucide-react with 'Secure payment' text in muted styling. Add a subtle heading 'Complete your booking' with font-semibold. Keep the form layout clean (p-6 space-y-4 max-w-md mx-auto).
3. In `BookingCalendar.tsx` orchestrator: update the step headers for auth and payment steps to show session type as an accent chip (same pattern as BookingForm header from T01) — use inline style with color-mix for the chip background. Ensure all step headers are visually consistent.
4. Run `npx vitest run --reporter=dot` — 474 tests must pass.
5. Run `npx tsc --noEmit` — must exit 0.
6. Run `npx next build` — must exit 0 (final build verification for the slice).
  - Estimate: 30m
  - Files: src/components/profile/RecurringOptions.tsx, src/components/profile/PaymentStep.tsx, src/components/profile/BookingCalendar.tsx
  - Verify: npx vitest run --reporter=dot && npx tsc --noEmit && npx next build
