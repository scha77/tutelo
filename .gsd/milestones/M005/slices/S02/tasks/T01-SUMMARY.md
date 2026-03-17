---
id: T01
parent: S02
milestone: M005
provides:
  - Phone number input and SMS consent checkbox in BookingCalendar form
  - Phone/consent data forwarded through both deferred and direct booking submission paths
key_files:
  - src/components/profile/BookingCalendar.tsx
  - src/components/ui/checkbox.tsx
key_decisions:
  - Consent checkbox conditionally rendered (not just disabled) when phone is empty — cleaner UX and ensures smsOptIn is forced false in payload logic
patterns_established:
  - TCPA-compliant SMS consent: checkbox unchecked by default, only visible when phone has content, consent forced false when phone cleared
observability_surfaces:
  - Browser DevTools Network tab — inspect POST body to /api/direct-booking/create-intent for parentPhone/parentSmsOptIn fields
  - React DevTools or server logs for submitAction payload (parent_phone/parent_sms_opt_in)
duration: 20m
verification_result: passed
completed_at: 2026-03-16
blocker_discovered: false
---

# T01: Add phone + consent UI fields to BookingCalendar and wire both submission paths

**Added optional phone input with TCPA-compliant SMS consent checkbox to booking form; both deferred and direct submission paths forward phone/consent values.**

## What Happened

1. Installed shadcn/ui Checkbox component via `npx shadcn@latest add checkbox` — created `src/components/ui/checkbox.tsx`.

2. Added `phone: ''` and `smsOptIn: false` to the `form` state initialization and `handleBookAnother` reset in `BookingCalendar.tsx`.

3. Added imports for `Checkbox` and `Phone` (lucide-react icon).

4. Added phone input field below Notes textarea with phone icon prefix, labeled "US phone number (optional)", placeholder "(555) 555-1234". Added SMS consent checkbox that only renders when `form.phone.trim().length > 0`, with TCPA-compliant text including "Msg & data rates may apply. Reply STOP to opt out."

5. Wired the deferred path (`submitAction` call in `handleSubmit`) to include `parent_phone` and `parent_sms_opt_in`, with `parent_sms_opt_in` forced to `false` when phone is empty.

6. Wired the direct path (`createPaymentIntent` fetch body) to include `parentPhone` and `parentSmsOptIn` with the same empty-phone guard.

7. Added Observability Impact section to T01-PLAN.md per pre-flight requirement.

## Verification

- `npm run build` — passes with zero errors
- `npx vitest run` — 396 tests pass, 0 failures (56 test files pass, 20 skipped)
- `src/components/ui/checkbox.tsx` exists (1214 bytes)
- Browser verification:
  - Phone input visible below Notes, labeled "US phone number (optional)" ✓
  - Consent checkbox hidden when phone is empty ✓
  - Consent checkbox appears when phone has content ✓
  - Consent checkbox unchecked by default ✓
  - TCPA text "Msg & data rates may apply. Reply STOP to opt out." visible ✓
  - Clearing phone hides checkbox (inputs 6→5, buttons 6→5) ✓
- Source grep confirms phone/consent in both submitAction and createPaymentIntent call sites

### Slice-level verification status (T01 is task 1 of 2):
- `npx vitest run src/__tests__/parent-phone-storage.test.ts` — NOT YET (test file created in T02)
- `npm run build` — PASS
- `npx vitest run` — PASS (all existing tests still pass)

## Diagnostics

- Inspect `BookingCalendar.tsx` — search for `phone` and `smsOptIn` to find state fields, UI elements, and both submission wiring sites
- The phone input uses `id="phone"` and consent checkbox uses `id="sms-consent"` for DOM inspection
- No new server-side code in this task — server-side storage is T02

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/components/ui/checkbox.tsx` — new shadcn/ui Checkbox component (installed via CLI)
- `src/components/profile/BookingCalendar.tsx` — added phone input, SMS consent checkbox, wired both submission paths
- `.gsd/milestones/M005/slices/S02/tasks/T01-PLAN.md` — added Observability Impact section per pre-flight
