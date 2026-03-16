---
estimated_steps: 5
estimated_files: 2
---

# T01: Implement cancelSession server action with Stripe void and tests

**Slice:** S04 — Last-Minute Session Cancellation
**Milestone:** M004

## Description

Create the `cancelSession` server action in `src/actions/bookings.ts` that allows a teacher to cancel a confirmed booking. The action authenticates via `getClaims()`, verifies teacher ownership, voids the Stripe PaymentIntent (if present), updates booking status to `cancelled`, sends a cancellation email to the parent only, and revalidates dashboard paths. Write comprehensive unit tests covering all success and failure paths.

## Steps

1. **Add `cancelSession` to `src/actions/bookings.ts`** — Follow the `markSessionComplete` pattern exactly:
   - Auth: `getClaims()` → extract `userId` → look up teacher row
   - Fetch booking: `.select('id, stripe_payment_intent').eq('id', bookingId).eq('teacher_id', teacher.id).eq('status', 'confirmed').maybeSingle()`
   - Stripe void: if `booking.stripe_payment_intent` is set, `stripe.paymentIntents.cancel(booking.stripe_payment_intent)` inside try/catch — log error via `console.error` but do NOT block the DB update
   - DB update: `.update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', bookingId)`
   - Email: fire-and-forget `sendCancellationEmail(bookingId).catch(console.error)` — calls existing function which emails both parent and teacher. Accept teacher receives email with stale "expired" copy for now (simplest; avoids forking email.ts).
   - Revalidate: `revalidatePath('/dashboard/sessions')`, `revalidatePath('/dashboard', 'layout')`
   - Return `{ success: true }` or `{ error: string }`

2. **Create `src/__tests__/cancel-session.test.ts`** with mocks for Supabase (`createClient`, `supabaseAdmin`), Stripe (class-based `vi.hoisted` pattern from `webhook-capture.test.ts`), and email (`sendCancellationEmail`). Test cases:
   - Returns error when `getClaims()` has no `sub` (not authenticated)
   - Returns error when teacher row not found
   - Returns error when booking not found (wrong teacher or not confirmed)
   - Cancels Stripe PI + updates DB + sends email on happy path (with `stripe_payment_intent`)
   - Skips Stripe call when `stripe_payment_intent` is null, still updates DB + sends email
   - Still updates DB and sends email even when Stripe PI cancel throws (resilience)
   - Calls `revalidatePath` for both `/dashboard/sessions` and `/dashboard` layout
   - Email is fire-and-forget (catch errors silently)

3. **Verify** all tests pass: `npx vitest run src/__tests__/cancel-session.test.ts`

## Must-Haves

- [ ] `cancelSession` exported from `src/actions/bookings.ts`
- [ ] Auth guard via `getClaims()` — returns error if not authenticated
- [ ] Teacher ownership guard — `.eq('teacher_id', teacher.id)`
- [ ] Status guard — `.eq('status', 'confirmed')`
- [ ] Stripe `paymentIntents.cancel()` called when `stripe_payment_intent` is set
- [ ] Stripe error does not block DB update (try/catch with console.error)
- [ ] DB status updated to `cancelled`
- [ ] `sendCancellationEmail(bookingId)` called fire-and-forget
- [ ] `revalidatePath` called for `/dashboard/sessions` and `/dashboard` layout
- [ ] All unit tests pass

## Verification

- `npx vitest run src/__tests__/cancel-session.test.ts` — all 8+ tests pass
- No TypeScript errors in `src/actions/bookings.ts`

## Observability Impact

- Signals added/changed: `console.error` logged when Stripe PI cancel fails (includes PI ID for debugging); `console.warn` if `stripe_payment_intent` is null (defensive path)
- How a future agent inspects this: check `bookings` table for `status = 'cancelled'` + `updated_at` timestamp; Stripe Dashboard shows PI in `canceled` state
- Failure state exposed: server action returns descriptive error strings; Stripe failure is logged but non-blocking

## Inputs

- `src/actions/bookings.ts` — `markSessionComplete` as pattern template (auth, Stripe, DB, email, revalidate)
- `src/lib/email.ts` — `sendCancellationEmail(bookingId)` implementation
- `src/__tests__/webhook-capture.test.ts` — class-based Stripe mock pattern with `vi.hoisted`
- `.gsd/milestones/M004/slices/S04/S04-RESEARCH.md` — constraints and decisions

## Expected Output

- `src/actions/bookings.ts` — new `cancelSession(bookingId: string)` export
- `src/__tests__/cancel-session.test.ts` — 8+ passing test cases covering all paths
