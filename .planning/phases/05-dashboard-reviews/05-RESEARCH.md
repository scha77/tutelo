# Phase 5: Dashboard + Reviews - Research

**Researched:** 2026-03-10
**Domain:** Next.js App Router dashboard UI, token-based review flow, PostgreSQL aggregation queries
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard home (`/dashboard`):**
- Becomes a real overview screen replacing the current redirect to `/dashboard/page`
- Stats bar: Total Earned (all-time) | Upcoming (count of confirmed) | Students (unique count)
- Upcoming sessions: show next 3 confirmed sessions, "View all sessions →" link to `/dashboard/sessions`
- Latest reviews: show 1–2 most recent reviews with star rating + excerpt, "View profile →" link to public page
- No month-scoped breakdowns — all-time totals only

**Session history (`/dashboard/sessions`):**
- New dedicated route; added to sidebar nav
- Confirmed sessions move here from `/dashboard/requests` — requests page becomes pending-only
- Two sections: Upcoming (confirmed, ascending date, Mark Complete button) and Past (completed, descending date)
- Per completed row: student name, subject, date, amount earned, review status (stars or "No review yet")

**Student list (`/dashboard/students`):**
- Separate route `/dashboard/students` with own sidebar nav item
- A "student" = unique (student_name, parent_email) pairing, grouped across sessions
- Per row: student name, subject(s), sessions completed count
- No contact/message actions for MVP — read-only

**Review submission flow:**
- Review link: `/review/[token]` — token-based, no login required
- Token stored in `reviews` table (or `review_tokens` table), invalidated on submission, no expiry for MVP
- Review form: 1–5 star rating (required) + optional text field
- After submit: inline success state ("Thanks! Your review has been posted."), no redirect, token invalidated

**Review display on `/[slug]`:**
- Reviews section only when at least 1 review exists — hidden entirely for zero reviews
- Header: aggregate rating + count (e.g. `4.9 ★ (12 reviews)`)
- Show 5 most recent reviews — no pagination
- Per review card: star rating, optional text, reviewer first name + date (e.g. `Sarah K. · March 2026`)
- Parent privacy: first name only

### Claude's Discretion

- Exact layout and styling of the dashboard home stats bar (cards, grid, colors)
- Empty states for sessions page (no upcoming, no past) and students page (no students yet)
- Sidebar nav ordering for new items (Sessions, Students)
- `review_tokens` table structure vs embedding token on `reviews` row
- How to extract reviewer first name (from parent_email prefix, or ask on review form)
- Mobile layout for the `/review/[token]` form page

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Teacher can view upcoming sessions | New `/dashboard/sessions` route with Upcoming section; reuses `ConfirmedSessionCard`; RSC query for `status = 'confirmed'` bookings |
| DASH-03 | Teacher can view earnings (completed sessions and total payout) | Supabase `.sum()` or raw SQL aggregate on `bookings` where `status = 'completed'`; displayed on dashboard home stats bar |
| DASH-04 | Teacher can view student list (name, subject, sessions completed) | New `/dashboard/students` route; GROUP BY (student_name, parent_email) aggregate query |
| DASH-05 | Teacher can mark a session as complete | `markSessionComplete` already exists in `@/actions/bookings`; Phase 5 wires in review token generation + updated `sendSessionCompleteEmail` call |
| REVIEW-01 | Parent can leave 1–5 star rating and optional text review after completed session | `/review/[token]` public route + Server Action to submit; `reviews` table already exists, needs `token` + `token_used_at` columns |
| REVIEW-02 | Reviews displayed on teacher's public landing page | `ReviewsSection` component added to `/[slug]/page.tsx`; RSC query for 5 most recent reviews + aggregate |
| REVIEW-03 | Review prompt delivered via email after session completion | `SessionCompleteEmail.tsx` already has `reviewUrl` prop; `sendSessionCompleteEmail` already sends it; Phase 5 switches from stub URL to real `/review/[token]` |
</phase_requirements>

---

## Summary

