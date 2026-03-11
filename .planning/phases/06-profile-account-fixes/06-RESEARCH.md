# Phase 6: Profile + Account Integration Fixes — Research

**Researched:** 2026-03-10
**Domain:** Next.js App Router surgical fixes — JSX render gap, URL construction, middleware routing, server action logic, Vitest mocking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**BookNowCTA render position**
- Add `<BookNowCTA />` immediately after `<BookingCalendar />` and before `<ReviewsSection />` in `[slug]/page.tsx`
- JSX order: HeroSection → CredentialsBar → AboutSection → BookingCalendar → **BookNowCTA** → ReviewsSection → SocialLinks
- The existing `h-16 md:hidden` spacer inside BookNowCTA is sufficient — no extra padding needed

**Rebook URL format**
- Fix URL in `/account/page.tsx` from `/${slug}#booking?subject=...` to `/${slug}?subject=${encodeURIComponent(subject)}#booking`
- Query param must come before the hash so `searchParams.get('subject')` reads it correctly in BookingCalendar
- Both behaviors: hash scrolls to `#booking` section AND query param pre-fills subject field
- No auto-open of booking form — parent still picks a date/time slot; subject is just pre-selected in the form

**/account middleware guard**
- Add `/account` to the `isProtected` check in `middleware.ts` alongside `/dashboard` and `/onboarding`
- Unauthenticated users hitting `/account` should be redirected to `/login?redirect=/account` (consistent with `/dashboard` pattern)
- In-page `auth.getUser()` redirect in `account/page.tsx` stays as belt-and-suspenders

**signIn action fix (test is source of truth)**
- The test is correct — fix the action, not the test
- Any authenticated teacher (published OR draft) should redirect to `/dashboard`
- Fix: check if a teacher row EXISTS (regardless of `is_published`) to decide redirect destination
  - Teacher exists → `/dashboard`
  - No teacher row (parent) → `/onboarding` (or respect `redirectTo` param)
- The `is_published` condition in the current action is the bug

### Claude's Discretion
- Exact query structure for the teacher existence check (selecting `id` vs `is_published`)
- Whether hourly_rate display in CredentialsBar needs any additional fix beyond what's already coded

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAGE-05 | Page displays: subjects + hourly rate, interactive availability calendar, reviews section | CredentialsBar already renders `$hourly_rate/hr` (line 63–68). The subjects + availability calendar + reviews are all rendering. Hourly rate is the only gap — it was already coded but the field must be in the DB query and non-null for display. No code change needed if CredentialsBar is already getting the `hourly_rate` prop. |
| PAGE-06 | Sticky "Book Now" CTA visible at all times on mobile | BookNowCTA component is complete and imported in `[slug]/page.tsx` but NOT rendered in JSX — the render call is simply missing. One-line JSX insertion after `<BookingCalendar />`. |
| PARENT-03 | Parent can rebook a session with the same teacher | URL bug in `account/page.tsx` line 77: hash before query param means browser strips query string. Fix: swap order to `?subject=...#booking`. BookingCalendar already reads `searchParams.get('subject')` at line 118. |
| AUTH-02 | User session persists across browser refresh | The `session.test.ts` stubs (it.todo) cover the acceptance criteria. The concrete fix in scope is the middleware `/account` guard and the `signIn` action redirect logic. |
</phase_requirements>

---

## Summary

Phase 6 is entirely surgical — five targeted fixes across four files with zero new components, zero schema changes, and no new dependencies. Every fix changes between one and three lines of code. All supporting infrastructure (component, middleware pattern, test harness) already exists; the gaps are rendering omission, URL ordering error, missing route guard, and wrong conditional in a server action.

The current state of the codebase has been read directly. Notable discovery: the `signup.test.ts` `signIn` test described as "failing" in the CONTEXT.md is currently passing (confirmed by running `vitest`). This is because the mock returns `{ data: { is_published: true } }` and the current action gates on `teacher?.is_published`. The test passes coincidentally with the broken code. After fixing the action to `if (teacher)`, the test continues to pass — but now correctly, covering draft teachers too. This means the fix is still required to satisfy the behavioral requirement; the test just doesn't currently distinguish the bug.

The `src/__tests__/rebook.test.ts` test at line 137 asserts the broken URL format (`#booking?subject=...`) — this test will need its assertion updated when the URL format is corrected. The planner must include this as part of the rebook task.

