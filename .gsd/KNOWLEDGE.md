# Knowledge

Append-only register of project-specific rules, patterns, and lessons learned.

---

## UI/UX Design Guidelines

These are the foundational design principles for all Tutelo interfaces. Follow them when building any UI — landing pages, dashboard, booking flows, teacher profiles, etc.

### 1. Affordance & Signifiers

The UI must communicate how it works without explicit instructions.

- **Grouping:** Use containers or whitespace to show relationships. Elements inside a box are related; those outside are not.
- **State Indicators:**
  - *Selection:* Use highlights or borders to show active items.
  - *Status:* Use "grayed out" styling to signify inactive or disabled elements.
- **Feedback:** Every interaction requires a response. Every button/input must have four states: Default, Hover, Active (Pressed), and Disabled.

### 2. Visual Hierarchy & Contrast

Direct the user's eye to the most important information first.

- **The "Big Three":** Use Size, Position, and Color to establish importance.
- **Scanning:** Place primary data (e.g., Price, Titles) at the top or in high-contrast colors to make them stand out.
- **De-emphasis:** Secondary info (e.g., timestamps, locations) should be smaller, lighter in weight, and placed below primary content.
- **Imagery:** Use images whenever possible to add color and make the UI more scannable.

### 3. Layout & Spacing

Consistency is more important than strict adherence to grids.

- **The 4pt Grid System:** Use multiples of 4 for spacing and padding. This allows for clean mathematical halving and ensures consistency.
- **Whitespace:** Let elements "breathe." Group related items (e.g., Header + Subtext) closer together, and use larger gaps (e.g., 32px) to separate distinct sections.
- **Responsive Standards:**
  - Desktop: 12 columns
  - Tablet: 8 columns
  - Mobile: 4 columns

### 4. Typography Rules

Design is 90% text; keep it simple and readable.

- **Font Selection:** Stick to one high-quality Sans-Serif font family.
- **Pro Styling:** For large headers, tighten letter spacing (-2% to -3%) and reduce line height (10% to 20%) to make it look professional.
- **Constraints:**
  - Landing Pages: Max 6 font sizes
  - Dashboards: Max size 24px (to maintain information density)

### 5. Color & Depth

Color should be functional, not just decorative.

