# Stack Research: Tutelo

**Project:** Tutelo — tutoring marketplace / teacher side-hustle SaaS
**Researched:** 2026-03-03
**Sources:** Next.js 16 official docs (verified current), Next.js 16 release blog, Tailwind CSS v4 release blog, Next.js authentication guide

---

## Core Stack (Pre-Decided)

### Next.js — CURRENT VERSION: 16.1.6

**Status:** Verified via official docs fetched 2026-02-27.

**What changed from v15 that matters:**

| Change | Impact on Tutelo |
|--------|------------------|
| `middleware.ts` renamed to `proxy.ts` | Auth guard file must be named `proxy.ts`, export function named `proxy` |
| `middleware.ts` still works but is deprecated | Do not use — start with `proxy.ts` from day one |
| `params` and `searchParams` are now async | `await params` required in all route handlers and pages |
| `cookies()`, `headers()`, `draftMode()` are now async | `await cookies()` everywhere — sync access throws |
| Turbopack is now the DEFAULT bundler | No config needed; faster dev server out of the box |
| React Compiler (stable, opt-in) | Can enable `reactCompiler: true` in next.config.ts — reduces manual memoization |
| Cache Components + `use cache` directive | New opt-in caching model — do NOT use for MVP, too new |
| `cacheComponents: true` in next.config.ts | Enables Partial Prerendering (PPR) — skip for MVP |
| `next build` no longer runs linter | Must run ESLint separately or via npm script |
| Server Actions are now called "Server Functions" | Same API, different terminology in docs |

**Minimum requirements:** Node.js 20.9+, TypeScript 5.1+

**Installation:**
```bash
npx create-next-app@latest tutelo --yes
# Defaults: TypeScript, Tailwind, ESLint, App Router, Turbopack, @/* alias
```

**Confidence:** HIGH — verified from official Next.js 16 docs and release blog.

---

### Tailwind CSS — CURRENT VERSION: v4.0 (released January 22, 2025)

**Status:** Verified via official Tailwind CSS v4 release blog.

**What changed from v3:**

| Change | Impact on Tutelo |
|--------|------------------|
| Config is now CSS-first (`@theme` block), no `tailwind.config.js` needed | New setup pattern — no config file unless customizing |
| Install: `npm install -D tailwindcss @tailwindcss/postcss` | Different package from v3 |
| CSS entry: `@import "tailwindcss"` (replaces `@tailwind base/components/utilities`) | Single import line |
| Content detection is automatic — no `content` array needed | No manual glob patterns |
| CSS custom properties exposed for all design tokens | Design system is built-in |
| Container queries are first-class (`@container`, `@sm:`, `@lg:`) | Useful for teacher card components |

**PostCSS config:**
```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

**CSS entry:**
```css
/* app/globals.css */
@import 'tailwindcss';

@theme {
  /* Custom design tokens here if needed */
}
```

**shadcn/ui compatibility note:** shadcn/ui has v4 Tailwind support as of 2025. The `npx shadcn@latest init` CLI handles the Tailwind v4 setup automatically. Verify compatibility during initialization — LOW confidence on exact current shadcn version, but the ecosystem has broadly adopted v4.

**Confidence:** HIGH for Tailwind v4 itself. MEDIUM for shadcn/ui v4 compatibility (not directly verified from official docs in this session).

---

### Supabase Auth + Database

**Status:** Package names and SSR approach verified from Next.js auth guide (which explicitly references Supabase). Deep Supabase-specific docs could not be fetched due to permission constraints.

**Required packages:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

- `@supabase/supabase-js` — core client
- `@supabase/ssr` — SSR adapter for Next.js (handles cookie-based sessions, replaces the deprecated `@supabase/auth-helpers-nextjs`)

**Do NOT use:** `@supabase/auth-helpers-nextjs` — deprecated, replaced by `@supabase/ssr`.

**Key patterns (verified from Next.js auth guide):**

1. **Three Supabase client types are needed:**
   - `createBrowserClient` — for Client Components
   - `createServerClient` — for Server Components, Route Handlers, Server Actions
   - `createServerClient` in `proxy.ts` — for middleware auth refresh

2. **Cookie refresh in proxy.ts is critical.** Supabase sessions are JWT-based and expire. The proxy must refresh the session cookie on every request. Failing to do this causes users to be logged out seemingly at random.

3. **proxy.ts (formerly middleware.ts) setup:**
```typescript
// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Refresh session — REQUIRED
  const { data: { user } } = await supabase.auth.getUser()

  // Route protection logic here
  // ...

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

