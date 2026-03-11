# Phase 7: Deferred Payment Critical Bug Fix — Research

**Researched:** 2026-03-11
**Domain:** Stripe webhook status-filter logic + Supabase query patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Primary fix — createCheckoutSessionsForTeacher**
- Change `.eq('status', 'requested')` to `.in('status', ['requested', 'pending'])` so both pre- and post-accept bookings receive Checkout sessions when the teacher connects Stripe

**Completion handler fix — checkout.session.completed**
- Also extend the idempotency guard in `checkout.session.completed` to `.in('status', ['requested', 'pending'])` so a `pending` booking whose parent completes payment correctly transitions to `confirmed`
- This is in scope for Phase 7 — without it, a `pending` booking that gets a Checkout session will remain stuck at `pending` even after the parent pays
- Idempotency is safe: once `confirmed`, the status no longer matches `requested` or `pending`, so Stripe webhook re-delivery is a no-op. No additional guard needed.

**Leave payment_intent.amount_capturable_updated alone**
- That handler is for the direct booking flow (Phase 4) — bookings in that path never pass through `pending` before payment, so the bug scenario doesn't apply. Do not modify it.

**Confirmation email**
- Same `sendBookingConfirmationEmail` call for both `requested` and `pending` bookings — no copy differentiation. The parent and teacher both see the same "Your booking is confirmed" email regardless of prior status.

### Claude's Discretion

- Whether to add a test or update an existing `it.todo()` stub in `checkout-session.test.ts` for the bug scenario

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOOK-02 | Parent sees a pending confirmation screen after request submission | Fix ensures parent receives Checkout session email even when teacher has accepted (status=pending) before connecting Stripe — parent can then pay and see /booking-confirmed |
| STRIPE-04 | Unconfirmed booking requests auto-cancel after 48 hours if teacher has not connected Stripe | Indirectly supported: fixing the status filter ensures all bookings that should proceed to payment can do so; the 48hr auto-cancel cron is not being modified |
| NOTIF-03 | Both teacher and parent receive booking confirmation emails | `sendBookingConfirmationEmail` is called in the corrected `checkout.session.completed` handler; both parties receive confirmation for `pending` bookings once parent pays |
</phase_requirements>

---

## Summary

Phase 7 closes a single critical integration bug discovered in the v1.0 audit. The bug sits in two adjacent places in `src/app/api/stripe/webhook/route.ts`: `createCheckoutSessionsForTeacher` only queries bookings in `requested` status, but `acceptBooking` transitions the status to `pending` before the teacher connects Stripe. When the teacher subsequently connects Stripe and `account.updated` fires, the webhook finds zero rows and creates no Checkout sessions. The booking is stuck at `pending` forever.

The second break point is the `checkout.session.completed` handler's idempotency guard: it uses `.eq('status', 'requested')`. If a `pending` booking does receive a Checkout session (after the fix above), the parent completing payment would fail silently — the update would match zero rows and no confirmation email would be sent.

Both fixes are one-line query changes from `.eq('status', 'requested')` to `.in('status', ['requested', 'pending'])`. No schema changes, no new APIs, no new dependencies. The `payment_intent.amount_capturable_updated` handler is explicitly out of scope — it serves the direct booking path where the booking never enters `pending` before payment. `sendBookingConfirmationEmail` requires no change: it fetches by `bookingId` without a status filter, so it works identically regardless of the booking's prior status.

**Primary recommendation:** Make exactly two `.eq` → `.in` changes in `route.ts`, convert or add `it.todo()` stubs in `checkout-session.test.ts` to cover the bug scenario, and verify no other query in the codebase assumes only `requested` bookings are eligible for Checkout sessions.

---

## Standard Stack

### Core (unchanged from prior phases — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Stripe (Node SDK) | existing | Webhook event parsing, Checkout session creation | Already integrated |
| Supabase JS v2 | existing | `.in()` query filter | `.in()` is native Supabase JS v2 syntax |
| Vitest | existing | Unit test framework | Project standard |

### No new dependencies needed

This is a surgical bug fix. All libraries and infrastructure are already in place.

---

## Architecture Patterns

### Existing Pattern: Supabase `.in()` filter

The `.in('status', ['requested', 'pending'])` pattern is already used elsewhere in the codebase. It is the standard Supabase JS v2 way to match a column against a list of values. Equivalent to SQL `WHERE status IN ('requested', 'pending')`.

```typescript
// Supabase JS v2 — .in() filter pattern (already used in codebase)
const { data } = await supabaseAdmin
  .from('bookings')
  .select('...')
  .eq('teacher_id', teacherId)
  .in('status', ['requested', 'pending'])   // replaces .eq('status', 'requested')
  .is('stripe_payment_intent', null)
```

### Existing Pattern: Idempotency via status guard

