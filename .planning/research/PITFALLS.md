# Pitfalls Research: Tutelo

**Domain:** Tutoring booking platform / B2B2C marketplace
**Stack:** Next.js + Supabase + Stripe Connect Express
**Researched:** 2026-03-03
**Overall Confidence:** MEDIUM (training data through Aug 2025; external verification blocked — flag critical items for manual confirmation before implementation)

---

## Critical Pitfalls (Must Address in MVP)

These will kill the product or require expensive rewrites if ignored.

---

### C1: Stripe Connect Express — Charges Blocked Until Capabilities Are Enabled

**Severity:** Critical
**Confidence:** HIGH (well-documented Stripe behavior)

**What goes wrong:**
Stripe Connect Express accounts go through an onboarding flow that requires the connected account to complete identity verification and agree to Stripe's Terms of Service before the `card_payments` and `transfers` capabilities are activated. Until `account.updated` fires with `charges_enabled: true` AND `payouts_enabled: true`, you cannot charge on behalf of that account. If your code creates a PaymentIntent with `transfer_data` pointing to an account that hasn't completed onboarding, Stripe returns a hard error at charge time — not at PaymentIntent creation time. This is a silent trap: the booking flow appears to succeed until payment is actually captured.

**Why it happens:**
Deferred onboarding (where you invite teachers post-booking-request) means there will always be a gap between "teacher exists in your system" and "teacher has a Stripe account that can receive money." If you attempt to collect payment before the teacher has completed onboarding, the payment fails. If you collect payment and THEN try to transfer, the transfer fails.

**Consequences for Tutelo:**
With the deferred Stripe Connect model (no payment setup until first booking arrives), you MUST gate payment collection behind `charges_enabled: true`. Any booking confirmed before that flag is true must be held in escrow-like state or payment collection must be deferred. If you forget to gate this, parents will experience payment failures at the point they feel most committed — after a teacher accepts their booking.

**Prevention:**
1. Subscribe to `account.updated` webhooks on your connected account webhook endpoint (see C2).
2. Store `stripe_charges_enabled` and `stripe_payouts_enabled` boolean columns on the `teachers` table, updated by webhook.
3. Gate the "Confirm Booking & Pay" button on the parent side behind `teacher.stripe_charges_enabled === true`.
4. Display a clear teacher-facing prompt: "Complete Stripe setup to accept your first booking."
5. Never hardcode capability checks — read them from the webhook-updated database field.

**Warning signs:**
- PaymentIntent creation succeeds but capture fails
- Logs show `StripeInvalidRequestError: The destination account needs to have at least one of the following capabilities enabled`
- Teachers report "I accepted a booking but the parent says payment failed"

**Phase:** Address in Phase 1 (Payments foundation). This cannot be bolted on.

---

### C2: Stripe Connect Webhooks — Two Separate Webhook Endpoints Required

**Severity:** Critical
**Confidence:** HIGH

**What goes wrong:**
Stripe Connect requires TWO distinct webhook endpoint configurations:
1. A **platform-level** webhook for your main Stripe account events (e.g., `payment_intent.succeeded`, `charge.refunded`)
2. A **connected-account** webhook for events happening on teacher accounts (e.g., `account.updated`, `payout.failed`, `payout.paid`)

Most developers set up only one. The connected-account events use a different signing secret and arrive at a different endpoint. If you use the same signing secret for both, signature verification fails silently or throws errors that surface as 500s, causing Stripe to retry endlessly.

**Why it happens:**
The Stripe dashboard has separate sections for "Webhooks" and "Connect > Webhooks." It's easy to configure one and assume it covers both. The Stripe CLI also doesn't make this obvious during local development.

**Consequences for Tutelo:**
- `account.updated` never fires in your system → `stripe_charges_enabled` never updates → all bookings are permanently blocked
- `payout.failed` never fires → teachers don't get notified of failed payouts → support tickets
- `account.application.deauthorized` never fires → deauthorized teachers remain "active" in your system

**Prevention:**
1. Create two webhook handlers in your Next.js API routes: `/api/webhooks/stripe` (platform) and `/api/webhooks/stripe-connect` (connected accounts).
2. Store both signing secrets in environment variables (`STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET`).
3. Use `stripe.webhooks.constructEvent(body, sig, secret)` with the correct secret per endpoint.
4. In the dashboard, set the connected account webhook with `connect: true` flag.
5. Test with `stripe listen --forward-connect-to localhost:3000/api/webhooks/stripe-connect`.

**Warning signs:**
- Webhook signature verification errors in logs
- `account.updated` events visible in Stripe dashboard but not in your DB
- Teachers complete onboarding but status never updates

**Phase:** Phase 1 (Payments foundation). Non-negotiable.

---

### C3: Timezone Bugs in Booking System — The Silent Data Corruption

**Severity:** Critical
**Confidence:** HIGH (extremely common in booking systems)

**What goes wrong:**
Booking systems that don't treat all times as UTC in the database, converting to/from user's timezone only at display time, will silently store wrong times. The failure modes are:
- Teacher in EST creates availability "3pm-5pm" → stored as `15:00` without timezone → when parent in PST views it, the system treats `15:00` as PST (11pm EST) — 3-hour offset error
- Daylight Saving Time transitions cause 1-hour double-booking windows (e.g., 1:00am–2:00am slots on DST switchover nights)
- "Available Sunday 9am" means different calendar days depending on UTC offset — a teacher in Hawaii setting Sunday availability may show Saturday slots for users in New York