4. **Row Level Security (RLS) must be enabled** on all tables. Supabase Auth identity is only enforced at the database level via RLS — without it, anyone with the anon key can read any row.

5. **Server Component data fetching pattern:**
```typescript
// app/dashboard/page.tsx (Server Component)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  // ...
}
```

**Environment variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  # server-only, never expose
```

**Confidence:** MEDIUM — package names and patterns are consistent with official Next.js auth guide recommendations. Full Supabase SSR docs were not accessible to verify current package version numbers directly.

---

### Stripe Connect Express

**Status:** Core concepts verified from training knowledge; specific SDK version not confirmed via live docs in this session.

**Required packages:**
```bash
npm install stripe @stripe/stripe-js
```

- `stripe` — Node.js server SDK for API calls
- `@stripe/stripe-js` — client-side SDK (for Stripe Elements / embedded flows)

**Tutelo-specific Connect flow:**

```
Phase 1 (pre-Stripe): Parent submits booking request → stored in DB
↓
"Money waiting" trigger: First booking request arrives for teacher
↓
Teacher receives urgent email → clicks "Connect Stripe"
↓
Platform creates Connect account: stripe.accounts.create({ type: 'express' })
↓
Platform creates onboarding link: stripe.accountLinks.create({ type: 'account_onboarding' })
↓
Teacher completes Stripe Express onboarding (Stripe-hosted)
↓
Webhook: account.updated → check charges_enabled → mark teacher payment-ready in DB
↓
Phase 2 (post-Stripe): Parent enters payment → PaymentIntent with destination charge
↓
Session completed → Payment captured → Transfer to teacher minus 7% platform fee
```

**Critical Stripe Connect patterns:**

1. **Destination charges** (recommended for this model):
```typescript
// Charge parent, route to teacher, keep platform fee
const paymentIntent = await stripe.paymentIntents.create({
  amount: 4000, // $40.00 in cents
  currency: 'usd',
  transfer_data: {
    destination: teacher.stripe_account_id, // teacher's Connect account ID
  },
  application_fee_amount: 280, // 7% of $40 = $2.80
})
```

2. **Separate charges and transfers** (alternative if authorization/capture needed):
```typescript
// Authorize at booking
const paymentIntent = await stripe.paymentIntents.create({
  amount: 4000,
  currency: 'usd',
  capture_method: 'manual', // authorize only
})

// Capture when session is marked complete
await stripe.paymentIntents.capture(paymentIntent.id)

// Transfer to teacher
await stripe.transfers.create({
  amount: 3720, // $40 - 7% = $37.20
  currency: 'usd',
  destination: teacher.stripe_account_id,
})
```

The **authorize-then-capture + separate transfer** pattern is better for Tutelo because:
- Parents authorize at booking time but aren't charged until session is confirmed complete
- Teacher gets paid only after marking the session done
- Aligns with Tutelo's deferred model philosophy

3. **Webhook endpoint** (Route Handler):
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text() // MUST use .text(), not .json()
  const sig = request.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return new Response('Webhook error', { status: 400 })
  }

  switch (event.type) {
    case 'account.updated':
      // Check charges_enabled, update teacher record
      break
    case 'payment_intent.succeeded':
      // Mark booking as paid
      break
  }

  return new Response(null, { status: 200 })
}
```

4. **CRITICAL webhook gotcha:** Route Handlers process the body as a stream. Stripe signature verification requires the raw body bytes, so you MUST call `await request.text()` — never `request.json()`. In Next.js App Router this works correctly out of the box (unlike Pages Router which needed `bodyParser: false`).

