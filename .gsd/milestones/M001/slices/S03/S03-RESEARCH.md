# Phase 3: Stripe Connect + Deferred Payment - Research

**Researched:** 2026-03-06
**Domain:** Stripe Connect Express, Checkout Sessions, PaymentIntents with manual capture, Vercel Cron Jobs, webhook handling
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Parent payment authorization**: Use Stripe Checkout (Stripe-hosted), not Stripe Elements
- **Trigger**: When `account.updated` webhook confirms `charges_enabled: true`, email all parents with `requested` bookings a Stripe Checkout link — no additional teacher action
- **Parent non-payment**: Booking stays in `pending` state indefinitely at MVP — no auto-cancel for parent non-payment
- **Checkout success redirect**: `/booking-confirmed?session=...` — shows date/time, teacher name, "24hr reminder" copy
- **Connect Stripe page (`/dashboard/connect-stripe`)**: Minimal UI — brief value prop + single "Connect with Stripe" button; no pending count or earnings preview
- **Return URL after onboarding**: `/dashboard?stripe=connected` — one-time success banner: "Payments activated! Your pending requests are being confirmed."
- **Guard**: If `stripe_charges_enabled = true` when teacher visits `/dashboard/connect-stripe`, redirect to `/dashboard` immediately
- **24hr email**: warm/gentle reminder — "Just a reminder — [parent] is still waiting. Connect Stripe to lock in this session."
- **48hr email**: explicit urgency + auto-cancel mention — "This booking will be cancelled if you don't connect before [time]. Don't lose this parent."
- **Dashboard warning banner**: disappears automatically on next page load once `stripe_charges_enabled = true` — no separate banner state needed
- **Mark Complete**: Lives on existing `/dashboard/requests` page — add "Confirmed" section below pending section; "Mark Complete" button per card
- **Mark Complete UX**: One click, no confirmation dialog — consistent with Phase 2 accept/decline pattern
- **After marking complete**: Session card disappears immediately from list; Phase 5 shows completed history

### Claude's Discretion
- Exact layout and styling of `/dashboard/connect-stripe` page
- `/booking-confirmed` page design (what details to show, what copy to use)
- Stripe Checkout session configuration details (description, metadata, etc.)
- Cron implementation for 48hr auto-cancel (Vercel Cron vs Supabase pg_cron)
- Cron implementation for 24hr/48hr follow-up emails
- Email template design for 24hr and 48hr follow-ups
- Booking confirmation email template (NOTIF-03) for parent and teacher
- Cancellation notification email template (NOTIF-05)
- Session-complete email template for parent (NOTIF-06)
- Loading states during Mark Complete action

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STRIPE-03 | Teacher completes Stripe Connect Express onboarding via "money waiting" link | `stripe.accounts.create()`, `stripe.accountLinks.create()`, `account.updated` webhook |
| STRIPE-04 | Unconfirmed bookings auto-cancel after 48hr if teacher hasn't connected Stripe | Vercel Cron (Pro required), idempotent update via `supabaseAdmin`, NOTIF-05 email |
| STRIPE-05 | Payment authorized (not captured) at booking time using `capture_method: manual` | Stripe Checkout `payment_intent_data.capture_method: 'manual'`, `checkout.session.completed` webhook |
| STRIPE-06 | Teacher marking session complete triggers automatic payment capture | `stripe.paymentIntents.capture()`, Mark Complete Server Action |
| STRIPE-07 | Platform applies 7% application fee on every captured payment | `application_fee_amount` in `capture()` call (NOT at Checkout creation — see Platform Fee section) |
| NOTIF-02 | Teacher receives 24hr and 48hr follow-up emails if Stripe not connected | Vercel Cron scanning `requested` bookings > 24hr and > 48hr old, `supabaseAdmin` query |
| NOTIF-03 | Both teacher and parent receive booking confirmation emails | New `sendBookingConfirmationEmail()` in `src/lib/email.ts`, triggered from `checkout.session.completed` webhook handler |
| NOTIF-05 | Both teacher and parent receive cancellation notifications | New `sendCancellationEmail()` in `src/lib/email.ts`, triggered from cron auto-cancel |
| NOTIF-06 | Parent receives session-complete email with review prompt | New `sendSessionCompleteEmail()` in `src/lib/email.ts`, triggered from Mark Complete Server Action |
</phase_requirements>

---

## Summary