The status check is the idempotency gate in both handlers. Once a booking reaches `confirmed`, its status no longer matches `['requested', 'pending']`, so Stripe webhook re-delivery is a no-op. This is the existing pattern for all other handlers — no additional guard is needed.

```typescript
// checkout.session.completed — corrected idempotency guard
const { error } = await supabaseAdmin
  .from('bookings')
  .update({ status: 'confirmed', ... })
  .eq('id', bookingId)
  .in('status', ['requested', 'pending'])   // replaces .eq('status', 'requested')
```

### Existing Pattern: supabaseAdmin in webhook handlers

All webhook handlers use `supabaseAdmin` (service role) — not the user-session client. This is unchanged.

### Existing Pattern: req.text() for raw body

Do not change. Required for Stripe signature verification. Already correct in the existing handler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-value SQL IN filter | Custom query concatenation | `.in('status', [...])` | Native Supabase JS v2 method, handles escaping, type-safe |
| Idempotency for webhook re-delivery | Custom deduplication table or flag | Status guard (`.in()` filter) | Status field is already the source of truth; confirmed bookings are inert |

---

## Common Pitfalls

### Pitfall 1: Modifying the wrong handler

**What goes wrong:** Editing `payment_intent.amount_capturable_updated` (line 155) instead of leaving it alone. That handler serves the direct booking flow exclusively — bookings in that path start at `requested` and are confirmed immediately via payment intent, never passing through `pending` via `acceptBooking`.

**How to avoid:** Only modify (a) the `.eq` inside `createCheckoutSessionsForTeacher` and (b) the `.eq` inside the `checkout.session.completed` case. Leave the `payment_intent.amount_capturable_updated` case unchanged.

**Warning sign:** If `acceptBooking` is mentioned in the diff, the scope has drifted.

### Pitfall 2: Forgetting the second fix (checkout.session.completed)

**What goes wrong:** Fixing `createCheckoutSessionsForTeacher` but leaving `checkout.session.completed` with `.eq('status', 'requested')`. Result: `pending` bookings receive Checkout sessions, parent pays, webhook fires — but the update matches zero rows. Booking stays `pending`, no confirmation email sent.

**How to avoid:** Both `.eq` calls must be changed in the same plan. They are two points of the same broken circuit.

**Warning sign:** After the fix to `createCheckoutSessionsForTeacher` only, the deferred-accept flow still fails silently at the payment step.

### Pitfall 3: `.select('id')` omission on update

**What goes wrong:** Supabase JS v2 `.update()` returns `count: null` unless you chain `.select('id')`. Some update paths in this file already use `.select('id')` to detect whether rows were affected; others do not. The `checkout.session.completed` fix does not need to check whether rows were affected — it just needs to call `sendBookingConfirmationEmail` if no DB error occurred. Keep the existing `if (error)` pattern; do not add unnecessary `.select('id')`.

**Reference from STATE.md:** "Chain .select('id') on Supabase JS v2 .update() calls to get affected rows — count is always null without explicit count preference header."

### Pitfall 4: Stripe signature verification broken by JSON parsing

**What goes wrong:** Changing `req.text()` to `req.json()` anywhere in the webhook handler destroys the raw bytes needed for HMAC verification.

**How to avoid:** The fix touches only query filter strings. Do not change the body-reading logic. Already correct.

### Pitfall 5: Test mock mismatch

**What goes wrong:** Writing a new Vitest test without updating the Supabase mock chain to return both `requested` and `pending` bookings. The existing mock in `checkout-session.test.ts` uses `{ from: vi.fn() }` — each test that exercises the query must set up the mock return value to match the new `.in()` call.

**How to avoid:** In tests for `createCheckoutSessionsForTeacher`, mock the Supabase chain to return a booking with `status: 'pending'` and assert a Checkout session was created for it.

---

## Code Examples

### Fix 1: createCheckoutSessionsForTeacher — query change

```typescript
// BEFORE (src/app/api/stripe/webhook/route.ts line 27)
.eq('status', 'requested')

// AFTER
.in('status', ['requested', 'pending'])
```

Full context (lines 23-28):
```typescript
const { data: bookings } = await supabaseAdmin
  .from('bookings')
  .select('id, parent_email, student_name, subject, booking_date, stripe_payment_intent, teachers(hourly_rate)')
  .eq('teacher_id', teacherId)
  .in('status', ['requested', 'pending'])   // was: .eq('status', 'requested')
  .is('stripe_payment_intent', null)
```

### Fix 2: checkout.session.completed — idempotency guard change

```typescript
// BEFORE (src/app/api/stripe/webhook/route.ts line 144)
.eq('status', 'requested')

// AFTER
.in('status', ['requested', 'pending'])
```

