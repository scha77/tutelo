# Phase 4: Direct Booking + Parent Account — Research

**Researched:** 2026-03-07
**Domain:** Stripe Elements (inline PaymentIntent), Supabase Auth (multi-role inline flow), Vercel Cron (nightly reminders)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- BookingCalendar gains extra steps **only** when `stripe_charges_enabled = true` on the teacher
- Flow: slot selection → booking details form → account/login → Stripe Elements payment → inline success state
- Extend `step` state machine with `'auth'` and `'payment'` steps (existing: `'calendar' | 'form' | 'success' | 'error'`)
- Conditional routing: pass `stripeConnected: boolean` as new prop; deferred path stays unchanged for `false`
- Auth step appears after parent fills in booking details and before Stripe Elements
- If the parent already has an active session: skip the auth step entirely — jump directly to payment
- Auth step offers: create account (email + password or Google SSO) or log in
- Use existing Supabase Auth — same auth system as teachers, role distinguished by presence/absence of a `teachers` row
- Stripe Elements card UI embedded inside the BookingCalendar card (same bordered container)
- Button label: "Confirm & Pay" — disabled + spinner while Stripe processes
- On success: switch to inline success state — no redirect
- On failure: show inline error message, keep parent on payment step to retry
- Parent-facing area at `/account` — completely separate from `/dashboard` (teacher-only)
- Two sections: Upcoming (confirmed sessions) and Past (completed sessions with Rebook button)
- Navigation: link in the booking confirmation email + direct URL — no entry point added to teacher public page for MVP
- Protected route: parent must be logged in; redirect to `/login?redirect=/account` if not
- Rebook button navigates to `/[teacher-slug]#booking` with `?subject=Math` URL param
- BookingCalendar reads `?subject=` param on mount to pre-fill subject
- Nightly Vercel Cron for 24hr reminders — add `reminder_sent_at` column to `bookings` for idempotency
- `supabaseAdmin` in all cron/webhook handlers

### Claude's Discretion

- Exact Stripe Elements configuration (appearance API, field layout)
- Styling of the auth step within the BookingCalendar card
- `/account` page layout and empty state design
- Login redirect flow for parents (vs. teachers) after auth
- Exact copy for the 24hr reminder email templates

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOOK-05 | Parent can complete direct booking (time slot → account creation → payment) when teacher already has Stripe connected | Stripe Elements PaymentIntent flow, inline `confirmPayment` with `redirect: "if_required"`, `payment_intent.amount_capturable_updated` webhook for server-side confirmation |
| PARENT-01 | Parent can create an account (email + password or Google SSO) | Existing Supabase Auth + LoginForm reuse inline; Google OAuth callback already wired |
| PARENT-02 | Parent can view booking history and upcoming sessions | `/account` protected route, `bookings` table queried by `parent_id = auth.uid()` (RLS already exists), `supabase.auth.getUser()` for Server Component auth |
| PARENT-03 | Parent can rebook a session with the same teacher | `?subject=` URL param on teacher slug page, `BookingCalendar` reads param on mount |
| NOTIF-04 | Both teacher and parent receive 24-hour reminder before each scheduled session | Nightly Vercel Cron (`/api/cron/session-reminders`), `reminder_sent_at` column on `bookings`, timezone-aware date window using `date-fns-tz` |
</phase_requirements>

---

## Summary

Phase 4 adds the "happy path" payment flow for teachers who already have Stripe connected. It also gives parents a lightweight account where they can see their booking history and rebook. The two biggest technical challenges are: (1) embedding Stripe Elements inline inside the BookingCalendar component without a page redirect, and (2) correctly routing the post-auth redirect so parents land back in the booking flow rather than being sent to `/onboarding`.

The Stripe integration uses **destination charges** (same pattern as Phase 3 deferred path), meaning the PaymentIntent is created on the platform account and funds are transferred to the connected account. This means the client-side `loadStripe` call uses the **platform publishable key** — no `stripeAccount` option needed. After the parent confirms via `stripe.confirmPayment()` with `redirect: "if_required"`, the PaymentIntent status moves to `requires_capture`. The correct webhook event to listen for on the server to confirm the booking is `payment_intent.amount_capturable_updated` (not `checkout.session.completed` which is used in the deferred path).