Phase 3 implements the revenue path: teacher connects Stripe Express in response to a "money waiting" notification, platform creates Stripe Checkout sessions for all waiting parents (authorizing but not capturing payment), and teacher marking a session complete triggers payment capture with the 7% application fee. Two separate Stripe webhook endpoints handle platform events (`account.updated`) and connected-account events.

Three cron jobs handle the deferred states: 48hr auto-cancel for teachers who never connect, and 24hr/48hr follow-up reminder emails. **Critical constraint: Vercel Hobby plan only allows daily cron jobs — Pro plan ($20/mo) is required to run cron jobs more frequently than once per day.** Since the project already notes Supabase Pro ($25/mo) is needed before launch, this Vercel constraint must be factored into the deployment plan.

The charge architecture uses **destination charges**: the platform processes the Stripe Checkout payment and transfers funds to the teacher's connected account, with `application_fee_amount` applied at the time of capture (not at Checkout session creation). This is the correct model for a marketplace collecting a percentage fee.

**Primary recommendation:** Use Stripe destination charges with `capture_method: manual` in Checkout Sessions; apply `application_fee_amount` at capture time in the Mark Complete Server Action; use Vercel Cron (requires Pro plan) for all scheduled jobs.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` (npm) | 20.4.0 | Stripe Node.js SDK — accounts, checkout, paymentIntents, webhooks | Official Stripe SDK with full TypeScript types |
| Stripe Checkout | Stripe-hosted | Payment authorization UI for parents | Locked decision; fastest to build, battle-tested, no custom card UI |
| Vercel Cron Jobs | built-in | 24hr/48hr follow-up emails + 48hr auto-cancel | Already on Vercel; native to the hosting platform |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `supabaseAdmin` | existing (`src/lib/supabase/service.ts`) | Bypass RLS in webhook handlers and cron routes | Any server-side handler without a user session context |
| Resend + react-email | existing | Email delivery for NOTIF-02, NOTIF-03, NOTIF-05, NOTIF-06 | All transactional emails in this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel Cron | Supabase pg_cron | pg_cron runs inside Postgres — no HTTP round-trip, no Vercel plan requirement; but requires SQL function and is harder to test locally; for MVP Vercel Cron is simpler to debug |
| Destination charges | Direct charges | Direct charges run on the connected account's Stripe account — simpler for the teacher but the platform loses control of dispute management; destination charges keep platform in control |

**Installation (Stripe SDK not yet installed):**
```bash
npm install stripe
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── stripe/
│   │   │   └── webhook/
│   │   │       └── route.ts          # Platform events: account.updated
│   │   ├── stripe-connect/
│   │   │   └── webhook/
│   │   │       └── route.ts          # Connected-account events (future)
│   │   └── cron/
│   │       ├── auto-cancel/
│   │       │   └── route.ts          # GET — 48hr auto-cancel job
│   │       └── stripe-reminders/
│   │           └── route.ts          # GET — 24hr + 48hr follow-up emails
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── connect-stripe/
│   │       │   └── page.tsx          # New: connect-stripe page
│   │       └── requests/
│   │           └── page.tsx          # MODIFIED: add Confirmed section
│   └── booking-confirmed/
│       └── page.tsx                  # New: Checkout success landing page
├── actions/
│   └── bookings.ts                   # MODIFIED: add markSessionComplete()
├── emails/
│   ├── FollowUpEmail.tsx             # New: 24hr gentle reminder
│   ├── UrgentFollowUpEmail.tsx       # New: 48hr urgent email
│   ├── BookingConfirmationEmail.tsx  # New: NOTIF-03 (parent + teacher)
│   ├── CancellationEmail.tsx         # New: NOTIF-05
│   └── SessionCompleteEmail.tsx      # New: NOTIF-06
└── lib/
    └── email.ts                      # MODIFIED: add new email functions
```

### Pattern 1: Stripe Express Connect — Account Link Generation

**What:** Teacher visits `/dashboard/connect-stripe`; a Server Action generates a one-time account link URL and redirects teacher to Stripe-hosted onboarding.

**When to use:** When teacher clicks "Connect with Stripe" button.

**Important:** Account link URLs are single-use. Do not generate them in advance — generate on button click/form submit.

```typescript
// Source: https://docs.stripe.com/connect/express-accounts (official Stripe docs)
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Step 1: Create (or retrieve existing) Express account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
})
// Save account.id → teachers.stripe_account_id

