# S02: Booking Calendar Restructure & Polish — UAT

**Milestone:** M011
**Written:** 2026-04-03T16:09:07.463Z

## UAT: S02 — Booking Calendar Restructure & Polish

**Preconditions:**
- Dev server running at localhost:3000
- Test teacher account exists: soosup.cha+test@gmail.com / testing123 (has Stripe connected for direct booking path)
- A second test teacher exists without Stripe connected (for deferred booking path)
- A test teacher with session types configured exists
- Browser at default viewport (desktop) unless stated otherwise

---

### TC-01: Session Type Selector Visual — Elevated Cards

**Goal:** Verify SessionTypeSelector renders with rounded-xl, shadow-sm, and hover:shadow-md card treatment.

**Steps:**
1. Navigate to a teacher profile page that has session types configured (e.g., `/[slug]` for a teacher with session types).
2. Click "Book a Session" to open the booking calendar.
3. Observe the session type selection step.

**Expected:**
- Session type cards have visibly rounded corners (rounded-xl).
- Cards have a subtle shadow (shadow-sm) at rest.
- Hovering a card shows a stronger shadow (hover:shadow-md) and a smooth transition.
- Price is displayed in the teacher's accent color.
- Duration is shown in muted text below the price.

---

### TC-02: Session Type Chip in BookingForm Step Header

**Goal:** Verify the accent-colored session type chip appears in the form step breadcrumb.

**Steps:**
1. Navigate to a teacher profile with session types. Open booking calendar.
2. Select a session type, select a date, select a time slot.
3. Observe the step header in the booking form step.

**Expected:**
- Step header shows: date · time · [session type chip]
- The session type chip has a tinted background using color-mix (15% of the teacher's accent color).
- Chip text is in the teacher's accent color.
- Layout wraps gracefully at narrow widths (does not overflow the panel).
- A back button (chevron) is present to return to the calendar.

---

### TC-03: BookingForm Visual — Card Background

**Goal:** Verify the form body has subtle background differentiation.

**Steps:**
1. Proceed to the booking form step (after TC-02 setup).
2. Observe the form area below the step header.

**Expected:**
- The form body area has a subtle muted background (bg-muted/5) distinguishing it from the header.
- Form fields (name/child selector, subject, email, notes, phone/SMS) are visible and functional.
- Submit button uses the teacher's accent color.

---

### TC-04: Deferred Booking Path — End to End

**Goal:** Verify the deferred (no-Stripe) booking path works through the decomposed orchestrator.

**Steps:**
1. Navigate to a teacher profile without Stripe connected.
2. Open booking calendar. Select date → time → fill form → submit.
3. Observe the success step.

**Expected:**
- Booking completes without errors.
- Success step shows "Booking Request Sent" (or equivalent) confirmation.
- No console errors. No broken layout.

---

### TC-05: Direct Booking Path with Payment — End to End

**Goal:** Verify the direct (Stripe-connected) booking path works including the PaymentStep.

**Steps:**
1. Navigate to a teacher profile with Stripe connected (soosup.cha+test@gmail.com teacher).
2. Open booking calendar. Select date → time → fill form → proceed to payment step.
3. Observe the payment step UI.
4. (Optional: complete with Stripe test card 4242 4242 4242 4242.)

**Expected:**
- Payment step shows "Complete your booking" heading.
- A Shield icon with "Secure payment" text appears above the Stripe PaymentElement.
- PaymentElement renders correctly.
- On test card completion, success step shown.

---

### TC-06: Auth Step Header — Accent Chip Consistency

**Goal:** Verify the auth step header uses the same accent chip pattern as the form step.

**Steps:**
1. Access a booking flow that requires auth (teacher with Stripe, not logged in as parent).
2. Proceed through date → time → form → reach auth step.
3. Observe the auth step header.

**Expected:**
- Auth step header shows the same flex-wrap breadcrumb with date · time · [session type chip].
- Chip uses color-mix accent tint — identical styling to the form step header.
- Back button present.

---

### TC-07: RecurringOptions — Repeat Icon and Rounded-xl Treatment

**Goal:** Verify RecurringOptions visual upgrades are present for recurring booking path.

**Steps:**
1. Log in as a parent with a saved child. Navigate to a teacher with session types and Stripe connected.
2. Open booking, proceed to recurring booking option (if available via the recurring flow).
3. Observe RecurringOptions component.

**Expected:**
- "Schedule type" label has a Repeat icon paired with it.
- Frequency toggle buttons (Weekly / Bi-weekly) have rounded-xl corners.
- Projected dates list has rounded-xl border, divide-y, and shadow-sm.
- "Add another session" button (if present) also has Repeat icon.

---

### TC-08: CalendarGrid — Month Navigation and Date Grid

**Goal:** Verify CalendarGrid renders correctly as a standalone sub-component.

**Steps:**
1. Open any booking calendar that has passed session type selection.
2. Observe the calendar grid step.
3. Click Previous Month and Next Month arrows.
4. Click an available date.

**Expected:**
- Month name and year update correctly on prev/next navigation.
- Available dates are clickable; unavailable dates are visually muted/disabled.
- Clicking an available date advances to time slot selection.
- "Change session type" link is visible below the calendar (if session types are configured) and navigates back to session type selector.

---

### TC-09: TimeSlotsPanel — Visual Treatment

**Goal:** Verify TimeSlotsPanel visual appearance.

**Steps:**
1. In the booking calendar, click an available date.
2. Observe the time slots panel.

**Expected:**
- Panel has a subtle muted background (bg-muted/20).
- Time slot buttons are visible with hover states.
- Clicking a time slot advances to the booking form step.

---

### TC-10: Recurring Booking Path — End to End

**Goal:** Verify the recurring booking path works through the decomposed orchestrator.

**Steps:**
1. Log in as a parent. Navigate to a teacher with Stripe connected.
2. Complete booking form with recurring options set.
3. Proceed through to recurring confirmation step.

**Expected:**
- RecurringOptions component renders with projected dates.
- Confirmation step shows all scheduled dates.
- No regression in recurring booking functionality.
- 474 test suite passes (automated gate).

---

### TC-11: Automated Verification (CI Gate)

**Goal:** Confirm all automated gates pass at slice completion.

**Steps:**
1. Run `npx vitest run --reporter=dot`
2. Run `npx tsc --noEmit`
3. Run `npx next build`

**Expected:**
- vitest: 474 tests pass, 0 failures, across 49 test files.
- tsc: exits 0, no type errors.
- next build: exits 0, 67 routes compiled.