**Primary recommendation:** Treat each fix as an independent task. All five can be verified by the existing test suite, which runs green in 6 seconds with `npx vitest run`.

---

## Standard Stack

### Core (all pre-installed, no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.x | JSX rendering, middleware, server actions | Project foundation |
| `@supabase/ssr` | current | Server-side Supabase client in middleware | Project standard — NOT auth-helpers |
| Vitest | 4.0.18 | Test runner for all unit tests | Confirmed by `vitest.config.ts` |
| React | 18.x | Client component rendering | Project foundation |

**Installation:** No new packages required.

---

## Architecture Patterns

### Middleware Pattern (established in this codebase)

The project's `middleware.ts` uses a string-contains `isProtected` check. The current code:

```typescript
// src/middleware.ts lines 27-29
const isProtected =
  request.nextUrl.pathname.startsWith('/dashboard') ||
  request.nextUrl.pathname.startsWith('/onboarding')
```

Adding `/account` follows the exact same pattern. The redirect clones `request.nextUrl` and sets `pathname = '/login'` — but note: the current middleware does NOT set a `?redirect=` param on the login URL. The in-page `account/page.tsx` redirect already uses `?redirect=/account`. For consistency, the middleware redirect should also append `?redirect=/account` matching the in-page behavior and the test assertion in `parent-account.test.ts` line 55 (`/login?redirect=/account`).

### getClaims vs getUser in Middleware

The middleware uses `supabase.auth.getClaims()` (post-Nov 2025 Supabase API, project-specific decision from STATE.md). This is NOT the same as `auth.getUser()`. The existing pattern must be preserved — do not switch to `getUser()` in middleware.

### Server Action Query Pattern

Current broken code in `src/actions/auth.ts` lines 41-48:

```typescript
const { data: teacher } = await supabase
  .from('teachers')
  .select('is_published')   // <-- selects is_published
  .eq('user_id', userId)
  .maybeSingle()

if (teacher?.is_published) {  // <-- gates on is_published (BUG)
  redirect('/dashboard')
}
```

Fix: change `.select('is_published')` to `.select('id')` and change `if (teacher?.is_published)` to `if (teacher)`. Selecting `id` is preferred (minimal data, consistent with `account/page.tsx` which already uses `.select('id')`).

### Rebook URL Construction

Browser URL parsing rule: fragment (`#`) terminates the path and query string. A URL like `/mrs-johnson#booking?subject=Math` is parsed as path `/mrs-johnson`, fragment `booking?subject=Math`. The query string is part of the fragment, not the search params — so `useSearchParams().get('subject')` returns `null`.

Correct form: `/mrs-johnson?subject=Math#booking` — path `/mrs-johnson`, search `?subject=Math`, fragment `booking`.

`BookingCalendar` already reads `searchParams.get('subject')` at line 118 using Next.js `useSearchParams()` hook. The hook reads from the URL search params correctly — the fix is entirely in the URL being constructed in `account/page.tsx`.

### JSX Render Gap (BookNowCTA)

`BookNowCTA` is:
- Defined: `src/components/profile/BookNowCTA.tsx` (complete, no changes needed)
- Imported: `[slug]/page.tsx` line 8 (`import { BookNowCTA } from '@/components/profile/BookNowCTA'`) — import already present
- Rendered: NOT present in the JSX return (lines 110-133) — the component is never called

The spacer div (`h-16 md:hidden`) is inside `BookNowCTA`'s own render output (line 36 of BookNowCTA.tsx), so it appears automatically when the component renders. No wrapper or padding needed.

### Anti-Patterns to Avoid

- **Modifying the test mock** to match broken behavior — the signIn test mock returns `{ is_published: true }`, which coincidentally makes the test pass. Fix the action, not the mock.
- **Adding a `?redirect=` param as a separate URL clone** — use `url.searchParams.set('redirect', '/account')` on the already-cloned URL.
- **Using `getSession()` in middleware** — project rule enforces `getClaims()` in middleware.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sticky mobile overlay | Custom CSS position:fixed component | Existing `BookNowCTA` component | Already complete with correct z-index, spacer, desktop/mobile breakpoints |
| URL encoding | Manual string concatenation | `encodeURIComponent()` (already used) | Already present in the broken URL — just needs order corrected |
| Route protection | Custom auth check in every page | Middleware `isProtected` pattern | Already established pattern in this codebase |