- **Semantic Colors:** Use colors with established meanings: Red (Danger), Yellow (Warning), Green (Success), Blue (Trust/Action).
- **Dark Mode (future):**
  - Avoid high-contrast pure white borders.
  - Create depth by making "elevated" cards lighter than the background (since shadows don't work in the dark).
- **Shadows:** Shadows should be subtle. Use lower opacity and higher blur. Stronger shadows should only be used for elements that "sit" high above the UI, like popovers.

### 6. Elements & Interactions

- **Icons:** Size icons to match the line height of your text (e.g., 24px icon for 24px line height).
- **Buttons:** A good padding rule for buttons is to make the width double the height.
- **Micro-interactions:** Use small animations (like a "Copied!" chip sliding up) to confirm actions.
- **Overlays:** When placing text over images, use a linear gradient (fading to black/dark) or a progressive blur to ensure text readability without obscuring the photo.

---

## Auth Pattern: getUser() not getClaims()

All dashboard pages and server-side auth checks should use `supabase.auth.getUser()` (verified API call), not `getClaims()` (unverified cookie read). `getClaims()` fails on server-action POST re-renders in Next.js 16. The dashboard layout already uses `getUser()` — all child pages must follow the same pattern.

**Affected:** Every `page.tsx` under `src/app/(dashboard)/dashboard/`.

---

## Resend Mock Pattern for Vitest

When mocking the `resend` package in Vitest, use a **class-based mock** in `vi.hoisted()` because `Resend` is instantiated with `new` at module scope. Using `vi.fn().mockReturnValue(...)` produces a plain function that isn't constructable — `new Resend(...)` throws `TypeError: value is not a constructor`.

**Correct pattern:**
```ts
const { MockResend, emailsSendMock } = vi.hoisted(() => {
  const emailsSendMock = vi.fn().mockResolvedValue({ id: 'email_test_123' })
  class MockResend {
    emails = { send: emailsSendMock }
  }
  return { MockResend, emailsSendMock }
})
vi.mock('resend', () => ({ Resend: MockResend }))
```

This differs from the Twilio mock pattern in `sms.test.ts` because Twilio uses a default export function call (`twilio(sid, token)`), not `new Twilio(...)`.

---

## Server Action Auth Limitation

Server actions under the dashboard layout can fail auth on Next.js 16 POST re-renders because cookies are not forwarded correctly. Known workaround: convert to API route handler pattern (POST endpoint + client-side fetch). `connectStripe` was already converted. Other server actions (`bookings.ts`, `availability.ts`, `profile.ts`) still use `getClaims()` — they work when called from pages but can fail on layout re-renders.

---

## High-Res QR PNG Download Without Server Round-Trip

To download a high-res QR code PNG client-side, render a second `QRCodeCanvas` at the target resolution (e.g. 512px) inside a `hidden` div, then extract it on click via `container.querySelector('canvas').toDataURL('image/png')`. This avoids a server request and produces a clean PNG without any DOM-visible rendering. Set error correction level `H` if you plan to add a logo overlay later (H allows up to 30% coverage).

**Affected:** `src/components/dashboard/QRCodeCard.tsx`

---

## Binary API Response Download via Blob URL

To download a binary response from an API route (e.g. PNG flyer), fetch the route, convert the response to a Blob, create an object URL, trigger a programmatic anchor click, then revoke the URL. Do NOT use `<a href="/api/...">` directly — browsers may navigate instead of downloading for image/* content types.

```ts
const resp = await fetch(`/api/flyer/${slug}`)
const blob = await resp.blob()
const url = URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = url
link.download = `tutelo-flyer-${slug}.png`
link.click()
URL.revokeObjectURL(url)
```

**Affected:** `src/components/dashboard/FlyerPreview.tsx`

---

## Vitest mock.calls Index Access — TypeScript Strict Tuple Error

`vi.fn().mock.calls[N]` is typed as `Parameters<T>` which may be an empty tuple `[]` when the mock function has no explicit parameter types. Accessing `mock.calls[0][0]` causes `TS2493: Tuple type '[]' has no element at index '0'`. Fix by casting through `unknown[]`:

```ts
// ❌ TS2493 error
const arg = mockFn.mock.calls[0][0]

// ✅ correct
const arg = (mockFn.mock.calls[0] as unknown[])[0] as Record<string, unknown>
```

**Affected:** `tests/unit/social-email.test.ts`


---

## Google SSO + School Email Verification — Decoupled by Design

The school email verification flow (VERIFY-01, M005/S03) must remain independent of the auth provider. Teachers who sign in with Google (personal Gmail) still need to be able to enter their `.edu` address and receive an OTP to earn the "verified" badge.

When implementing Google OAuth, do **not** assume the auth email equals the school email. The `verified_school_email` column on the `teachers` table is the source of truth for verification status — not `auth.users.email`. The OTP flow should be triggerable from the dashboard regardless of how the teacher authenticated.

Alternative approach worth considering later: if a teacher authenticates via Google Workspace with a `.edu` email, treat that as implicit verification (no OTP needed). This requires detecting the Google account's `hd` (hosted domain) claim in the OAuth token. See decision D003.

---

## og:url Must Be a Hardcoded Canonical URL — Not Environment-Derived

When adding `openGraph.url` to `generateMetadata`, hardcode the production URL (`https://tutelo.app/${slug}`) rather than reading from `process.env.NEXT_PUBLIC_APP_URL`. Facebook and other platforms use `og:url` as the deduplication/canonical key for link preview caching. If the URL differs between preview and production deployments, crawlers cache preview-branch previews and serve them on production.

This matches how `metadataBase` is set in `src/app/layout.tsx` and the URL pattern used in `/api/flyer/[slug]` and other server routes. OG metadata must be deterministic regardless of the serving environment.

**Pattern:** When in doubt about which URL to emit for OG tags, always use the hardcoded production canonical URL. See decision D004.

---

## Server Component + Client Animation Split Pattern

When a Next.js page is an async server component (using `await supabase.auth.getUser()` or any async data fetch), you cannot import `motion` client variants or any `'use client'` components that use hooks directly at the top-level import chain — it breaks the server component boundary.

**Pattern:** Keep the async page as a pure server component. Extract any list that needs stagger animation into a sibling `'use client'` component in the same directory, passing only serializable props (string, number, plain objects — no functions, no Date objects, no class instances).

```
promote/
  page.tsx              ← async server component: fetches data, renders layout
  SwipeFileSection.tsx  ← 'use client': receives serializable props, runs staggerContainer/staggerItem
```

This pattern applies wherever you need both server-side auth/data-fetching and client-side animation in the same route. **Affected:** `src/app/(dashboard)/dashboard/promote/`.

---

## Parametric Null-Leak Tests for Data Interpolation Modules

When a module interpolates user-supplied data into text templates, add a cross-cutting parametric test suite that asserts **no rendered output ever contains `"null"`, `"undefined"`, or empty label strings** — for every template × every data fixture combination.

Five fixture categories cover the full edge-case space: (1) all fields present, (2) all optionals null, (3) empty arrays for list fields, (4) single-item arrays, (5) multi-item arrays. With 4 templates × 5 fixtures = 20 assertions, the entire class of "raw null leaked into copy" bugs is eliminated in one sweep.

```ts
describe.each(fixtures)('null-leak: $name', (fixture) => {
  templates.forEach(t => {
    it(`${t.id} contains no null/undefined`, () => {
      const text = t.render(fixture.data)
      expect(text).not.toMatch(/\bnull\b|\bundefined\b/)
    })
  })
})
```

**Affected:** `tests/unit/templates.test.ts` — apply this pattern to any future template, email, or SMS rendering module.

---

## Git Worktree Environment File Gap

`.env.local` and `.env` are not automatically inherited by git worktrees — they live in the main project root and are not symlinked or copied to the worktree directory. If a build or test run inside a worktree fails because environment variables are missing, symlink the env files:

```bash
ln -s ../../.env.local .env.local
ln -s ../../.env .env
```

Worktrees share git history but have isolated working directories. Any file that is gitignored (like `.env.local`) must be explicitly made available. This is a recurring gap — establish the symlink as part of worktree initialization.

---

## Profile Page Capacity Check: Inline Query vs. Utility Import

The profile RSC ([slug]/page.tsx) performs the capacity check inline (direct Supabase query) rather than importing `getCapacityStatus` from `src/lib/utils/capacity.ts`. This is intentional: the page already has a `supabase` client from cookie auth and shares the same request lifecycle. The utility accepts a `SupabaseClient` parameter specifically to support this inline-or-import flexibility. If you refactor to use the utility import, pass the page's existing `supabase` client — do NOT create a new one.

---

## AtCapacitySection Must Match BookingCalendar Layout Signature

`AtCapacitySection` deliberately uses the same `mx-auto max-w-3xl px-4 py-8` container as `BookingCalendar`. The profile page conditionally renders one or the other in the same slot. If you change `BookingCalendar`'s container width/padding, update `AtCapacitySection` to match — otherwise the layout shifts noticeably when switching between states.

---

## Zod safeParse Error Access: `.issues` not `.errors`

In Zod v3, `safeParse` returns `{ success: false, error: ZodError }` where `ZodError` exposes `.issues` (array of `ZodIssue`), NOT `.errors`. TypeScript will correctly flag `parsed.error.errors[0]` with "Property 'errors' does not exist on type 'ZodError'" — the fix is `parsed.error.issues[0].message`.

**Affected:** `src/actions/session-types.ts` (discovered during S02 build verification — pre-existing S03 code). Apply `parsed.error.issues[0].message` everywhere Zod `safeParse` error messages are extracted.

---

## Session Type Selector as Calendar-Step Guard (Not a New Step Machine State)

When adding a pre-selection screen to the booking calendar (session type picker, package selector, etc.), implement it as a conditional block inside the existing `'calendar'` step rather than a new named step. Pattern:

```tsx
{step === 'calendar' && (
  <>
    {hasSessionTypes && !selectedSessionType ? (
      <SessionTypePicker onSelect={setSelectedSessionType} />
    ) : (
      <CalendarGrid ... />
    )}
  </>
)}
```

This avoids adding branches to the back-navigation and step-transition logic while keeping the UI state machine simple. The selected type is just another piece of form state — not a named routing step.

---

## getSlotsForDate durationMinutes Parameter: Must Be Added, Not Assumed

When a task plan says "`getSlotsForDate` already accepts `durationMinutes` as the 7th param with a default of 30" — **verify first**. In M007/S03, this parameter did NOT exist in `slots.ts`; it had to be added to both `generateSlotsFromWindow` and `getSlotsForDate`. The function signature in `slots.ts` is the ground truth; task plans that reference it may be stale. Adding `durationMinutes = 30` as a default parameter is backward-compatible and safe for existing callers.

---

## Session Type Price Is NUMERIC (Dollars), Convert to Cents at PI Creation

The `session_types.price` column stores dollar values as a NUMERIC type (e.g., `60.00`). When creating a Stripe PaymentIntent, convert with `Math.round(Number(price) * 100)`. Never assume the DB stores cents. The `Number()` cast is needed because Supabase returns NUMERIC as a string in JavaScript. Using `Math.round` avoids floating-point rounding errors (e.g., 35.99 * 100 = 3598.9999...).

---

## session_type_id FK on Bookings: Skip for MVP, Add When Analytics Needed

Storing `session_type_id` as a FK on the `bookings` table requires a migration and delivers no immediate user-facing value — the session type label is already captured as `subject`. For MVP, storing `session_type_id` only in Stripe PaymentIntent metadata is sufficient. Add the FK migration when reporting or analytics queries need session-type-level aggregation. This avoids table-altering migrations that create risk without reward.

---

## Pure-Logic + Async-Query Split Pattern for DB-Dependent Utilities

When a utility function combines business logic with a DB query, split it into two exports:
1. A **pure function** (`isAtCapacity(count, limit)`) for unit-testable logic with no mocking
2. An **async function** (`getCapacityStatus(supabase, teacherId, capacityLimit)`) for the DB query layer

The async function accepts a `SupabaseClient` parameter so RSC pages that already have a client can call it directly, and the utility's own tests can pass a mock. The async function also short-circuits early when no computation is needed (e.g., `if (capacityLimit === null) return { atCapacity: false, count: 0 }` — avoids a DB round trip for the common case).

---

## Anonymous Mutations: API Route + supabaseAdmin, Not Server Actions

Server actions require an auth context (Next.js session) that anonymous users don't have. For any form submission where the user is not authenticated (e.g., waitlist signup by a parent who has never logged in), use an API route (`/api/resource` POST) with `supabaseAdmin` (service role key). This pattern:
- Bypasses RLS cleanly without anon-safe client gymnastics
- Returns explicit HTTP status codes (201/409/400/500) that are meaningful to the client
- Is testable as a standard HTTP handler
- Is consistent with Next.js middleware patterns for unauthenticated requests

---

## Safe-Default-on-Error for Feature/Access-Gate Checks

Any check that gates user access to a feature (capacity check, feature flag, subscription status) must fail open — not fail closed. If the DB query fails, the user should see the permissive state (show calendar, not "at capacity"). Log the error with context (teacher_id, no PII), but never block access due to a transient infrastructure failure. This applies to capacity checks, session type lookups, and any "should this user see X?" logic.

---

## Fire-and-Forget Post-Action Work: Dynamic Import Pattern

When a server action needs to trigger non-blocking follow-up work (sending emails, processing notifications, updating analytics), use this pattern:
```ts
import('@/lib/utils/notify').then(m => m.checkAndNotify(id)).catch(console.error)
```
- **Dynamic import** keeps the notification module out of the primary action bundle
- **.catch(console.error)** ensures failures never propagate to the action caller
- Matches the existing pattern for `sendCancellationEmail` and `sendSmsCancellation` in `bookings.ts`
- Never use `await` — the caller should not wait for the notification to complete

---

## Worktree vs. Main Branch Split: Verify Code in Both

When closing a milestone that used a worktree, some slice work may have been committed directly to `main` rather than the worktree branch (e.g., M007/S03). Before declaring a code-change verification pass, check both:
- `git diff --stat $(git merge-base HEAD main) HEAD -- ':!.gsd/'` in the worktree
- The main branch for any files listed in slice summaries but not in the worktree diff

The union of both sets is the milestone's actual deliverable. The worktree merge will reconcile them, but the verification step must account for both locations.

---

## Recurring Date Generation: Use UTC Noon Anchor for DST Safety

`generateRecurringDates` uses `new Date(\`\${dateStr}T12:00:00Z\`)` as the anchor, not midnight. Then adds `n * 7 * 24 * 60 * 60 * 1000` ms and converts back via `.toISOString().split('T')[0]`. Midnight-anchored dates fail when adding days across a DST boundary — the UTC midnight shifts one hour and the date string rolls back by one day. Noon anchor absorbs the ±1h DST shift. All date-only arithmetic in the recurring feature should use this pattern.

---

## Stripe setup_future_usage + capture_method:manual Compatibility

`PaymentIntent` with both `setup_future_usage: 'off_session'` and `capture_method: 'manual'` is valid and confirmed compatible by Stripe docs. The client calls `stripe.confirmCardPayment()` as normal — Stripe saves the payment method to the Customer and places an authorization hold simultaneously. When S02 implements auto-charge, retrieve `payment_intent.payment_method` from the PI object after confirmation (stored on `recurring_schedules.stripe_payment_method_id`) and use `stripe.paymentIntents.create()` with `confirm: true, payment_method: savedPmId, customer: customerId` for each subsequent session.

---

## React Email Template: Preview Text Must Use Template Literal for Number Interpolation

React Email's `<Preview>` component only accepts `string` children, but TypeScript infers `number | string` from array `.length`. Use a template literal:
```tsx
<Preview>{`Your recurring schedule: ${sessionDates.length} sessions starting ${formattedStart}`}</Preview>
```
Direct JSX expression interpolation (`{sessionDates.length} sessions`) causes TS2322 errors with some React Email versions.

---

## Vitest Mock Pattern for Route Modules That Import @/lib/email

When testing API routes that call `sendRecurringBookingConfirmationEmail` (or any email function), add `vi.mock('@/lib/email', () => ({ sendRecurringBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined), sendBookingNotificationEmail: vi.fn().mockResolvedValue(undefined) }))` to the test file — otherwise Resend's constructor fires during module import and throws `Error: Missing API key`. This applies to all route tests in `src/__tests__/` that import routes wired to `src/lib/email.ts`.

---

## Vitest Config: Exclude .gsd/** to Prevent Worktree Test Pollution

When vitest runs without excludes, it discovers test files in `.gsd/worktrees/` from previous milestones. These stale tests import modules that reference missing env vars (e.g., `STRIPE_SECRET_KEY`) and fail with unrelated errors. Add `'.gsd/**'` to the `exclude` array in `vitest.config.ts` to prevent this:
```ts
exclude: ['node_modules/**', '.gsd/**']
```
Without this, vitest reports 5–10 phantom failures that obscure real test results.

---

## Recurring Cron: bookings Table Has No session_type_id FK

When implementing the recurring auto-charge cron, the plan specified joining `session_types(price)` via `bookings.session_type_id`. The `bookings` table does not have a `session_type_id` column — session type price was stored only in Stripe PaymentIntent metadata (see D008). For recurring charges, use `computeSessionAmount(start_time, end_time, hourly_rate)` from the teacher's `hourly_rate` instead. The recurring schedule join provides the teacher's `hourly_rate` directly.

---

## Cron Route idempotencyKey Pattern for Stripe PI Creates

For cron-initiated Stripe PaymentIntent creates, always pass an idempotencyKey combining a booking ID and the target date:
```ts
{ idempotencyKey: `recurring-charge-${bookingId}-${tomorrowUtc}` }
```
This prevents duplicate charges if Vercel reruns the cron on a cold start or network error. The `.eq('status', 'requested')` guard on the booking update is a second layer — if the PI was created but the DB update failed, the next cron run finds 0 bookings with `status='requested'` for that date (Stripe's idempotency returns the same PI, booking is already confirmed).

---

## Token-Gated Self-Service Pages: RSC Resolves Token, Client Component Uses fetch()

For parent-facing pages where the visitor has no auth session (e.g., `/manage/[token]`, `/review/[token]`), follow this split:

1. **RSC shell** (`page.tsx`): resolves the token via `supabaseAdmin`, handles invalid/empty states, renders the client component only on valid token.
2. **Client component** (`CancelSeriesForm.tsx`, etc.): receives pre-fetched data as props; all mutations go through dedicated `/api/manage/*` POST routes using `fetch()` — **not server actions**. Server actions require an active Next.js session; pages reached via email links have no session, so server actions will silently fail or throw auth errors.
3. **API routes** (`/api/manage/cancel-session`, `/api/manage/cancel-series`): no auth middleware, but they validate the token owns the target resource on every call. This is the only security boundary — the token is a 64-char hex (256-bit) secret that is never shown in the teacher dashboard or any public surface.

This pattern is established for both `/review/[token]` (post-session review) and `/manage/[token]` (self-service cancellation).

## UTC Noon Anchor for Recurring Date Arithmetic (M009)

When generating recurring dates (weekly/biweekly), always anchor at `T12:00:00Z`, never `T00:00:00Z`. Adding 7 or 14 days in milliseconds to a UTC midnight anchor can produce a date shift of ±1 day when a DST transition falls within the window. UTC noon is always "safe distance" from both day boundaries regardless of timezone.

```ts
// ✅ Safe
const anchor = new Date(`${dateStr}T12:00:00Z`);
const next = new Date(anchor.getTime() + 7 * 24 * 60 * 60 * 1000);
const nextStr = next.toISOString().slice(0, 10); // always correct calendar date

// ❌ Risky
const anchor = new Date(`${dateStr}T00:00:00Z`);
// +7 days during a "spring forward" night can produce wrong date
```

A DST boundary test (`America/New_York` March → November crossing) caught this during M009/S01/T01 development.

## Two-Layer Idempotency for Cron Stripe PaymentIntents (M009)

For cron jobs that create Stripe PIs, use both layers together:
1. **Stripe idempotencyKey**: `recurring-charge-{bookingId}-{tomorrowUtc}` — prevents duplicate PIs on cron retry within the same day
2. **DB `.eq('status','requested')` guard on booking update**: prevents the DB row from being double-updated if the Stripe operation succeeds but the cron crashes before the update

Neither layer alone is sufficient. The idempotencyKey handles Stripe-side retries; the status guard handles cases where the PI was created but the booking update wasn't committed before a crash.

## Mock `@/lib/email` in All Route Test Files That Touch Email (M009)

Any test file that imports a Next.js route module which imports `@/lib/email` **must** add:

```ts
vi.mock('@/lib/email', () => ({
  sendRecurringBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  // ... other functions as needed
}));
```

Otherwise the Resend client constructor (`new Resend(process.env.RESEND_API_KEY)`) throws during module import in test environments, producing a confusing error unrelated to the test subject. The mock must be declared before any imports via `vi.mock` hoisting.

## Exclude `.gsd/**` from Vitest (M009)

Always add `.gsd/**` to the `exclude` list in `vitest.config.ts`. GSD worktrees from previous milestones can leave behind stale test files under `.gsd/` that pollute the test run with phantom failures. This is especially important in projects using GSD auto-mode where multiple milestone worktrees may have existed on the same machine.

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    exclude: ['node_modules/**', '.gsd/**'],
  },
});
```

## Supabase Relation Join Types Are Always Arrays in TypeScript (M010)

When using `.select('*, children(*), teachers(*)')` with Supabase JS, the TypeScript types for relation joins are **always arrays**, even for one-to-one joins. Access the first element explicitly:

```ts
// ❌ Wrong — TypeScript error + runtime undefined
const childName = booking.children?.name

// ✅ Correct
const childName = (booking.children as Array<{name: string}>)[0]?.name
```

This applies to any Supabase query with related tables. Define `BookingRow` with `children: { name: string; grade: string | null }[]` (array, not object). Forgetting this causes TypeScript build failures when accessing nested join fields.

---

## BookingCalendar Child Selector: useEffect + fetch Pattern (M010)

To add per-user personalization (child selector, saved cards, etc.) to `BookingCalendar` without making it a server component:

1. `useState` for data (`children: Child[]`) and loading guard (`childrenLoaded: boolean`)
2. `useEffect` on mount: `supabase.auth.getUser()` → if user, fetch API route → set state
3. Conditional render: `if (childrenLoaded && children.length > 0)` → `<Select>`, else → `<Input>`
4. All three submission paths (`createPaymentIntent`, `createRecurringIntent`, `handleSubmit`) must include the new field (`childId`) in the POST body

The `childrenLoaded` guard prevents a flash of the select before the fetch completes. Without it, logged-out users briefly see the select before it hides. API errors fall back silently to the text input — never block the booking flow on a personalization fetch.

---

## Parent Auth Routing: maybeSingle() Not single() for Teacher Table Check (M010)

When checking if a user has a teacher row (to decide `/parent` vs. `/dashboard` routing), always use `.maybeSingle()` not `.single()`. `.single()` throws a PostgrestError when no row is found, which propagates as a 500 instead of routing to `/parent`. `.maybeSingle()` returns `null` for no-match without error. Pattern used consistently in callback route, signIn action, and login page:

```ts
const { data: teacher } = await supabase
  .from('teachers')
  .select('id')
  .eq('id', user.id)
  .maybeSingle()

if (teacher) return redirect('/dashboard')
return redirect('/parent')
```

---

## `setup_future_usage: 'off_session'` + `capture_method: 'manual'` on One PI (M009)

For recurring booking first-session authorization, a single PaymentIntent can simultaneously:
1. Authorize (hold) the first session payment (via `capture_method: 'manual'`)
2. Save the card for future off-session auto-charges (via `setup_future_usage: 'off_session'`)

No separate SetupIntent is needed. After the parent confirms payment, the PI's `payment_method` is attached to the Stripe Customer and available for subsequent auto-charges. Retrieve it from `payment_intent.payment_method` in the webhook and store on `recurring_schedules.stripe_payment_method_id`.

