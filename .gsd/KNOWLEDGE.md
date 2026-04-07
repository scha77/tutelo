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

---

## Next.js Route Groups Strip Path Segments from OAuth `redirectTo` (M010/S02)

Next.js route groups (directories wrapped in parentheses like `(auth)`) do **not** appear in the URL. A callback route at `src/app/(auth)/callback/route.ts` is reachable at `/callback`, not `/auth/callback`. If you set `redirectTo: \`${window.location.origin}/auth/callback\`` in a Supabase OAuth call, the redirect will 404. Always use the URL-accessible path, not the filesystem path.

Fixed in `LoginForm.tsx` `handleGoogleSignIn`:
```ts
// ❌ Wrong — (auth) group segment appears in filesystem path but NOT in URL
redirectTo: `${window.location.origin}/auth/callback`

// ✅ Correct — matches the actual route URL
redirectTo: `${window.location.origin}/callback`
```

---

## Testing Next.js Route Handlers That Return Redirects (M010/S02)

When unit-testing a route handler that returns `NextResponse.redirect()`:

1. Call the handler with `new NextRequest('http://localhost/callback?code=test-code')`.
2. The response is a `NextResponse` with status 307/308 and a `location` header — **not** a thrown redirect.
3. Assert with: `expect(response.headers.get('location')).toContain('/dashboard')` (or check `response.status`).

Use `vi.hoisted()` to define mock variables before `vi.mock()` runs, since `vi.mock()` is hoisted to the top of the module scope by Vitest. Without `vi.hoisted()`, mock variable references inside the factory are `undefined` at the time the factory executes.

```ts
const { mockExchangeCodeForSession, mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockExchangeCodeForSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession, getUser: mockGetUser },
    from: mockFrom,
  })),
}))
```


---

## Avoiding TS2702 in Webhook Route Tests with vi.mock'd Stripe (M010/S03)

When testing a webhook route handler that references `Stripe.PaymentIntent` as a type (from the `stripe` module), importing the `Stripe` namespace in the test file causes `TS2702: 'Stripe' only refers to a type, but is being used as a namespace` after `vi.mock('stripe', ...)` replaces the module. Workaround: type the mock PI objects as `any` in the webhook test file rather than `Stripe.PaymentIntent`. This avoids the TS2702 error while still allowing full runtime mock control.

```ts
// ❌ Causes TS2702 when stripe is vi.mock'd
import Stripe from 'stripe'
const mockPI: Stripe.PaymentIntent = { ... }

// ✅ Works — use any for mock objects in webhook tests
const mockPI: any = { id: 'pi_test', customer: 'cus_test', payment_method: 'pm_test', ... }
```

---

## Stripe paymentMethods.detach vs. customers.detachPaymentMethod (M010/S03)

To remove a saved card from a Stripe Customer, use `stripe.paymentMethods.detach(pmId)` (standalone call). Do NOT use `stripe.customers.detachPaymentMethod()` — that API doesn't exist in the Node SDK. After detach, update `parent_profiles` to null out the card fields (`stripe_payment_method_id`, `card_brand`, `card_last4`, `card_exp_month`, `card_exp_year`) so the UI reflects the removal.

---

## parent_profiles Table Pattern: Non-Critical PM Storage (M010/S03)

The `parent_profiles` table stores one Stripe Customer + saved card per parent account. Key invariants:
- `user_id` is the PK (1:1 with `auth.users`) — upsert with `onConflict: 'user_id'`
- PM card details are upserted in the webhook's `payment_intent.amount_capturable_updated` handler **after** booking confirmation succeeds — wrap the PM upsert in try/catch so a Stripe or DB error here never fails the webhook response (booking confirmation is already done)
- PM upsert only runs when PI metadata has `parent_id`, `customer`, and `payment_method` — pre-S03 bookings (no `parent_id` in metadata) skip gracefully
- GET `/api/parent/payment-method` returns only display fields (brand, last4, exp_month, exp_year) — never expose `stripe_payment_method_id` or `stripe_customer_id` to the client

---

