---
id: T02
parent: S01
milestone: M005
provides:
  - Step1Schema extended with optional phone_number (US validation via libphonenumber-js) and sms_opt_in boolean
  - ProfileUpdateSchema extended with phone_number (nullable) and sms_opt_in
  - BookingRequestSchema extended with optional parent_phone and parent_sms_opt_in (schema only, UI in S02)
  - WizardStep1 phone input + SMS opt-in checkbox below photo upload
  - AccountSettings phone input + SMS opt-in checkbox with controlled state management
requires:
  - slice: S01/T01
    provides: libphonenumber-js installed, migration 0008 columns exist
affects: [S02]
key_files:
  - src/lib/schemas/onboarding.ts
  - src/lib/schemas/booking.ts
  - src/actions/profile.ts
  - src/components/onboarding/WizardStep1.tsx
  - src/components/dashboard/AccountSettings.tsx
key_decisions:
  - "US-only phone validation via isValidPhoneNumber from libphonenumber-js — international support deferred"
  - "Empty string phone transformed to null/undefined before DB write — prevents storing empty strings"
  - "Checkbox disabled (not hidden) when phone empty in WizardStep1 and AccountSettings — different from S02's conditional render approach for BookingCalendar"
patterns_established:
  - "Zod phone validation pattern: optional string with libphonenumber-js isValidPhoneNumber refine, empty string coerced to undefined/null"
  - "Phone + opt-in paired fields — always store together, opt-in forced false when phone is empty"
drill_down_paths:
  - .gsd/milestones/M005/slices/S01/tasks/T02-PLAN.md
duration: 20min
verification_result: pass
completed_at: 2026-03-16T22:30:00Z
---

# T02: Zod schemas extended and teacher phone collection UI in onboarding and settings

**Three Zod schemas extended with phone/opt-in fields; WizardStep1 and AccountSettings both render phone input with SMS opt-in checkbox; empty phone coerced to null; US-only validation via libphonenumber-js.**

## What Happened

Extended `Step1Schema` in `src/lib/schemas/onboarding.ts` with `phone_number` (optional, US validation via `isValidPhoneNumber` from libphonenumber-js, empty string passthrough) and `sms_opt_in` (boolean, default false). Extended `ProfileUpdateSchema` in `src/actions/profile.ts` with `phone_number` (nullable, optional, `z.preprocess` to convert empty string to null) and `sms_opt_in` (optional boolean). Extended `BookingRequestSchema` in `src/lib/schemas/booking.ts` with `parent_phone` (optional string) and `parent_sms_opt_in` (optional boolean, default false) — schema only, UI wired in S02.

Added phone input and SMS opt-in checkbox to `WizardStep1.tsx` below the photo upload section. Phone field uses `register('phone_number')` with placeholder, error display for invalid numbers, and `watch('phone_number')` to disable the opt-in checkbox when phone is empty. Checkbox label: "Text me session reminders and alerts".

Added phone input and SMS opt-in checkbox to `AccountSettings.tsx` with controlled state (`phoneNumber`, `smsOptIn`) initialized from `teacher.phone_number` and `teacher.sms_opt_in`. Phone and opt-in included in `updateProfile()` payload with `phone_number: phoneNumber || null` and `sms_opt_in: phoneNumber ? smsOptIn : false` — forcing opt-in to false when phone is cleared. Teacher interface extended with `phone_number: string | null` and `sms_opt_in: boolean`. Settings page select query updated to include `phone_number, sms_opt_in`.

## Deviations

None. Implementation matched the plan.

## Files Created/Modified

- `src/lib/schemas/onboarding.ts` — Step1Schema with phone_number + sms_opt_in fields
- `src/lib/schemas/booking.ts` — BookingRequestSchema with parent_phone + parent_sms_opt_in
- `src/actions/profile.ts` — ProfileUpdateSchema with phone_number (nullable) + sms_opt_in
- `src/components/onboarding/WizardStep1.tsx` — Phone input + opt-in checkbox below photo upload
- `src/components/dashboard/AccountSettings.tsx` — Phone input + opt-in checkbox with controlled state