The database already has a `parent_id` column on `bookings` (nullable, added in Phase 1 schema) and a `bookings_parent_read` RLS policy. The `create_booking()` Postgres function does **not** currently set `parent_id`. Phase 4 needs a new `submitDirectBooking` Server Action path that: (1) creates a PaymentIntent, (2) returns `clientSecret` to the client for Elements rendering, (3) after client confirmation, receives the webhook and confirms the booking with `parent_id` set.

**Primary recommendation:** Extend BookingCalendar with `'auth'` and `'payment'` steps; create a new `/api/direct-booking/create-intent` API route (not a Server Action, because it must return `clientSecret` to the client); handle booking confirmation via the platform webhook `payment_intent.amount_capturable_updated`.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `stripe` | ^20.4.0 | Server-side Stripe API | Already in package.json |
| `@supabase/ssr` | ^0.9.0 | Server-side Supabase client | Already in package.json |
| `date-fns-tz` | ^3.2.0 | Timezone-aware date math for cron window | Already in package.json |

### New Packages Required
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@stripe/stripe-js` | ^8.9.0 | Client-side Stripe.js loader | Canonical Stripe browser SDK |
| `@stripe/react-stripe-js` | ^5.6.1 | React `Elements`, `PaymentElement`, hooks | Official React bindings; v5.6.1 released 2026-03-02 |

**Installation:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hook-form` + `zod` | ^7.71 / ^4.3 | Auth form validation in inline auth step | Consistent with existing forms |
| `sonner` | ^2.0.7 | Toast notifications | Consistent with existing error feedback |

---

## Architecture Patterns

### Recommended Project Structure (new files only)
```
src/
├── app/
│   ├── account/
│   │   └── page.tsx              # PARENT-02: protected parent session view
│   ├── api/
│   │   └── direct-booking/
│   │       └── create-intent/
│   │           └── route.ts      # POST: create PaymentIntent, return clientSecret
│   └── api/
│       ├── cron/
│       │   └── session-reminders/
│       │       └── route.ts      # NOTIF-04: nightly 24hr reminder cron
│       └── stripe/
│           └── webhook/
│               └── route.ts      # EXTENDED: add payment_intent.amount_capturable_updated
├── components/
│   ├── profile/
│   │   ├── BookingCalendar.tsx   # EXTENDED: add stripeConnected prop + 'auth'/'payment' steps
│   │   └── PaymentStep.tsx       # NEW: Stripe Elements wrapper (child of BookingCalendar)
│   └── auth/
│       └── InlineAuthForm.tsx    # NEW: auth step within BookingCalendar card
├── emails/
│   └── SessionReminderEmail.tsx  # NEW: 24hr reminder react-email template
└── lib/
    └── email.ts                  # EXTENDED: sendSessionReminderEmail function
supabase/
└── migrations/
    └── 0005_phase4_direct_booking.sql  # reminder_sent_at + parent_id update in create_booking
```

### Pattern 1: `Elements` Provider with `clientSecret`

The `Elements` provider must wrap any component using `PaymentElement`, `useStripe`, or `useElements`. For destination charges, use the **platform publishable key** — no `stripeAccount` option.