Full context (lines 134-144):
```typescript
const { error } = await supabaseAdmin
  .from('bookings')
  .update({
    status: 'confirmed',
    stripe_payment_intent: typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null,
    updated_at: new Date().toISOString(),
  })
  .eq('id', bookingId)
  .in('status', ['requested', 'pending'])   // was: .eq('status', 'requested')
```

### Test: New behavior in checkout-session.test.ts (Claude's discretion)

The existing stubs are all `it.todo()`. Phase 7 should convert or add at least one implemented test covering the bug scenario:

```typescript
// Suggested new test (or converted from it.todo()) in checkout-session.test.ts
it('creates a Checkout session for a pending booking (teacher accepted before connecting Stripe)', async () => {
  // Setup: booking with status='pending', stripe_payment_intent=null
  // Assert: mockCheckoutSessionsCreate called once for that booking
})

it('updates booking status from pending to confirmed on checkout.session.completed', async () => {
  // Setup: booking with status='pending'
  // Assert: supabase update called with status: 'confirmed'
})
```

The mock infrastructure is already in place: `mockCheckoutSessionsCreate`, `mockWebhooksConstructEvent`, `supabaseAdmin`, and email mocks are all set up at the top of `checkout-session.test.ts`. No new mock setup needed for the new test cases.

---

## Bug Anatomy (for planning clarity)

| Step | Current behavior | Fixed behavior |
|------|-----------------|----------------|
| Parent submits request | booking: `requested` | unchanged |
| Teacher accepts (before Stripe) | booking: `pending` | unchanged |
| Teacher connects Stripe → `account.updated` fires | `createCheckoutSessionsForTeacher` queries `.eq('status', 'requested')` → 0 rows → no Checkout session | queries `.in('status', ['requested', 'pending'])` → 1 row → Checkout session created, parent emailed |
| Parent pays Checkout session | `checkout.session.completed` handler: `.eq('status', 'requested')` → 0 rows → no update, no confirmation email | `.in('status', ['requested', 'pending'])` → 1 row → booking set to `confirmed`, both parties emailed |

---

## Files to Modify

| File | Lines affected | Change |
|------|---------------|--------|
| `src/app/api/stripe/webhook/route.ts` | Line 27 | `.eq('status', 'requested')` → `.in('status', ['requested', 'pending'])` |
| `src/app/api/stripe/webhook/route.ts` | Line 144 | `.eq('status', 'requested')` → `.in('status', ['requested', 'pending'])` |
| `tests/stripe/checkout-session.test.ts` | Existing `it.todo()` stubs | Convert 1-2 stubs to implemented tests covering the `pending` booking scenario (Claude's discretion) |

No other files need modification. The `sendBookingConfirmationEmail` function fetches by `bookingId` without a status filter and is correct as-is.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `npx vitest run tests/stripe/checkout-session.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOK-02 | Parent receives Checkout session email even when booking is `pending` | unit | `npx vitest run tests/stripe/checkout-session.test.ts` | Yes (stubs exist) |
| STRIPE-04 | 48hr auto-cancel unaffected by fix | unit | `npx vitest run tests/stripe/auto-cancel.test.ts` | Yes |
| NOTIF-03 | Both parties receive confirmation email for `pending` bookings | unit | `npx vitest run tests/stripe/email-confirmation.test.ts` | Yes |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/stripe/checkout-session.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. `checkout-session.test.ts` already has the mock setup. Phase 7 only needs implemented test bodies added to existing `it.todo()` stubs.

---

## Sources

### Primary (HIGH confidence)

- Direct source inspection: `src/app/api/stripe/webhook/route.ts` — full handler read, both bug sites confirmed at lines 27 and 144
- Direct source inspection: `tests/stripe/checkout-session.test.ts` — mock infrastructure confirmed present
- Direct source inspection: `src/lib/email.ts` lines 119-168 — `sendBookingConfirmationEmail` confirmed to query by `bookingId` with no status filter
- `.planning/v1.0-MILESTONE-AUDIT.md` — audit evidence confirming root cause, fix recommendation, and affected requirements
- `.planning/phases/07-deferred-payment-fix/07-CONTEXT.md` — locked implementation decisions

### Secondary (MEDIUM confidence)

- Supabase JS v2 `.in()` syntax confirmed via project STATE.md decision log: "`.in('status', [...])`  Supabase query pattern — same pattern used elsewhere in the codebase"

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; fix is pure query filter change in existing code
- Architecture: HIGH — both fix sites verified by direct source read; pattern is identical to existing `.in()` usage in codebase
- Pitfalls: HIGH — bug anatomy confirmed from audit; all pitfall scenarios derived from direct code inspection

**Research date:** 2026-03-11
**Valid until:** Indefinite — this is a targeted surgical fix with no moving ecosystem dependencies
