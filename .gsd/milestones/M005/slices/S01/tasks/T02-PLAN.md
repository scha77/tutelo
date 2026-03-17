---
estimated_steps: 5
estimated_files: 5
---

# T02: Zod schemas, WizardStep1 phone UI, and AccountSettings phone UI

**Slice:** S01 — SMS Infrastructure & Teacher Phone Collection
**Milestone:** M005

## Description

Extend Zod schemas to accept phone numbers and SMS opt-in, then add the phone collection UI to both the onboarding wizard (WizardStep1) and the dashboard account settings. This gives teachers two places to provide their phone number. The `saveWizardStep` action already spreads `...data` into the DB update, and `updateProfile` uses `ProfileUpdateSchema` — both will persist the new fields once the schemas accept them.

## Steps

1. Extend `Step1Schema` in `src/lib/schemas/onboarding.ts`:
   - Add `phone_number: z.string().optional().or(z.literal('')).transform(v => v || undefined).pipe(z.string().refine(v => { ... isValidPhoneNumber(v, 'US') }, 'Valid US phone number required').optional())` — use `libphonenumber-js/min` for client bundle size
   - Add `sms_opt_in: z.boolean().optional().default(false)`
   - Update `FullOnboardingSchema` (merge includes Step1Schema automatically)
2. Extend `ProfileUpdateSchema` in `src/actions/profile.ts`:
   - Add `phone_number: z.string().nullable().optional()` with same US validation refine
   - Add `sms_opt_in: z.boolean().optional()`
   - Add `.transform()` to convert empty string to null before DB write
3. Extend `BookingRequestSchema` in `src/lib/schemas/booking.ts`:
   - Add `parent_phone: z.string().optional()` and `parent_sms_opt_in: z.boolean().optional().default(false)` — schema only, no UI changes (S02 wires these)
4. Add phone input + opt-in checkbox to `WizardStep1.tsx`:
   - Below the photo upload section, add a phone number text input with `register('phone_number')` and placeholder "(555) 555-1234"
   - Below that, add a checkbox with label "Text me session reminders and alerts" using `register('sms_opt_in')`
   - Checkbox is visually disabled/muted when phone_number field is empty (use `watch('phone_number')`)
   - Error message display for invalid phone
5. Add phone input + opt-in checkbox to `AccountSettings.tsx`:
   - Add `phoneNumber` and `smsOptIn` state fields initialized from `teacher.phone_number` and `teacher.sms_opt_in`
   - Add controlled phone input and checkbox below years-of-experience field
   - Include `phone_number` and `sms_opt_in` in the `updateProfile()` call payload
   - Update `Teacher` interface to include `phone_number: string | null` and `sms_opt_in: boolean`

## Must-Haves

- [ ] `Step1Schema` accepts optional US phone number with `libphonenumber-js` validation
- [ ] `Step1Schema` accepts `sms_opt_in` boolean (default false)
- [ ] `ProfileUpdateSchema` accepts `phone_number` (nullable, optional) and `sms_opt_in` (optional)
- [ ] `BookingRequestSchema` accepts optional `parent_phone` + `parent_sms_opt_in`
- [ ] WizardStep1 renders phone input + opt-in checkbox
- [ ] AccountSettings renders phone input + opt-in checkbox with state management
- [ ] Empty string phone is transformed to null/undefined (not stored as "")
- [ ] Checkbox disabled when phone field is empty

## Verification

- `npm run build` — zero errors (schemas compile, components render)
- Review WizardStep1 and AccountSettings in browser to confirm fields render correctly
- Verify schema rejects "123" (too short), accepts "(512) 555-1234" (valid US), rejects "+44 7911 123456" (UK)

## Observability Impact

- Signals added/changed: None (schema validation errors surface through existing form error display)
- How a future agent inspects this: Check `teachers.phone_number` and `teachers.sms_opt_in` in Supabase after form submission
- Failure state exposed: Zod validation errors shown in form UI via existing error message pattern

## Inputs

- `src/lib/schemas/onboarding.ts` — Step1Schema to extend
- `src/lib/schemas/booking.ts` — BookingRequestSchema to extend
- `src/actions/profile.ts` — ProfileUpdateSchema to extend
- `src/components/onboarding/WizardStep1.tsx` — onboarding form to add phone fields
- `src/components/dashboard/AccountSettings.tsx` — settings form to add phone fields
- T01 output: `libphonenumber-js` installed, migration 0008 applied (columns exist)

## Expected Output

- `src/lib/schemas/onboarding.ts` — Step1Schema with phone_number + sms_opt_in fields
- `src/lib/schemas/booking.ts` — BookingRequestSchema with parent_phone + parent_sms_opt_in
- `src/actions/profile.ts` — ProfileUpdateSchema with phone_number + sms_opt_in
- `src/components/onboarding/WizardStep1.tsx` — phone input + opt-in checkbox below photo upload
- `src/components/dashboard/AccountSettings.tsx` — phone input + opt-in checkbox with controlled state
