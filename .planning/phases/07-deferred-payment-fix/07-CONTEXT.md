# Phase 7: Deferred Payment Critical Bug Fix - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the deferred booking flow so that bookings accepted by the teacher (status → `pending`) before connecting Stripe also receive Checkout sessions when `account.updated` fires. No booking can become permanently stuck at `pending` with no Checkout session.

</domain>

<decisions>
## Implementation Decisions

### Primary fix — createCheckoutSessionsForTeacher
- Change `.eq('status', 'requested')` to `.in('status', ['requested', 'pending'])` so both pre- and post-accept bookings receive Checkout sessions when the teacher connects Stripe

### Completion handler fix — checkout.session.completed
- Also extend the idempotency guard in `checkout.session.completed` to `.in('status', ['requested', 'pending'])` so a `pending` booking whose parent completes payment correctly transitions to `confirmed`
- This is in scope for Phase 7 — without it, a `pending` booking that gets a Checkout session will remain stuck at `pending` even after the parent pays
- Idempotency is safe: once `confirmed`, the status no longer matches `requested` or `pending`, so Stripe webhook re-delivery is a no-op. No additional guard needed.

### Leave payment_intent.amount_capturable_updated alone
- That handler is for the direct booking flow (Phase 4) — bookings in that path never pass through `pending` before payment, so the bug scenario doesn't apply. Do not modify it.

### Confirmation email
- Same `sendBookingConfirmationEmail` call for both `requested` and `pending` bookings — no copy differentiation. The parent and teacher both see the same "Your booking is confirmed" email regardless of prior status.

### Claude's Discretion
- Whether to add a test or update an existing `it.todo()` stub in `checkout-session.test.ts` for the bug scenario

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/api/stripe/webhook/route.ts`: `createCheckoutSessionsForTeacher` (line 27) — the primary fix target
- `src/app/api/stripe/webhook/route.ts`: `checkout.session.completed` handler (line 144) — secondary fix target
- `tests/stripe/checkout-session.test.ts` — all `it.todo()` stubs, mock infrastructure already set up

### Established Patterns
- `.in('status', [...])` Supabase query pattern — same pattern used elsewhere in the codebase
- `supabaseAdmin` for all webhook handlers — service role, no user session context
- Idempotency via status guard: `.eq('status', 'requested')` is the existing pattern; Phase 7 extends it to `.in('status', ['requested', 'pending'])`
- `req.text()` for raw body (Stripe signature verification) — do not change

### Integration Points
- `account.updated` webhook handler calls `createCheckoutSessionsForTeacher` — only the query inside the function changes
- `checkout.session.completed` handler — only the `.eq('status', 'requested')` guard changes; all other logic unchanged

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-deferred-payment-fix*
*Context gathered: 2026-03-11*
