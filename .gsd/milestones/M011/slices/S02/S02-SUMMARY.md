---
id: S02
parent: M011
milestone: M011
provides:
  - BookingForm.tsx — form step sub-component usable independently if booking UX needs further restructuring
  - SessionTypeSelector.tsx — session type card grid, reusable if session type selection is needed elsewhere
  - CalendarGrid.tsx — calendar grid with month navigation, reusable for any date-picker surface
  - TimeSlotsPanel.tsx — time slot grid with hover states, reusable for availability previews
  - Established accent chip pattern with color-mix for all step header breadcrumbs in booking flow
requires:
  - slice: S01
    provides: color-mix accent chip pattern (D043), rounded-xl + shadow-sm elevated card pattern, S01 visual language that S02 booking flow must match
affects:
  - S05 — landing page + global consistency pass reads S02 visual patterns as part of consistency audit
key_files:
  - src/components/profile/BookingForm.tsx
  - src/components/profile/SessionTypeSelector.tsx
  - src/components/profile/CalendarGrid.tsx
  - src/components/profile/TimeSlotsPanel.tsx
  - src/components/profile/BookingCalendar.tsx
  - src/components/profile/RecurringOptions.tsx
  - src/components/profile/PaymentStep.tsx
key_decisions:
  - All state and async handlers kept in BookingCalendar orchestrator (D045) — sub-components are purely presentational with prop-drilling
  - CalendarGrid accepts isAvailable callback not raw slot arrays (D046) — availability logic stays centralized
  - Accent chip pattern: color-mix(in srgb, var(--accent) 15%, transparent) inline style in all step headers — consistent with S01 CredentialsBar pattern (D043)
  - SessionTypeSelector cards upgraded to rounded-xl shadow-sm hover:shadow-md for elevated card design
  - Shield icon chosen over Lock for PaymentStep trust signal — conveys security without implying restriction
patterns_established:
  - Presentational sub-component extraction: new booking sub-components are stateless, receive all data/callbacks via typed props, and are exercised through BookingCalendar in integration tests — no separate unit tests needed
  - Accent chip in booking step headers: flex-wrap breadcrumb with inline color-mix style for session type chip — handles narrow widths without overflow
  - Visual consistency token: rounded-xl + shadow-sm + hover:shadow-md is the elevated card pattern across SessionTypeSelector, ReviewsSection, and other M011 components
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M011/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M011/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M011/slices/S02/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-03T16:09:07.462Z
blocker_discovered: false
---

# S02: Booking Calendar Restructure & Polish

**Decomposed the 933-line BookingCalendar monolith into 4 presentational sub-components and applied premium visual treatment across every booking flow step — all 3 booking paths functional, 474 tests passing, build green.**

## What Happened

S02 tackled both the structural debt and the visual gap in the booking flow across three tasks.

**T01 — BookingForm extraction:** The booking form step (student name/child selector, subject, email, notes, SMS, submit) was extracted from BookingCalendar.tsx into a standalone BookingForm.tsx (263 lines). The step header was upgraded with a flex-wrap breadcrumb that displays the session type as an accent-colored chip using `color-mix(in srgb, var(--accent) 15%, transparent)`, matching the S01 CredentialsBar visual language. The form body received `bg-muted/5` for subtle differentiation. All state and async handlers stay in BookingCalendar — BookingForm is purely presentational with ~15 props. BookingCalendar reduced from 933 to 751 lines.

**T02 — Remaining 3 sub-component extractions:** Three additional presentational sub-components completed the decomposition. SessionTypeSelector (48 lines) received visual elevation: `rounded-xl shadow-sm hover:shadow-md transition-shadow` on cards, accent-colored prices. CalendarGrid (130 lines) received the month navigation, day-of-week headers, date grid, and change-session-type link; it takes an `isAvailable` callback to keep availability logic centralized in the orchestrator. TimeSlotsPanel (71 lines) received `bg-muted/20` background and the hover-state TimeSlotButton. BookingCalendar updated to import all 4 sub-components, replacing all inline calendar-step JSX. The orchestrator landed at 617 lines — above the ~250-line plan target because success/error/recurring/auth/payment step JSX and all async handlers stay inline as designed.