Phase 5 is primarily a UI/data-assembly phase — almost all the hard infrastructure (Stripe capture, email templates, reviews table, booking state machine) was built in Phases 1–4. The work is: reorganizing the dashboard into a real overview, adding two new routes, wiring the existing `SessionCompleteEmail` to real review tokens, and adding reviews to the public profile page.

The most technically interesting piece is the token-based review flow. The `reviews` table already exists from the Phase 1 schema but lacks `token` and `token_used_at` columns. The `sendSessionCompleteEmail` function already fires on mark-complete and already constructs a `reviewUrl` — it currently uses a stub (`/review?booking=bookingId`). Phase 5 replaces that stub with a real `/review/[token]` URL, which requires token generation at mark-complete time and a new migration to add the token columns.

The dashboard queries are straightforward Supabase JS aggregations, but require attention to the amount-earned calculation: the `bookings` table stores no `amount` column directly — earnings must come from Stripe's captured amount or an `amount_cents` column needs to be added. This is the key schema gap to resolve.

**Primary recommendation:** Add a `amount_cents` column to `bookings` at the time of payment capture (Phase 3 already captures via Stripe). Phase 5 migration adds this if missing, then populates from captured PaymentIntents for existing rows. All earnings displays read `amount_cents` directly from the DB — no live Stripe calls needed for the dashboard.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Next.js App Router | 16.1.6 | RSC pages, Server Actions, dynamic routes | All patterns already established in codebase |
| Supabase JS (`@supabase/ssr`) | 0.9.0 | DB queries, RLS | Use `createClient()` (server) for RSC pages, `supabaseAdmin` for Server Actions with no session |
| React Hook Form + Zod | 7.x / 4.x | Review submission form | Zod v4 RFC 4122 UUID pattern applies to test data |
| date-fns + date-fns-tz | 4.x / 3.x | Date formatting in teacher timezone | Use `formatInTimeZone` as established |
| Tailwind v4 + shadcn/ui | CSS-first | UI layout, stats cards, star rating | No `tailwind.config.js`; use `@theme` and CSS vars |
| Resend + react-email | 6.x / 1.x | Review prompt email (already wired) | `SessionCompleteEmail.tsx` already exists |
| Lucide React | 0.577.0 | Icons (Star, TrendingUp, Users, etc.) | Already installed |
| sonner | 2.x | Toast notifications | Already used in `ConfirmedSessionCard` |
| crypto (Node built-in) | — | Token generation | `crypto.randomBytes(32).toString('hex')` — no new dep |

### No New Dependencies Required

Phase 5 requires no new `npm install`. All needed libraries are already in `package.json`. The star rating UI can be built with plain HTML + Tailwind (no rating library needed for a simple 1–5 click pattern).

---

## Architecture Patterns

### Recommended File Structure (new files only)

```
src/
├── app/
│   ├── (dashboard)/dashboard/
│   │   ├── page.tsx                          # REPLACE: real overview (was redirect)
│   │   ├── sessions/
│   │   │   └── page.tsx                      # NEW: Upcoming + Past sessions
│   │   └── students/
│   │       └── page.tsx                      # NEW: Student list
│   └── review/
│       └── [token]/
│           └── page.tsx                      # NEW: Public review form (no auth)
├── components/
│   ├── dashboard/
│   │   ├── StatsBar.tsx                      # NEW: Total Earned / Upcoming / Students cards
│   │   └── ReviewPreviewCard.tsx             # NEW: Mini review card for dashboard home
│   └── profile/
│       └── ReviewsSection.tsx                # NEW: Reviews on /[slug]
├── actions/
│   └── reviews.ts                            # NEW: submitReview server action
└── emails/
    └── SessionCompleteEmail.tsx              # MODIFY: reviewUrl now uses /review/[token]
supabase/migrations/
└── 0006_phase5_reviews.sql                   # NEW: token + amount_cents columns
```

### Pattern 1: RSC Dashboard Pages with Client Islands

All three dashboard pages (`/dashboard`, `/dashboard/sessions`, `/dashboard/students`) follow the existing RSC shell + client island pattern. The RSC page does the DB query and passes data as props to client components that handle interactivity.