## Supabase Realtime postgres_changes: RLS Is Enforced Automatically (M010/S04)

`postgres_changes` subscriptions on tables with RLS enabled automatically filter events to only rows the authenticated user can SELECT. No custom filter beyond `conversation_id=eq.<id>` is needed — Supabase handles participant authorization at the DB level. This means the browser Supabase client (`createClient()`) can subscribe to messages without any extra auth config.

Cleanup pattern that works reliably: store the channel reference from `.channel().on(...).subscribe()` in a `useRef` or closure, then call `supabase.removeChannel(channel)` in the `useEffect` return. Do not call `supabase.channel(...).unsubscribe()` — `removeChannel` is the correct API.

---

## Resend Constructor Must Be Mocked with function() Not Arrow Function (M010/S04)

When an API route calls `new Resend(process.env.RESEND_API_KEY)` **at module scope** (outside any handler), the mock must support construction:

```ts
// ❌ Arrow function — not constructable, throws TypeError
vi.mock('resend', () => ({ Resend: vi.fn() }))

// ✅ function() — constructable, supports new Resend(...)
vi.mock('resend', () => ({
  Resend: function () { this.emails = { send: emailSendMock } },
}))
```

Use a shared mutable `emailSendMock` variable declared before the mock factory so individual tests can reassign `.mockResolvedValue()` / `.mockRejectedValue()` per test. Note: this duplicates entry in KNOWLEDGE.md at line 80 for the same pattern from an earlier milestone — the canonical fix is `function()` not arrow function.

---

## Messaging API: Conversation Auto-Creation Race Condition Handling (M010/S04)

`POST /api/messages` with a `teacherId` (first message) does a SELECT-then-INSERT for the conversation. Under race conditions, two simultaneous requests from the same parent can both skip the SELECT (null result) and both attempt INSERT, triggering a `23505` unique constraint violation on the second insert. The fix: catch `convError.code === '23505'` and re-SELECT to get the winning row:

```ts
if (convError.code === '23505' || convError.message?.includes('unique')) {
  const { data: raceConv } = await supabaseAdmin.from('conversations')
    .select('id').eq('teacher_id', teacherId).eq('parent_id', parentId).single()
  resolvedConversationId = raceConv?.id
}
```

This pattern avoids a transaction or advisory lock while still handling the race gracefully.

---

## Admin Route Group: notFound() vs redirect() for Access Control (M010/S05)

For the `(admin)` route group access gate, `notFound()` (not `redirect()`) is the correct call for unauthorized users. `redirect('/login')` would leak information that the admin route exists. `notFound()` returns a 404, making the route appear to not exist at all. This is a security pattern — use it for any operator-only route where existence should not be revealed.

Pattern for env-var-based access gating:
```ts
const allowlist = process.env.ADMIN_USER_IDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
if (allowlist.length === 0 || !allowlist.includes(user.id)) {
  notFound()
}
```

The `filter(Boolean)` is essential: without it, `['']` (from an empty env var) has `.length === 1`, so the `allowlist.length === 0` guard doesn't fire. Trailing commas or spaces in `ADMIN_USER_IDS` also get cleaned up by `trim()` + `filter(Boolean)`.

---

## Admin Dashboard Testing: vi.resetModules + Dynamic Import Pattern (M010/S05)

The admin layout directly reads `process.env.ADMIN_USER_IDS` at the module level (inside the component function). To test different env var states per test, each test must reset modules and dynamically import the component fresh. Using `vi.mock` with a static mock is insufficient because the env var is read at call time, not import time.

Pattern (matches existing `parent-dashboard.test.ts`):
```ts
beforeEach(() => {
  vi.resetModules()
})

it('returns 404 when ADMIN_USER_IDS is empty', async () => {
  process.env.ADMIN_USER_IDS = ''
  const { default: AdminLayout } = await import('@/app/(admin)/layout.tsx')
  // ...
})
```

---

## Next.js Route Groups Strip Parenthesized Directory Segments from URLs (M010/S02)