**Why it happens:**
JavaScript `Date` objects carry timezone context but are often serialized to ISO strings and re-parsed without preserving timezone. Supabase `timestamptz` columns are correct, but `time` and `timestamp` (without tz) columns are a trap. Developers build availability as `time` type ranges (e.g., `09:00–17:00`) without timezone, then display them as if they're local time.

**Consequences for Tutelo:**
- Parents book a "4pm" slot that the teacher thought was "7pm" → no-show
- Teachers set weekly recurring availability that silently shifts after DST
- Overlap between booked sessions not detected because comparison is done in wrong timezone

**Prevention:**
1. Store ALL timestamps as `timestamptz` in Supabase. Never use `timestamp` (without tz) or bare `time` columns for booking data.
2. Store teacher's IANA timezone string (e.g., `America/New_York`) on the `teachers` table at profile creation. Require it — do not infer it.
3. Store availability slots as UTC `timestamptz` ranges, not local-time strings.
4. On the frontend, use a timezone-aware library. `date-fns-tz` or `Temporal` (if available) are preferred over raw `Date`. Never do timezone math manually.
5. When displaying times to users, always convert from UTC using the viewer's stored IANA timezone.
6. Write explicit tests: create a booking in EST, read it back as PST, verify the UTC storage is unchanged.

**Warning signs:**
- Teacher and parent see different times for the same booking
- Bookings that were correct yesterday are off by 1 hour today (DST fired)
- Availability slots appearing on wrong calendar days for users in different timezones

**Phase:** Phase 1 (Booking core). Retrofit is expensive — get this right initially.

---

### C4: Supabase RLS — Row Level Security Silent Failures

**Severity:** Critical
**Confidence:** HIGH

**What goes wrong:**
Supabase RLS policies that have logic errors don't throw errors — they silently return empty results or silently block writes. This means a bug in your RLS policies will manifest as:
- A parent trying to view their bookings sees an empty list (looks like a UI bug)
- A teacher trying to update their availability gets a silent no-op (no error, no rows updated)
- An admin dashboard query returns no data even when records exist

The hardest variant: RLS policies that work correctly when tested as the postgres superuser (which bypasses RLS) but fail for actual authenticated users. This leads to "works on my machine" bugs that are invisible in development if you don't test as actual Supabase auth users.

**Why it happens:**
RLS policies reference `auth.uid()` or `auth.jwt()` claims. In development, developers often test queries via the Supabase Studio table editor, which uses the service role key (bypassing RLS). The policy looks correct but has never been tested as an actual `anon` or `authenticated` role user.

**Consequences for Tutelo:**
With three roles (parent, teacher, admin), RLS policies must correctly gate:
- Parents: see only their own bookings, can read teacher profiles
- Teachers: see only their own bookings, can update their own availability
- Admins: see all data
- Service role: used only in backend API routes, never exposed to frontend

A misconfigured policy can mean parents see other parents' bookings (data breach), or teachers can't update their own profiles (broken UX), or admins are locked out.

**Prevention:**
1. Enable RLS on every table immediately — never create a table without immediately writing its policies.
2. Test every policy by calling Supabase from the frontend (as an authenticated user with a specific role), NOT from Supabase Studio with service role.
3. Use `SECURITY DEFINER` functions sparingly and understand they bypass RLS entirely.
4. Store user role (`parent` | `teacher` | `admin`) in `auth.users.raw_user_meta_data` OR in a separate `profiles` table joined via `auth.uid()`. Do not use `app_metadata` for things you set from the client — that's a security hole.
5. Write a test suite that authenticates as each role type and asserts what they can and cannot read/write.
6. Use Supabase's RLS policy tester in the dashboard during development.

**Warning signs:**
- Queries return 0 rows unexpectedly
- Updates return success but data doesn't change
- "Works in Studio but not in the app"
- Different behavior when using `supabaseAdmin` (service key) vs `supabase` (anon key)

**Phase:** Phase 1 (Auth/roles foundation). RLS must be designed before data model is finalized.

---

### C5: Double-Booking — Race Condition in Availability Check

**Severity:** Critical
**Confidence:** HIGH

**What goes wrong:**
The naive booking flow:
1. Check if teacher is available at requested time → YES
2. Create booking record

Between steps 1 and 2, a second parent can complete step 1 simultaneously and also get YES. Both bookings are created, teacher is double-booked. This is a classic TOCTOU (time-of-check, time-of-use) race condition.

**Why it happens:**
Most developers implement availability checks as a SELECT query followed by an INSERT query — two separate database operations with no atomicity guarantee. At low traffic it rarely manifests. At higher traffic (especially if you send push notifications to parents that a new teacher is available, causing a spike), it becomes frequent.

**Consequences for Tutelo:**
A double-booked teacher must cancel one session. The parent who gets cancelled has a terrible first experience. On a platform where trust is the product, this is catastrophic for retention.

**Prevention:**
1. Implement booking creation as a **single atomic Postgres function** (RPC via `supabase.rpc()`). The function should use `SELECT ... FOR UPDATE` or a unique constraint to prevent concurrent conflicts.
2. Add a **unique constraint** on `(teacher_id, session_start_time)` in the bookings table so the database itself enforces non-overlap at the insert level.
3. Consider a "slot reservation" pattern: when a parent clicks "Request Session," atomically reserve the slot for 10 minutes. If payment/confirmation doesn't complete, the reservation expires.
4. For recurring bookings, the uniqueness check must cover all instances, not just the first.