5. **Two webhook endpoints needed:**
   - Platform webhook (account events, charge events)
   - Connect webhook (events from connected accounts, e.g., `payment_intent.payment_failed` on teacher's behalf)

**Environment variables:**
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Confidence:** MEDIUM — Core patterns are well-established and confirmed from training. Specific SDK version (likely stripe@17.x as of 2026) not live-verified.

---

### Vercel (Hosting)

**No special setup needed.** Deploy from GitHub, connect to Vercel dashboard. Key settings:

- Add all environment variables in Vercel dashboard
- Enable Vercel Speed Insights (free, built in) for performance monitoring
- Use Vercel's built-in image optimization (already included in Next.js)
- Stripe webhook endpoint needs public URL — use Vercel preview URLs for testing or stripe CLI for local dev

**Confidence:** HIGH — standard Vercel/Next.js deployment, no exotic configuration.

---

### Resend (Transactional Email)

**Status:** Integration pattern derived from official documentation structure and training knowledge. Exact current version not live-verified.

**Required packages:**
```bash
npm install resend react-email @react-email/components
```

- `resend` — Resend SDK for sending emails
- `react-email` + `@react-email/components` — Build email templates as React components
- These are the canonical Resend-recommended stack (Resend acquired react-email ecosystem)

**Usage pattern (Server Action or Route Handler):**
```typescript
// lib/email.ts
import { Resend } from 'resend'
import { BookingConfirmationEmail } from '@/emails/booking-confirmation'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingConfirmation({ teacherEmail, parentName, sessionDate }) {
  await resend.emails.send({
    from: 'Tutelo <notifications@tutelo.com>',
    to: teacherEmail,
    subject: 'New booking request — a parent is waiting',
    react: BookingConfirmationEmail({ parentName, sessionDate }),
  })
}
```

**Email template (React Email):**
```typescript
// emails/booking-confirmation.tsx
import { Body, Container, Html, Text, Button } from '@react-email/components'

export function BookingConfirmationEmail({ parentName, sessionDate }) {
  return (
    <Html>
      <Body>
        <Container>
          <Text>A parent ({parentName}) wants to book a session on {sessionDate}.</Text>
          <Button href="https://tutelo.com/dashboard">View Request</Button>
        </Container>
      </Body>
    </Html>
  )
}
```

**Email addresses needed:**
- `notifications@tutelo.com` — transactional (booking confirmations, reminders)
- `no-reply@tutelo.com` — system emails

Set up custom domain in Resend dashboard. Free tier: 100 emails/day, 3,000/month — sufficient for MVP.

**Confidence:** MEDIUM — pattern is standard and well-documented. Exact version of `resend` package not live-verified.

---

## Recommended Supporting Libraries

### Validation: Zod

**Recommendation: Use Zod for all schema validation.**

```bash
npm install zod
```

- The Next.js official auth guide explicitly uses Zod as the server-side validation example
- Validates Server Action inputs before hitting the database
- Validates Stripe webhook payloads
- Creates TypeScript types from schemas (single source of truth)
- Works in both Server Components and Client Components
- Current major version: v3.x (v4 may be available — verify on install)

**Usage pattern:**
```typescript
// lib/schemas.ts
import { z } from 'zod'

export const OnboardingSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  school: z.string().min(2).max(100),
  subjects: z.array(z.string()).min(1),
  gradeRange: z.tuple([z.number().min(1), z.number().max(12)]),
  hourlyRate: z.number().min(20).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(50),
})

export type OnboardingData = z.infer<typeof OnboardingSchema>
```

**Confidence:** HIGH — verified as canonical choice from Next.js official documentation.

---

### Form Handling: React Hook Form + Zod resolver

**Recommendation: Use React Hook Form with @hookform/resolvers for complex multi-step forms.**

```bash
npm install react-hook-form @hookform/resolvers
```

**Why React Hook Form over native form + useActionState:**

| Concern | Native Server Action Forms | React Hook Form |
|---------|---------------------------|-----------------|
| Multi-step wizard state | Complex to manage | Built-in field state |
| Client-side validation UX | Delayed (server round-trip) | Instant field-level errors |
| Complex field dependencies | Manual | Built-in watch/trigger |
| File upload with preview | Manual | Straightforward |
| Form state across steps | Requires extra state | Controller pattern |

For Tutelo's 4-step onboarding wizard, React Hook Form provides immediate validation feedback without server round-trips on every field blur. Use Server Actions only for final submission.

**Usage pattern:**
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { OnboardingSchema, type OnboardingData } from '@/lib/schemas'

export function OnboardingStep1() {
  const form = useForm<OnboardingData>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: { firstName: '', lastName: '' },
  })

  const onSubmit = async (data: OnboardingData) => {
    await submitOnboardingAction(data) // Server Action
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* fields */}
    </form>
  )
}
```

**Confidence:** HIGH — standard pattern, widely verified across ecosystem. RHF v7.x is current.

---

### UI Components: shadcn/ui

**Recommendation: Use shadcn/ui for all UI components.**

```bash
npx shadcn@latest init
```

- Not a library — copies component source into your project (`components/ui/`)
- Built on Radix UI primitives (accessible by default)
- Styled with Tailwind CSS v4 (compatible)
- Key components for Tutelo: Button, Input, Select, Calendar, Dialog, Form, Badge, Avatar, Tabs, Card
- Fully customizable since you own the source

**Do NOT use:** MUI, Chakra UI, Ant Design — heavyweight, not Tailwind-native, adds unnecessary bundle weight for a solo project.

**Confidence:** MEDIUM — shadcn/ui is the current standard choice for Next.js + Tailwind projects. v4 Tailwind compatibility assumed based on ecosystem activity but not directly verified from live docs.

---

### Date/Time: date-fns

**Recommendation: Use `date-fns` for all date manipulation.**

```bash
npm install date-fns
```

- Functional, tree-shakeable (only import what you use)
- No global date mutation (unlike Moment.js)
- Excellent TypeScript support
- Current version: v4.x
- Use for: formatting dates in emails, calculating session durations, 24hr reminder scheduling

**Do NOT use:** Moment.js (deprecated), dayjs (fine but date-fns is more tree-shakeable), Luxon (overkill for this use case).

**For timezone handling:** Add `date-fns-tz` if teachers and parents are in different timezones.
```bash
npm install date-fns-tz
```

**Confidence:** HIGH — date-fns is the standard choice, well-established.

---

### Scheduling/Availability UI: Custom with shadcn Calendar

**Recommendation: Build the weekly availability grid with a custom component, NOT a full scheduling library.**

**Why not a library:**
- Full calendar libraries (FullCalendar, react-big-calendar) are designed for event management, not availability selection
- Tutelo needs a simple "mark which time slots you're available" grid (weekday evenings + weekends)
- A custom component built on shadcn's `Calendar` + Tailwind grid is ~200 lines and fully owned

**What to build:**
```
[ Mon ] [ Tue ] [ Wed ] [ Thu ] [ Fri ] [ Sat ] [ Sun ]
   -       -       -       -       -    [ 9am ]  [ 9am ]
   -       -       -       -       -    [10am ]  [10am ]