// Step 2: Generate a one-time account link
const accountLink = await stripe.accountLinks.create({
  account: account.id,  // or existing stripe_account_id from DB
  type: 'account_onboarding',
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?stripe=connected`,
  refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect-stripe`,
})

// Step 3: Redirect teacher to Stripe
redirect(accountLink.url)
```

**Refresh URL handling:** If the teacher's session expires during onboarding, Stripe redirects to `refresh_url`. The `/dashboard/connect-stripe` page handles this gracefully — it just re-renders the connect button.

### Pattern 2: Platform Webhook — `account.updated` Handler

**What:** Fires when teacher completes Stripe onboarding. When `charges_enabled: true`, update DB and create Checkout sessions for all waiting bookings.

**When to use:** `/api/stripe/webhook` — platform-level events.

**Critical:** Must use `supabaseAdmin` (service role) — no user session in webhook context.

```typescript
// Source: https://docs.stripe.com/connect/webhooks (official Stripe docs)
// app/api/stripe/webhook/route.ts

import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  // CRITICAL: req.text() not req.json() — preserves raw bytes for signature verification
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    if (account.charges_enabled) {
      // Update teacher record
      await supabaseAdmin
        .from('teachers')
        .update({ stripe_charges_enabled: true })
        .eq('stripe_account_id', account.id)

      // Create Checkout sessions for all requested bookings
      await createCheckoutSessionsForWaitingBookings(account.id)
    }
  }

  return new Response('OK', { status: 200 })
}
```

### Pattern 3: Stripe Checkout Session — Manual Capture with Destination Charges

**What:** Create a Stripe Checkout session that authorizes but does not capture payment. Funds flow through platform → teacher's connected account. Platform takes 7% via `application_fee_amount` applied at capture.

**When to use:** After `account.updated` confirms `charges_enabled: true`, called for each `requested` booking.

**Key insight on fee timing:** The `application_fee_amount` in `payment_intent_data` at Checkout creation and at capture time work differently. For clarity and correctness with `capture_method: manual`, apply the fee at capture via `stripe.paymentIntents.capture()`.

```typescript
// Source: https://docs.stripe.com/connect/destination-charges (official Stripe docs)
// Source: https://docs.stripe.com/api/checkout/sessions/create (official Stripe docs)

async function createCheckoutSessionForBooking(
  booking: { id: string; hourlyRate: number; parentEmail: string; studentName: string },
  teacherStripeAccountId: string
) {
  const amountInCents = Math.round(booking.hourlyRate * 100)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Tutoring session — ${booking.studentName}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    payment_intent_data: {
      capture_method: 'manual',   // Authorize only — capture on Mark Complete
      on_behalf_of: teacherStripeAccountId,
      transfer_data: {
        destination: teacherStripeAccountId,
      },
      metadata: {
        booking_id: booking.id,
      },
    },
    customer_email: booking.parentEmail,
    success_url: `${appUrl}/booking-confirmed?session={CHECKOUT_SESSION_ID}`,
    metadata: {
      booking_id: booking.id,
    },
  })

  // Store checkout URL in bookings.stripe_checkout_url (new column needed)
  // Store session.payment_intent in bookings.stripe_payment_intent after checkout.session.completed
  return session
}
```

### Pattern 4: `checkout.session.completed` Webhook Handler

**What:** Fires when parent completes Stripe Checkout. PaymentIntent is now in `requires_capture` status. Update booking status `requested → confirmed`, store PaymentIntent ID, send confirmation emails (NOTIF-03).

**Note:** This event fires on the **platform** webhook (`/api/stripe/webhook`), not the connect webhook.

```typescript
// Source: https://docs.stripe.com/payments/place-a-hold-on-a-payment-method (official Stripe docs)