```typescript
// Source: https://docs.stripe.com/sdks/stripejs-react
// src/components/profile/PaymentStep.tsx
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

// Initialize ONCE outside the component — prevents re-creating Stripe object on render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentStepProps {
  clientSecret: string
  accentColor: string
  onSuccess: () => void
  onError: (msg: string) => void
}

export function PaymentStep({ clientSecret, accentColor, onSuccess, onError }: PaymentStepProps) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm accentColor={accentColor} onSuccess={onSuccess} onError={onError} />
    </Elements>
  )
}

function CheckoutForm({ accentColor, onSuccess, onError }: Omit<PaymentStepProps, 'clientSecret'>) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking-confirmed`,
      },
      redirect: 'if_required', // Card payments stay on page; redirect-based methods still redirect
    })

    setSubmitting(false)
    if (error) {
      onError(error.message ?? 'Payment failed')
    } else if (paymentIntent?.status === 'requires_capture') {
      // Manual capture — payment authorized, booking confirmed via webhook
      onSuccess()
    }
  }
  // ... render PaymentElement + submit button
}
```

**CRITICAL:** `loadStripe` must be called **outside** any React component to avoid recreating the Stripe object on each render.

### Pattern 2: PaymentIntent Creation (Server-Side API Route)

Direct bookings require a POST API route (not a Server Action) because the `clientSecret` must be returned to the client to mount the `Elements` provider. Server Actions that trigger redirects cannot return arbitrary data to the client in this way.

```typescript
// Source: https://docs.stripe.com/connect/destination-charges
// src/app/api/direct-booking/create-intent/route.ts
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json()
  // body: { teacherId, bookingDate, startTime, endTime, subject, studentName, notes }

  // Fetch teacher's stripe_account_id and hourly_rate
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, stripe_account_id, stripe_charges_enabled, hourly_rate')
    .eq('id', body.teacherId)
    .single()

  if (!teacher?.stripe_charges_enabled || !teacher.stripe_account_id) {
    return new Response('Teacher not connected', { status: 400 })
  }

  const amountInCents = Math.round((teacher.hourly_rate ?? 0) * 100)
  const applicationFeeAmount = Math.round(amountInCents * 0.07) // STRIPE-07: 7% fee

  // Destination charge — processed on platform, transferred to connected account
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    capture_method: 'manual',           // STRIPE-05: authorize only, capture on Mark Complete
    on_behalf_of: teacher.stripe_account_id,
    transfer_data: { destination: teacher.stripe_account_id },
    application_fee_amount: applicationFeeAmount, // STRIPE-07
    metadata: {
      teacher_id: teacher.id,
      parent_user_id: data.user.id,
      booking_date: body.bookingDate,
      start_time: body.startTime,
      // other booking fields encoded into metadata for webhook reconstruction
      student_name: body.studentName,
      subject: body.subject,
      end_time: body.endTime,
      notes: body.notes ?? '',
    },
  })

  return Response.json({ clientSecret: paymentIntent.client_secret })
}
```

### Pattern 3: Webhook Handler — `payment_intent.amount_capturable_updated`

After client-side `confirmPayment`, PaymentIntent status transitions to `requires_capture`. The platform webhook fires `payment_intent.amount_capturable_updated`. This is where the booking record is atomically created and confirmed.

```typescript
// Source: https://docs.stripe.com/payments/payment-intents/verifying-status
// In src/app/api/stripe/webhook/route.ts — ADD to existing switch:

case 'payment_intent.amount_capturable_updated': {
  const pi = event.data.object as Stripe.PaymentIntent
  const meta = pi.metadata

  if (!meta.booking_date || !meta.teacher_id) break // Not a booking PI

  // Atomic booking creation — reuse create_booking RPC
  const { data: bookingResult } = await supabaseAdmin.rpc('create_booking', {
    p_teacher_id: meta.teacher_id,
    p_parent_user_id: meta.parent_user_id, // NEW parameter added to function
    p_parent_email: pi.receipt_email ?? '',
    p_student_name: meta.student_name,
    p_subject: meta.subject,
    p_booking_date: meta.booking_date,
    p_start_time: meta.start_time,
    p_end_time: meta.end_time,
    p_notes: meta.notes || null,
  })

  const result = bookingResult as { success: boolean; booking_id?: string; error?: string }
  if (result.success && result.booking_id) {
    // Link PaymentIntent to booking
    await supabaseAdmin
      .from('bookings')
      .update({
        stripe_payment_intent: pi.id,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', result.booking_id)

    await sendBookingConfirmationEmail(result.booking_id).catch(console.error)
  }
  break
}
```

**Alternative approach (simpler):** Create the booking row in the API route (before returning `clientSecret`), store `pending_payment` as initial status, then update to `confirmed` in the webhook. This avoids needing to extend the `create_booking()` Postgres function with a new parameter.

**Recommended:** Create booking row in API route with status `'requested'` and store the PaymentIntent ID immediately (before client confirmation). Webhook updates status to `'confirmed'` and links `parent_id`. This is idempotent and doesn't require changing the Postgres function signature.

### Pattern 4: Inline Auth Step

The auth step within `BookingCalendar` uses Supabase client-side auth without redirecting. After successful sign-up/sign-in, the state machine advances to `'payment'`.

```typescript
// src/components/auth/InlineAuthForm.tsx
'use client'

import { createClient } from '@/lib/supabase/client'

interface InlineAuthFormProps {
  onAuthSuccess: () => void // Called when session established
}

export function InlineAuthForm({ onAuthSuccess }: InlineAuthFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const supabase = createClient()

  async function handleEmailAuth(email: string, password: string) {
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (!error) onAuthSuccess()
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error) onAuthSuccess()
    }
  }

  async function handleGoogleAuth() {
    // Google OAuth WILL redirect — bookingState must be preserved in sessionStorage
    // before triggering Google OAuth, then restored after callback
    sessionStorage.setItem('pendingBooking', JSON.stringify(currentBookingData))
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${window.location.pathname}` }
    })
  }
  // ...
}
```

**CRITICAL PITFALL for Google OAuth:** Google OAuth requires a page redirect. If the parent is mid-booking and chooses Google OAuth, the booking state (selected slot, form data) will be lost on redirect unless saved to `sessionStorage` before the OAuth redirect and restored after the callback. Email/password auth stays on the page.

### Pattern 5: Parent-Role Detection

No separate `parents` table is needed. Role is determined by presence/absence of a `teachers` row:
- Has `teachers` row → teacher
- No `teachers` row → parent

```typescript
// src/app/account/page.tsx (Server Component)
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/account')
  }

  // Determine role — if teacher row exists, redirect to dashboard
  const { data: teacherRow } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (teacherRow) {
    redirect('/dashboard') // Teachers get their own dashboard
  }

  // Fetch this parent's bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, teachers(full_name, slug)')
    .eq('parent_id', user.id) // bookings_parent_read RLS enforces this
    .order('booking_date', { ascending: true })

  // Split into upcoming / past
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = bookings?.filter(b =>
    b.booking_date >= today && b.status === 'confirmed'
  ) ?? []
  const past = bookings?.filter(b =>
    b.booking_date < today || b.status === 'completed'
  ) ?? []

  return ( /* render upcoming + past sections */ )
}
```

### Pattern 6: Nightly Reminder Cron

```typescript
// Source: https://vercel.com/docs/cron-jobs — UTC-only execution
// src/app/api/cron/session-reminders/route.ts

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Window: sessions occurring in the next 24-48 hours (hourly cron window)
  const nowUtc = new Date()
  const windowStart = new Date(nowUtc.getTime() + 23 * 60 * 60 * 1000) // 23hr from now
  const windowEnd = new Date(nowUtc.getTime() + 25 * 60 * 60 * 1000)   // 25hr from now

  // NOTE: booking_date is a DATE type (no time component). We compare booking_date to
  // tomorrow's UTC date. This is an approximation — for cross-timezone accuracy,
  // use teacher's timezone to compute "tomorrow's date" per booking.
  // MVP simplification: query by booking_date = tomorrow (UTC date), status = confirmed,
  // reminder_sent_at IS NULL.
  const tomorrowUtc = new Date(nowUtc.getTime() + 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)

  const { data: sessions } = await supabaseAdmin
    .from('bookings')
    .select('id, parent_email, booking_date, start_time, teachers(full_name, social_email)')
    .eq('booking_date', tomorrowUtc)
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)

  let sent = 0
  for (const session of sessions ?? []) {
    // Idempotent update — only proceed if reminder_sent_at is still null
    const { data: updated } = await supabaseAdmin
      .from('bookings')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', session.id)
      .is('reminder_sent_at', null)
      .select('id')

    if (updated && updated.length > 0) {
      await sendSessionReminderEmail(session.id).catch(console.error)
      sent++
    }
  }

  return Response.json({ sent, checked: sessions?.length ?? 0 })
}
```

**vercel.json addition:**
```json
{ "path": "/api/cron/session-reminders", "schedule": "0 9 * * *" }
```
Schedule `0 9 * * *` = 9 AM UTC daily (covers both coasts for "24hr before" US sessions).

### Anti-Patterns to Avoid

- **Using `stripe.confirmPayment()` without `redirect: "if_required"`:** Default behavior will redirect away from the page for all payment methods, destroying the inline booking flow.
- **Using `stripeAccount` in `loadStripe` for destination charges:** The charge is on the platform, not the connected account. Only direct charges need `stripeAccount`.
- **Confirming booking in client-side callback only:** Stripe warns explicitly not to fulfill orders in client-side code because customers can navigate away. Always confirm via `payment_intent.amount_capturable_updated` webhook.
- **Not checking `reminder_sent_at` before sending:** Cron runs hourly. Without idempotency, a teacher and parent could receive many duplicate reminder emails.
- **Redirecting parent to `/onboarding` or `/dashboard` after inline auth:** The existing `signIn` Server Action redirects to `/onboarding` or `/dashboard`. For the inline auth step, use `createClient().auth.signInWithPassword()` directly (client-side) — do NOT call the `signIn` Server Action, which triggers a redirect.
- **`getSession()` instead of `getUser()`:** Existing project pattern — always `getUser()` in server context.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PCI-compliant card UI | Custom `<input type="text">` card fields | `PaymentElement` from `@stripe/react-stripe-js` | Card numbers can't pass through your server; Elements iframes satisfy PCI SAQ A |
| 3DS authentication handling | Custom redirect/popup logic | `stripe.confirmPayment()` with `redirect: "if_required"` | 3DS flows (SCA, regional regulations) are handled automatically |
| Stripe signature verification | Manual HMAC | `stripe.webhooks.constructEvent()` | Already established in Phase 3 webhook handlers |
| Timezone-safe date comparisons | Manual UTC math | `date-fns-tz` `formatInTimeZone` / `toDate` | Already installed; handles DST edge cases |

**Key insight:** Stripe Elements' `PaymentElement` replaces the need for any custom card UI. It handles PCI compliance, 3DS/SCA, Apple Pay, Google Pay, and localization automatically. The only custom code needed is the submit handler and success/error state.

---

## Common Pitfalls

### Pitfall 1: Google OAuth Destroys Mid-Booking State
**What goes wrong:** Parent is mid-booking (slot selected, form filled), chooses "Continue with Google." Google OAuth requires a full page redirect to `accounts.google.com` then back. All React component state is lost.
**Why it happens:** OAuth is a browser redirect flow — there is no way to preserve in-memory state across redirects.
**How to avoid:** Before triggering `signInWithOAuth`, serialize the current booking state (teacherId, selectedDate, selectedSlot, formData) to `sessionStorage`. On the auth callback page (or in a `useEffect` after returning), read from `sessionStorage` and either: (a) navigate back to the teacher page with query params, or (b) use a booking-continuation URL. For MVP, the simplest approach is to document this as expected behavior and note that email/password stays on-page.
**Warning signs:** Parents reporting "I logged in and my booking disappeared."

### Pitfall 2: `loadStripe` Inside Component (Re-initialization on Every Render)
**What goes wrong:** Calling `loadStripe(...)` inside the component body causes a new Stripe instance to be created on every render, which re-mounts the Elements iframe and loses card entry.
**Why it happens:** `loadStripe` returns a new Promise each call; `Elements` detects a new `stripe` prop and remounts.
**How to avoid:** Declare `const stripePromise = loadStripe(...)` at module level (outside the component), so it's created once.

### Pitfall 3: Confirming Booking on Client — Webhook Is the Source of Truth
**What goes wrong:** Using the client-side `paymentIntent.status === 'requires_capture'` to immediately mark the booking confirmed in the database. If the webhook arrives before or simultaneously, the booking gets double-confirmed.
**Why it happens:** Both the client and webhook try to write to the same booking row.
**How to avoid:** Create the booking row in the API route (before returning `clientSecret`) with `status = 'requested'`. The webhook updates it to `status = 'confirmed'`. The client-side only transitions the UI step to `'success'` — no DB write from the client path.

### Pitfall 4: Parent Email Not Collected for PaymentIntent `receipt_email`
**What goes wrong:** Stripe PaymentIntent's `receipt_email` field is not set, so Stripe can't send the parent a receipt and the webhook handler has no `parent_email` to use when creating the booking.
**Why it happens:** Booking form collects `email` but it's not passed through to the `create-intent` API call.
**How to avoid:** Include `receipt_email: parentEmail` in the `stripe.paymentIntents.create()` call. Alternatively, pass the email in the PaymentIntent `metadata` object.

### Pitfall 5: `/account` Route Not Added to Middleware Protection
**What goes wrong:** Unauthenticated parents can visit `/account` and get a server error instead of a redirect to `/login`.
**Why it happens:** `middleware.ts` currently only protects `/dashboard` and `/onboarding`.
**How to avoid:** Add `/account` to the `isProtected` check in `middleware.ts`. Then use `createClient()` + `getUser()` inside the page as a belt-and-suspenders check.

### Pitfall 6: `bookings_parent_read` RLS Requires `parent_id` to Be Set
**What goes wrong:** Direct bookings work but `/account` shows empty — the booking was created without `parent_id` set.
**Why it happens:** The existing `create_booking()` Postgres function does not accept or set `parent_id`.
**How to avoid:** In the `/api/direct-booking/create-intent` route, when creating the booking row pre-authorization, include `parent_id: user.id` in the insert. The webhook update preserves this existing value.

### Pitfall 7: Duplicate Reminders From Hourly Cron
**What goes wrong:** Cron runs at 9 AM UTC. Teacher and parent each receive 24 reminder emails.
**Why it happens:** No idempotency check.
**How to avoid:** Use `reminder_sent_at IS NULL` filter in the query AND a conditional update (`.is('reminder_sent_at', null)`) so only the first cron run sets the flag. Identical to the auto-cancel idempotency pattern from Phase 3.

### Pitfall 8: Login Redirect Sends Parent to `/onboarding`
**What goes wrong:** Parent completes inline auth (email/password), then the existing `signIn` Server Action runs and redirects them to `/onboarding` (because they have no `teachers` row).
**Why it happens:** The `signIn` Server Action in `src/actions/auth.ts` always redirects after success.
**How to avoid:** For the inline auth step in BookingCalendar, call `supabase.auth.signInWithPassword()` directly from the client (not the Server Action). On success, the Supabase client sets the session cookie via cookie-based SSR — the component can then call `onAuthSuccess()` to advance the step state machine.

---

## Code Examples

### Creating PaymentIntent (Destination Charge, Manual Capture)
```typescript
// Source: https://docs.stripe.com/connect/destination-charges
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: 'usd',
  capture_method: 'manual',
  on_behalf_of: teacher.stripe_account_id,
  transfer_data: { destination: teacher.stripe_account_id },
  application_fee_amount: Math.round(amountInCents * 0.07),
  receipt_email: parentEmail,
  metadata: { booking_id: bookingId, teacher_id: teacher.id },
})
// Returns: paymentIntent.client_secret → sent to client
```

### Client-Side Confirmation (Inline, No Redirect for Cards)
```typescript
// Source: https://docs.stripe.com/js/payment_intents/confirm_payment
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/booking-confirmed`,
    // return_url used only for redirect-based payment methods (not cards)
  },
  redirect: 'if_required',
})
// paymentIntent.status === 'requires_capture' on success with capture_method: manual
```

### Webhook: `payment_intent.amount_capturable_updated`
```typescript
// Source: https://docs.stripe.com/payments/payment-intents/verifying-status
case 'payment_intent.amount_capturable_updated': {
  const pi = event.data.object as Stripe.PaymentIntent
  const bookingId = pi.metadata.booking_id
  if (!bookingId) break

  await supabaseAdmin
    .from('bookings')
    .update({ status: 'confirmed', stripe_payment_intent: pi.id, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('status', 'requested') // Idempotency guard

  await sendBookingConfirmationEmail(bookingId).catch(console.error)
  break
}
```

### Middleware Extension for `/account`
```typescript
// src/middleware.ts — extend isProtected check
const isProtected =
  request.nextUrl.pathname.startsWith('/dashboard') ||
  request.nextUrl.pathname.startsWith('/onboarding') ||
  request.nextUrl.pathname.startsWith('/account')   // ADD THIS

if (isProtected && !claims) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('redirect', request.nextUrl.pathname) // Preserve redirect target
  return NextResponse.redirect(url)
}
```

### Login Page: Redirect Param Support
```typescript
// src/app/(auth)/login/page.tsx — read redirect param
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect: redirectTo } = await searchParams
  // Pass redirectTo to LoginForm as a prop
}
```

### Database Migration (Phase 4)
```sql
-- 0005_phase4_direct_booking.sql