---

## Common Pitfalls

### Pitfall 1: Rebook Test Assertion Uses the Old Broken URL
**What goes wrong:** `src/__tests__/rebook.test.ts` line 137 asserts `expect(rebookUrl).toBe('/mrs-johnson#booking?subject=Math')` — this test passes today but asserts the broken format. After fixing `account/page.tsx`, this test assertion will also need updating to `/mrs-johnson?subject=Math#booking`.
**Why it happens:** The test was written to match the existing (broken) implementation.
**How to avoid:** Update the assertion in the same task as the URL fix.
**Warning signs:** If the rebook URL fix is done and this test is not updated, the test suite turns red.

### Pitfall 2: Middleware Redirect Missing the Redirect Param
**What goes wrong:** Adding `/account` to `isProtected` but redirecting to `/login` without `?redirect=/account` means the parent cannot be sent back to `/account` after login.
**Why it happens:** The current middleware redirect (lines 32-35 of `middleware.ts`) does not set any search params — it just sets `url.pathname = '/login'`. The `/dashboard` redirect has the same limitation but users don't need to return to a specific dashboard page.
**How to avoid:** After cloning the URL and setting `pathname = '/login'`, call `url.searchParams.set('redirect', '/account')` before returning the redirect response.
**Warning signs:** Unauthenticated parent clicks "My Sessions", gets sent to `/login`, logs in, lands on `/onboarding` instead of `/account`.

### Pitfall 3: signIn Action Breaks Parent Login After Fix
**What goes wrong:** Changing `if (teacher?.is_published)` to `if (teacher)` is the correct fix, but the `redirectTo` param early-return (lines 34-36 of `auth.ts`) already handles parents who pass a `redirectTo`. The teacher check only runs when there's NO `redirectTo` — verify this logic is still correct post-fix.
**Why it happens:** The `redirectTo` early-exit means a parent with `redirectTo=/account` will never reach the teacher check. A teacher with no `redirectTo` who is in draft will now correctly go to `/dashboard` instead of `/onboarding`.
**How to avoid:** Trace the full signIn logic: (1) error → return error, (2) redirectTo present → redirect there, (3) teacher row exists → /dashboard, (4) default → /onboarding. Fix only touches step 3.

### Pitfall 4: CredentialsBar hourly_rate Already Works
**What goes wrong:** PAGE-05 mentions "hourly rate" as a gap but CredentialsBar already renders it (lines 63-68 of `CredentialsBar.tsx`). The field is guarded with `null` check and `[slug]/page.tsx` already passes `teacher` (which includes `hourly_rate`) to `<CredentialsBar teacher={teacher} />`.
**Why it happens:** The audit flagged PAGE-05 as incomplete, but inspection shows hourly_rate display is already coded.
**How to avoid:** Verify in a browser visit that the rate appears — if so, no code change is needed and PAGE-05 is satisfied by BookNowCTA render (which was the actual visual gap). If rate is missing, check whether `hourly_rate` is null in the DB for test teachers.

---

## Code Examples

### Fix 1: BookNowCTA Render (one line inserted)

```typescript
// src/app/[slug]/page.tsx — after BookingCalendar, before ReviewsSection
<BookingCalendar ... />
<BookNowCTA />        {/* ADD THIS LINE — PAGE-06 */}
<ReviewsSection reviews={reviews ?? []} />
```

### Fix 2: Rebook URL Order (one field changed)

```typescript
// src/app/account/page.tsx line 77 — BEFORE (broken):
const rebookUrl = `/${teacher.slug}#booking?subject=${encodeURIComponent(booking.subject)}`

// AFTER (correct — query param before hash):
const rebookUrl = `/${teacher.slug}?subject=${encodeURIComponent(booking.subject)}#booking`
```

### Fix 3: Middleware /account Guard

```typescript
// src/middleware.ts — extend isProtected and add redirect param
const isProtected =
  request.nextUrl.pathname.startsWith('/dashboard') ||
  request.nextUrl.pathname.startsWith('/onboarding') ||
  request.nextUrl.pathname.startsWith('/account')   // ADD

