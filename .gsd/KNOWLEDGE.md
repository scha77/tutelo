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

## Safe-Default Pattern for Capacity / Feature Gating Checks

When a gating check (capacity, feature flag, rate limit) fails due to a DB error, **always default to the permissive state** so the product remains functional. For capacity specifically: if `getCapacityStatus()` throws or returns an error, render the booking calendar (not the at-capacity state). This prevents a transient DB hiccup from locking all parents out of booking.

Apply this consistently: `if (error) { return { atCapacity: false, ... } }`. Log the error with structured context (teacher_id, error code, message) but never PII.

---

## Inline Capacity Query vs. Importing Utility in Profile RSC

`src/app/[slug]/page.tsx` deliberately inlines the capacity DB query rather than importing `getCapacityStatus()` from `src/lib/utils/capacity.ts`. The RSC already has a Supabase client, and the query is a 3-line `.select().eq().in().gte()` — importing the utility would add a dependency for minimal gain. The utility is valuable for **unit testing** (pure `isAtCapacity()`) and for **reuse across multiple call sites** (S02 notification trigger). Use the utility in new server actions; prefer inline for single-use RSC queries.

---

## Active Student Count: Distinct student_name, Last 90 Days

The "active student" metric used for capacity counting is: **distinct `student_name` values from `bookings` where `status IN ('confirmed', 'completed')` AND `booking_date >= 90 days ago`**. This definition is used in both `getCapacityStatus()` (T01) and the CapacitySettings display (T02) — keep them in sync if the definition changes. The 90-day window prevents long-ago completed engagements from permanently consuming capacity slots.