```typescript
// src/app/(dashboard)/dashboard/sessions/page.tsx — RSC shell
export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const userId = claimsData.claims.sub
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, timezone')
    .eq('user_id', userId)
    .maybeSingle()
  if (!teacher) redirect('/onboarding')

  const { data: upcoming } = await supabase
    .from('bookings')
    .select('id, student_name, subject, booking_date, start_time, parent_email')
    .eq('teacher_id', teacher.id)
    .eq('status', 'confirmed')
    .order('booking_date', { ascending: true })

  const { data: past } = await supabase
    .from('bookings')
    .select('id, student_name, subject, booking_date, amount_cents, reviews(rating)')
    .eq('teacher_id', teacher.id)
    .eq('status', 'completed')
    .order('booking_date', { ascending: false })

  return (
    <div className="p-6 max-w-2xl">
      {/* Upcoming uses existing ConfirmedSessionCard (client component) */}
      {/* Past is a new read-only component */}
    </div>
  )
}
```

### Pattern 2: Token-Based Review Flow

Token generated at mark-complete time, stored on the `reviews` table, consumed by the public `/review/[token]` route.

```typescript
// In markSessionComplete (actions/bookings.ts) — MODIFIED
import { randomBytes } from 'crypto'

// After status updated to 'completed':
const reviewToken = randomBytes(32).toString('hex')
await supabase
  .from('reviews')
  .insert({
    booking_id: bookingId,
    teacher_id: teacher.id,
    token: reviewToken,
    // rating, text null until parent submits
  })

// Pass token to email (not bookingId)
sendSessionCompleteEmail(bookingId, reviewToken).catch(console.error)
```

```typescript
// src/app/review/[token]/page.tsx — RSC shell
export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()  // or supabaseAdmin for service role

  const { data: review } = await supabase
    .from('reviews')
    .select('id, token_used_at, booking_id, bookings(student_name, teachers(full_name))')
    .eq('token', token)
    .maybeSingle()

  if (!review) return <div>Invalid review link.</div>
  if (review.token_used_at) return <div>This review has already been submitted.</div>

  // Pass review id + booking context to client form component
  return <ReviewForm reviewId={review.id} ... />
}
```

```typescript
// src/actions/reviews.ts — Server Action
'use server'
export async function submitReview(reviewId: string, rating: number, text: string | null) {
  const supabase = createServiceClient() // supabaseAdmin — no user session on public route
  const { error } = await supabase
    .from('reviews')
    .update({
      rating,
      text,
      token_used_at: new Date().toISOString(),
      reviewer_name: // extracted from parent_email or form input
    })
    .eq('id', reviewId)
    .is('token_used_at', null) // idempotency guard
  if (error) return { error: error.message }
  revalidatePath('/[slug]', 'page') // surface review on public profile immediately
  return { success: true }
}
```

### Pattern 3: Earnings Aggregate Query

Supabase JS does not expose `.sum()` in the JS client directly. Two approaches:

**Option A: PostgreSQL aggregate via `.select()` with Postgres functions (RECOMMENDED)**
```typescript
// Supabase JS supports raw column expressions in select
const { data } = await supabase
  .from('bookings')
  .select('amount_cents')
  .eq('teacher_id', teacher.id)
  .eq('status', 'completed')
// Sum client-side — safe because count is bounded to one teacher's sessions
const totalEarned = (data ?? []).reduce((sum, b) => sum + (b.amount_cents ?? 0), 0)
```

**Option B: Supabase RPC (if session count could be large)**
```sql
-- Not needed for MVP — a teacher is unlikely to have >1000 completed sessions
```

Client-side reduce is fine for MVP. Supabase PostgREST does support `?select=amount_cents.sum()` in newer versions but the JS client API for this is less stable — avoid for simplicity.

### Pattern 4: Student List Aggregation

Group bookings by (student_name, parent_email) client-side after fetching completed bookings:

```typescript
const { data: completedBookings } = await supabase
  .from('bookings')
  .select('student_name, parent_email, subject')
  .eq('teacher_id', teacher.id)
  .eq('status', 'completed')

// Group client-side
const studentMap = new Map<string, { name: string; email: string; subjects: Set<string>; count: number }>()
for (const b of completedBookings ?? []) {
  const key = `${b.student_name}|${b.parent_email}`
  const existing = studentMap.get(key)
  if (existing) {
    existing.subjects.add(b.subject)
    existing.count++
  } else {
    studentMap.set(key, { name: b.student_name, email: b.parent_email, subjects: new Set([b.subject]), count: 1 })
  }
}
const students = Array.from(studentMap.values())
```

This is safe at MVP volume. Move to a DB view or RPC if performance becomes an issue post-launch.

### Pattern 5: Reviews on Public Profile (`/[slug]`)

The `reviews_public_read` RLS policy already allows public select on the `reviews` table. The RSC page adds a query alongside the existing teacher fetch:

```typescript
const { data: reviews } = await supabase
  .from('reviews')
  .select('id, rating, text, reviewer_name, created_at')
  .eq('teacher_id', teacher.id)
  .not('rating', 'is', null)        // only submitted reviews (token not yet used = null rating)
  .order('created_at', { ascending: false })
  .limit(5)
```

### Anti-Patterns to Avoid

- **Using `supabase.auth.getUser()` on the public `/review/[token]` route:** This route is unprotected. Use `supabaseAdmin` (service role) for DB operations since there is no user session. The `supabase.auth.getClaims()` pattern is for authenticated teacher routes only.
- **Live Stripe API calls for earnings display:** Never call `stripe.paymentIntents.retrieve()` for each completed session to build the earnings view. Store `amount_cents` in the `bookings` table at capture time. This was deferred in Phase 3 but must be added in Phase 5.
- **Storing the review token on a separate `review_tokens` table:** Adds complexity with no MVP benefit. Embed `token` and `token_used_at` columns directly on the `reviews` row. The `reviews` table already has `UNIQUE (booking_id)` so one token per booking is enforced by the schema.
- **Redirecting after review submission:** The decision is inline success state on same page. A redirect would break the "no duplicate submission" UX since the token is already invalidated.
- **Not invalidating the token atomically:** The `.is('token_used_at', null)` guard in the Server Action is mandatory — it prevents a double-submission race condition if the parent clicks the button twice.

---

## Database Changes (Migration 0006)

The Phase 5 migration must add:

```sql
-- 0006_phase5_reviews.sql

-- Add token-based review columns to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS token TEXT UNIQUE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS token_used_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- Make rating nullable (token-stub rows created at mark-complete, rating filled on submission)
ALTER TABLE reviews ALTER COLUMN rating DROP NOT NULL;
-- Add back: rating must be 1-5 when present
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range
  CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);

-- Add amount_cents to bookings for earnings display
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_cents INTEGER;

-- Index for token lookup on public review route
CREATE INDEX IF NOT EXISTS idx_reviews_token ON reviews (token) WHERE token IS NOT NULL;

-- RLS: allow service role to insert review stub at mark-complete time
-- (existing reviews_parent_insert policy requires auth.uid() = parent_id — won't work for guest parents)
-- Add a service-role bypass or update insert policy
DROP POLICY IF EXISTS "reviews_parent_insert" ON reviews;

CREATE POLICY "reviews_insert_token_stub"
  ON reviews FOR INSERT
  WITH CHECK (true);
  -- Service role bypasses RLS anyway; this is a fallback for authenticated inserts

-- Update reviews_public_read to only show submitted reviews (rating IS NOT NULL)
DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read"
  ON reviews FOR SELECT
  USING (rating IS NOT NULL);

-- Allow token-based update (public review submission via service role)
-- Service role bypasses RLS; no additional policy needed for supabaseAdmin calls
```

**Critical schema insight:** The existing `reviews_parent_insert` policy requires `parent_id = auth.uid()`, but review stubs are created server-side in `markSessionComplete` (no parent session), and review submissions come from an unauthenticated token route. Both must use `supabaseAdmin` (service role), which bypasses RLS entirely. The RLS policies for `reviews` can be simplified accordingly.