if (isProtected && !claims) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  if (request.nextUrl.pathname.startsWith('/account')) {
    url.searchParams.set('redirect', '/account')
  }
  return NextResponse.redirect(url)
}
```

### Fix 4: signIn Action — Existence Check Not Published Check

```typescript
// src/actions/auth.ts — change select and condition
const { data: teacher } = await supabase
  .from('teachers')
  .select('id')             // was: 'is_published'
  .eq('user_id', userId)
  .maybeSingle()

if (teacher) {              // was: teacher?.is_published
  redirect('/dashboard')
}
```

### Fix 5: Rebook Test Assertion Update

```typescript
// src/__tests__/rebook.test.ts line 137 — update assertion to match corrected URL
expect(rebookUrl).toBe('/mrs-johnson?subject=Math#booking')   // was: '#booking?subject=Math'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `supabase.auth.getSession()` in middleware | `supabase.auth.getClaims()` | Nov 2025 Supabase SDK | getClaims is faster (reads JWT locally, no network call); getSession is insecure in server context |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | auth-helpers deprecated; ssr package is the current standard |

---

## Open Questions

1. **Is hourly_rate NULL for some existing test teacher accounts in the dev DB?**
   - What we know: CredentialsBar renders `$hourly_rate/hr` with a `null` guard — it silently hides if null
   - What's unclear: Whether PAGE-05 gap is a code gap or data gap
   - Recommendation: Verify in browser with a teacher that has `hourly_rate` set. If it displays, PAGE-05 is satisfied by BookNowCTA render (Fix 1). If not, check DB — no code fix needed.

2. **Middleware redirect specificity: should ALL protected routes get a redirect param?**
   - What we know: Current middleware doesn't set `?redirect=` for `/dashboard` or `/onboarding`
   - What's unclear: Whether adding redirect param for `/account` only is inconsistent
   - Recommendation: Per locked decision, only add `?redirect=/account` for the `/account` route. `/dashboard` teachers know to log in; `/onboarding` is handled differently.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/auth/signup.test.ts src/__tests__/rebook.test.ts src/__tests__/parent-account.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAGE-06 | BookNowCTA renders on public profile page | unit (logic) | `npx vitest run tests/profile/slug-page.test.ts` | ✅ exists (tests isDraftPage/bio logic; no CTA test — see Wave 0) |
| PAGE-05 | hourly_rate visible in CredentialsBar | unit | No dedicated test — covered by visual verification or manual-only | ✅ no gap if rendering confirmed in browser |
| PARENT-03 | Rebook URL pre-fills subject in BookingCalendar | unit | `npx vitest run src/__tests__/rebook.test.ts` | ✅ exists — assertion needs updating |
| AUTH-02 | /account middleware guard redirects unauthenticated visitors | unit | `npx vitest run src/__tests__/parent-account.test.ts` | ✅ exists (line 51-57 tests redirect URL format) |
| AUTH-02 | signIn redirects draft teacher to /dashboard | unit | `npx vitest run tests/auth/signup.test.ts` | ✅ exists — test passes but mock covers is_published:true case only |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/auth/signup.test.ts src/__tests__/rebook.test.ts src/__tests__/parent-account.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Add test case to `tests/auth/signup.test.ts` covering draft teacher (is_published: false) redirects to /dashboard after signIn fix
- [ ] Update assertion in `src/__tests__/rebook.test.ts` line 137 to assert correct URL format (`?subject=...#booking`)

---

## Sources

### Primary (HIGH confidence)
- Direct source file reads — `src/middleware.ts`, `src/actions/auth.ts`, `src/app/[slug]/page.tsx`, `src/app/account/page.tsx`, `src/components/profile/BookNowCTA.tsx`, `src/components/profile/CredentialsBar.tsx`, `src/components/profile/BookingCalendar.tsx`
- Direct test file reads — `tests/auth/signup.test.ts`, `src/__tests__/rebook.test.ts`, `src/__tests__/parent-account.test.ts`
- Live test run — `npx vitest run` confirmed 100 passing, 49 todo (all green)
- `.planning/phases/06-profile-account-fixes/06-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- MDN/browser spec: URL fragment behavior (hash terminates query string) — well-established web standard, no source needed

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, confirmed by package.json and vitest run
- Architecture: HIGH — all source files read directly, no inference needed
- Pitfalls: HIGH — rebook test assertion gap found by reading actual test source; middleware redirect param gap found by reading actual middleware source

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable — no external dependencies, no API changes expected)
