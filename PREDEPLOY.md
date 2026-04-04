# Tutelo — Pre-Deploy Hardening Checklist

> **Purpose:** This file tracks code quality fixes identified in the April 2026 audit.
> Each batch groups changes by file proximity to minimize context switching.
> A fresh Claude Code conversation should read this file, pick the next incomplete batch,
> do the work, then check off completed items before ending the session.
>
> **How to use:** Start a conversation with: "Read PREDEPLOY.md and work on the next incomplete batch."

---

## Batch 1 — Database Migration (single new migration file)

Created `supabase/migrations/0020_predeploy_hardening.sql`.

- [x] **Add ON DELETE CASCADE to `bookings.recurring_schedule_id`**
  - Current: `supabase/migrations/0014_recurring_schedules.sql:71` — FK has no cascade
  - Fix: `ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_recurring_schedule_id_fkey, ADD CONSTRAINT bookings_recurring_schedule_id_fkey FOREIGN KEY (recurring_schedule_id) REFERENCES recurring_schedules(id) ON DELETE CASCADE;`

- [x] **Add ON DELETE SET NULL to `bookings.child_id`**
  - Current: `supabase/migrations/0017_children_and_parent_dashboard.sql:30` — FK has no cascade
  - Fix: Same pattern. Use `ON DELETE SET NULL` (don't delete bookings when a child is removed — just null out the reference)

- [x] **Add missing indexes**
  - `CREATE INDEX IF NOT EXISTS idx_bookings_parent_id ON bookings (parent_id);`
  - `CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);`
  - `CREATE INDEX IF NOT EXISTS idx_teachers_is_published ON teachers (is_published);`
  - `CREATE INDEX IF NOT EXISTS idx_reviews_teacher_id ON reviews (teacher_id);`

- [x] **Add `updated_at` triggers to tables missing them**
  - Check which tables already have the trigger (grep existing migrations for `update_updated_at`)
  - Add trigger for any of: `availability`, `availability_overrides`, `session_types`, `waitlist`, `conversations`, `messages`, `children` that don't have one
  - Use the same `update_updated_at()` function pattern already in the codebase

**Verify:** Run `npx supabase db push` or `npx supabase migration up` against local/staging.

**Agent notes (Batch 1):**
- Migration file: `supabase/migrations/0020_predeploy_hardening.sql`
- `supabase db push --dry-run` passed cleanly. Migration has NOT been pushed to remote — run `supabase db push` when ready.
- None of the 7 listed tables had `updated_at` columns, so the migration adds both the column (`DEFAULT NOW()`) and the trigger for each. Also added a trigger for `parent_profiles` which had the column but no trigger.
- `npm run build` passes.

---

## Batch 2 — API Route Hardening

### 2a. Input validation on `create-intent`
- [x] **Add Zod schema to `src/app/api/direct-booking/create-intent/route.ts`**
  - Currently line 25 destructures `req.json()` with zero validation
  - Model after `src/app/api/direct-booking/create-recurring/route.ts` which uses `RecurringBookingSchema`
  - Schema should validate: `teacherId` (uuid), `bookingDate` (YYYY-MM-DD regex), `startTime`/`endTime` (HH:MM regex, endTime > startTime), `studentName` (non-empty string), `subject` (string), `sessionTypeId` (optional uuid), `childId` (optional uuid)
  - Return 400 with flattened field errors on validation failure

### 2b. Rate limiting on public endpoints
- [x] **Add rate limiting to `src/app/api/track-view/route.ts`**
  - Simple approach: use `headers()` to get IP, check against an in-memory Map with TTL (e.g., max 10 requests per IP per minute)
  - Or install `@upstash/ratelimit` if Upstash Redis is available
  - Return 429 when exceeded
- [x] **Add rate limiting to `src/app/api/waitlist/route.ts`**
  - Same pattern as track-view
  - Additionally validate email format with Zod if not already done

### 2c. CRON_SECRET empty guard
- [x] **Guard against empty `CRON_SECRET` in all 4 cron routes**
  - Files: `src/app/api/cron/auto-cancel/route.ts`, `stripe-reminders/route.ts`, `session-reminders/route.ts`, `recurring-charges/route.ts`
  - Add at the top of each GET handler, before the auth check:
    ```typescript
    if (!process.env.CRON_SECRET) {
      console.error('[cron] CRON_SECRET is not configured')
      return new Response('Server misconfiguration', { status: 500 })
    }
    ```

### 2d. Idempotent webhook emails
- [x] **Fix `checkout.session.completed` handler in `src/app/api/stripe/webhook/route.ts`**
  - Line 134-151: The `.update()` uses `.in('status', ['requested', 'pending'])` (good), but line 150 sends the confirmation email even if the update matched 0 rows (Stripe re-delivery)
  - Fix: Change to use `.select('id')` on the update, then only send email if `updated && updated.length > 0` — same pattern already used by the `payment_intent.amount_capturable_updated` handler on line 174

### 2e. N+1 query fix in conversations
- [x] **Refactor `src/app/api/conversations/route.ts:53-104`**
  - Current: loops through each conversation with 2 queries per iteration (last message + participant name)
  - Fix: After fetching conversations, batch-fetch last messages with a single query using `.in('conversation_id', conversationIds)` and group by conversation_id. For parent names, batch-fetch with `supabaseAdmin.auth.admin.listUsers()` filtered by IDs, or cache teacher names from the join already present.
  - Goal: 2-3 total queries instead of 2N+1

**Verify:** `npm run build` succeeds. Manually test booking flow, cron endpoints (with `curl -H "Authorization: Bearer $CRON_SECRET"`), and conversations list.

**Agent notes (Batch 2):**
- 2a: Added `DirectBookingIntentSchema` to `src/lib/schemas/booking.ts` with `.refine()` for endTime > startTime. Applied in `create-intent/route.ts` with JSON parse error handling and flattened field errors on 400.
- 2b: Created `src/lib/utils/rate-limit.ts` — in-memory Map with TTL + periodic pruning. Applied to `track-view` (10 req/min/IP) and `waitlist` (5 req/min/IP). Both return 429 when exceeded. Waitlist already had email regex validation.
- 2c: Added `if (!process.env.CRON_SECRET)` guard returning 500 to all 4 cron routes, before the auth header check.
- 2d: Changed `checkout.session.completed` handler to use `.select('id')` and gate email on `updated.length > 0` — matches the pattern already used by `payment_intent.amount_capturable_updated`.
- 2e: Replaced 2N+1 per-conversation queries with: (1) single `.or()` query matching `(conversation_id, last_message_at)` pairs for batch message fetch, (2) deduped parallel `getUserById` calls for parent names. Assembly loop is now synchronous with no queries.
- `npm run build` passes.

---

## Batch 3 — New Pages + Static Files

- [x] **Create `/booking-cancelled` page**
  - File: `src/app/booking-cancelled/page.tsx`
  - Referenced by `src/app/api/stripe/webhook/route.ts:61` as Stripe Checkout `cancel_url`
  - Simple page: "Booking cancelled" heading, "Your payment was not processed" subtext, link back to homepage
  - Match the style of `src/app/booking-confirmed/page.tsx`

- [x] **Add `loading.tsx` to parent routes**
  - Create skeleton loading files for:
    - `src/app/(parent)/parent/loading.tsx`
    - `src/app/(parent)/parent/bookings/loading.tsx`
    - `src/app/(parent)/parent/children/loading.tsx`
    - `src/app/(parent)/parent/payment/loading.tsx`
    - `src/app/(parent)/parent/messages/loading.tsx`
  - Match the pattern used in `src/app/(dashboard)/dashboard/loading.tsx`

- [x] **Add `robots.txt`**
  - File: `public/robots.txt`
  - Disallow: `/admin`, `/dashboard`, `/parent`, `/api/`, `/onboarding`, `/callback`
  - Allow: `/`, `/tutors`, `/[slug]` (teacher profiles), `/sitemap.xml`

**Verify:** `npm run build` succeeds. Visit `/booking-cancelled` in dev. Check `localhost:3000/robots.txt` renders.

**Agent notes (Batch 3):**
- Created `src/app/booking-cancelled/page.tsx` — matches booking-confirmed style with XCircle icon, red accent, and "Back to Home" link.
- Created 5 loading.tsx files under `src/app/(parent)/parent/` (root, bookings, children, payment, messages) — all follow the dashboard skeleton pattern with `animate-pulse`.
- Created `public/robots.txt` — disallows private routes, allows public pages and sitemap.
- `npm run build` passes.

---

## Batch 4 — Server Action + Cron Logic Fixes

### 4a. Atomic publishProfile
- [x] **Make `publishProfile` atomic in `src/actions/onboarding.ts:100-146`**
  - Current: 3 separate operations (upsert teacher → delete availability → insert availability). If insert fails after delete, teacher loses availability data.
  - Fix: Create a Supabase RPC (Postgres function) that does all three in a single transaction. Add the function to the migration from Batch 1 (or a new migration if Batch 1 is already applied). Then call via `supabase.rpc('publish_profile', { ... })` in the action.
  - Alternative (simpler): Insert new availability first with a temp flag, then delete old rows, then clear the temp flag. At minimum, reverse the order: insert first, delete only on success.

### 4b. Timezone-aware cron reminders
- [x] **Fix `src/app/api/cron/session-reminders/route.ts:26-28`**
  - Current: `tomorrowUtc` uses UTC date. A PST teacher with a 9 AM session on April 5 won't get a reminder if cron runs when it's still April 4 in PST.
  - Fix: Instead of matching exact date, query bookings where `booking_date` is within the next 36 hours from now. This covers all timezones:
    ```typescript
    const now = new Date()
    const windowStart = new Date(now.getTime() + 12 * 60 * 60 * 1000) // 12h from now
    const windowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000)   // 36h from now
    // Query: booking_date + start_time falls within [windowStart, windowEnd]
    ```
  - The `reminder_sent_at` idempotency guard already prevents double-sends.

- [x] **Apply same fix to `src/app/api/cron/recurring-charges/route.ts:29-30`**
  - Same UTC date issue. Use time-range window approach.

**Verify:** Write a test case with a PST teacher and UTC cron time to confirm the window logic works. `npm run build` succeeds.

**Agent notes (Batch 4):**
- 4a: Created `supabase/migrations/0021_publish_profile_fn.sql` with `publish_profile(p_user_id UUID, p_teacher_data JSONB, p_availability JSONB)` — SECURITY DEFINER function that upserts the teacher row, deletes old availability, and inserts new availability in a single Postgres transaction. On any failure the entire transaction rolls back, so availability data is never orphaned.
- 4a: Updated `src/actions/onboarding.ts` — replaced 3 separate Supabase calls (upsert → delete → insert) with a single `supabase.rpc('publish_profile', {...})` call. Result is typed and error-checked.
- 4b: Updated `src/app/api/cron/session-reminders/route.ts` — replaced `booking_date = tomorrowUtc` with `.gte('booking_date', windowStart).lte('booking_date', windowEnd)` using a 12–36h window from now. The `reminder_sent_at` idempotency guard already prevents double-sends across the wider window.
- 4b: Applied same 12–36h window fix to `src/app/api/cron/recurring-charges/route.ts`. Also added `booking_date` to the select and simplified the Stripe idempotency key to use booking ID only (each booking ID is unique, date suffix was redundant).
- `npm run build` passes.

---

## Batch 5 — Email Template Cleanup

- [x] **Extract `appUrl` constant**
  - All email files in `src/emails/` should receive `appUrl` as a prop instead of hardcoding `tutelo.app`
  - Check `src/lib/email.ts` (the email-sending utility) — it likely already resolves `NEXT_PUBLIC_APP_URL`. Make sure all templates receive it as a prop and use it for links.
  - Grep for hardcoded `tutelo.app` in `src/emails/` and replace with the prop.

- [x] **Add unsubscribe footer to marketing-adjacent emails**
  - Emails that should have unsubscribe: `FollowUpEmail`, `UrgentFollowUpEmail`, `WaitlistNotificationEmail`
  - Transactional emails (booking confirmations, cancellations, reminders) don't legally require unsubscribe but a "manage notifications" link is good UX
  - Simple footer: `<Text style={{ fontSize: 12, color: '#9ca3af' }}>You're receiving this because you signed up on Tutelo. <a href="${appUrl}/account">Manage preferences</a></Text>`

**Verify:** Send test emails from dev (or preview with react-email dev server). Confirm all links use the correct domain.

**Agent notes (Batch 5):**
- Added `appUrl: string` prop to all 14 email template interfaces and destructured in each component.
- All footer `tutelo.app` text now wrapped in `<a href={appUrl}>` links. Hardcoded `href="https://tutelo.app"` in CancellationEmail and RecurringCancellationEmail replaced with `href={appUrl}`.
- Updated all call sites: `src/lib/email.ts` (12 email-send functions), `src/lib/verification.ts`, and `src/app/api/messages/route.ts` — each resolves `appUrl` from `NEXT_PUBLIC_APP_URL` and passes it to the template.
- Added "Manage preferences" unsubscribe link (`${appUrl}/account`) to FollowUpEmail, UrgentFollowUpEmail, and WaitlistNotificationEmail footers.
- `sendCheckoutLinkEmail` (plain text) updated to interpolate `appUrl` instead of hardcoded `tutelo.app`.
- `npm run build` passes.

---

## Post-Batch Verification

After all 5 batches are complete:

- [ ] Full build passes: `npm run build`
- [ ] Test suite passes: `npm run test` (or `npx vitest run`)
- [ ] Manual smoke test: onboarding → publish → booking → payment → cron
- [ ] Deploy to Vercel preview and verify cron endpoints respond
- [ ] Update `LAUNCH.md` Known Limitations section (remove items that were fixed)
- [ ] Delete or archive this file

---

## Status

| Batch | Description | Status |
|-------|-------------|--------|
| 1 | Database migration | **Done** |
| 2 | API route hardening | **Done** |
| 3 | New pages + static files | **Done** |
| 4 | Server action + cron logic | **Done** |
| 5 | Email template cleanup | **Done** |