**amount_cents population:** For existing completed bookings from Phase 3/4, `amount_cents` will be NULL initially. The sessions page should handle `null` with a fallback display (`—` or `$0.00`). Going forward, `markSessionComplete` in `actions/bookings.ts` writes `amount_cents` from `amountToCapture` at the time of capture.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique review token | Custom UUID-based token | `crypto.randomBytes(32).toString('hex')` | URL-safe, 256-bit entropy, built into Node |
| Star rating UI | External star-rating library | Plain HTML + Tailwind + click handler | Simple 5-star click — no library needed, no extra dep |
| Earnings totals | Stripe API calls at render time | `amount_cents` column on `bookings` + client reduce | DB query is O(n sessions), Stripe calls are n network round-trips |
| Student grouping | Separate `students` table | Client-side grouping of `bookings` | No new data, no sync complexity, safe at MVP volume |
| Review token expiry | Cron job to expire old tokens | No expiry for MVP (explicitly decided in CONTEXT.md) | Parent may wait weeks to click; implement if abuse is observed |

---

## Common Pitfalls

### Pitfall 1: `rating NOT NULL` on existing `reviews` table
**What goes wrong:** The Phase 1 schema has `rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5)`. If you try to insert a review stub (with `null` rating) at mark-complete time, the insert fails with a NOT NULL violation.
**Why it happens:** The token-stub approach — create the review row at mark-complete time, fill in the rating on submission — requires `rating` to be nullable.
**How to avoid:** Migration 0006 must `ALTER COLUMN rating DROP NOT NULL` and add a nullable-aware check constraint before any code attempts to insert stubs.

### Pitfall 2: `sendSessionCompleteEmail` uses stub URL
**What goes wrong:** The existing `sendSessionCompleteEmail` in `src/lib/email.ts` constructs `reviewUrl = \`${appUrl}/review?booking=${bookingId}\`` — this is the Phase 3 stub. Phase 5 must update this function signature to accept `reviewToken` and produce `/review/${reviewToken}`.
**Why it happens:** Phase 3 STATE.md note: "review URL stub /review?booking=bookingId in SessionCompleteEmail — link embedded so parent has it once Phase 5 ships the actual review flow."
**How to avoid:** Update `sendSessionCompleteEmail(bookingId, reviewToken)` signature. Update the caller in `markSessionComplete` to generate the token first, insert the review stub, then pass the token to the email function.

### Pitfall 3: RLS blocks service-role review stub insert
**What goes wrong:** `reviews_parent_insert` policy uses `parent_id = auth.uid()`. If `markSessionComplete` uses the standard `createClient()` (which runs as the teacher user), the insert of a review stub (with `parent_id = null` for guest parents) fails the RLS check.
**Why it happens:** The teacher's auth.uid() ≠ `parent_id`.
**How to avoid:** `markSessionComplete` must use `supabaseAdmin` for the review stub insert (consistent with other webhook/server-action patterns in the codebase that use `supabaseAdmin`). Migration 0006 also simplifies the RLS policy.

### Pitfall 4: Dashboard home queries — 4 separate DB round-trips
**What goes wrong:** The dashboard home overview needs: upcoming count, total earnings, student count, and 2 recent reviews. Naive implementation fires 4 separate `await supabase.from(...)` calls sequentially.
**How to avoid:** Use `Promise.all()` to parallelize all four queries in the RSC page. This is standard practice in the codebase (see `requests/page.tsx` which does multiple fetches). Four parallel queries at ~10ms each is fine; four sequential queries at 40ms+ is noticeable.

### Pitfall 5: `ConfirmedSessionCard` disappears from requests page without appearing on sessions page
**What goes wrong:** The plan is to move confirmed sessions from `/dashboard/requests` to `/dashboard/sessions`. If you remove the confirmed section from `requests/page.tsx` before `/dashboard/sessions` exists, teachers lose access to their confirmed sessions during the deployment window.
**How to avoid:** Plan 05-01 creates `/dashboard/sessions` first, then Plan 05-01 (or same task) removes the confirmed section from `/dashboard/requests`. Deploy as a single atomic change (one commit per plan in yolo mode).

