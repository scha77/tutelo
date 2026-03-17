---
estimated_steps: 8
estimated_files: 2
---

# T01: Add phone + consent UI fields to BookingCalendar and wire both submission paths

**Slice:** S02 — Parent Phone Collection & Booking SMS
**Milestone:** M005

## Description

The booking form in `BookingCalendar.tsx` currently collects name, subject, email, and notes. This task adds an optional phone number input and an SMS consent checkbox below the Notes field. Both the deferred booking path (`submitAction`) and the direct booking path (`createPaymentIntent` fetch) must forward the new `parent_phone` and `parent_sms_opt_in` values in their payloads.

The consent checkbox must start unchecked (TCPA compliance) and only appear when the phone input has content. If the user checks consent but clears the phone field, `parent_sms_opt_in` must be forced to `false`.

## Steps

1. Install the shadcn/ui Checkbox component: `npx shadcn@latest add checkbox`. This creates `src/components/ui/checkbox.tsx`. If the CLI prompts, accept defaults.

2. In `src/components/profile/BookingCalendar.tsx`, add `phone: ''` and `smsOptIn: false` to the `form` state object initialization (around line 72):
   ```ts
   const [form, setForm] = useState({
     name: '',
     subject: subjects.length === 1 ? subjects[0] : (searchParams.get('subject') ?? ''),
     email: '',
     notes: '',
     phone: '',
     smsOptIn: false,
   })
   ```

3. Add `phone: ''` and `smsOptIn: false` to the `handleBookAnother` reset object (around line 155):
   ```ts
   setForm({
     name: '',
     subject: subjects.length === 1 ? subjects[0] : '',
     email: '',
     notes: '',
     phone: '',
     smsOptIn: false,
   })
   ```

4. Add imports at the top of the file:
   ```ts
   import { Checkbox } from '@/components/ui/checkbox'
   import { Phone } from 'lucide-react'
   ```

5. Add phone input + consent checkbox UI below the Notes `<div>` and above the submit `<Button>`, inside the `<form>` element (after the Notes textarea div, around line 594). The phone field is always visible (optional). The consent checkbox only appears when phone is non-empty:
   ```tsx
   {/* Phone — optional */}
   <div className="space-y-1.5">
     <Label htmlFor="phone">
       US phone number{' '}
       <span className="font-normal text-muted-foreground">(optional)</span>
     </Label>
     <div className="relative">
       <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
       <Input
         id="phone"
         type="tel"
         value={form.phone}
         onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
         placeholder="(555) 555-1234"
         className="pl-10"
       />
     </div>
   </div>

   {/* SMS consent — only shown when phone has content */}
   {form.phone.trim().length > 0 && (
     <div className="flex items-start space-x-2">
       <Checkbox
         id="sms-consent"
         checked={form.smsOptIn}
         onCheckedChange={(checked) =>
           setForm((f) => ({ ...f, smsOptIn: checked === true }))
         }
       />
       <label
         htmlFor="sms-consent"
         className="text-sm leading-tight cursor-pointer text-muted-foreground"
       >
         Send me text message reminders about this session. Msg & data rates may apply. Reply STOP to opt out.
       </label>
     </div>
   )}
   ```

6. In `handleSubmit` (deferred path), add phone fields to the `submitAction` call object (around line 211):
   ```ts
   const result = await submitAction({
     teacherId,
     studentName: form.name,
     subject: form.subject,
     email: form.email,
     notes: form.notes || undefined,
     bookingDate: format(selectedDate!, 'yyyy-MM-dd'),
     startTime: selectedSlot!.startRaw,
     endTime: selectedSlot!.endRaw,
     parent_phone: form.phone.trim() || undefined,
     parent_sms_opt_in: form.phone.trim() ? form.smsOptIn : false,
   })
   ```

7. In `createPaymentIntent`, add phone fields to the fetch body (around line 174):
   ```ts
   body: JSON.stringify({
     teacherId,
     bookingDate: format(selectedDate!, 'yyyy-MM-dd'),
     startTime: selectedSlot!.startRaw,
     endTime: selectedSlot!.endRaw,
     studentName: form.name,
     subject: form.subject,
     notes: form.notes || undefined,
     parentPhone: form.phone.trim() || undefined,
     parentSmsOptIn: form.phone.trim() ? form.smsOptIn : false,
   }),
   ```

8. Run `npm run build` to verify no TypeScript or build errors.

## Must-Haves

- [ ] `form` state includes `phone` and `smsOptIn` fields
- [ ] `handleBookAnother` resets `phone` to `''` and `smsOptIn` to `false`
- [ ] Phone input rendered below Notes, labeled "US phone number (optional)"
- [ ] Consent checkbox unchecked by default, only visible when phone is non-empty
- [ ] Consent text includes "Msg & data rates may apply. Reply STOP to opt out."
- [ ] `submitAction` call includes `parent_phone` and `parent_sms_opt_in` (deferred path)
- [ ] `createPaymentIntent` fetch body includes `parentPhone` and `parentSmsOptIn` (direct path)
- [ ] `parent_sms_opt_in` forced to `false` when phone is empty in both paths
- [ ] `npm run build` passes

## Verification

- `npm run build` passes with zero errors
- Checkbox component file exists at `src/components/ui/checkbox.tsx`
- BookingCalendar.tsx contains phone input, checkbox, and both submission paths forward phone data

## Inputs

- `src/components/profile/BookingCalendar.tsx` — existing booking form with name/subject/email/notes fields
- `src/lib/schemas/booking.ts` — `BookingRequestSchema` already accepts `parent_phone` (string, optional) and `parent_sms_opt_in` (boolean, optional, default false)

## Expected Output

- `src/components/ui/checkbox.tsx` — new shadcn Checkbox component
- `src/components/profile/BookingCalendar.tsx` — modified with phone input, consent checkbox, and both submission paths forwarding phone/consent values