[5pm ]  [5pm ]  [5pm ]  [5pm ]  [5pm ]  [11am ]  [11am ]
[6pm ]  [6pm ]  [6pm ]  [6pm ]  [6pm ]  [ 2pm ]  [ 2pm ]
[7pm ]  [7pm ]  [7pm ]  [7pm ]  [7pm ]    -        -
```

Store availability as: `{ dayOfWeek: number, startTime: string, endTime: string }[]`

**Parent booking view:** Use shadcn `Calendar` component to show available dates, then show time slots for the selected day.

**Confidence:** HIGH for "build it custom" recommendation. The complexity of integrating a full scheduling library isn't justified by this use case.

---

### State Management: Zustand (lightweight, when needed)

**Recommendation: Use Zustand only if you need client-side global state. Default to Server Components + React state.**

```bash
npm install zustand
```

**When you need Zustand in Tutelo:**
- Multi-step onboarding wizard state (holding data across steps before final submit)
- Teacher dashboard tab state

**Do NOT use:** Redux, Recoil, Jotai — overkill for this scope. React Context is fine for simple cases.

**When to NOT use Zustand:** If a Server Component or React useState works, use that first. Zustand is only for state that genuinely needs to live across multiple unrelated components.

**Confidence:** HIGH — Zustand is the lightweight standard for Next.js App Router projects.

---

### Slug Generation: slugify

**Recommendation: Use `slugify` for generating teacher URL slugs.**

```bash
npm install slugify
```

- Converts "Ms. Jennifer Johnson" → "ms-jennifer-johnson"
- Handles special characters, accents, unicode
- Check slug uniqueness in DB before saving

**Confidence:** HIGH — standard library, straightforward use.

---

## Key Integrations

### Supabase Auth + Next.js App Router

**The critical pattern to get right from day one:**

```
User hits any route
↓
proxy.ts runs (on every request)
↓
Supabase session cookie is refreshed (JWT rotation)
↓
Route is protected or allowed through
↓
Server Component reads user from await supabase.auth.getUser()
```

**What breaks if you get this wrong:**
- Not refreshing cookies in proxy → users randomly logged out after JWT expiry
- Using `supabase.auth.getSession()` instead of `supabase.auth.getUser()` → insecure, doesn't verify with server
- Creating a Supabase client without cookie handling in Server Components → always unauthenticated

**Google SSO setup:**
1. Enable Google provider in Supabase Auth settings
2. Add Google OAuth credentials (Client ID + Secret) in Supabase dashboard
3. Add redirect URL: `https://[project].supabase.co/auth/v1/callback`
4. No code needed — Supabase handles the OAuth flow