if (event.type === 'checkout.session.completed') {
  const session = event.data.object as Stripe.Checkout.Session
  const bookingId = session.metadata?.booking_id
  const paymentIntentId = session.payment_intent as string

  if (!bookingId) return new Response('Missing booking_id', { status: 400 })

  // Update booking: confirmed + store PaymentIntent ID
  await supabaseAdmin
    .from('bookings')
    .update({
      status: 'confirmed',
      stripe_payment_intent: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('status', 'requested')  // Guard against duplicate events

  // Send confirmation emails (NOTIF-03) — fire and forget
  await sendBookingConfirmationEmail(bookingId)
}
```

### Pattern 5: Mark Complete + Payment Capture with 7% Fee

**What:** Teacher marks session complete → capture PaymentIntent with `application_fee_amount` = 7% of charge.

**When to use:** Mark Complete Server Action in `src/actions/bookings.ts`.

```typescript
// Source: https://docs.stripe.com/api/payment_intents/capture (official Stripe API reference)

export async function markSessionComplete(bookingId: string) {
  const supabase = await createClient()
  // Auth check — same pattern as acceptBooking

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, stripe_payment_intent, teacher_id')
    .eq('id', bookingId)
    .eq('status', 'confirmed')
    .single()

  if (!booking?.stripe_payment_intent) return { error: 'No payment intent found' }

  // Retrieve the PaymentIntent to get the authorized amount
  const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent)
  const amountToCapture = paymentIntent.amount_capturable ?? paymentIntent.amount
  const applicationFee = Math.round(amountToCapture * 0.07)  // 7% platform fee

  // Capture with platform fee
  await stripe.paymentIntents.capture(booking.stripe_payment_intent, {
    amount_to_capture: amountToCapture,
    application_fee_amount: applicationFee,
  })

  // Update booking status
  await supabase
    .from('bookings')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  // Send session-complete email to parent (NOTIF-06)
  await sendSessionCompleteEmail(bookingId)

  revalidatePath('/dashboard/requests')
}
```

### Pattern 6: Vercel Cron Routes (Requires Pro Plan)

**What:** Two scheduled jobs — auto-cancel expired bookings, send follow-up reminder emails.

**Critical constraint:** Vercel Hobby plan is limited to once-per-day cron jobs. Jobs running every hour require **Vercel Pro plan ($20/mo)**. For the 24hr/48hr logic to work correctly within reasonable timing windows, Pro plan is required.

```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs (official Vercel docs)
// app/api/cron/auto-cancel/route.ts

import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  // Security: Vercel sends CRON_SECRET as Bearer token
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data: expired } = await supabaseAdmin
    .from('bookings')
    .select('id, parent_email, teacher_id')
    .eq('status', 'requested')
    .lt('created_at', cutoff)

  for (const booking of expired ?? []) {
    // Check teacher hasn't since connected Stripe
    const { data: teacher } = await supabaseAdmin
      .from('teachers')
      .select('stripe_charges_enabled')
      .eq('id', booking.teacher_id)
      .single()

    if (!teacher?.stripe_charges_enabled) {
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', booking.id)
        .eq('status', 'requested')  // Idempotent guard

      await sendCancellationEmail(booking.id)
    }
  }

  return Response.json({ cancelled: expired?.length ?? 0 })
}
```

**vercel.json configuration:**
```json
{
  "crons": [
    {
      "path": "/api/cron/auto-cancel",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/stripe-reminders",
      "schedule": "30 * * * *"
    }
  ]
}
```

**Note:** `0 * * * *` = every hour at :00; `30 * * * *` = every hour at :30. Pro plan minimum interval = 1 minute.

### Pattern 7: Two Separate Webhook Endpoints

**What:** Platform events (`account.updated`, `checkout.session.completed`) go to `/api/stripe/webhook`. Connected-account events (future: payout events, refunds) go to `/api/stripe-connect/webhook`.

**Each endpoint requires its own signing secret** registered separately in the Stripe Dashboard.

| Endpoint | Secret Env Var | Events |
|----------|---------------|--------|
| `/api/stripe/webhook` | `STRIPE_WEBHOOK_SECRET` | `account.updated`, `checkout.session.completed` |
| `/api/stripe-connect/webhook` | `STRIPE_CONNECT_WEBHOOK_SECRET` | Connected-account events (Phase 3: stub only) |

### Anti-Patterns to Avoid
- **`req.json()` in webhook handlers:** Parses body before signature verification — breaks `stripe.webhooks.constructEvent()`. Always `req.text()`.
- **Creating PaymentIntents before `charges_enabled: true`:** Will fail — connected account cannot receive payments until fully onboarded.
- **Using `createClient()` (user-context) in webhook handlers:** No user session exists in webhooks — use `supabaseAdmin` (service role).
- **Applying `application_fee_amount` at Checkout Session creation with `capture_method: manual`:** The fee is deducted at capture time. Adding it at session creation too causes double-fee or API errors. Apply fee only at `paymentIntents.capture()`.
- **Generating account links at page load:** Account links are single-use. Generate them only when the teacher clicks "Connect with Stripe."
- **Trusting the `return_url` redirect to confirm onboarding:** The return_url fires even if the teacher didn't complete all steps. Always verify via `account.updated` webhook where `charges_enabled: true`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment authorization/hold | Custom "hold" logic | Stripe `capture_method: manual` | PCI compliance, card network rules, authorization windows |
| Webhook signature verification | Manual HMAC comparison | `stripe.webhooks.constructEvent()` | Timing attacks, replay attacks — Stripe handles all edge cases |
| Teacher onboarding KYC | Custom identity verification | Stripe Connect Express | Banking regulations, ID verification, bank account validation — weeks of work |
| Fee calculation on capture | Custom ledger | `application_fee_amount` in `paymentIntents.capture()` | Stripe handles atomic fee split — no race conditions |
| Cron scheduling | Custom timer/queue | Vercel Cron Jobs | Already on Vercel infra; zero additional services |

**Key insight:** Every custom solution here touches financial compliance, card network rules, or identity verification — areas where "close enough" causes real legal and financial liability.

---

## Common Pitfalls

### Pitfall 1: `req.json()` in Stripe Webhook Handlers
**What goes wrong:** `req.json()` consumes the request body stream and parses it to an object. `stripe.webhooks.constructEvent()` then receives a string representation of the parsed JSON — the raw bytes are gone, signature verification always fails with "No signatures found matching the expected signature for payload."
**Why it happens:** Natural instinct to parse JSON in a Next.js route handler.
**How to avoid:** Always `const body = await req.text()` as the very first line in both webhook handlers.
**Warning signs:** Webhook verification error in logs; `400` responses; "Webhook signature verification failed" message.

### Pitfall 2: Vercel Hobby Plan — Cron Jobs Only Run Once Per Day
**What goes wrong:** Deploying to Hobby plan with `"schedule": "0 * * * *"` causes deployment failure: *"Hobby accounts are limited to daily cron jobs. This cron expression would run more than once per day."*
**Why it happens:** Hobby plan hard limit — minimum interval is once per day; Pro plan minimum is once per minute.
**How to avoid:** Upgrade to Vercel Pro ($20/mo) before deploying Phase 3. Verify plan tier in Vercel Dashboard before wiring cron jobs.
**Warning signs:** Deployment error mentioning "cron expression would run more than once per day."

### Pitfall 3: Authorization Window Expiry (Visa 5-day, others 7-day)
**What goes wrong:** PaymentIntent in `requires_capture` status automatically cancels if not captured within the authorization window. Visa shortened this from 7 days to 5 days for online payments (as of April 2024).
**Why it happens:** Teacher accepts booking but doesn't mark it complete for a week — authorization expires, capture fails silently.
**How to avoid:** At MVP, 5-day window is sufficient for a single tutoring session scenario. Document this as a known constraint. In Phase 5, consider showing a warning when a confirmed session hasn't been marked complete within 4 days.
**Warning signs:** `stripe.paymentIntents.capture()` returns error `"This PaymentIntent's payment_method was not automatically captured and expired."`.

### Pitfall 4: Using `createClient()` Instead of `supabaseAdmin` in Webhook Handlers
**What goes wrong:** `createClient()` from `@/lib/supabase/server` uses the user session for RLS. In a webhook handler, there's no user session — RLS policies block all writes. Bookings never get updated when `checkout.session.completed` fires.
**Why it happens:** Same function used everywhere; easy to import the wrong one.
**How to avoid:** Any route handler under `app/api/stripe/` or `app/api/cron/` must import `supabaseAdmin` from `@/lib/supabase/service`. Existing service.ts file already exists for exactly this purpose. Note: `SUPABASE_SERVICE_SECRET_KEY` not `SUPABASE_SERVICE_ROLE_KEY` (project naming convention).
**Warning signs:** Webhook returns 200 but bookings table not updated; no error in logs; RLS violation silently swallowed.

### Pitfall 5: Account Link URL Is Single-Use
**What goes wrong:** If teacher navigates back to `/dashboard/connect-stripe` after starting onboarding (e.g., hits browser back), the same URL is dead — Stripe rejects it. Teacher sees an error page.
**Why it happens:** Stripe invalidates account link URLs after first use for security (they grant access to sensitive identity info).
**How to avoid:** The `refresh_url` parameter handles this correctly — Stripe redirects to `refresh_url` when the link is expired/invalid. Set `refresh_url` to `/dashboard/connect-stripe` so the page re-renders the connect button and teacher can try again.
**Warning signs:** Teacher reports "Something went wrong" on Stripe's hosted page after navigating back.

### Pitfall 6: `account.updated` Fires Multiple Times
**What goes wrong:** Stripe fires `account.updated` many times during onboarding (each time requirements change). Creating Checkout sessions on every `account.updated` event would create duplicate sessions.
**Why it happens:** Webhook is idempotency-naive — just reacting to every event of a given type.
**How to avoid:** In the `account.updated` handler, check `account.charges_enabled === true` AND check if `teachers.stripe_charges_enabled` is already `true` in DB — skip Checkout session creation if teacher was already activated. Use a DB-level guard: only process `requested` bookings where `stripe_payment_intent IS NULL`.
**Warning signs:** Parent receives multiple Checkout links for the same booking.

### Pitfall 7: Cron Job Not Idempotent
**What goes wrong:** Vercel's event system can deliver the same cron event more than once (documented behavior). Auto-cancel cron runs twice → cancellation email sent twice to both parties.
**Why it happens:** No idempotency guard on the update query.
**How to avoid:** The `status: 'requested'` guard in the UPDATE query prevents double-cancel. Only send cancellation email after a successful update (check `count > 0`). Use `eq('status', 'requested')` in the WHERE clause so a second run finds 0 rows.
**Warning signs:** Duplicate cancellation emails reported by teachers/parents.

---

## Code Examples

Verified patterns from official sources:

### Create Stripe Connect Express Account + Account Link
```typescript
// Source: https://docs.stripe.com/connect/express-accounts
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Create account (only if stripe_account_id is null on teacher record)
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
})

