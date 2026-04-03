---
estimated_steps: 8
estimated_files: 2
skills_used: []
---

# T01: Extract BookingForm sub-component with visual polish

Extract the booking form step (student name/child selector, subject dropdown, email, notes, phone/SMS, submit button) from BookingCalendar.tsx into a new BookingForm.tsx sub-component. The step header (back button + date/time/session breadcrumb) is included in BookingForm. Apply visual polish: wrap form in a subtle card treatment, display session type as an accent-colored chip in the header (matching S01's color-mix pattern). BookingCalendar passes form state, setForm, and onSubmit as props — no logic changes.

Steps:
1. Create `src/components/profile/BookingForm.tsx` with the form JSX extracted from BookingCalendar lines ~700-930. Props: form, setForm, onSubmit, submitting, creatingIntent, firstName, subjects, hasSessionTypes, children, childrenLoaded, selectedDate, selectedSlot, selectedSessionType, stripeConnected, accentColor, onBack.
2. Include the step header (back button + date/time/session type breadcrumb) inside BookingForm, with visual upgrade: session type shown as accent-colored chip using `style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}`.
3. Wrap the form body in a subtle bg treatment: add `bg-muted/5` or similar subtle background to differentiate from header.
4. In BookingCalendar.tsx, replace the form JSX block (the else branch at the bottom of the step router) with `<BookingForm ...props />`. Keep all state and handlers in BookingCalendar.
5. Run `npx vitest run --reporter=dot` — 474 tests must pass. The booking-child-selector tests render BookingCalendar and assert on the form; since BookingForm is not mocked, it's rendered normally through BookingCalendar.
6. Run `npx tsc --noEmit` — must exit 0.

## Inputs

- ``src/components/profile/BookingCalendar.tsx` — source of form JSX to extract (lines ~700-930)`
- ``src/__tests__/booking-child-selector.test.ts` — must continue passing (imports BookingCalendar, tests child selector render and state)`

## Expected Output

- ``src/components/profile/BookingForm.tsx` — new sub-component (~200 lines) containing the booking form step with header, child selector, subject dropdown, email, notes, phone/SMS, submit button`
- ``src/components/profile/BookingCalendar.tsx` — modified to import and render BookingForm instead of inline JSX`

## Verification

npx vitest run --reporter=dot && npx tsc --noEmit