**Supabase client helper file (copy this pattern):**
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch { /* Called from Server Component — cookies are read-only */ }
        },
      },
    }
  )
}

// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

### Stripe Connect Express Setup

**Account creation flow (triggered by first booking request):**

```typescript
// app/api/stripe/connect/route.ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const { teacherId } = await request.json()

  // 1. Create Express account
  const account = await stripe.accounts.create({
    type: 'express',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })

  // 2. Save account ID to teacher record in Supabase
  await supabase.from('teachers').update({
    stripe_account_id: account.id
  }).eq('id', teacherId)

  // 3. Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect/retry`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect/success`,
    type: 'account_onboarding',
  })

  return Response.json({ url: accountLink.url })
}
```

**Webhook handling for account completion:**

```typescript
// Key events to handle:
// account.updated → check account.charges_enabled → mark teacher payment-ready
// payment_intent.succeeded → confirm booking paid
// payment_intent.payment_failed → notify teacher/parent
// transfer.created → log payout to teacher
```

---

### Resend + Next.js Integration Pattern

**Trigger emails from Server Actions (not Route Handlers):**

```typescript
// app/actions/notifications.ts
'use server'

import { Resend } from 'resend'
import { MoneyWaitingEmail } from '@/emails/money-waiting'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendMoneyWaitingEmail({ teacher, parent, session }) {
  await resend.emails.send({
    from: 'Tutelo <notifications@tutelo.com>',
    to: teacher.email,
    subject: `A parent is waiting to pay you — connect Stripe now`,
    react: MoneyWaitingEmail({ teacher, parent, session }),
  })
}
```

**Email types needed for Tutelo:**

| Email | Trigger | Recipient |
|-------|---------|-----------|
| Booking request received | Parent submits request | Teacher |
| Money waiting (urgency) | First booking request | Teacher |
| Follow-up (24hr, 48hr, 72hr) | No Stripe connection | Teacher |
| Booking confirmation | Stripe connected + booking confirmed | Both |
| Session reminder (24hr before) | Scheduled job | Both |
| Session complete + review prompt | Teacher marks complete | Parent |
| Cancellation | Either party cancels | Both |

**Scheduled emails:** Resend itself doesn't schedule. Use Vercel Cron Jobs (free up to 2 jobs) or a Supabase Edge Function cron to send reminder emails.

---

## Gotchas & Watch Out For

### CRITICAL: proxy.ts not middleware.ts

**In Next.js 16, the file is `proxy.ts` not `middleware.ts`.** Export function must be named `proxy`. The old `middleware.ts` still works but is deprecated. Starting with the deprecated name will create technical debt immediately.

### CRITICAL: Async params and cookies

**All Next.js 16 dynamic APIs are async:**
```typescript
// WRONG (throws in Next.js 16):
const { slug } = params
const cookieStore = cookies()

// CORRECT:
const { slug } = await params
const cookieStore = await cookies()
```

This is a frequent source of runtime errors when following older tutorials (pre-2025).

### CRITICAL: Supabase cookie refresh in proxy.ts

The Supabase session is stored as a JWT in cookies. JWTs expire. The proxy.ts MUST refresh the token on every request and propagate the updated cookie. Missing this step causes silent auth failures — users appear logged out even though they just signed in.

### CRITICAL: Stripe webhook needs raw body

```typescript
// CORRECT — raw body for signature verification:
const body = await request.text()
const event = stripe.webhooks.constructEvent(body, sig, secret)

// WRONG — JSON parsing destroys raw bytes:
const body = await request.json() // Don't do this for webhook handler
```

### Stripe Connect: Two webhook secrets