`src/app/(auth)/callback/route.ts` is accessible at `/callback`, NOT `/auth/callback`. Next.js route groups strip the `(groupname)` directory from the URL. Always verify OAuth `redirectTo` values and any hardcoded paths against the actual accessible URL, not the filesystem path. This was the root cause of the Google SSO bug fixed in S02: `LoginForm.tsx` was passing `redirectTo: .../auth/callback` when the route lives at `/callback`.

---

## getUser() + maybySingle() Is the Canonical Auth Pattern for Teacher-vs-Parent Routing (M010/S01)

For all three auth paths (OAuth callback route, `signIn` server action, login page `getServerSideProps`-style check), the consistent pattern is:
1. `const { data: { user } } = await supabase.auth.getUser()` — verified identity, not JWT claims
2. Query `teachers` table with `.eq('user_id', user.id).maybeSingle()` — returns null if no teacher row (parent-only account)
3. Teacher row found → redirect to `/dashboard`; no teacher row → redirect to `/parent`

**Do NOT use `getClaims()`** — unreliable on POST re-renders in Next.js 16. This pattern is established across the entire codebase as of M010.

---

## Production Operations for M010 Features — COMPLETED

All operational steps completed (April 2026):
1. ✅ All migrations (0001–0019) applied to Supabase production via `supabase db push --linked` (April 3, 2026). Migrations 0011–0016 had been missed; 0017–0019 re-registered.
2. ✅ `ADMIN_USER_IDS` set in Vercel (Production + Development) and `.env.local`
3. ✅ Supabase Realtime publication for `messages` table active (via migration 0019)
4. ✅ Google OAuth configured — Client ID + Secret set in Supabase Authentication → Providers → Google; redirect URI `https://gonbqvhcxspjmxtfsfci.supabase.co/auth/v1/callback` registered in Google Cloud Console
5. ✅ All code (M001–M010 + bottom nav fix) pushed to `origin/main` and deployed to Vercel (April 3, 2026)

---

## Supabase Migrations Must Be Explicitly Applied — Code Deploy ≠ DB Deploy

Pushing code to `origin/main` triggers a Vercel deploy, but Supabase migrations are **not** automatically applied. They must be pushed separately via `supabase db push --linked` (or applied manually in the Supabase SQL Editor). A code deploy that references new tables/columns will cause runtime errors if the corresponding migration hasn't been applied.