**T03 — Remaining flow surfaces polished:** RecurringOptions.tsx upgraded with a Repeat icon on the schedule type label, `rounded-xl` toggle buttons, and `rounded-xl shadow-sm` on the projected dates list. PaymentStep.tsx gained a Shield trust signal ("Secure payment" in muted text with Shield icon) and a "Complete your booking" heading above the Stripe PaymentElement. BookingCalendar auth and payment step headers were upgraded to the same flex-wrap + accent chip pattern as BookingForm, ensuring visual consistency across every step that shows the booking context breadcrumb. Final gate: `next build` compiles cleanly across all 67 routes.

## Verification

All three verification gates pass at every task and confirmed at slice close: `npx vitest run --reporter=dot` — 474 tests pass across 49 test files (including booking-child-selector tests that exercise BookingForm and sub-components through BookingCalendar). `npx tsc --noEmit` — exits 0, no type errors. `npx next build` — compiles successfully, generates all 67 routes.

## Requirements Advanced

- UI-02 — BookingCalendar monolith decomposed into 4 sub-components; all booking flow steps receive premium visual treatment matching S01 language
- UI-08 — SessionTypeSelector, RecurringOptions, PaymentStep, and step headers all upgraded with intentional design choices — rounded-xl cards, trust signals, accent chips, Repeat/Shield icons
- UI-09 — Step breadcrumbs now show session type context at every step; trust signal added to payment step; visual consistency across steps reduces cognitive load

## Requirements Validated

- UI-02 — BookingCalendar 933-line monolith decomposed into BookingForm (263 lines), SessionTypeSelector (48 lines), CalendarGrid (130 lines), TimeSlotsPanel (71 lines). All 3 booking paths (deferred, direct, recurring) function through integration test suite. 474 tests passing, tsc clean, next build success.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

BookingCalendar orchestrator is ~617 lines rather than the ~250-line target in the plan. The delta is accounted for: success/error/recurring/auth/payment step JSX (5 steps that are tightly coupled to state transitions) and the full async handler block (createPaymentIntent, createRecurringIntent, handleSubmit) remain inline by design. Only the calendar-step presentation was extracted to sub-components. This was recognized during T02 and is the correct tradeoff — extracting tightly state-coupled steps would require prop-drilling or context just to reach the same handlers. CalendarGrid uses an isAvailable callback rather than raw slot arrays — a deviation from the plan description but an improvement (keeps availability logic in the orchestrator).

## Known Limitations

BookingCalendar orchestrator at 617 lines is still materially smaller than the original 933-line monolith (~34% reduction) and the sub-components are individually testable in isolation. The remaining inline steps could be extracted in a future slice if needed, but current size is manageable.

## Follow-ups

S03 (Mobile Navigation Overhaul) is independent of S02 and can proceed immediately. S04 (Dashboard Polish) depends on S03. S05 (Landing Page & Global Consistency Pass) depends on S01 and S04. No blocking issues discovered during S02.

## Files Created/Modified

- `src/components/profile/BookingForm.tsx` — New file — 263-line presentational form step sub-component extracted from BookingCalendar. Includes accent-colored session type chip in step header, bg-muted/5 form body.
- `src/components/profile/SessionTypeSelector.tsx` — New file — 48-line session type card grid. Upgraded to rounded-xl shadow-sm hover:shadow-md with accent-colored prices.
- `src/components/profile/CalendarGrid.tsx` — New file — 130-line calendar grid with month navigation, day-of-week headers, date cells, and change-session-type link. Takes isAvailable callback.
- `src/components/profile/TimeSlotsPanel.tsx` — New file — 71-line time slot panel with bg-muted/20 background and hover-state TimeSlotButton.
- `src/components/profile/BookingCalendar.tsx` — Reduced from 933 to 617 lines. Imports and renders 4 sub-components. Auth and payment step headers upgraded with flex-wrap + accent chip pattern. Cleaned up 6 unused imports.
- `src/components/profile/RecurringOptions.tsx` — Repeat icon on schedule type label, rounded-xl toggle buttons, rounded-xl shadow-sm projected dates list.
- `src/components/profile/PaymentStep.tsx` — Shield trust signal ('Secure payment') and 'Complete your booking' heading added above Stripe PaymentElement.
