---
estimated_steps: 8
estimated_files: 3
skills_used: []
---

# T03: Visual polish pass — RecurringOptions, PaymentStep, and step header refinements

Apply premium visual treatment to the remaining booking flow surfaces: RecurringOptions projected dates, PaymentStep trust signal, and step headers in auth/payment panels. This completes the visual cohesion between the booking flow and the S01 profile page.

Steps:
1. In `RecurringOptions.tsx`: upgrade projected dates list from `rounded-lg border divide-y` to `rounded-xl border divide-y shadow-sm`. Add `Repeat` icon paired with 'Schedule type' label (matching S01 icon-paired meta pattern). Refine frequency toggle button corners to `rounded-xl` for consistency.
2. In `PaymentStep.tsx`: add a trust signal above the Stripe PaymentElement — a `Shield` or `Lock` icon from lucide-react with 'Secure payment' text in muted styling. Add a subtle heading 'Complete your booking' with font-semibold. Keep the form layout clean (p-6 space-y-4 max-w-md mx-auto).
3. In `BookingCalendar.tsx` orchestrator: update the step headers for auth and payment steps to show session type as an accent chip (same pattern as BookingForm header from T01) — use inline style with color-mix for the chip background. Ensure all step headers are visually consistent.
4. Run `npx vitest run --reporter=dot` — 474 tests must pass.
5. Run `npx tsc --noEmit` — must exit 0.
6. Run `npx next build` — must exit 0 (final build verification for the slice).

## Inputs

- ``src/components/profile/RecurringOptions.tsx` — existing 250-line component needing visual polish`
- ``src/components/profile/PaymentStep.tsx` — existing 80-line component needing trust signal`
- ``src/components/profile/BookingCalendar.tsx` — orchestrator from T02 with auth/payment step headers to polish`

## Expected Output

- ``src/components/profile/RecurringOptions.tsx` — upgraded with rounded-xl projected dates, Repeat icon, refined toggle corners`
- ``src/components/profile/PaymentStep.tsx` — upgraded with Shield/Lock trust signal and 'Complete your booking' heading`
- ``src/components/profile/BookingCalendar.tsx` — step headers updated with accent chip for session type display`

## Verification

npx vitest run --reporter=dot && npx tsc --noEmit && npx next build