**Symptom:** "Application error: a client-side exception has occurred" on pages that query missing tables. The server component's Supabase query fails, the RSC throws, and Next.js's error propagation triggers React Router hooks-mismatch bug (#310). The browser console shows "Rendered more hooks than during the previous render" — which is misleading because the root cause is a missing DB table, not a hooks violation.

**Checklist for every milestone deploy:**
1. `git push origin main` — deploys code to Vercel
2. `supabase db push --linked` — applies pending migrations to production Supabase
3. Verify env vars on Vercel if new ones were added
4. Spot-check affected pages in production

---

## CREATE INDEX CONCURRENTLY Cannot Run in supabase db push

`supabase db push` wraps each migration file in a transaction pipeline. `CREATE INDEX CONCURRENTLY` is incompatible with transactions and will fail with `SQLSTATE 25001`. For small tables, use `CREATE INDEX` (without CONCURRENTLY). For large tables where a lock-free index build is needed, apply the CONCURRENTLY statement manually via the Supabase SQL Editor outside a transaction.

**Affected:** `supabase/migrations/0012_teachers_search_vector.sql` (fixed by removing CONCURRENTLY).

---

## Make All Migrations Idempotent for Re-run Safety

When migrations may be partially applied (e.g., one table created manually, another via CLI), all statements should be idempotent:
- Tables: `CREATE TABLE IF NOT EXISTS`
- Columns: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- Indexes: `CREATE INDEX IF NOT EXISTS`
- Policies: `DROP POLICY IF EXISTS ... ; CREATE POLICY ...` (Postgres has no `CREATE POLICY IF NOT EXISTS`)
- Publications: wrap `ALTER PUBLICATION ... ADD TABLE` in a `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` block

---

## Tailwind bg-accent vs CSS variable --accent on Teacher Profile Page

On the teacher `/[slug]` page, the `<main>` element has `--accent` overridden as an inline CSS variable to the teacher's `accent_color`. This means **any component that reads `--accent` dynamically (via inline styles) will correctly show the teacher's chosen color**, but **Tailwind's `bg-accent` utility class does NOT** — it resolves to a static class with the default theme value, not the runtime CSS variable.

**Pattern to use:** `style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}`  
**Pattern to avoid:** `className="bg-accent text-accent-foreground"` on the profile page

This applies to CredentialsBar subject chips, ReviewsSection reviewer avatars, and any future profile component that needs accent tinting.

---

## textWrap: balance/pretty Requires Inline Style in This Project

Tailwind v3 (in use here) does not have `text-balance` or `text-pretty` utility classes built in. Use inline styles: `style={{ textWrap: 'pretty' } as React.CSSProperties}` or `style={{ textWrap: 'balance' } as React.CSSProperties}`. Cast to `React.CSSProperties` to avoid TypeScript errors since these are newer CSS properties not yet in the standard type definitions.

---

## SocialLinks Always Renders for Attribution Footer

`SocialLinks` in `src/app/[slug]/page.tsx` was changed in M011/S01 to always render (even when no social links are set) because it now displays a "Powered by Tutelo" attribution footer. Previously it returned null when the teacher had no social links. If you add conditional rendering back, ensure the attribution footer still displays.


---

## BookingCalendar Decomposition: Line Count vs. Target

The S02 plan targeted BookingCalendar.tsx at ~250 lines after decomposition. The actual result is ~617 lines. This is not a failure — it reflects an explicit design decision: the success/error/recurring/auth/payment step JSX and all async handlers (createPaymentIntent, createRecurringIntent, handleSubmit) remain inline in the orchestrator because they are tightly coupled to the step state machine. Only the *calendar-step* presentation was extracted. Future slices that want to reduce the orchestrator further should note that the 5 non-calendar steps and the handler block account for the remaining ~350 lines.

---

## Sub-component Props Shape for BookingCalendar Family

The four booking sub-components use prop-drilling from BookingCalendar orchestrator:
- **BookingForm** (~15 props): form, setForm, onSubmit, submitting, creatingIntent, firstName, subjects, hasSessionTypes, children, childrenLoaded, selectedDate, selectedSlot, selectedSessionType, stripeConnected, accentColor, onBack
- **SessionTypeSelector**: sessionTypes, accentColor, onSelect
- **CalendarGrid**: calendarDays, currentMonth, selectedDate, today, accentColor, hasSessionTypes, selectedSessionType, onDateClick, onPrevMonth, onNextMonth, onChangeSessionType, isAvailable (callback)
- **TimeSlotsPanel**: selectedDate, timeSlotsForDay, accentColor, onSlotClick

All four are purely presentational — no state, no async calls. Tests that render BookingCalendar exercise all four sub-components via integration (no separate unit tests for sub-components needed).

---

## Accent Chip Pattern in Step Headers

All step headers in the booking flow (BookingForm, auth step, payment step) use a consistent flex-wrap layout for the date/time/session breadcrumb:
```tsx
<div className="text-sm text-muted-foreground leading-tight flex items-center gap-2 flex-wrap">
  <span>{date}</span>
  <span>·</span>
  <span>{time}</span>
  {selectedSessionType && (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
      {selectedSessionType.name}
    </span>
  )}
</div>
```
The flex-wrap + gap-2 layout is required to prevent the chip from overflowing on narrow booking panel widths. Do not use inline-block or fixed-width approaches.


---

## Mobile Nav Item Count: navItems Array Is Not Sequential by Visual Order

`navItems` in `src/lib/nav.ts` is ordered by dashboard importance, not by the 0-based array index you'd expect if you wanted specific items. Availability is at index **6** (not index 3). When splitting `navItems` into `primaryNavItems` and `moreNavItems`, use explicit index references (`navItems[0]`, `navItems[6]`, etc.) rather than `.slice(0, 4)`. Slicing by index would pick up Students/Waitlist/Page as primary items instead of the intended Overview/Requests/Sessions/Availability.

---

## MobileBottomNav More Panel: Panel Positioned Above Nav Bar Height

The More panel uses `bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px))` to sit flush above the nav bar. This value (`3.5rem`) must match the nav bar height. If the nav bar height changes (e.g., taller for larger touch targets), update the panel's `bottom` value to match, or the panel will overlap the bar or leave a gap.

---

## ParentMobileNav Was Already Correct Before S03

When T02 was planned, the expectation was that `ParentMobileNav.tsx` needed sr-only label removal. In reality, it already had visible `text-[10px]` labels on all 5 tabs and Sign Out. Always read the actual component before planning label-visibility changes — the component may have already been updated as part of a previous slice or task.

---

## Premium Dashboard Card Standard (M011)

All dashboard cards use this pattern:
```
className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow"
```
For stat cards or cards without hover interaction, omit `hover:shadow-md transition-shadow`.

Tinted icon pill (dashboard context):
```tsx
<div className="rounded-lg p-2" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
  <Icon className="h-4 w-4 text-primary" />
</div>
```

**Important:** Use `var(--primary)` in dashboards. Use `var(--accent)` ONLY on the teacher `/[slug]` profile page where `--accent` is overridden to the teacher's chosen color. In the dashboard, `--accent` resolves to near-white and is invisible.

---

## Premium Page Header Pattern (M011)

Every dashboard page uses this header:
```tsx
<div>
  <h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
  <p className="mt-1 text-sm text-muted-foreground">Subtitle describing the page.</p>
</div>
```

The `tracking-tight` on h1 is essential for the premium look. The subtitle uses `mt-1` (not `mt-2`) for tighter coupling.

---

## Empty State Pattern (M011)

All empty states follow this pattern:
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <LucideIcon className="h-10 w-10 text-muted-foreground/50 mb-4" />
  <h2 className="text-lg font-semibold">No items yet</h2>
  <p className="text-muted-foreground mt-1 max-w-sm">Description text.</p>
</div>
```

Icon size is `h-10 w-10` (dashboard) or `h-12 w-12` (parent pages). Use `/50` opacity on the icon for subtlety.

---

## Avatar Initial Circle Pattern (M011)

For user/child avatar placeholders:
```tsx
<div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium text-primary shrink-0"
  style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
  {name.charAt(0).toUpperCase()}
</div>
```

`h-9 w-9` is the standard size across both teacher and parent pages. `shrink-0` prevents the circle from collapsing in flex layouts.

---

## color-mix Is the Canonical Tinting Approach (M011)

`color-mix(in srgb, var(--primary) 12%, transparent)` is the only tinting pattern used in Tutelo. It:
- Respects the theme (works in both light and dark mode)
- Avoids hardcoded colors (no `bg-blue-50` or `bg-primary/10`)
- Uses CSS-level mixing (no Tailwind arbitrary value gymnastics)

The `12%` opacity is the standard for pill backgrounds. Use `15%` for slightly stronger tinting (e.g., subject chips on the profile page with `--accent`).


---

## createClient() (Supabase SSR) Blocks ISR — Use supabaseAdmin for Public Pages (M012/S01)

`createClient()` from `src/lib/supabase/server.ts` calls `cookies()` from `next/headers`, which is a dynamic API. Any Server Component that calls `createClient()` — even if no real cookie is read — will opt the entire route out of the Full Route Cache and prevent ISR.

**Fix:** Use `supabaseAdmin` (from `src/lib/supabase/service.ts`) for all data fetching in public, cacheable pages. `supabaseAdmin` uses the service role key directly with no cookie dependency.

**Also:** `draftMode()` from `next/headers` does NOT block ISR in Next.js 16. It reads the bypass cookie transparently and only opts a specific request out of the cache when the draft cookie is active — the route still builds as `● (SSG)` with revalidation.

**Also:** Client components using `useSearchParams()` must be wrapped in `<Suspense>` when the parent page is ISR-rendered (builds with `generateStaticParams`). Without this, Next.js throws during prerendering: "useSearchParams() should be wrapped in a suspense boundary."