// Generate one-time onboarding link
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  type: 'account_onboarding',
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?stripe=connected`,
  refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect-stripe`,
})

redirect(accountLink.url)  // redirect() from 'next/navigation'
```

### Webhook Handler Structure (Both Endpoints)
```typescript
// Source: https://docs.stripe.com/webhooks (official Stripe docs)
// Same pattern for both /api/stripe/webhook and /api/stripe-connect/webhook
export async function POST(req: Request) {
  const body = await req.text()       // MUST be text(), not json()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!  // Different secret for each endpoint
    )
  } catch (err) {
    return new Response(`Webhook Error: ${err}`, { status: 400 })
  }

  // Handle events
  switch (event.type) {
    case 'account.updated': { /* ... */ break }
    case 'checkout.session.completed': { /* ... */ break }
    default: { /* ignore */ }
  }

  return new Response('OK', { status: 200 })
}
```

### Checkout Session with Manual Capture (Destination Charges)
```typescript
// Source: https://docs.stripe.com/connect/destination-charges
// Source: https://docs.stripe.com/api/checkout/sessions/create
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: `Tutoring — ${studentName}` },
      unit_amount: amountInCents,  // teacher's hourly_rate * 100
    },
    quantity: 1,
  }],
  mode: 'payment',
  payment_intent_data: {
    capture_method: 'manual',
    on_behalf_of: teacherStripeAccountId,
    transfer_data: { destination: teacherStripeAccountId },
    metadata: { booking_id: bookingId },
  },
  customer_email: parentEmail,
  success_url: `${appUrl}/booking-confirmed?session={CHECKOUT_SESSION_ID}`,
  metadata: { booking_id: bookingId },
})
// session.url → email this to parent
// session.payment_intent → store after checkout.session.completed fires
```

### Capture with 7% Application Fee
```typescript
// Source: https://docs.stripe.com/api/payment_intents/capture
const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
const amount = paymentIntent.amount_capturable ?? paymentIntent.amount
const fee = Math.round(amount * 0.07)  // 7% platform fee