### Pitfall 6: `revalidatePath` scope after review submission
**What goes wrong:** After a parent submits a review via `/review/[token]`, the new review won't appear on the teacher's public page unless the `/[slug]` cache is invalidated.
**How to avoid:** `submitReview` server action calls `revalidatePath('/[slug]', 'page')` — but the slug isn't known in that action. Use `revalidatePath('/', 'layout')` to bust all pages, or join the teacher slug in the review query and call `revalidatePath(\`/${slug}\`)`.

### Pitfall 7: `amount_cents` NULL for historical completed sessions
**What goes wrong:** Completed sessions from Phase 3/4 have no `amount_cents` value — the column didn't exist. The sessions Past section and dashboard earnings stat will show 0 or errors.
**How to avoid:** Show `—` for earnings on rows where `amount_cents IS NULL`. Consider a one-time backfill script (in `scripts/`) that calls Stripe's PaymentIntent retrieve for each completed booking. Document this in the plan as a non-blocking known gap.

---

## Code Examples

### Parallel RSC queries for dashboard home

```typescript
// Source: established pattern from existing dashboard pages
const [
  { count: upcomingCount },
  { data: completedBookings },
  { data: recentReviews },
] = await Promise.all([
  supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacher.id)
    .eq('status', 'confirmed'),
  supabase
    .from('bookings')
    .select('amount_cents, student_name, parent_email')
    .eq('teacher_id', teacher.id)
    .eq('status', 'completed'),
  supabase
    .from('reviews')
    .select('rating, text, reviewer_name, created_at')
    .eq('teacher_id', teacher.id)
    .not('rating', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2),
])

const totalEarned = (completedBookings ?? []).reduce((s, b) => s + (b.amount_cents ?? 0), 0)
const uniqueStudents = new Set((completedBookings ?? []).map(b => `${b.student_name}|${b.parent_email}`)).size
```

### Token generation in markSessionComplete

```typescript
// Source: Node.js built-in crypto
import { randomBytes } from 'crypto'

const reviewToken = randomBytes(32).toString('hex') // 64-char hex string
await supabaseAdmin
  .from('reviews')
  .insert({
    booking_id: bookingId,
    teacher_id: teacher.id,
    token: reviewToken,
    // rating and text remain null until parent submits
  })
```

### Sidebar nav items (Sessions + Students addition)

```typescript
// Source: src/components/dashboard/Sidebar.tsx — extend navItems array
import { LayoutDashboard, Inbox, CalendarCheck, Users, FileText, Calendar, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard',          label: 'Overview',     icon: LayoutDashboard },
  { href: '/dashboard/requests', label: 'Requests',     icon: Inbox           },
  { href: '/dashboard/sessions', label: 'Sessions',     icon: CalendarCheck   },
  { href: '/dashboard/students', label: 'Students',     icon: Users           },
  { href: '/dashboard/page',     label: 'Page',         icon: FileText        },
  { href: '/dashboard/availability', label: 'Availability', icon: Calendar    },
  { href: '/dashboard/settings', label: 'Settings',     icon: Settings        },
]
// Note: /dashboard active check must use pathname === '/dashboard' (exact),
// not pathname.startsWith('/dashboard') — otherwise Overview is always active.
```

### Star rating client component (no library needed)

```typescript
// Inline pattern for ReviewForm client component
'use client'
import { useState } from 'react'

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="text-2xl transition-colors"
          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
        >
          <span className={(hovered || value) >= star ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        </button>
      ))}
    </div>
  )
}
```

### Reviews section on `/[slug]` (RSC)