-- NOTIF-04: track reminder send time for idempotency
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Index for cron query performance
CREATE INDEX IF NOT EXISTS idx_bookings_reminder
  ON bookings (booking_date, status, reminder_sent_at)
  WHERE status = 'confirmed' AND reminder_sent_at IS NULL;

-- Note: parent_id column already exists (from Phase 1 schema)
-- bookings_parent_read RLS policy already exists
-- No new RLS needed for parent bookings
```

### Pre-filling Subject from URL Param
```typescript
// In BookingCalendar.tsx — read ?subject= on mount
import { useSearchParams } from 'next/navigation'

// Inside BookingCalendar component:
const searchParams = useSearchParams()
const [form, setForm] = useState({
  name: '',
  subject: subjects.length === 1 ? subjects[0] : (searchParams.get('subject') ?? ''),
  email: '',
  notes: '',
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Checkout (hosted page) | PaymentElement (inline iframe) | ~2022 | PaymentElement supports all payment methods in one element; no redirect required for cards |
| `CardElement` (single card input) | `PaymentElement` (multi-method) | ~2023 | `PaymentElement` is the recommended replacement; adapts to payment methods available for the country |
| `@stripe/stripe-js` loaded via CDN script tag | `loadStripe()` from npm package | ~2021 | Tree-shakeable, version-locked, works with SSR |

**Deprecated/outdated:**
- `CardElement` from `@stripe/react-stripe-js`: Still works but Stripe recommends migrating to `PaymentElement`
- `stripe.confirmCardPayment()`: Replaced by `stripe.confirmPayment()` for `PaymentElement`

---

## Open Questions

1. **Parent email collection at payment time**
   - What we know: The booking form collects `email` in the details step (before auth step). After auth, the parent has a real Supabase user with `email` on their account.
   - What's unclear: Which email to use as canonical — the one typed in the form (might be a school email) or the Supabase auth email (used for login)?
   - Recommendation: Use the Supabase auth user's email (`user.email`) for the PaymentIntent `receipt_email` and booking `parent_email` field. The form email is still captured in metadata as "student contact email" for the teacher.

2. **Booking confirmation email `/account` link**
   - What we know: CONTEXT.md says add `/account` link to confirmation email. Existing `BookingConfirmationEmail.tsx` has no `/account` link.
   - What's unclear: Should the link go in both teacher and parent emails, or only parent?
   - Recommendation: Only parent email (teacher goes to `/dashboard`). Update `BookingConfirmationEmail` to accept an optional `accountUrl` prop.

3. **Google OAuth mid-booking state preservation**
   - What we know: OAuth redirects destroy in-memory state. sessionStorage survives redirects within same origin.
   - What's unclear: Whether to implement `sessionStorage` state rescue or accept the limitation for MVP.
   - Recommendation: For MVP, accept the limitation. Document it. When parent returns after Google OAuth, they land on the teacher page (via `?next=/[slug]` callback redirect) and can re-select their slot. Full state rescue is Phase 2+ polish.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + @testing-library/react 16.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run tests/bookings/ tests/account/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOK-05 | `submitDirectBookingIntent` returns `clientSecret` for connected teacher | unit | `npx vitest run tests/bookings/direct-booking.test.ts -t "returns clientSecret"` | Wave 0 |
| BOOK-05 | Webhook `payment_intent.amount_capturable_updated` updates booking to confirmed | unit | `npx vitest run tests/stripe/direct-booking-webhook.test.ts` | Wave 0 |
| BOOK-05 | Direct booking blocked if `stripe_charges_enabled = false` | unit | `npx vitest run tests/bookings/direct-booking.test.ts -t "blocked when not connected"` | Wave 0 |
| PARENT-01 | Inline auth: `signInWithPassword` success advances step to payment | unit (RTL) | `npx vitest run tests/components/InlineAuthForm.test.tsx` | Wave 0 |
| PARENT-02 | `/account` redirects to `/login?redirect=/account` when unauthenticated | unit | `npx vitest run tests/account/account-page.test.ts -t "redirects unauthenticated"` | Wave 0 |
| PARENT-02 | `/account` splits bookings into upcoming/past correctly | unit | `npx vitest run tests/account/account-page.test.ts -t "splits sessions"` | Wave 0 |
| PARENT-03 | BookingCalendar reads `?subject=` param and pre-fills subject field | unit (RTL) | `npx vitest run tests/components/BookingCalendar.test.tsx -t "pre-fills subject from URL param"` | Wave 0 |
| NOTIF-04 | `sendSessionReminderEmail` sends to both teacher and parent | unit | `npx vitest run tests/bookings/email.test.ts -t "reminder email"` | Wave 0 |
| NOTIF-04 | Cron handler skips bookings with `reminder_sent_at` already set | unit | `npx vitest run tests/cron/session-reminders.test.ts -t "idempotent"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/bookings/ tests/account/ tests/components/ tests/cron/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/bookings/direct-booking.test.ts` — covers BOOK-05 API route + schema validation
- [ ] `tests/stripe/direct-booking-webhook.test.ts` — covers `payment_intent.amount_capturable_updated` handler
- [ ] `tests/account/account-page.test.ts` — covers PARENT-02 auth guard + session split logic
- [ ] `tests/components/InlineAuthForm.test.tsx` — covers PARENT-01 inline auth step
- [ ] `tests/cron/session-reminders.test.ts` — covers NOTIF-04 cron idempotency
- [ ] `tests/components/BookingCalendar.test.tsx` — extend existing to cover new steps + PARENT-03 URL param

---

## Sources

### Primary (HIGH confidence)
- [React Stripe.js Reference — Stripe Docs](https://docs.stripe.com/sdks/stripejs-react) — `Elements` provider, `useStripe`, `useElements`, `PaymentElement`, `clientSecret` mode
- [stripe/react-stripe-js GitHub — v5.6.1 release](https://github.com/stripe/react-stripe-js) — version confirmed 2026-03-02
- [Stripe — Destination Charges](https://docs.stripe.com/connect/destination-charges) — Platform publishable key (no `stripeAccount`), `transfer_data[destination]`, `on_behalf_of`, `application_fee_amount`
- [Stripe — PaymentIntents Lifecycle](https://docs.stripe.com/payments/paymentintents/lifecycle) — `requires_capture` status after `capture_method: manual` confirmation
- [Stripe — Payment Status Updates](https://docs.stripe.com/payments/payment-intents/verifying-status) — `payment_intent.amount_capturable_updated` as the correct webhook event for manual capture confirmation
- [Stripe — `stripe.confirmPayment` docs](https://docs.stripe.com/js/payment_intents/confirm_payment) — `redirect: "if_required"` for inline card payments
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — `bookings_parent_read` RLS policy pattern (already exists in schema)
- [Vercel — Cron Jobs](https://vercel.com/docs/cron-jobs) — UTC-only execution, `vercel.json` schedule format
- Existing codebase (Phase 1–3 source) — `create_booking()` function, `bookings` schema, `middleware.ts` pattern, webhook handler patterns

### Secondary (MEDIUM confidence)
- [Stripe — Place a Hold on Payment Method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method) — `capture_method: manual` behavior, authorization windows (7 days for card-not-present)
- [Supabase Auth — Server-Side Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — `getUser()` vs `getSession()` security model
- [WebSearch] Multiple sources confirm `loadStripe()` must be called outside component to prevent re-initialization

### Tertiary (LOW confidence — needs validation)
- Google OAuth mid-booking state: sessionStorage preservation approach is documented approach but not tested in this specific flow

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@stripe/react-stripe-js` v5.6.1 confirmed via npm, official docs verified
- Architecture: HIGH — destination charge pattern confirmed by Stripe docs; extends verified Phase 3 patterns
- Pitfalls: HIGH — Google OAuth redirect issue is a known/documented constraint; other pitfalls derived from reading existing code
- Validation: MEDIUM — test structure follows established project patterns; test file names are conventions, not confirmed existing files

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (Stripe API stable; `@stripe/react-stripe-js` actively maintained)