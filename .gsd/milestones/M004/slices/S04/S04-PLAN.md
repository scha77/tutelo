# S04: Last-Minute Session Cancellation

**Goal:** A teacher can cancel a confirmed session from their dashboard, voiding the Stripe payment authorization and sending an immediate cancellation email to the parent.
**Demo:** Teacher clicks "Cancel Session" on a confirmed session card → confirms via dialog → booking status changes to `cancelled`, Stripe PI is voided, parent receives cancellation email, card disappears from the Upcoming list.

## Must-Haves

- `cancelSession` server action in `src/actions/bookings.ts` following the `markSessionComplete` pattern
- Stripe PaymentIntent cancelled (`paymentIntents.cancel`) before DB status update when `stripe_payment_intent` is set
- Cancellation email sent to parent only (skip teacher — they just triggered it)
- Teacher ownership guard (`.eq('teacher_id', teacher.id)`) and status guard (`.eq('status', 'confirmed')`)
- Confirmation dialog before executing the cancel (prevents accidental taps)
- "Cancel Session" button on `ConfirmedSessionCard` alongside "Mark Complete"
- `revalidatePath` on `/dashboard/sessions` and `/dashboard` layout after cancel
- `npm run build` passes with zero errors

## Proof Level

- This slice proves: integration
- Real runtime required: no (unit tests with mocked Stripe + Supabase + email)
- Human/UAT required: no (UAT deferred to milestone completion)

## Verification

- `npx vitest run src/__tests__/cancel-session.test.ts` — server action unit tests (auth guard, ownership guard, status guard, Stripe PI cancel, DB update, email dispatch, Stripe-error resilience)
- `npm run build` — zero errors

## Observability / Diagnostics

- Runtime signals: `console.error` on Stripe PI cancel failure (logged but non-blocking); `console.warn` on missing `stripe_payment_intent` (defensive skip)
- Inspection surfaces: booking `status` column in `bookings` table transitions to `cancelled`; `updated_at` timestamp marks when cancellation occurred
- Failure visibility: server action returns `{ error: string }` with specific messages (`'Not authenticated'`, `'Teacher not found'`, `'Booking not found or not in confirmed state'`, `'Failed to cancel payment — please try again'`); toast surfaces error to teacher
- Redaction constraints: no secrets logged; Stripe PI ID is safe to log

## Integration Closure

- Upstream surfaces consumed: `sendCancellationEmail` in `src/lib/email.ts`, `ConfirmedSessionCard` component, `markSessionComplete` pattern in `src/actions/bookings.ts`, sessions page RSC in `src/app/(dashboard)/dashboard/sessions/page.tsx`
- New wiring introduced in this slice: `cancelSession` server action → Stripe PI cancel → DB update → email dispatch → path revalidation; `ConfirmedSessionCard` gains `cancelSessionAction` prop and confirmation dialog; sessions page passes `cancelSession` to card
- What remains before the milestone is truly usable end-to-end: nothing — S01–S03 are complete; S04 completes M004

## Tasks

- [x] **T01: Implement cancelSession server action with Stripe void and tests** `est:45m`
  - Why: Core logic — auth, ownership guard, Stripe PI void, DB status update, parent-only email, path revalidation. Tests prove all paths.
  - Files: `src/actions/bookings.ts`, `src/__tests__/cancel-session.test.ts`
  - Do: Add `cancelSession(bookingId)` to `bookings.ts` following `markSessionComplete` pattern. Auth via `getClaims()`. Look up teacher row. Fetch booking with `.eq('teacher_id', teacher.id).eq('status', 'confirmed')`. If `stripe_payment_intent` set, call `stripe.paymentIntents.cancel(pi)` in try/catch (log error but still proceed to DB update). Update status to `cancelled`. Fire `sendCancellationEmail(bookingId)` — but only the parent email (extract parent-only send inline or call existing function and accept teacher gets email with stale copy — research recommends skipping teacher email). `revalidatePath('/dashboard/sessions')` and `revalidatePath('/dashboard', 'layout')`. Write comprehensive tests covering: auth failure, teacher not found, booking not found, booking not confirmed, successful cancel with Stripe PI, successful cancel without Stripe PI, Stripe error resilience (DB still updates), email fire-and-forget.
  - Verify: `npx vitest run src/__tests__/cancel-session.test.ts` — all tests pass
  - Done when: `cancelSession` exported, all 8+ test cases pass

- [x] **T02: Add Cancel Session button with confirmation dialog to ConfirmedSessionCard and wire into sessions page** `est:40m`
  - Why: Connects the server action to the UI. Teacher needs the button and a confirmation dialog to prevent accidental cancellation.
  - Files: `src/components/dashboard/ConfirmedSessionCard.tsx`, `src/app/(dashboard)/dashboard/sessions/page.tsx`
  - Do: Add `cancelSessionAction` prop to `ConfirmedSessionCard` with same signature as `markCompleteAction`. Add a "Cancel Session" button (red/destructive styling) alongside "Mark Complete". Wire `window.confirm('Cancel this session? The parent will be notified and the payment authorization will be released.')` before calling the action via `startTransition`. Show "Cancelling…" while pending, toast success "Session cancelled — parent notified" or toast error on failure. In sessions page, import `cancelSession` from `@/actions/bookings` and pass as `cancelSessionAction` prop. Verify `npm run build` passes.
  - Verify: `npm run build` succeeds with zero errors
  - Done when: "Cancel Session" button visible on confirmed session cards, confirmation dialog fires before action, build passes clean

## Files Likely Touched

- `src/actions/bookings.ts`
- `src/__tests__/cancel-session.test.ts`
- `src/components/dashboard/ConfirmedSessionCard.tsx`
- `src/app/(dashboard)/dashboard/sessions/page.tsx`
