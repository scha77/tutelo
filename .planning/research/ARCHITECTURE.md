# Architecture Research: Tutelo

**Domain:** Tutoring marketplace / booking platform
**Stack:** Next.js 14/15 App Router, Supabase, Stripe Connect Express, Vercel, Resend, Tailwind CSS
**Researched:** 2026-03-03
**Confidence note:** Web search and WebFetch tools unavailable during this session. All findings are drawn from training knowledge (cutoff August 2025). Confidence levels are adjusted to MEDIUM for any findings that benefit from external verification.

---

## System Components

### Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel (Next.js)                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  App Router  │  │  API Routes  │  │  Middleware (Auth)     │ │
│  │  (RSC + SC)  │  │  /api/*      │  │  matcher: protected    │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────────┘ │
│         │                 │                                     │
└─────────┼─────────────────┼─────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌──────────────────┐  ┌─────────────────────────────────────────┐
│   Supabase       │  │   Stripe Connect                        │
│                  │  │                                         │
│  PostgreSQL DB   │  │  Platform account (Tutelo)              │
│  Auth (JWT)      │  │  Connected accounts (teachers)          │
│  Storage         │  │  PaymentIntents (held/captured)         │
│  Realtime        │  │  Webhook endpoint                       │
└──────────────────┘  └─────────────────────────────────────────┘
          │
          ▼
┌──────────────────┐
│   Resend         │
│   (email)        │
│                  │
│  Transactional   │
│  email sending   │
└──────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With | Auth Model |
|-----------|---------------|-------------------|------------|
| Next.js App Router (RSC) | Page rendering, UI, server-side data fetching | Supabase (server client) | Supabase session cookie |
| Next.js API Routes (`/api/*`) | Stripe webhooks, Stripe account creation, payment actions | Supabase (service-role), Stripe SDK | Stripe webhook secret OR service-role key |
| Supabase PostgreSQL | Persistent data (users, teachers, bookings, availability, reviews) | Next.js (via client or server client) | RLS policies on JWT |
| Supabase Auth | User identity (teachers and parents), JWT issuance | Next.js Middleware, RSC, Server Actions | Session cookies |
| Supabase Storage | Profile photos, supporting documents | Next.js RSC/SC | Storage RLS policies |
| Stripe Connect Express | Teacher payment accounts, payment flow | `/api/stripe/*` routes only | Stripe-secret key server-side |
| Resend | Transactional email (booking notifications, money-waiting, confirmations) | `/api/*` routes and Server Actions | API key server-side |

### Key Architectural Decisions

**Server Components as Default**
All data-fetching pages (teacher profile `/[slug]`, booking management, dashboard) should be React Server Components using the Supabase server client. Client Components are reserved for interactive widgets: calendar picker, booking form state, real-time availability updates.

**Service-Role Client Strictly for API Routes**
The Supabase `service_role` key (bypasses RLS) must only ever be used in `/api/*` route handlers — never in Server Components, never in Client Components. This is the boundary that makes the architecture secure.

**Stripe in API Routes Only**
Stripe SDK is only ever instantiated server-side in `/api/stripe/*` route handlers. The Stripe secret key must never touch client-side code. The Stripe publishable key is safe in Client Components.

---

## Data Flow: Key Journeys

### Journey 1: Teacher Onboarding

```
1. Teacher signs up (Supabase Auth → email verification)
   └─ Creates: auth.users record

2. Teacher completes profile form (Server Action or API route)
   └─ Creates: teachers row (stripe_connected = false, stripe_account_id = null)
   └─ Creates: availability rows

3. Teacher profile goes live at /[slug]
   └─ Page is publicly accessible (anon-read RLS policy)
   └─ No Stripe connection required yet

4. Teacher optionally triggers Stripe Connect (from dashboard)
   └─ POST /api/stripe/connect/create
      └─ stripe.accounts.create({ type: 'express' })
      └─ UPDATE teachers SET stripe_account_id = acct_xxx
   └─ Redirect to Stripe-hosted onboarding link
      └─ stripe.accountLinks.create({ type: 'account_onboarding' })
   └─ Stripe redirects back to /dashboard?stripe=success
   └─ Webhook: account.updated fires when requirements completed
      └─ UPDATE teachers SET stripe_connected = true

State after step 3: Teacher has public page but stripe_connected = false
State after step 4: Teacher can receive payments
```

### Journey 2: Booking Request (Deferred Stripe Flow)

```
Parent visits /[slug] → selects time → fills booking form

1. Parent submits booking request
   ├─ If teacher.stripe_connected = false (deferred path):
   │   └─ INSERT bookings (status = 'requested', no payment_intent)
   │   └─ Send email to teacher: "You have a booking request + money waiting"
   │       └─ Email includes link to /dashboard/connect-stripe
   │   └─ Send email to parent: "Request received, pending teacher setup"
   │   └─ [TEACHER SEES DASHBOARD NOTIFICATION]
   │
   └─ If teacher.stripe_connected = true (direct path → Journey 3)

2. Teacher clicks email → /dashboard/connect-stripe
   └─ POST /api/stripe/connect/create (if no stripe_account_id)
       OR POST /api/stripe/connect/link (if account exists but incomplete)
   └─ Redirected to Stripe hosted onboarding

3. Stripe onboarding complete → webhook: account.updated
   └─ UPDATE teachers SET stripe_connected = true
   └─ Query: SELECT * FROM bookings WHERE teacher_id = X AND status = 'requested'
   └─ For each pending booking:
       └─ Create PaymentIntent (manual capture, amount = rate * duration)
       └─ UPDATE bookings SET status = 'pending', stripe_payment_intent = pi_xxx
       └─ Send email to parent: "Teacher ready — complete booking" + Stripe payment link
           OR send email with secure payment link /booking/[id]/pay

4. Parent completes payment (PaymentIntent confirm)
   └─ Webhook: payment_intent.succeeded (or payment_intent.amount_capturable_updated)
   └─ UPDATE bookings SET status = 'confirmed'
   └─ Send confirmation emails to both parties
```

### Journey 3: Direct Booking (Teacher Already Has Stripe)

```
1. Parent visits /[slug] → selects time → fills booking form
   ├─ Teacher is stripe_connected = true

2. POST /api/bookings/create
   └─ Validate slot availability (check bookings table for conflicts)
   └─ stripe.paymentIntents.create({ capture_method: 'manual', amount, ... })
       └─ on_behalf_of: teacher.stripe_account_id
       └─ application_fee_amount: platform_fee
       └─ transfer_data: { destination: teacher.stripe_account_id }
   └─ INSERT bookings (status = 'pending', stripe_payment_intent = pi_xxx)

3. Client-side: Stripe Elements confirm payment (card auth only, no capture)
   └─ stripe.confirmCardPayment(clientSecret)

4. Webhook: payment_intent.amount_capturable_updated
   └─ Funds authorized, not yet captured
   └─ UPDATE bookings SET status = 'confirmed' (or keep 'pending' until session)
   └─ Send confirmation emails

5. Session occurs

6. POST /api/bookings/[id]/complete (teacher marks complete OR scheduled job)
   └─ stripe.paymentIntents.capture(pi_xxx)
   └─ UPDATE bookings SET status = 'completed'
   └─ Send review request email to parent
```

### Journey 4: Cancellation

```
Either party cancels (with policy):

1. POST /api/bookings/[id]/cancel
   └─ Check cancellation window (business rule)
   └─ If refund warranted:
       └─ stripe.refunds.create({ payment_intent: pi_xxx })
       └─ Webhook: charge.refunded → UPDATE bookings SET status = 'cancelled'
   └─ If no refund (late cancellation):
       └─ stripe.paymentIntents.capture (capture to pay teacher) OR cancel
       └─ UPDATE bookings SET status = 'cancelled'
   └─ Send cancellation emails
```

---

## Database Architecture

### Schema with RLS Annotations

```sql
-- TEACHERS
-- Public read (anyone can view profiles)
-- Write only by owner
CREATE TABLE teachers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL UNIQUE,
  school      TEXT,
  city        TEXT,
  state       TEXT(2),
  subjects    TEXT[] DEFAULT '{}',
  grade_range TEXT[] DEFAULT '{}',
  hourly_rate NUMERIC(10,2) NOT NULL,
  bio         TEXT,
  photo_url   TEXT,
  -- Stripe fields
  stripe_account_id  TEXT,
  stripe_connected   BOOLEAN DEFAULT FALSE,
  -- Metadata
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- AVAILABILITY (teacher's recurring weekly slots)
CREATE TABLE availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  UNIQUE(teacher_id, day_of_week, start_time)
);

-- BOOKINGS
CREATE TABLE bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id            UUID NOT NULL REFERENCES teachers(id),
  parent_id             UUID REFERENCES auth.users(id),  -- nullable (guest parent)
  parent_email          TEXT NOT NULL,
  student_name          TEXT NOT NULL,
  subject               TEXT NOT NULL,
  booking_date          DATE NOT NULL,
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  status                TEXT NOT NULL DEFAULT 'requested'
                          CHECK (status IN ('requested','pending','confirmed','completed','cancelled')),
  stripe_payment_intent TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id),
  teacher_id  UUID NOT NULL REFERENCES teachers(id),
  parent_id   UUID REFERENCES auth.users(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
-- High-traffic lookup patterns
CREATE INDEX idx_teachers_slug ON teachers(slug);
CREATE INDEX idx_teachers_state_city ON teachers(state, city);
CREATE INDEX idx_teachers_subjects ON teachers USING GIN(subjects);
CREATE INDEX idx_bookings_teacher_date ON bookings(teacher_id, booking_date);
CREATE INDEX idx_bookings_parent_email ON bookings(parent_email);
CREATE INDEX idx_bookings_status ON bookings(status) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX idx_availability_teacher ON availability(teacher_id);
```

### RLS Policy Architecture

RLS requires `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all tables. The key principle: **anon role for public read, authenticated role with JWT claims for writes**.

**User role identification pattern:**
The cleanest approach for a two-role system is to store role in either `auth.users.raw_user_meta_data` (set at signup) or in a separate `profiles` table. For this app, store `role: 'teacher' | 'parent'` in user metadata.

```sql
-- Helper function (avoids re-querying on every policy check)
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'anon'
  )
$$ LANGUAGE sql STABLE;
```

**teachers table policies:**

```sql
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Anyone can read teacher profiles (public marketplace)
CREATE POLICY "teachers_public_read"
  ON teachers FOR SELECT
  USING (true);

-- Teachers can only insert their own record
CREATE POLICY "teachers_insert_own"
  ON teachers FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.user_role() = 'teacher');

-- Teachers can only update their own record
CREATE POLICY "teachers_update_own"
  ON teachers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No direct deletes (soft-delete or admin only)
CREATE POLICY "teachers_no_delete"
  ON teachers FOR DELETE
  USING (false);
```

**availability table policies:**

```sql
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Public can read availability (needed for booking calendar)
CREATE POLICY "availability_public_read"
  ON availability FOR SELECT
  USING (true);

-- Teachers manage only their own availability
CREATE POLICY "availability_teacher_write"
  ON availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = availability.teacher_id
        AND teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = availability.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );
```

**bookings table policies:**

```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Teachers can see their own bookings
CREATE POLICY "bookings_teacher_select"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = bookings.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );

-- Parents can see their own bookings (by user_id OR by email for guest)
CREATE POLICY "bookings_parent_select"
  ON bookings FOR SELECT
  USING (
    (parent_id IS NOT NULL AND parent_id = auth.uid())
    OR
    -- For guest bookings, match by email stored in JWT claim if set
    (parent_email = (auth.jwt() -> 'user_metadata' ->> 'email'))
  );

-- Anyone (including anon) can INSERT a booking request
-- The application layer validates teacher_id and slot before inserting
CREATE POLICY "bookings_insert_public"
  ON bookings FOR INSERT
  WITH CHECK (status = 'requested');  -- Can only create in 'requested' state

-- Teachers can update booking status (accept/cancel)
CREATE POLICY "bookings_teacher_update"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = bookings.teacher_id
        AND teachers.user_id = auth.uid()
    )
  );

-- IMPORTANT: Status transitions (requested → confirmed, etc.) are enforced
-- by the API route (server-side) using service_role, not by RLS alone.
-- RLS is a safety net; business logic lives in API routes.
```

**reviews table policies:**

```sql
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reviews are public
CREATE POLICY "reviews_public_read"
  ON reviews FOR SELECT
  USING (true);

-- Parents insert review only for their completed booking
CREATE POLICY "reviews_parent_insert"
  ON reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
        AND bookings.status = 'completed'
        AND (bookings.parent_id = auth.uid()
             OR bookings.parent_email = (auth.jwt() -> 'user_metadata' ->> 'email'))
    )
  );

-- No updates to reviews after submission
```

### Guest Parent Handling

Parents do not need to create accounts to submit booking requests. This is a deliberate UX decision. The tradeoff:

- `parent_id` is nullable in bookings
- RLS for guest parents is email-based (fragile for security-critical operations)
- For payment confirmation and review submission, parents receive a signed, time-limited URL (generated in the API route, stored as a token in bookings or a separate `booking_tokens` table)
- Stripe payment can be done via a payment link URL — no auth required

**Booking token pattern (recommended for guest payments):**

```sql
ALTER TABLE bookings ADD COLUMN payment_token UUID DEFAULT gen_random_uuid();
CREATE INDEX idx_bookings_payment_token ON bookings(payment_token);
```

The payment email contains `/booking/pay?token=[payment_token]` — the API route validates the token server-side using `service_role`, no auth needed.

---

## Stripe Connect Integration

### Account Types

Stripe Connect Express is the right choice here. It provides:
- Stripe-hosted onboarding UI (minimal code)
- Stripe handles KYC/identity verification
- Teachers have a Stripe dashboard
- Platform (Tutelo) can charge application fees

**MEDIUM confidence** — this matches Stripe's documented Express account model as of August 2025.

### Account Creation Flow

```typescript
// POST /api/stripe/connect/create
// Called when teacher initiates Stripe Connect

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Step 1: Create Express account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: teacher.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  business_type: 'individual',
});

// Step 2: Store account ID
await supabase
  .from('teachers')
  .update({ stripe_account_id: account.id })
  .eq('id', teacher.id);

// Step 3: Generate onboarding link
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/stripe/refresh`,
  return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/stripe/return`,
  type: 'account_onboarding',
});

// Step 4: Redirect teacher
return { url: accountLink.url };
```

### PaymentIntent Pattern (Manual Capture)

```typescript
// POST /api/bookings/create

const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(hourlyRate * sessionHours * 100), // cents
  currency: 'usd',
  capture_method: 'manual',  // CRITICAL: auth-only, don't capture yet
  on_behalf_of: teacher.stripe_account_id,
  application_fee_amount: Math.round(platformFeeAmount * 100),
  transfer_data: {
    destination: teacher.stripe_account_id,
  },
  metadata: {
    booking_id: booking.id,
    teacher_id: teacher.id,
  },
});
```

The `capture_method: 'manual'` is essential. It authorizes the card (holds funds) but does not charge. Capture happens after the session is completed.

### Key Webhook Events

All webhooks are received at `POST /api/stripe/webhook`. Stripe signature verification is required before processing.

```typescript
// POST /api/stripe/webhook
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const body = await req.text(); // MUST be raw text, not parsed JSON
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  switch (event.type) {
    // ... handle events
  }

  return new Response('OK', { status: 200 });
}
```

**Critical webhook events for Tutelo:**

| Event | When It Fires | Action |
|-------|--------------|--------|
| `account.updated` | Teacher completes Stripe onboarding | Check `details_submitted` + `charges_enabled` → set `stripe_connected = true`, process pending bookings |
| `payment_intent.amount_capturable_updated` | Card authorized successfully (manual capture) | Update booking status to `confirmed`, send confirmation emails |
| `payment_intent.payment_failed` | Card authorization failed | Update booking status to `cancelled`, notify parent |
| `payment_intent.succeeded` | Payment captured (after capture call) | Update booking to `completed`, trigger payout |
| `charge.refunded` | Refund processed | Update booking to `cancelled`, notify both parties |
| `account.application.deauthorized` | Teacher disconnects Stripe | Set `stripe_connected = false`, handle pending bookings |

**Webhook route configuration** — the webhook endpoint must not use Next.js body parsing. In App Router, raw body access requires reading `req.text()` before any parsing.

### Deferred Onboarding Technical Pattern

```typescript
// In webhook handler for account.updated

case 'account.updated': {
  const account = event.data.object as Stripe.Account;

  // Only act when account is fully enabled
  if (!account.details_submitted || !account.charges_enabled) break;

  // Update teacher record
  const { data: teacher } = await supabase
    .from('teachers')
    .update({ stripe_connected: true })
    .eq('stripe_account_id', account.id)
    .select('id, hourly_rate')
    .single();

  if (!teacher) break;

  // Find all pending booking requests for this teacher
  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('teacher_id', teacher.id)
    .eq('status', 'requested');

  // Create PaymentIntents for each pending booking and notify parents
  for (const booking of pendingBookings ?? []) {
    const pi = await stripe.paymentIntents.create({
      amount: calculateAmount(booking, teacher.hourly_rate),
      currency: 'usd',
      capture_method: 'manual',
      on_behalf_of: account.id,
      transfer_data: { destination: account.id },
      metadata: { booking_id: booking.id },
    });

    await supabase
      .from('bookings')
      .update({
        status: 'pending',
        stripe_payment_intent: pi.id
      })
      .eq('id', booking.id);

    // Send payment email to parent with payment link
    await resend.emails.send({
      to: booking.parent_email,
      subject: 'Your booking is almost confirmed — complete payment',
      // Include payment URL with booking token
    });
  }
  break;
}
```

### Application Fee Model

Tutelo earns revenue by taking an `application_fee_amount` on each PaymentIntent. This is deducted before the transfer to the teacher's account.

```
Parent pays: $60 (1 hour @ $60/hr)
Platform fee: $6 (10%)
Teacher receives: $54

stripe.paymentIntents.create({
  amount: 6000,        // $60.00
  application_fee_amount: 600,  // $6.00 → stays with Tutelo
  transfer_data: { destination: 'acct_teacher' }
  // $54.00 automatically transferred to teacher
})
```

---

## Build Order Recommendations

Build order is dictated by data dependencies and integration complexity. Each phase must deliver something demonstrably working.

### Phase 1: Foundation (Nothing works without this)

```
Auth system (Supabase Auth, middleware, session management)
  → Teachers table + RLS
  → Basic profile creation flow
  → Public /[slug] page (read-only)
```

**Rationale:** All other components depend on user identity and the teacher profile record. The public profile page is the app's core value proposition and validates the data model early.

### Phase 2: Availability & Booking Request

```
Availability table + RLS + CRUD
  → Availability display on /[slug] (calendar/slots)
  → Booking request form (no payment)
  → Bookings table + RLS
  → Email notification via Resend (to teacher: "you have a request")
```

**Rationale:** Proves the core loop works end-to-end before payment complexity is added. Also lets teachers test the product with real parents while Stripe setup is pending.

### Phase 3: Stripe Connect + Deferred Payment

```
Stripe Connect Express account creation
  → /api/stripe/connect/create endpoint
  → Teacher onboarding redirect flow
  → Webhook: account.updated handler
  → Process pending 'requested' bookings → create PaymentIntents
  → Payment link emails to parents
  → PaymentIntent confirmation (Stripe Elements or Payment Link)
  → Webhook: payment_intent.amount_capturable_updated → confirm booking
```

**Rationale:** Implements the "money waiting" deferred flow. This is the critical revenue path and the most complex. Isolating it in phase 3 after the non-payment flow works reduces risk.

### Phase 4: Direct Booking (Post-Stripe Path)

```
Direct booking flow (teacher.stripe_connected = true)
  → PaymentIntent creation at booking time
  → Stripe Elements on booking form
  → Immediate payment auth → confirmed booking
  → Session completion → payment capture
  → Review request email
```

**Rationale:** Builds on Phase 3's webhook infrastructure. Adds the smoother UX for established teachers.

### Phase 5: Dashboard & Reviews

```
Teacher dashboard (upcoming bookings, earnings, availability management)
  → Parent booking history
  → Review submission flow
  → Review display on /[slug]
```

**Rationale:** Dashboard is important but not blocking for core transactions. Reviews require completed bookings to exist.

### Dependency Graph

```
Auth + Teachers
      │
      ├─→ Availability
      │         │
      │         └─→ Booking Requests (no payment)
      │                   │
      │                   └─→ Stripe Connect (deferred)
      │                               │
      │                               └─→ Direct Booking
      │                                         │
      └────────────────────────────────────────→ Dashboard + Reviews
```

---

## Next.js App Router Patterns

### Server vs Client Component Strategy

```
app/
  [slug]/
    page.tsx           ← RSC (server): fetch teacher, availability
    BookingForm.tsx    ← 'use client': interactive form, Stripe Elements
  dashboard/
    page.tsx           ← RSC (server): fetch bookings list
    BookingCard.tsx    ← 'use client' if interactive, RSC if display-only
  api/
    stripe/
      webhook/
        route.ts       ← API Route (no auth, Stripe signature check)
      connect/
        create/
          route.ts     ← API Route (auth required)
    bookings/
      create/
        route.ts       ← API Route (validate + insert)
      [id]/
        complete/
          route.ts     ← API Route (teacher-only, auth required)
        cancel/
          route.ts     ← API Route (auth required)
```

### Supabase Client Instantiation Pattern

Three different clients for three different contexts:

```typescript
// lib/supabase/server.ts (RSC and Server Actions)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: ... } }
  )
}

// lib/supabase/service.ts (API Routes only — bypasses RLS)
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // never expose to client
)

// lib/supabase/client.ts (Client Components)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Middleware for Auth Protection

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Refresh session cookie on every request
  // Redirect to /login if accessing protected routes unauthenticated
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*'],
}
```

### Server Actions vs API Routes

Use **Server Actions** for: form submissions that require session auth (profile updates, availability management, review submission).

Use **API Routes** for: Stripe webhooks (no auth, raw body needed), Stripe account creation (need to return redirect URL), any endpoint called by external services.

**Do NOT use Server Actions for Stripe webhooks** — they require raw body access and no session context.

### Availability Calendar: Real-time with Supabase

For the booking calendar, the recommended pattern is:

1. **Initial load via RSC**: Fetch `availability` (recurring slots) and `bookings` (taken slots) server-side on the `/[slug]` page.
2. **Real-time updates via Supabase Realtime** (optional, only if concurrent booking is a concern): Subscribe to `bookings` table changes for the teacher in a Client Component.

```typescript
// In BookingCalendar.tsx ('use client')
useEffect(() => {
  const channel = supabase
    .channel('bookings-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bookings',
        filter: `teacher_id=eq.${teacherId}`,
      },
      (payload) => {
        // Remove newly booked slot from available slots
        setTakenSlots(prev => [...prev, payload.new]);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [teacherId]);
```

**Conflict prevention:** The database enforces uniqueness. Before inserting a booking, the API route should check for conflicts:

```sql
SELECT id FROM bookings
WHERE teacher_id = $1
  AND booking_date = $2
  AND status NOT IN ('cancelled')
  AND (start_time, end_time) OVERLAPS ($3, $4)
```

This is more reliable than relying on Realtime alone.

### Environment Variables

```bash
# Public (safe for client)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Server-only (never expose)
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_URL=https://tutelo.com  # for Stripe redirect URLs
```

---

## Sources and Confidence

| Finding | Confidence | Basis |
|---------|------------|-------|
| Stripe Connect Express account flow | MEDIUM | Training knowledge (Stripe API, August 2025). Verify against current Stripe docs at stripe.com/docs/connect/express-accounts |
| `capture_method: 'manual'` for session-based billing | MEDIUM | Well-established Stripe pattern. Verify at stripe.com/docs/payments/capture-later |
| Supabase RLS policy syntax | MEDIUM | Training knowledge. Verify at supabase.com/docs/guides/database/postgres/row-level-security |
| `@supabase/ssr` client patterns | MEDIUM | Training knowledge (post-`@supabase/auth-helpers` migration). Verify current package at supabase.com/docs/guides/auth/server-side/nextjs |
| Next.js App Router webhook raw body | HIGH | Well-established, stable Next.js App Router behavior |
| Build order / phase structure | HIGH | Derived from dependency analysis (logical, not empirical) |
| Supabase Realtime for availability | MEDIUM | Training knowledge. Verify at supabase.com/docs/guides/realtime |

**Note:** WebSearch and WebFetch were unavailable during this research session. All findings should be verified against current official documentation before implementation, particularly:
- Stripe Connect Express API (capabilities, account link types)
- `@supabase/ssr` package API (replaces `@supabase/auth-helpers`)
- Next.js 15 App Router specifics (any behavior changes from 14)