Platform webhooks (e.g., when your platform's account events happen) use one secret. Connect webhooks (events from connected teacher accounts) use a different secret. Set both:
```bash
STRIPE_WEBHOOK_SECRET=whsec_platform_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_connect_...
```

### Supabase RLS: Not optional

Row Level Security must be enabled on every table. Without it, the anon key (which is public in `NEXT_PUBLIC_`) can read all data. Every table needs a policy. Failing to do this is a data breach.

**Minimum RLS policy pattern:**
```sql
-- Teachers can only see their own bookings
CREATE POLICY "teachers_own_bookings" ON bookings
  FOR ALL USING (teacher_id = auth.uid());

-- Public can view published teacher profiles
CREATE POLICY "public_teacher_profiles" ON teachers
  FOR SELECT USING (is_published = true);
```

### Tailwind v4: No tailwind.config.js by default

Older documentation, blog posts, and shadcn/ui guides may reference `tailwind.config.js`. In v4, configuration moves to the CSS file via `@theme`. Don't create a `tailwind.config.js` unless shadcn/ui's init CLI explicitly creates one.

### Supabase: Never use getSession() for auth checks

`supabase.auth.getSession()` reads from the local cookie without verifying with Supabase servers. This means it can be spoofed. Always use `supabase.auth.getUser()` for security-sensitive checks (protected routes, authorization in Server Actions).

### Next.js 16: params is Promise in Route Handlers

```typescript
// OLD (breaks in Next.js 16):
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { slug } = params
}

// CORRECT:
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
}
```

### Stripe Connect: charges_enabled vs payouts_enabled

After a teacher completes onboarding, check `account.charges_enabled` (can accept charges) not just `account.details_submitted`. `details_submitted` can be true while `charges_enabled` is still false (e.g., pending bank verification).

### Do not enable cacheComponents for MVP

Next.js 16's `cacheComponents: true` (enabling Partial Prerendering) changes the entire caching model and requires careful `use cache` / `<Suspense>` placement. This is a powerful feature but introduces cognitive complexity inappropriate for a solo build under time pressure. Leave it disabled.

---

## Confidence Levels

| Area | Confidence | Source | Notes |
|------|------------|--------|-------|
| Next.js version (16.1.6) | HIGH | Official docs fetched 2026-02-27 | Confirmed current |
| Next.js proxy.ts rename | HIGH | Official Next.js 16 blog + docs | Breaking change confirmed |
| Next.js async params/cookies | HIGH | Official Next.js 16 breaking changes | Critical pattern |
| Tailwind CSS v4 | HIGH | Official Tailwind v4 release blog | Released Jan 22, 2025 |
| Tailwind v4 + Next.js setup | HIGH | Official Next.js CSS docs | Verified current |
| shadcn/ui v4 compatibility | MEDIUM | Not directly verified | Assumed based on ecosystem |
| Supabase @supabase/ssr package | MEDIUM | Referenced in Next.js auth guide | Exact version not verified |
| Supabase proxy.ts pattern | MEDIUM | Extrapolated from Next.js auth guide + known Supabase patterns | Core pattern stable |
| Supabase RLS requirement | HIGH | Known security requirement, well-documented | Not version-specific |
| Stripe Connect Express flow | MEDIUM | Training knowledge; live Stripe docs inaccessible | Core APIs stable |
| Stripe webhook raw body | HIGH | Next.js Route Handler docs confirm .text() pattern | Confirmed pattern |
| Resend + react-email | MEDIUM | Training knowledge; live Resend docs inaccessible | Standard Resend stack |
| React Hook Form | HIGH | Well-established, consistent across ecosystem | Version details not live-verified |
| Zod | HIGH | Explicitly referenced in official Next.js auth docs | Current recommendation |
| date-fns | HIGH | Well-established choice | Version details not live-verified |
| Zustand | HIGH | Well-established choice for Next.js | Version details not live-verified |

---

## Installation Summary

```bash
# Core (all pre-decided)
npx create-next-app@latest tutelo
# Creates: Next.js 16, TypeScript, Tailwind v4, ESLint, App Router, Turbopack

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Stripe
npm install stripe @stripe/stripe-js

# Email
npm install resend react-email @react-email/components

# Validation
npm install zod

# Forms
npm install react-hook-form @hookform/resolvers

# Dates
npm install date-fns date-fns-tz

# Slugs
npm install slugify

# State (add when needed)
npm install zustand

# UI components (interactive — not npm install)
npx shadcn@latest init
```

## Sources

- Next.js 16 Official Documentation: https://nextjs.org/docs (fetched 2026-02-27)
- Next.js 16 Release Blog: https://nextjs.org/blog/next-16 (published October 21, 2025)
- Next.js Authentication Guide: https://nextjs.org/docs/app/guides/authentication
- Next.js Forms Guide: https://nextjs.org/docs/app/guides/forms
- Next.js CSS Guide: https://nextjs.org/docs/app/getting-started/css
- Next.js Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js Proxy (Middleware): https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Tailwind CSS v4 Blog: https://tailwindcss.com/blog/tailwindcss-v4