```typescript
// Minimal aggregate pattern for public profile
const avgRating = reviews.length > 0
  ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
  : null

// Reviewer first name extraction from email prefix
function firstNameFromEmail(email: string): string {
  const prefix = email.split('@')[0]       // e.g. "sarah.k" or "sarahk123"
  const name = prefix.split(/[._\-0-9]/)[0] // take first word-like segment
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Redirect `/dashboard` → `/dashboard/page` | Real overview at `/dashboard` | Phase 5 replaces the redirect stub |
| Review stub URL `/review?booking=id` | Token URL `/review/[token]` | Phase 3 note in STATE.md confirms this was intentionally deferred |
| `reviews.rating NOT NULL` | Nullable until submitted | Requires migration 0006 |
| No `amount_cents` on bookings | `amount_cents` written at capture | Enables earnings display without Stripe API calls |

---

## Open Questions

1. **Reviewer name collection**
   - What we know: CONTEXT.md leaves this to Claude's discretion — either extract from parent_email prefix or ask on the review form
   - What's unclear: Extracted names like "sarahk123" look bad; a free-text "First name" field is one extra field
   - Recommendation: Add an optional "First name" text field on the review form (pre-populated with email prefix as default). Store in `reviewer_name` column. If blank, fall back to email prefix extraction.

2. **`/dashboard` active state in Sidebar**
   - What we know: Current `isActive` uses `pathname.startsWith(href + '/')` — this means `/dashboard` would match all sub-routes
   - Recommendation: Use exact match `pathname === '/dashboard'` for the Overview nav item only; keep `startsWith` for all others.

3. **Historical `amount_cents` backfill**
   - What we know: Completed sessions from Phase 3/4 have no amount stored in DB; the Stripe PaymentIntent was captured but the amount not persisted
   - Recommendation: Note as known gap. Show `—` in earnings display for NULL rows. A `scripts/backfill-amounts.ts` script can be added as a non-blocking task if needed before launch.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/__tests__/dashboard-reviews.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Upcoming confirmed sessions appear on sessions page | unit (pure logic) | `npx vitest run src/__tests__/dashboard-reviews.test.ts` | Wave 0 |
| DASH-03 | Total earnings correctly sums amount_cents from completed bookings | unit (pure logic) | `npx vitest run src/__tests__/dashboard-reviews.test.ts` | Wave 0 |
| DASH-04 | Student list groups by (student_name, parent_email) correctly | unit (pure logic) | `npx vitest run src/__tests__/dashboard-reviews.test.ts` | Wave 0 |
| DASH-05 | markSessionComplete generates review token and inserts review stub | unit (server action) | `npx vitest run src/__tests__/dashboard-reviews.test.ts` | Wave 0 |
| REVIEW-01 | submitReview writes rating+text, sets token_used_at, idempotent on second call | unit (server action) | `npx vitest run src/__tests__/dashboard-reviews.test.ts` | Wave 0 |
| REVIEW-02 | Reviews section omitted when no reviews; shows aggregate + 5 most recent when reviews exist | unit (pure logic) | `npx vitest run src/__tests__/dashboard-reviews.test.ts` | Wave 0 |
| REVIEW-03 | sendSessionCompleteEmail called with /review/[token] URL (not stub) | unit (spy) | `npx vitest run src/__tests__/dashboard-reviews.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/dashboard-reviews.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/dashboard-reviews.test.ts` — covers DASH-01/03/04/05, REVIEW-01/02/03
- [ ] `vitest.config.ts` already exists — no framework install needed

---

## Sources

### Primary (HIGH confidence)

- Codebase direct inspection — `src/actions/bookings.ts`, `src/lib/email.ts`, `src/emails/SessionCompleteEmail.tsx`, `supabase/migrations/0001_initial_schema.sql`, `src/components/dashboard/Sidebar.tsx`, `src/app/(dashboard)/dashboard/requests/page.tsx`, `src/app/[slug]/page.tsx`
- `.planning/phases/05-dashboard-reviews/05-CONTEXT.md` — locked decisions
- `.planning/REQUIREMENTS.md` — requirement definitions
- `.planning/STATE.md` — accumulated project decisions including Phase 3 review URL stub note

### Secondary (MEDIUM confidence)

- Node.js docs — `crypto.randomBytes()` for token generation
- Supabase JS v2 docs — `.not('column', 'is', null)` filter syntax, RLS service-role bypass behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire stack already installed and in use; no new libraries
- Architecture: HIGH — all patterns directly observed in existing codebase; new routes follow exact same shape as existing ones
- Schema gaps (amount_cents, token columns): HIGH — directly verified against migration files
- Pitfalls: HIGH — most stem from Phase 3 STATE.md notes and direct code inspection (stub URL, NOT NULL constraint, RLS policy)

**Research date:** 2026-03-10
**Valid until:** 2026-06-30 (stable stack, no fast-moving dependencies)