const captured = await stripe.paymentIntents.capture(paymentIntentId, {
  amount_to_capture: amount,
  application_fee_amount: fee,
})
// captured.status === 'succeeded'
```

### Vercel Cron Route with Security
```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... job logic
  return Response.json({ success: true })
}
```

### Retrieve PaymentIntent ID from Checkout Session (for `/booking-confirmed` page)
```typescript
// Source: https://docs.stripe.com/api/checkout/sessions/retrieve
// Called from /booking-confirmed page with ?session=cs_xxx
const session = await stripe.checkout.sessions.retrieve(sessionId)
const paymentIntentId = session.payment_intent as string
// Use bookingId from session.metadata.booking_id to show booking details
```

---

## Schema Changes Required

The existing `bookings` table already has `stripe_payment_intent TEXT` (for PaymentIntent ID). One additional column is needed:

**New column: `bookings.stripe_checkout_url`**
```sql
-- Migration: 0004_stripe_checkout_url.sql
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT;
```

**Purpose:** Store the Stripe Checkout session URL (`session.url`) at the point of Checkout session creation, so the parent's payment link is retrievable if needed. The platform webhook (`checkout.session.completed`) will then write `stripe_payment_intent` when payment is authorized.

**No other schema changes needed** — `stripe_account_id` and `stripe_charges_enabled` already exist on `teachers`. The `bookings` table already has `stripe_payment_intent`.

---

## Required Environment Variables

| Variable | Purpose | Where to Set |
|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API — server-side calls | Vercel env vars (never `NEXT_PUBLIC_`) |
| `STRIPE_WEBHOOK_SECRET` | Platform webhook signature verification | Vercel env vars + Stripe Dashboard |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Connected-account webhook signature | Vercel env vars + Stripe Dashboard |
| `CRON_SECRET` | Vercel cron job authorization | Vercel env vars (`openssl rand -hex 32`) |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Custom accounts for everything | Express accounts for simple marketplaces | Ongoing | Express handles KYC/onboarding — platform doesn't need to collect identity docs |
| Check `return_url` to confirm onboarding | Listen to `account.updated` webhook | Stripe's guidance | Return URL fires even on incomplete onboarding — webhook is the only reliable signal |
| Register webhooks per connected account | One Connect webhook listens to all connected accounts | Ongoing | Scale-friendly; single endpoint receives events from all teachers |
| `capture_method: 'automatic'` (default) | `capture_method: 'manual'` for deferred capture | Ongoing | Enables authorization-hold pattern — capture only on service completion |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Not used in this project — replaced by `@supabase/ssr` (already in place)
- Stripe `source` object: Use PaymentIntents API instead (already in plan)
- Express accounts v1: Still functional but Stripe recommends Accounts v2 API for new platforms. For this MVP Express is appropriate — v2 migration is a future consideration, not blocking.

---

## Open Questions

1. **Stripe account re-onboarding (incomplete onboarding)**
   - What we know: Teacher may click through the Express flow but not complete it (e.g., doesn't add bank account). `charges_enabled` remains `false`. `return_url` still fires.
   - What's unclear: Should the dashboard show a "continue onboarding" CTA for incomplete accounts vs "connect Stripe" CTA for unstarted accounts?
   - Recommendation: At MVP, treat both states the same — the `/dashboard/connect-stripe` page always shows the connect button. The `refresh_url` and guard redirect handle re-entry. A teacher with `stripe_account_id` set but `stripe_charges_enabled = false` just gets a new account link for their existing account.

2. **Checkout session expiration**
   - What we know: Stripe Checkout sessions expire 24 hours after creation by default.
   - What's unclear: If parent receives the payment link but doesn't complete payment within 24 hours, the link is dead. No auto-cancel is planned for parent non-payment at MVP.
   - Recommendation: Parent non-payment is handled informally at MVP (CONTEXT.md locked decision). If needed, teacher can contact parent directly. Note this in the UX copy of the confirmation email.

3. **Multiple bookings for same teacher**
   - What we know: When `account.updated` fires with `charges_enabled: true`, we create Checkout sessions for ALL `requested` bookings for that teacher.
   - What's unclear: What if one Checkout session creation fails (e.g., invalid amount, Stripe rate limit)?
   - Recommendation: Process each booking independently with try/catch — a failure on one booking should not block the rest. Log errors but return 200 to Stripe to prevent re-delivery of the event.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `/Users/soosupcha/Projects/Tutelo/vitest.config.ts` |
| Quick run command | `npx vitest run tests/stripe/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRIPE-03 | `connectStripe` Server Action creates account + account link | unit | `npx vitest run tests/stripe/connect-stripe.test.ts -x` | ❌ Wave 0 |
| STRIPE-04 | Auto-cancel cron marks `requested` bookings `cancelled` after 48hr | unit | `npx vitest run tests/stripe/auto-cancel.test.ts -x` | ❌ Wave 0 |
| STRIPE-05 | Checkout session created with `capture_method: manual` | unit | `npx vitest run tests/stripe/checkout-session.test.ts -x` | ❌ Wave 0 |
| STRIPE-06 | `markSessionComplete` calls `paymentIntents.capture()` | unit | `npx vitest run tests/stripe/mark-complete.test.ts -x` | ❌ Wave 0 |
| STRIPE-07 | Capture call includes `application_fee_amount` = 7% of amount | unit | `npx vitest run tests/stripe/mark-complete.test.ts -x` | ❌ Wave 0 (same file) |
| NOTIF-02 | Follow-up cron sends 24hr email and 48hr email to correct recipients | unit | `npx vitest run tests/stripe/reminders-cron.test.ts -x` | ❌ Wave 0 |
| NOTIF-03 | `sendBookingConfirmationEmail` sends to both parent and teacher | unit | `npx vitest run tests/stripe/email-confirmation.test.ts -x` | ❌ Wave 0 |
| NOTIF-05 | `sendCancellationEmail` sends to both parties | unit | `npx vitest run tests/stripe/email-cancellation.test.ts -x` | ❌ Wave 0 |
| NOTIF-06 | `sendSessionCompleteEmail` sends to parent with review prompt | unit | `npx vitest run tests/stripe/email-complete.test.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/stripe/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/stripe/connect-stripe.test.ts` — covers STRIPE-03: Server Action account + link creation
- [ ] `tests/stripe/checkout-session.test.ts` — covers STRIPE-05: Checkout session params
- [ ] `tests/stripe/mark-complete.test.ts` — covers STRIPE-06 + STRIPE-07: capture call + fee
- [ ] `tests/stripe/auto-cancel.test.ts` — covers STRIPE-04: cron idempotency + cancellation logic
- [ ] `tests/stripe/reminders-cron.test.ts` — covers NOTIF-02: 24hr/48hr email trigger logic
- [ ] `tests/stripe/email-confirmation.test.ts` — covers NOTIF-03: dual-recipient confirmation
- [ ] `tests/stripe/email-cancellation.test.ts` — covers NOTIF-05: cancellation email
- [ ] `tests/stripe/email-complete.test.ts` — covers NOTIF-06: session-complete email