**Warning signs:**
- Duplicate bookings in the database for the same teacher at the same time
- Teacher complaints about double-booking
- `23505 unique_violation` errors in logs (good — means constraint is working)

**Phase:** Phase 1 (Booking core). Atomic booking creation must be designed from the start.

---

### C6: Stripe Webhook Signature Verification — Raw Body Destruction

**Severity:** Critical
**Confidence:** HIGH

**What goes wrong:**
Stripe webhook signature verification requires the **raw, unparsed request body**. If Next.js (or any middleware) parses the JSON body before your webhook handler sees it, the raw bytes are gone and `stripe.webhooks.constructEvent()` will always fail with a signature mismatch error.

In Next.js App Router, this is particularly subtle: if you have a global body parser middleware (or if you're using `NextResponse` with automatic JSON parsing), the raw body is consumed before your handler runs.

**Why it happens:**
Next.js 13+ App Router doesn't have the `bodyParser: false` configuration that Pages Router had. Developers copy webhook handler code from Pages Router examples into App Router without adapting it. The error messages are confusing: "No signatures found matching the expected signature for payload."

**Prevention:**
1. In App Router, read the raw body using `req.text()` or `req.arrayBuffer()` before passing to `stripe.webhooks.constructEvent()`.
2. Do NOT use `req.json()` in webhook routes.
3. Example:
   ```typescript
   const body = await req.text();
   const sig = headers().get('stripe-signature')!;
   const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
   ```
4. Test locally with `stripe listen` CLI to confirm signature verification works before deployment.

**Warning signs:**
- `WebhookSignatureVerificationError` in production
- Stripe dashboard shows 400 responses for webhook deliveries
- All webhooks fail immediately after deployment but work in local dev

**Phase:** Phase 1 (Payments). Often caught late when payments fail in staging.

---

## High Priority Pitfalls

Significant user pain or technical debt if ignored.

---

### H1: Deferred Stripe Connect — Booking Limbo State

**Severity:** High
**Confidence:** HIGH

**What goes wrong:**
The deferred model (teacher gets Stripe onboarding link only after first booking request) creates a "limbo" booking state that most implementations handle poorly:

- Parent requests booking → teacher accepts → parent goes to pay → teacher has no Stripe account yet
- Parent requests booking → teacher accepts → teacher starts Stripe onboarding → parent pays → teacher abandons onboarding halfway → payment is collected but cannot be transferred
- Parent pays → teacher completes onboarding days later → payout happens weeks later → teacher is confused

**Consequences for Tutelo:**
Limbo bookings accumulate. Parents feel payment is processing forever. Teachers think money is lost. Trust collapses in the critical first interaction.

**Prevention:**
1. Design the state machine explicitly. Booking states should be: `requested` → `teacher_accepted` → `awaiting_stripe_setup` (if teacher has no Stripe) → `payment_pending` → `confirmed` → `completed`.
2. Never collect payment until `teacher.stripe_charges_enabled === true`.
3. After teacher accepts, immediately send the Stripe onboarding link. Make this the next required step before the parent is even notified of acceptance.
4. Set a maximum wait time (e.g., 48 hours) for Stripe setup. If not completed, auto-cancel the booking with a clear explanation to both parties.
5. Consider alternative: require teachers to complete Stripe setup during PROFILE creation (before any booking), not deferred. Simpler state machine, less limbo risk.

**Warning signs:**
- Bookings stuck in `teacher_accepted` state for >24 hours
- Parent emails asking "when does my payment go through"
- Teacher emails asking "I accepted but haven't been paid"

**Phase:** Phase 1 (Booking + Payments integration design). State machine must be explicit in the DB schema.

---

### H2: Supabase Free Tier Limits — Production Traffic Surprise

**Severity:** High
**Confidence:** MEDIUM (limits change; verify current values at launch)

**What goes wrong:**
Supabase free tier has limits that are invisible during development but hit suddenly in production:
- **500MB database storage** — a booking platform with session notes, availability slots, and user profiles grows faster than expected
- **2GB bandwidth per month** — if you serve profile images or documents through Supabase Storage, this is reached quickly
- **50MB file uploads per project** — per upload limit
- **Paused projects after 1 week of inactivity** — on free tier, if Tutelo launches then goes quiet for a week during iteration, the project pauses and users hit a dead site

**Why it happens:**
Development databases are sparse. 500MB sounds like a lot. But with RLS policies, indexes, audit logs, and session data, real apps hit it sooner than expected.

**Consequences for Tutelo:**
If Instagram launch goes well and drives traffic, hitting Supabase free tier limits mid-launch is a worst-case scenario. The Pro plan upgrade takes effect immediately but requires downtime management. More importantly, the project-pausing behavior can kill early traction entirely.

**Prevention:**
1. Upgrade to Supabase Pro ($25/month) before any public launch. Not optional.
2. Implement Supabase Storage with a CDN (Supabase has Cloudflare integration) for profile images to avoid bandwidth costs.
3. Monitor database size from day one using `SELECT pg_database_size(current_database())`.
4. Archive or soft-delete old booking data to control growth.

**Warning signs:**
- Supabase dashboard shows >60% storage usage
- API requests start returning 429 errors (rate limiting)
- Project goes offline unexpectedly during low-traffic period

**Phase:** Pre-launch checklist. Easy to miss, expensive to hit.

---

### H3: Supabase Auth — Email Confirmation Breaks Mobile Signup

**Severity:** High
**Confidence:** HIGH

**What goes wrong:**
Supabase Auth requires email confirmation by default. On mobile (which will be Tutelo's primary channel given the Instagram GTM strategy), the email confirmation flow is broken:
- User signs up on their phone
- Supabase sends confirmation email
- User leaves the app to go to Gmail (or worse, checks email on desktop)
- Confirmation link opens in the desktop browser, creating a new session
- User returns to phone, is not logged in, is confused

Additionally, if you're building a PWA or mobile-first web app, deep links from email to app are non-trivial to configure correctly.

**Prevention:**
1. Configure Supabase Auth to redirect to your app's URL after email confirmation, not to `localhost`.
2. Use Supabase's PKCE flow (recommended for mobile/SPAs) to prevent session fragmentation.
3. Consider disabling email confirmation for MVP and using only email/password or magic link, with confirmation as a background check.
4. If using magic links: set short expiry (1 hour), handle "link expired" gracefully with a "resend" option.
5. Test the entire auth flow on a real mobile device, not just desktop browser.

**Warning signs:**
- Analytics show high signup-to-confirmation drop-off
- Support tickets: "I confirmed but I'm not logged in"
- Users creating multiple accounts because they couldn't confirm the first

**Phase:** Phase 1 (Auth). Must test on mobile before launch.

---

### H4: Stripe 1099-K Compliance — Teacher Tax Surprise

**Severity:** High
**Confidence:** MEDIUM

**What goes wrong:**
In the US, Stripe is required to issue a 1099-K to connected account holders who exceed the IRS reporting threshold. As of recent legislation (pending final implementation as of Aug 2025), the threshold may drop significantly from the prior $20,000/200-transaction rule. Stripe handles the form generation automatically for connected accounts, BUT:
- Teachers who are employees of a school district may have contract restrictions on outside income
- Teachers are often unaware that tutoring income is taxable self-employment income subject to SE tax (~15.3%)
- If you don't surface this clearly during onboarding, teachers feel blindsided by a 1099 they weren't expecting
- This can cause teacher churn: they quit the platform rather than deal with tax complexity they didn't sign up for

**Prevention:**
1. Display a clear disclaimer during teacher onboarding: "Tutelo reports earnings to the IRS via 1099-K. You are responsible for applicable self-employment taxes."
2. Link to IRS guidance on self-employment income.
3. Consider adding a tax FAQ to the teacher help center.
4. Collect teacher's SSN/EIN during Stripe onboarding (Stripe handles this). Don't collect it yourself.
5. Do NOT position the platform as a way to earn "under the table" — this is a compliance and reputation risk.

**Warning signs:**
- Teacher support tickets: "I got a 1099 from Stripe, what is this?"
- Teacher churning in January (after receiving 1099-Ks for prior year)
- Negative reviews mentioning unexpected tax burden

**Phase:** Phase 1 onboarding copy and legal review.

---

### H5: Booking System — Recurring Sessions Edge Cases

**Severity:** High
**Confidence:** HIGH

**What goes wrong:**
"Weekly sessions" sound simple but have dozens of edge cases:
- Teacher cancels a recurring session: cancel just this one, or all future? UI must be explicit.
- Holiday conflicts: teacher is unavailable Dec 25 but recurring session exists
- Payment for recurring: charge weekly? Monthly? At time of session? In advance?
- Teacher changes their availability: does this invalidate confirmed recurring bookings?
- DST transition: weekly sessions at "4pm" that recur across a DST boundary are stored as UTC — 4pm EST in November becomes 4pm EDT in March — which is a different UTC time
- One-off session vs. recurring: parents assume "monthly" means "last Tuesday of each month at 3pm" but developers implement it as "every 4 weeks"

**Prevention:**
1. For MVP: implement ONLY single sessions. No recurring. Recurring is a Phase 2+ feature.
2. When you build recurring: use an explicit recurrence rule (RRULE format, iCal-compatible) stored in the database, not a custom "repeat every N days" scheme.
3. Never expand recurring events into individual rows at creation time — expand lazily (create rows for upcoming sessions on a schedule), keeping the RRULE as source of truth.
4. Handle cancellation modes explicitly: "this session," "this and all future," "all in series."

**Warning signs:**
- Teacher calendar showing sessions that were supposed to be cancelled
- Parent paying for sessions that don't happen
- DST-related complaints about session times being "wrong"

**Phase:** Phase 2+. Do not build recurring for MVP.

---

### H6: Stripe Payout Timing — Teacher Expectation Mismatch

**Severity:** High
**Confidence:** HIGH

**What goes wrong:**
New Stripe Connect Express accounts have a default payout schedule of T+7 (7 days rolling) or longer for the first 90 days while Stripe performs risk assessment. Teachers who complete a tutoring session on Monday expecting to be paid that week will be surprised when nothing appears in their bank account for 7–14 days.

Additionally:
- Bank account verification adds 2-3 business days
- Payout failures (wrong bank account details) don't surface immediately — Stripe sends `payout.failed` webhook, but if you don't handle it, the teacher just sees no money

**Consequences for Tutelo:**
Teacher's first payout experience is "I finished my session, where is my money?" This is a high-churn moment. Teachers who don't understand the payout timeline leave negative feedback or simply stop showing up.

**Prevention:**
1. During Stripe onboarding, explicitly communicate: "Your first payment will arrive 7–10 business days after your first session. After 90 days, payouts occur every 2 business days."
2. Add a "Your upcoming payouts" section to the teacher dashboard showing scheduled payout amounts and arrival dates (pull from Stripe API).
3. Handle `payout.failed` webhook: notify the teacher immediately via email with instructions to update bank details.
4. Handle `payout.paid` webhook: send teacher a "You've been paid!" notification.

**Warning signs:**
- Teacher support tickets in the first 2 weeks: "where is my money"
- Teacher deactivating their account after first session (payout frustration)

**Phase:** Phase 1 (Payments). Notification must be built alongside payment collection.

---

### H7: Self-Reported Credentials — Trust and Liability

**Severity:** High
**Confidence:** MEDIUM

**What goes wrong:**
Allowing teachers to self-report credentials (school district, grade level, subject) creates two distinct risks:
1. **Trust:** Parents don't know if a "7th grade math teacher" is actually a certified teacher or someone claiming to be one
2. **Liability:** If a teacher with false credentials causes harm to a child, Tutelo may bear reputational (and potentially legal) liability for facilitating the connection

The subtler risk: verified-credential competitors will market against you ("Unlike Tutelo, we verify every teacher"). Once a competitor does this, self-reported credentials become a liability rather than just a neutral feature gap.

**Prevention:**
1. Add social proof proxies that are verifiable without manual review: school email address verification (`@[district].edu`), LinkedIn profile link, teaching license number (displayed, not verified).
2. Display a clear disclaimer on teacher profiles: "Tutelo does not independently verify teacher credentials."
3. Implement parent reviews as a trust signal immediately — a teacher with 10 5-star reviews from real parents is more trustworthy than a credential badge.
4. Plan background check integration for Phase 2 (services like Checkr have APIs). Signal this publicly: "Enhanced background checks coming soon."
5. Consider requiring school email verification at minimum for MVP — it's cheap, automated, and meaningfully increases trust.

**Warning signs:**
- Parent complaints about misrepresented credentials
- Teacher profiles with implausible claims (10 years experience at age 22)
- Press coverage of a marketplace trust incident in the edtech space

**Phase:** Phase 1 (Teacher onboarding). Copy and disclaimer must be in place at launch.

---

## Medium Priority Pitfalls

Worth knowing, can defer but should be on radar.

---

### M1: Supabase Realtime — Presence and Connection Limits

**Severity:** Medium
**Confidence:** MEDIUM

**What goes wrong:**
If you build realtime features (live booking status updates, messaging), Supabase Realtime has connection limits on the free tier (200 concurrent connections) and the Pro tier (500 concurrent). More importantly, Realtime subscriptions that don't filter correctly (e.g., subscribing to `bookings:*` instead of `bookings:teacher_id=eq.{uid}`) will push ALL booking change events to ALL connected clients — a privacy leak and a performance problem.

**Prevention:**
1. Always filter Realtime subscriptions by the authenticated user's ID.
2. For MVP, consider polling (every 30 seconds) rather than Realtime for booking status updates. Simpler, no connection limit issues.
3. If using Realtime: test with 50+ concurrent connections in staging before launch.

**Phase:** Phase 2 (if adding messaging or live status). Not MVP-critical.

---

### M2: Next.js App Router — Server Actions and Stripe Race Conditions

**Severity:** Medium
**Confidence:** MEDIUM

**What goes wrong:**
Next.js Server Actions are convenient but have subtle gotchas in payment flows:
- Server Actions don't have built-in idempotency. If a user double-clicks a "Confirm Booking" button, the Server Action may fire twice, creating duplicate PaymentIntents.
- Server Actions timeout at 60 seconds by default. Stripe Connect operations (creating accounts, processing payments) can take longer under load.
- Error handling in Server Actions doesn't automatically roll back database writes. If you write to Supabase then call Stripe and Stripe fails, the Supabase write is committed but the payment doesn't exist — inconsistent state.

**Prevention:**
1. Create Stripe PaymentIntents with an `idempotency_key` (use a booking UUID) to prevent duplicate charges.
2. Disable the submit button after first click (client-side) AND enforce idempotency server-side.
3. For payment flows, use database-first pattern: create the booking record first, then process payment, then update status. If payment fails, mark booking as `payment_failed`. Never assume both succeed atomically.

**Phase:** Phase 1 (Payments). Design idempotency from day one.

---

### M3: Onboarding Drop-Off — Form Friction on Mobile

**Severity:** Medium
**Confidence:** HIGH

**What goes wrong:**
Long signup forms (especially for teachers who need to provide school, grade level, subjects, bio, availability, and Stripe info) are the primary cause of onboarding drop-off. On mobile, each additional form field loses ~10-15% of users.

The specific failure mode for teacher onboarding: requiring too much information before the teacher can see any value. If a teacher must complete a 12-field form AND connect Stripe before they can even browse what the platform looks like, most will abandon.

**Prevention:**
1. Use progressive disclosure: minimum viable profile first (name, school, email), then prompt for more detail later.
2. For MVP: require only name, email, school district, and subjects. Everything else (bio, photo, availability) can be added after account creation.
3. Defer Stripe Connect setup until the teacher wants to accept their first booking — this is actually the deferred model and it's correct for onboarding friction reduction.
4. Use autocomplete for school district names (there are public datasets of US school districts).
5. Test the teacher signup flow on a real phone with real cellular connection, not WiFi.

**Phase:** Phase 1 (Onboarding). A/B test form length early.

---

### M4: Cold Start — Two-Sided Marketplace Without Demand

**Severity:** Medium (for Tutelo's specific GTM, mitigated by Instagram audience)
**Confidence:** HIGH

**What goes wrong:**
Classic two-sided marketplace chicken-and-egg: teachers won't join if there are no parents, parents won't use it if there are no teachers. Most edtech marketplaces fail at this stage.

The risk for Tutelo specifically: if the Instagram audience (@eyes_on_meme) skews toward parents rather than teachers (or vice versa), the platform will have demand on one side and nothing on the other. Additionally, an audience built around content (memes, relatable teacher content) doesn't automatically convert to commerce. Purchase intent is very different from content engagement.

**Prevention:**
1. Launch supply first: recruit 20-30 verified teacher profiles BEFORE opening to parents. Don't launch to parents with an empty marketplace.
2. Personally onboard the first 10-20 teachers from your Instagram audience. DM them, walk them through signup, treat it as white-glove.
3. For the first cohort, offer 0% platform fee. Remove economic friction completely for early adopters.
4. Track the follower-to-signup conversion rate from the first Instagram CTA. If it's <1%, the audience isn't converting and GTM strategy needs adjustment.

**Warning signs:**
- Parents sign up but there are no teachers near them or in their subject area
- Teachers sign up but sit without booking requests for 2+ weeks
- Engagement on Instagram posts about Tutelo is high (comments, likes) but signups are low

**Phase:** Pre-launch and Phase 1. Supply seeding is a launch prerequisite.

---

### M5: Legal — School District Employment Contract Restrictions

**Severity:** Medium
**Confidence:** MEDIUM

**What goes wrong:**
Many US school districts have employment contracts that restrict teachers from:
- Competing with district programs (some districts offer their own tutoring programs)
- Using student relationships formed at school for private commercial purposes
- Contacting students' parents outside official channels for commercial purposes
- Operating a business that could be seen as a conflict of interest

Teachers who violate their contract to use Tutelo face disciplinary action. This creates churn (they leave when they realize the risk) and reputational risk for Tutelo if a district investigates.

**Prevention:**
1. Add a teacher onboarding acknowledgment: "I confirm that using Tutelo complies with my employer's policies regarding outside employment and tutoring."
2. Add FAQ content: "Is using Tutelo allowed for school teachers?" with general guidance and a prompt to review their contract.
3. Do NOT market Tutelo with messaging that implies teachers can tutor their own students — this is the highest-risk violation.
4. Position Tutelo as serving students who are NOT a teacher's own classroom students (different school, different district, or different grade level).

**Phase:** Phase 1 (Copy and legal review before launch).

---

### M6: Platform Fee Collection — Timing and Failure Modes

**Severity:** Medium
**Confidence:** HIGH

**What goes wrong:**
Stripe Connect Express allows the platform to take an `application_fee_amount` at charge time. If you set the fee percentage incorrectly (e.g., computing 15% of $50 in integer cents and getting a rounding error), you either undercharge or fail the transaction. More commonly:

- If a refund is issued, the application fee is automatically refunded proportionally — but only if you issued the refund via Stripe, not via a manual bank transfer workaround.
- If you update your fee structure later (e.g., 10% → 15%), existing bookings confirmed under old fees must be processed at the old rate. No mechanism to retroactively update.
- Fee collection fails silently if the `application_fee_amount` exceeds the charge amount (Stripe returns an error but many implementations don't handle it).

**Prevention:**
1. Compute fees in integer cents using integer arithmetic (not floating point). `Math.round(amountInCents * feePercent / 100)` not `amountInCents * 0.15`.
2. Store the agreed fee percentage on the booking record at booking creation time, not on the teacher profile. This locks in the rate.
3. Always process refunds through Stripe's API, never via manual workarounds.
4. Handle `application_fee_amount > charge_amount` as a hard error with clear logging.

**Phase:** Phase 1 (Payments). Fee math errors compound quickly.

---

### M7: Solo Build Scope Creep — Death by Polish

**Severity:** Medium
**Confidence:** HIGH

**What goes wrong:**
At 10-15 hours/week, a solo builder has approximately 40-60 hours per month of productive development time. Features that seem small (a notification system, a review/rating system, a calendar UI, a messaging system) each consume 20-40 hours individually. The trap: building polished versions of features instead of functional versions.

Common fatal scope decisions for a solo tutoring platform at MVP:
- Building in-app messaging (use email for MVP)
- Building a custom calendar picker (use a library like `react-day-picker` or Calendly embed)
- Building a teacher search with filters (use a simple list sorted by rating for MVP)
- Building automated session reminders (use Supabase edge functions triggering simple emails)

**Prevention:**
1. Set a hard MVP feature list and treat every addition as a tradeoff against launch date.
2. Use a launch deadline (target date) as the primary constraint, not feature completeness.
3. Prefer library solutions for all UI components: shadcn/ui, react-day-picker, react-hook-form.
4. Defer: messaging, reviews/ratings, search/filters, recurring bookings, referral system, coupon codes.
5. Track hours per feature to calibrate estimates.

**Phase:** Ongoing. Most dangerous in Phase 2-3 when the platform "almost works."

---

### M8: Stripe Connect — Account Deauthorization Handling

**Severity:** Medium
**Confidence:** HIGH

**What goes wrong:**
Teachers can disconnect their Stripe account from your platform at any time by going to their Stripe dashboard and revoking access. When this happens, Stripe sends `account.application.deauthorized`. If you don't handle this webhook:
- The teacher still appears as "active" in your system
- Parents can still try to book them
- When payment is attempted, it fails with a confusing error
- There are no payouts to the teacher

**Prevention:**
1. Handle `account.application.deauthorized` webhook: set `stripe_account_id = null` and `stripe_charges_enabled = false` on the teacher record.
2. Immediately disable the teacher's booking availability so no new bookings can be made.
3. Email the teacher: "Your Stripe account was disconnected from Tutelo. Reconnect to continue accepting bookings."
4. For any pending bookings: cancel them and refund parents.

**Phase:** Phase 1 (Webhooks). Must be part of initial webhook implementation.

---

## Design Decision Validation

Evaluating Tutelo's five key architectural decisions against research findings.

---

### Decision 1: Deferred Stripe Connect

**Decision:** No payment setup required until first booking request arrives.
**Verdict:** SMART with critical guardrails.
**Confidence:** HIGH

**Analysis:**
Deferred onboarding is the correct decision for reducing teacher signup friction. Requiring Stripe setup before a teacher has any reason to complete it creates a 100% abandonment rate at that step for teachers who aren't yet convinced the platform will generate revenue for them.

HOWEVER, the deferred model introduces the limbo booking problem (see H1). The key is engineering the state machine correctly:
- Teachers must be blocked from "accepting" bookings until Stripe is set up, OR
- Acceptance triggers an immediate Stripe setup prompt with a time limit, OR
- Payment is not collected until setup completes, with the parent clearly informed

**Guardrail required:** Define the exact state machine before writing any booking code. The sequence `request → accept → stripe_setup → payment → confirm` must be explicit in the database schema and enforced, not assumed.

**Risk level:** Low if state machine is implemented correctly. High if state machine is implicit/assumed.

---

### Decision 2: Booking Request Model (No Payment Until Stripe Connected)

**Decision:** No payment collected until teacher connects Stripe.
**Verdict:** VALID for MVP, but fraud risk is real and must be bounded.
**Confidence:** MEDIUM

**Analysis:**
The fraud risk in the "request without payment" model is primarily:
- Fake booking spam: bad actors can flood teachers with fake booking requests
- Parent intent verification: a parent who isn't charged feels less committed, leading to no-shows even after teacher accepts

The fraud risk is bounded in the early phase because:
- Volume is low (small user base)
- Teachers are real identities (school email verification)
- The Instagram GTM brings a known community, not anonymous users

**Guardrail required:** Add rate limiting on booking requests per parent account. Consider a small deposit or card pre-authorization (not charge) at booking request time — this verifies the card and parent intent without completing the charge until after the session.

**Risk level:** Low at MVP scale. Revisit when volume exceeds 100 bookings/month.

---

### Decision 3: Self-Reported Teacher Credentials

**Decision:** MVP uses self-reported credentials with no verification.
**Verdict:** ACCEPTABLE for MVP with strong disclaimers. Must have Phase 2 plan.
**Confidence:** MEDIUM

**Analysis:**
Self-reported credentials are industry-standard for early-stage edtech platforms. Wyzant, Tutor.com, and Varsity Tutors all started with lighter verification. The risk is real but manageable at low scale.

The critical guardrails:
- Explicit disclaimer on profiles and during parent onboarding: "Credentials are self-reported by teachers. Tutelo does not independently verify."
- School email verification as a minimum trust signal (verifiable, automated, meaningful)
- Parent reviews/ratings as early as possible (Phase 2 at latest)
- No marketing language that implies verification you haven't done

**Risk level:** Low at MVP. Elevates when you reach media attention or larger scale. Plan Checkr or similar integration for Phase 3.

---

### Decision 4: Solo Build at 10-15 hrs/week

**Decision:** Building solo, 10-15 hours per week.
**Verdict:** VIABLE for MVP if scope is ruthlessly constrained.
**Confidence:** HIGH

**Analysis:**
At 15 hrs/week, you have approximately 60 hours per month. Realistic milestones:
- Phase 1 (Auth + profiles + booking + payments): 120-180 hours → 2-3 months
- Phase 2 (Reviews + notifications + teacher dashboard): 80-120 hours → 1.5-2 months
- Phase 3 (Search + mobile polish + compliance): 60-80 hours → 1-1.5 months

Total to launch-ready: 5-7 months at this pace. This is achievable if scope doesn't expand. The pitfall is feature creep adding 20-40% to each phase.

**Guardrail required:** Maintain a strict "not in MVP" list. Every feature request or idea gets triaged: MVP or backlog. No exceptions during Phase 1-2.

**Risk level:** Medium. The risk is motivation and consistency over 6+ months, not technical feasibility.

---

### Decision 5: Instagram (@eyes_on_meme) as Primary GTM

**Decision:** Leverage existing Instagram teacher audience for launch distribution.
**Verdict:** HIGH UPSIDE, HIGH DEPENDENCY RISK.
**Confidence:** MEDIUM

**Analysis:**
Having an existing audience is a genuine advantage that most marketplace founders don't have. However:

1. **Content-to-commerce conversion is uncertain.** An audience that follows for relatable teacher content may not convert to users who want to set up a tutoring side hustle. The psychographic overlap needs validation with a test CTA before the platform exists.

2. **Single channel dependency.** If Instagram algorithm changes, account gets flagged, or engagement drops, GTM collapses. No diversification.

3. **Audience composition risk.** If the audience skews heavily toward one geography, subject area, or grade level, supply will be imbalanced.

4. **Timing dependency.** Instagram algorithm favors active accounts. A long build phase without product-relevant content may cause audience decay.

**Guardrail required:**
- Post a "would you use this?" poll or waitlist CTA before building. Validate conversion intent.
- Grow an email list (not just Instagram) of interested teachers during the build phase.
- Identify 2-3 backup channels (teacher Facebook groups, Reddit r/Teachers, TikTok for Teachers).
- Set a minimum teacher signup threshold (e.g., 25 verified teachers) before opening to parents.

**Risk level:** Medium-High. GTM is the product's biggest risk, more so than technical execution.

---

## Phase-by-Phase Risk Mapping

| Phase | Topic | Primary Pitfall | Mitigation | Severity |
|-------|-------|-----------------|------------|----------|
| Phase 1 | Database schema | Timezone storage errors | Use `timestamptz` everywhere; store IANA tz string | Critical |
| Phase 1 | RLS design | Silent policy failures for multi-role access | Design policies before schema; test as real users | Critical |
| Phase 1 | Booking creation | Double-booking race condition | Atomic DB function + unique constraint | Critical |
| Phase 1 | Webhook setup | Missing Connect webhook endpoint | Two endpoints, two secrets, test both | Critical |
| Phase 1 | Webhook body | Raw body destroyed by middleware | Use `req.text()` not `req.json()` | Critical |
| Phase 1 | Payments | Teacher capabilities not enabled | Gate payment on `charges_enabled` flag from webhook | Critical |
| Phase 1 | Booking state | Limbo bookings (deferred Stripe) | Explicit state machine, 48-hour timeout, clear UX | High |
| Phase 1 | Auth mobile | Email confirmation broken on mobile | PKCE flow, correct redirect URLs, mobile test | High |
| Phase 1 | Teacher onboarding | Credentials trust gap | Disclaimer copy, school email verification | High |
| Phase 1 | Payout | Teacher payout timing surprise | Onboarding copy explaining T+7 timeline | High |
| Phase 1 | Fees | Integer rounding errors | Integer arithmetic, store rate on booking record | Medium |
| Phase 1 | Deauthorization | Teacher disconnects Stripe silently | Handle `account.application.deauthorized` | Medium |
| Phase 1 | Idempotency | Double-click creates duplicate PaymentIntents | Idempotency key = booking UUID | Medium |
| Pre-launch | Infrastructure | Supabase free tier limits | Upgrade to Pro before launch | High |
| Pre-launch | GTM | Supply-side cold start | Seed 20-30 teacher profiles before parent launch | Medium |
| Pre-launch | Legal | School district contract violations | Acknowledgment copy + FAQ in teacher onboarding | Medium |
| Pre-launch | Tax | Teacher 1099-K surprise | Disclosure in onboarding, link to IRS guidance | High |
| Phase 2 | Recurring bookings | DST edge cases, cancellation complexity | Build only after single-session is proven | High |
| Phase 2 | Realtime | Unfiltered subscriptions = privacy leak | Filter by `auth.uid()`, consider polling for MVP | Medium |
| Phase 2 | Credentials | Competitor trust gap widens | Begin Checkr or school-email verification | High |
| Ongoing | Scope | Solo builder feature creep | Strict MVP list, time-box features | Medium |
| Ongoing | GTM | Single channel Instagram dependency | Grow email list, identify 2 backup channels | Medium |

---

## Summary of Most Critical Risks

In priority order for a solo builder at 10-15 hrs/week:

1. **Timezone storage** — Silent data corruption. Get this right in the schema before any booking code is written.
2. **Stripe webhook architecture** — Two endpoints, two secrets. Get this right before payments are written.
3. **RLS policy testing** — Test as real users, not studio superuser. Build the test harness in Phase 1.
4. **Booking state machine** — Make the limbo states explicit. Draw the state machine before writing code.
5. **Teacher payout expectations** — Cheap to fix with copy; expensive to lose early teachers over.
6. **GTM validation** — Test the Instagram conversion before investing 6 months of build time.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stripe Connect Express pitfalls | HIGH | Well-documented, consistent with official Stripe docs as of Aug 2025 |
| Supabase RLS pitfalls | HIGH | Core product behavior unlikely to change |
| Supabase free tier limits | MEDIUM | Verify current limits at launch — Supabase changes these |
| Booking/timezone pitfalls | HIGH | Universal booking system problem, well-documented |
| 1099-K threshold | MEDIUM | IRS threshold was in legislative flux as of Aug 2025; verify current rules |
| School district contract law | LOW | Jurisdiction-specific; requires legal counsel for definitive guidance |
| Stripe payout timing | MEDIUM | Stripe changes default schedules; verify current defaults |
| Instagram conversion rates | LOW | No data available; requires empirical testing |

---

## Sources

Note: External web access was unavailable during this research session. All findings are based on training knowledge through August 2025, cross-referenced across Stripe documentation, Supabase documentation, edtech marketplace post-mortems, and booking system engineering patterns in the author's training corpus. Items marked MEDIUM or LOW confidence should be manually verified against current official documentation before implementation.

**Key sources to verify manually:**
- https://stripe.com/docs/connect/express-accounts — Express account capabilities and requirements
- https://stripe.com/docs/connect/webhooks — Connect webhook configuration
- https://supabase.com/docs/guides/auth/row-level-security — RLS patterns
- https://supabase.com/pricing — Current free tier limits
- https://stripe.com/docs/connect/payout-statement-descriptors — Payout timing documentation
- IRS.gov — Current 1099-K reporting thresholds
