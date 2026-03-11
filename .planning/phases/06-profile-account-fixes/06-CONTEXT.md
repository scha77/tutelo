# Phase 6: Profile + Account Integration Fixes - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Close 5 concrete gaps found in the v1.0 audit: render BookNowCTA on the public profile page, fix the rebook URL so subject pre-fills correctly, add `/account` to middleware protection, fix the `signIn` action so any teacher (published or draft) redirects to `/dashboard`, and make the failing `signIn` test pass.

</domain>

<decisions>
## Implementation Decisions

### BookNowCTA render position
- Add `<BookNowCTA />` immediately after `<BookingCalendar />` and before `<ReviewsSection />` in `[slug]/page.tsx`
- JSX order: HeroSection → CredentialsBar → AboutSection → BookingCalendar → **BookNowCTA** → ReviewsSection → SocialLinks
- The existing `h-16 md:hidden` spacer inside BookNowCTA is sufficient — no extra padding needed

### Rebook URL format
- Fix URL in `/account/page.tsx` from `/${slug}#booking?subject=...` to `/${slug}?subject=${encodeURIComponent(subject)}#booking`
- Query param must come before the hash so `searchParams.get('subject')` reads it correctly in BookingCalendar
- Both behaviors: hash scrolls to `#booking` section AND query param pre-fills subject field
- No auto-open of booking form — parent still picks a date/time slot; subject is just pre-selected in the form

### /account middleware guard
- Add `/account` to the `isProtected` check in `middleware.ts` alongside `/dashboard` and `/onboarding`
- Unauthenticated users hitting `/account` should be redirected to `/login?redirect=/account` (consistent with `/dashboard` pattern)
- In-page `auth.getUser()` redirect in `account/page.tsx` stays as belt-and-suspenders

### signIn action fix (test is source of truth)
- The test is correct — fix the action, not the test
- Any authenticated teacher (published OR draft) should redirect to `/dashboard`
- Fix: check if a teacher row EXISTS (regardless of `is_published`) to decide redirect destination
  - Teacher exists → `/dashboard`
  - No teacher row (parent) → `/onboarding` (or respect `redirectTo` param)
- The `is_published` condition in the current action is the bug

### Claude's Discretion
- Exact query structure for the teacher existence check (selecting `id` vs `is_published`)
- Whether hourly_rate display in CredentialsBar needs any additional fix beyond what's already coded

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BookNowCTA` (`src/components/profile/BookNowCTA.tsx`): Already complete — mobile sticky fixed bar + desktop inline button + h-16 spacer. Just needs to be added to the page JSX.
- `CredentialsBar` (`src/components/profile/CredentialsBar.tsx`): Already has `$hourly_rate/hr` display logic with `null` guard.
- `middleware.ts`: Has `isProtected` string-check pattern (`startsWith('/dashboard') || startsWith('/onboarding')`) — straightforward to add `|| startsWith('/account')`.

### Established Patterns
- Middleware redirect: clones `request.nextUrl`, sets `pathname = '/login'`, returns `NextResponse.redirect(url)` — same pattern needed for `/account` (with `?redirect=/account` search param)
- Auth actions: `src/actions/auth.ts` — `signIn` uses `supabase.auth.signInWithPassword` then queries `teachers` table to determine redirect destination

### Integration Points
- `[slug]/page.tsx`: Import for `BookNowCTA` already present — only the JSX render call is missing
- `account/page.tsx`: Rebook URL is built at line ~`const rebookUrl = ...` — one-line fix
- `tests/auth/signup.test.ts`: `signIn` test mocks `maybeSingle` returning `{ data: { is_published: true } }` — expects `NEXT_REDIRECT:/dashboard`

</code_context>

<specifics>
## Specific Ideas

- No new UI components or patterns needed — all five fixes are surgical changes to existing files
- The signIn action fix changes the condition from `if (teacher?.is_published)` to `if (teacher)` — any teacher row existence means redirect to dashboard

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-profile-account-fixes*
*Context gathered: 2026-03-10*