**Mocking pattern to follow** (from `tests/bookings/email.test.ts`):
- Use `vi.hoisted()` + class-based mock for `new Stripe()` constructor
- Use `vi.mock('@/lib/supabase/service', ...)` for `supabaseAdmin`
- All Stripe SDK calls are mockable via the class pattern

---

## Sources

### Primary (HIGH confidence)
- `https://docs.stripe.com/connect/express-accounts` — Express account creation, account links, onboarding flow
- `https://docs.stripe.com/payments/place-a-hold-on-a-payment-method` — Manual capture with Checkout, `checkout.session.completed` webhook
- `https://docs.stripe.com/connect/destination-charges` — Destination charges, `on_behalf_of`, `transfer_data`, `application_fee_amount`
- `https://docs.stripe.com/api/checkout/sessions/create` — Checkout session parameters including `payment_intent_data`
- `https://docs.stripe.com/api/payment_intents/capture` — Capture with `application_fee_amount` and `amount_to_capture`
- `https://docs.stripe.com/connect/webhooks` — Platform vs connected-account webhook types, `account` property on events
- `https://vercel.com/docs/cron-jobs` — Cron job setup, expressions, timezone (UTC)
- `https://vercel.com/docs/cron-jobs/manage-cron-jobs` — `CRON_SECRET` security, idempotency guidance
- `https://vercel.com/docs/cron-jobs/usage-and-pricing` — **Hobby plan = daily only; Pro plan required for hourly** (confirmed)
- Existing codebase: `src/lib/supabase/service.ts` — `supabaseAdmin` client using `SUPABASE_SERVICE_SECRET_KEY`
- Existing codebase: `supabase/migrations/0001_initial_schema.sql` — confirmed `stripe_account_id`, `stripe_charges_enabled` on teachers; `stripe_payment_intent` on bookings

### Secondary (MEDIUM confidence)
- `https://docs.stripe.com/payments/capture-later` — General manual capture docs, 5-day Visa window
- `https://docs.stripe.com/api/checkout/sessions/retrieve` — Session retrieval, `payment_intent` field

### Tertiary (LOW confidence — WebSearch only)
- Stripe npm package v20.4.0 as latest (from npmjs.com search result — not directly verified against npm registry)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against official Stripe docs and existing codebase
- Architecture: HIGH — all patterns traced to official Stripe and Vercel docs
- Pitfalls: HIGH — webhook raw body requirement confirmed by both official docs and existing project decisions; Vercel plan constraint confirmed directly from Vercel pricing docs
- Validation architecture: HIGH — follows established Vitest patterns from existing test files

**Research date:** 2026-03-06
**Valid until:** 2026-09-06 (Stripe APIs are stable; Vercel plan pricing could change)