---
phase: 01-foundation
verified: 2026-03-05T12:00:00Z
status: gaps_found
score: 4/5 success criteria verified
re_verification: false
gaps:
  - truth: "Visiting the published URL shows a mobile-first public page with the teacher's name, school, credentials, subjects, rate, availability calendar, and a sticky 'Book Now' button — with availability times automatically converted to the visitor's local timezone"
    status: partial
    reason: "Two sub-requirements fail: (1) hourly_rate is not displayed anywhere on the public profile page — PAGE-05 requires rate on the public page but no profile component references it; (2) the sticky 'Book Now' mobile CTA (BookNowCTA.tsx) exists but is not rendered on the page — the profile page uses BookingCalendar instead, which has no fixed/sticky mobile bar"
    artifacts:
      - path: "src/app/[slug]/page.tsx"
        issue: "Does not import or render BookNowCTA; does not pass hourly_rate to any displayed component"
      - path: "src/components/profile/BookNowCTA.tsx"
        issue: "Exists and is substantive (correct sticky mobile bar) but is orphaned — not used in the profile page"
      - path: "src/components/profile/BookingCalendar.tsx"
        issue: "Replaces AvailabilityGrid + BookNowCTA but has no sticky 'Book Now' mobile bar; booking form submit is a stub (setTimeout mock, no API call — intentional Phase 2 wire, but PAGE-06 mobile CTA is missing)"
    missing:
      - "Import and render BookNowCTA in src/app/[slug]/page.tsx (or add sticky mobile bar to BookingCalendar)"
      - "Display hourly_rate on the public profile page — add to CredentialsBar or a dedicated RateSection component; pass hourly_rate in the teachers query in src/app/[slug]/page.tsx"
  - truth: "Vitest test suite is fully green"
    status: partial
    reason: "1 test fails: tests/auth/signup.test.ts > signIn Server Action > 'successful sign in redirects to /dashboard'. The signIn action now queries teachers table after login (plan 04 deviation), but the test mock returns { error: null } without mocking data.user, causing 'Cannot read properties of undefined (reading user)' — the action redirects to /onboarding instead of /dashboard"
    artifacts:
      - path: "tests/auth/signup.test.ts"
        issue: "Mock for signInWithPassword returns { error: null } but signIn action reads data.user?.id — mock needs { error: null, data: { user: { id: 'user-123' } } }; then from('teachers').maybeSingle() also needs mocking"
      - path: "src/actions/auth.ts"
        issue: "signIn action was updated (Plan 04 fix) to query teachers table after login, but test mock was not updated to match the new data shape"
    missing:
      - "Update signInWithPassword mock in tests/auth/signup.test.ts to return { error: null, data: { user: { id: 'mock-user-id' } } } and add mock for supabase.from('teachers').select().eq().maybeSingle() returning { data: { is_published: true } }"
human_verification:
  - test: "Verify sticky 'Book Now' mobile CTA on public profile page"
    expected: "A fixed bottom bar with 'Book Now' button visible at all times while scrolling on mobile viewport (width < 768px)"
    why_human: "CSS visibility of fixed-position elements requires browser rendering; can't verify programmatically whether BookingCalendar renders a sticky bar"
  - test: "Verify hourly rate is displayed on the public profile page"
    expected: "Teacher's hourly rate (e.g. '$45/hr') visible on the public /[slug] page"
    why_human: "Grep confirms no hourly_rate reference in profile components, but visual verification confirms absence to the user"
  - test: "Verify Google OAuth full flow end-to-end"
    expected: "Clicking 'Continue with Google' opens Google consent screen, completes redirect to /auth/callback, and routes to /dashboard (existing user) or /onboarding (new user)"
    why_human: "OAuth flow requires a browser session with real Supabase credentials; cannot verify programmatically"
  - test: "Verify availability times are converted to visitor's local timezone"
    expected: "If teacher is in America/New_York and visitor browser is in America/Los_Angeles, teacher's 5pm slot shows as 2pm on the public page"
    why_human: "Timezone conversion depends on browser Intl.DateTimeFormat() API and actual slot data; requires real browser with known timezone override"
---

# Phase 1: Foundation Verification Report

**Phase Goal:** A teacher can complete onboarding, publish a live customized public page at their vanity URL, and a visitor can see their availability — all with no payment setup required.
**Verified:** 2026-03-05T12:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Teacher can sign up with Google SSO or email+password, complete onboarding wizard, receive shareable tutelo.app/[slug] URL — no payment required | VERIFIED | auth flow wired (LoginForm, signUp/signIn actions, OAuth callback), onboarding wizard 3 steps complete, publishProfile sets is_published=true, redirect to /dashboard?welcome=true |
| 2 | Published URL shows mobile-first public page with name, school, credentials, subjects, rate, availability calendar, sticky Book Now — timezone converted | PARTIAL | Name/school/credentials/subjects/calendar verified; hourly_rate NOT displayed on public page; BookNowCTA component exists but is orphaned (not rendered); timezone conversion via BookingCalendar confirmed |
| 3 | Teacher can customize accent color, headline, banner, social links from dashboard — changes reflect on public page | VERIFIED | PageSettings has all 4 CUSTOM-* fields; updateProfile/updatePublishStatus/uploadBannerImage Server Actions wired; revalidatePath('/[slug]', 'page') called |
| 4 | Teacher can toggle Active/Draft; Draft page shows graceful "not available" — not a 404 | VERIFIED | DraftPage component in /[slug]/page.tsx confirmed; VIS-02 pattern correct; PageSettings toggle calls updatePublishStatus; dashboard layout with sidebar confirmed |
| 5 | timestamptz everywhere, IANA timezone field, proxy.ts not middleware.ts with async params/cookies | VERIFIED | proxy.ts at root with getClaims(); all DB timestamps TIMESTAMPTZ; teachers.timezone TEXT NOT NULL; server.ts uses await cookies(); all RSC pages use async params |

**Score:** 4/5 truths verified (Truth 2 is partial — 2 sub-failures)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `proxy.ts` | Session refresh + route protection | VERIFIED | getClaims(), PUBLISHABLE_KEY, protects /dashboard and /onboarding |
| `src/lib/supabase/client.ts` | Browser Supabase client | VERIFIED | createBrowserClient with PUBLISHABLE_KEY |
| `src/lib/supabase/server.ts` | Server Supabase client | VERIFIED | await cookies(), PUBLISHABLE_KEY |
| `src/lib/supabase/service.ts` | Admin client | VERIFIED | SUPABASE_SERVICE_SECRET_KEY |
| `vitest.config.ts` | Vitest config | VERIFIED | defineConfig with jsdom environment |
| `src/app/(auth)/login/page.tsx` | Login page | VERIFIED | getClaims() redirect guard, LoginForm rendered |
| `src/app/(auth)/callback/route.ts` | OAuth callback | VERIFIED | exchangeCodeForSession, teachers query for routing |
| `src/components/auth/LoginForm.tsx` | Login form | VERIFIED | 'use client', RHF+Zod, signInWithOAuth for Google |
| `supabase/migrations/0001_initial_schema.sql` | DB schema | VERIFIED | 4 tables, RLS on all, TIMESTAMPTZ, UNIQUE constraints |
| `src/lib/schemas/onboarding.ts` | Zod schemas | VERIFIED | Step1/2/3/FullOnboardingSchema all exported |
| `src/lib/utils/slugify.ts` | Slug generator | VERIFIED | generateSlug, findUniqueSlug exported |
| `src/actions/onboarding.ts` | Wizard Server Actions | VERIFIED | saveWizardStep, generateSlugAction, publishProfile |
| `src/components/onboarding/OnboardingWizard.tsx` | Multi-step wizard | VERIFIED | 'use client', FormProvider, per-step validation |
| `src/app/onboarding/page.tsx` | Onboarding RSC | VERIFIED | getClaims(), resume support, wizard_step check |
| `src/app/[slug]/page.tsx` | Public profile RSC | VERIFIED | await params, draft gate, accent CSS var — but missing BookNowCTA and hourly_rate |
| `src/components/profile/HeroSection.tsx` | Hero section | VERIFIED | banner/accent fallback, circular avatar, initials, headline |
| `src/components/profile/CredentialsBar.tsx` | Credentials bar | VERIFIED | verified badge, years exp, subjects, grades, location |
| `src/components/profile/AboutSection.tsx` | About section | VERIFIED | bio or generateBio() fallback |
| `src/components/profile/AvailabilityGrid.tsx` | Availability grid | VERIFIED | 'use client', formatInTimeZone, 7-col desktop, stacked mobile — orphaned (not used in profile page, replaced by BookingCalendar) |
| `src/components/profile/BookNowCTA.tsx` | Sticky Book Now CTA | ORPHANED | Exists and is substantive, but NOT imported/rendered on /[slug]/page.tsx |
| `src/components/profile/BookingCalendar.tsx` | Calendar + booking stub | VERIFIED | timezone-aware calendar, booking form (Phase 2 stub submit — intentional) |
| `src/lib/utils/bio.ts` | Bio generator | VERIFIED | generateBio, null-safe |
| `src/lib/utils/timezone.ts` | Timezone converter | VERIFIED | convertSlotToTimezone, getVisitorTimezone |
| `src/app/(dashboard)/dashboard/layout.tsx` | Dashboard shell | VERIFIED | auth guard, getClaims, Sidebar |
| `src/components/dashboard/PageSettings.tsx` | Page settings | VERIFIED | Active/Draft toggle, 6 color swatches, headline, banner upload, social links |
| `src/components/dashboard/AvailabilityEditor.tsx` | Availability editor | VERIFIED | 7-col grid, clickable hour blocks, Save button → updateAvailability |
| `src/actions/profile.ts` | Profile Server Actions | VERIFIED | updateProfile, updatePublishStatus, uploadBannerImage |
| `src/actions/availability.ts` | Availability Server Action | VERIFIED | updateAvailability (delete+insert), getClaims auth |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `proxy.ts` | Supabase auth cookie | getClaims() on every request | WIRED | `getClaims()` confirmed in proxy.ts line 25 |
| `src/lib/supabase/server.ts` | next/headers cookies() | `await cookies()` | WIRED | Line 5 confirmed |
| `LoginForm.tsx` | supabase.auth.signInWithOAuth | Google button onClick | WIRED | `signInWithOAuth` line 58 |
| `callback/route.ts` | supabase.auth.exchangeCodeForSession | GET handler | WIRED | Line 10 confirmed |
| `proxy.ts` | /login redirect | getClaims() null check | WIRED | Lines 28-36 confirmed |
| `OnboardingWizard.tsx` | saveWizardStep Server Action | after each step advance | WIRED | import confirmed |
| `WizardStep3.tsx` | generateSlugAction | auto-generates slug on mount | WIRED | useEffect + generateSlugAction call confirmed |
| `publishProfile` | teachers table (Supabase) | INSERT with is_published=true | WIRED | upsert with is_published: true confirmed |
| `src/app/[slug]/page.tsx` | teachers + availability table | .select('*, availability(*)')  | WIRED | Line 85 confirmed |
| `AvailabilityGrid.tsx` | date-fns-tz | formatInTimeZone for each slot | WIRED | formatInTimeZone confirmed |
| `BookingCalendar.tsx` | date-fns-tz | formatInTimeZone for slot conversion | WIRED | Imported and used in getSlotsForDate |
| `PageSettings.tsx` | profile Server Action | form submit calls updateProfile | WIRED | All 4 CUSTOM fields call updateProfile or updatePublishStatus on blur/click |
| `HeroSection.tsx` | teacher.accent_color | style={{ backgroundColor: teacher.accent_color }} | WIRED | Confirmed on banner fallback |
| `src/app/[slug]/page.tsx` | --accent CSS custom property | style={{ '--accent': teacher.accent_color }} | WIRED | Line 99 confirmed |
| `BookNowCTA.tsx` | #availability anchor | scrollIntoView scroll | NOT_WIRED | Component is orphaned — never rendered on profile page |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 01-01, 01-02 | Sign up with email+password or Google SSO | SATISFIED | LoginForm, signUp/signIn actions, signInWithOAuth |
| AUTH-02 | 01-01, 01-02 | Session persists across browser refresh | SATISFIED | proxy.ts cookie-based session via getClaims() |
| ONBOARD-01 | 01-03, 01-04 | Wizard: name, school, city/state, experience, photo — no payment | SATISFIED | WizardStep1 confirmed |
| ONBOARD-02 | 01-03, 01-04 | Multi-select subjects | SATISFIED | WizardStep2 subjects array |
| ONBOARD-03 | 01-03, 01-04 | Multi-select grade ranges | SATISFIED | WizardStep2 grade_levels array |
| ONBOARD-04 | 01-03, 01-04 | IANA timezone (required) | SATISFIED | Step3Schema timezone field, DB TEXT NOT NULL |
| ONBOARD-05 | 01-03, 01-04 | Weekly availability visual calendar | SATISFIED | WizardStep3 availability grid with defaults |
| ONBOARD-06 | 01-03, 01-04 | Hourly rate with local benchmark hint | SATISFIED | WizardStep2 hourly_rate + "$35–65/hr" hint |
| ONBOARD-07 | 01-03, 01-04 | Shareable tutelo.app/[slug] URL on publish | SATISFIED | publishProfile generates slug, redirects to dashboard |
| PAGE-01 | 01-05 | Public page at teacher's slug URL | SATISFIED | /[slug]/page.tsx RSC confirmed |
| PAGE-02 | 01-05 | Name, photo, initials avatar, school, city/state | SATISFIED | HeroSection (name, avatar, banner), CredentialsBar (city/state) |
| PAGE-03 | 01-05 | Credential bar: verified badge, years exp, subjects, grades | SATISFIED | CredentialsBar confirmed |
| PAGE-04 | 01-05 | Auto-generated bio | SATISFIED | AboutSection + generateBio fallback |
| PAGE-05 | 01-05 | Subjects + hourly rate + interactive availability calendar | PARTIAL | Subjects in CredentialsBar; availability in BookingCalendar; hourly_rate NOT displayed on public page |
| PAGE-06 | 01-05 | Sticky "Book Now" CTA visible at all times on mobile | FAILED | BookNowCTA component exists but not rendered on profile page; BookingCalendar has no sticky mobile bar |
| PAGE-07 | 01-05 | Teacher's accent color applied throughout page | SATISFIED | --accent CSS custom property on `<main>` element |
| PAGE-08 | 01-05 | Custom headline/tagline below name | SATISFIED | HeroSection displays teacher.headline if set |
| PAGE-09 | 01-05 | Banner image at top | SATISFIED | HeroSection with banner_url + accent fallback |
| PAGE-10 | 01-05 | Social/contact links | SATISFIED | SocialLinks inline component in /[slug]/page.tsx |
| CUSTOM-01 | 01-05 | Accent color preset palette | SATISFIED | PageSettings has 6 color swatches |
| CUSTOM-02 | 01-05 | Custom headline/tagline | SATISFIED | PageSettings headline Input with auto-save |
| CUSTOM-03 | 01-05 | Social/contact links | SATISFIED | PageSettings 3 social inputs |
| CUSTOM-04 | 01-05 | Banner image upload | SATISFIED | PageSettings banner upload → uploadBannerImage Server Action |
| AVAIL-01 | 01-05 | Teacher can view/edit availability from dashboard | SATISFIED | AvailabilityEditor on /dashboard/availability |
| AVAIL-02 | 01-05 | Available times on public page | SATISFIED | BookingCalendar shows slots |
| AVAIL-03 | 01-05 | Auto-detects visitor timezone, converts times | SATISFIED | BookingCalendar uses Intl.DateTimeFormat() + formatInTimeZone |
| VIS-01 | 01-05 | Active/Draft toggle from dashboard | SATISFIED | PageSettings toggle → updatePublishStatus |
| VIS-02 | 01-05 | Draft page shows graceful "not available" — not 404 | SATISFIED | DraftPage component returned (not notFound()) |
| DASH-06 | 01-05 | Active/Draft toggle from dashboard (same as VIS-01) | SATISFIED | PageSettings confirmed |

**Requirements with gaps:**
- PAGE-05: hourly_rate not displayed on public profile page (subjects satisfied, availability satisfied, rate missing)
- PAGE-06: sticky "Book Now" CTA not rendered on profile page (BookNowCTA orphaned)

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/profile/BookingCalendar.tsx` | 140-153 | `handleSubmit` uses `setTimeout` mock + toast success — no API call | INFO | Intentional Phase 2 stub; booking form collects data but doesn't submit to backend. Does NOT block Phase 1 goal but should be noted for Phase 2 planning |
| `tests/auth/signup.test.ts` | 76 | Test fails: mock doesn't include `data.user` after plan 04 signIn update | BLOCKER | `signIn` test "successful sign in redirects to /dashboard" fails — 1 red test in suite |
| `src/lib/utils/timezone.ts` | 65 | `require('date-fns-tz')` used inside function body (CommonJS require in ESM file) | WARNING | Works but mixes module systems; may cause issues in strict ESM environments. `toDate` imported at module level in AvailabilityGrid.tsx (correct), but timezone.ts uses inline require |

---

## Human Verification Required

### 1. Hourly Rate on Public Profile

**Test:** Visit a published teacher profile URL (e.g. /ms-test-teacher). Look for the teacher's hourly rate ($45/hr or similar) displayed on the page.
**Expected:** The rate should be visible — ideally in the credentials bar or below the teacher name.
**Why human:** Grep confirms no `hourly_rate` reference in any profile component rendered on the page. Visual confirmation needed to rule out indirect display.

### 2. Sticky "Book Now" Mobile CTA

**Test:** Open a published teacher profile on mobile (or resize browser to < 768px width). Scroll down past the availability section.
**Expected:** Per PAGE-06: "Book Now" button is fixed to the bottom of the screen, visible at all times while scrolling.
**Why human:** BookNowCTA component exists with correct `fixed bottom-0` CSS, but it is not imported in the profile page. The gap is structural (import missing), but the user should confirm the visual absence.

### 3. Google OAuth Full Flow

**Test:** Click "Continue with Google" on /login. Complete Google consent. Verify redirect to /auth/callback and then to /dashboard (existing user) or /onboarding (new user).
**Expected:** Full OAuth loop completes without errors.
**Why human:** Requires real Supabase project credentials and Google OAuth app configuration.

### 4. Availability Timezone Conversion

**Test:** With a teacher account set to America/New_York timezone with a 5pm Monday slot, view the profile page with browser timezone set to America/Los_Angeles.
**Expected:** The calendar shows "2:00 PM" for that Monday slot, with "(times in America/Los Angeles)" label.
**Why human:** Requires real slot data and browser timezone override to verify conversion.

---

## Gaps Summary

Two gaps block full goal achievement:

**Gap 1 — Hourly rate not displayed on public profile (PAGE-05 partial):**
The public profile page `/[slug]/page.tsx` selects all teacher columns (`select('*, availability(*)')`), so `hourly_rate` is fetched — but no component receives or renders it. The `CredentialsBar` shows subjects and grades but not rate. The `BookingCalendar` shows time slots but not rate. Rate exists in the DB schema and is collected in onboarding (Step 2), but is invisible to visitors on the public page.

**Gap 2 — Sticky "Book Now" CTA not rendered (PAGE-06 failed):**
`BookNowCTA.tsx` is a complete, correct component with a `fixed bottom-0` mobile sticky bar. However, `src/app/[slug]/page.tsx` imports `BookingCalendar` instead and does not import `BookNowCTA`. `BookingCalendar` is a richer Phase 2-ready component (interactive calendar + booking form), but it does not include a sticky mobile CTA. The result is that mobile users have no persistent call-to-action while scrolling.

**Gap 3 — 1 failing test (test suite not fully green):**
`tests/auth/signup.test.ts` has 1 red test. The `signIn` Server Action was updated in Plan 04 to query the teachers table after login (smart routing between /dashboard and /onboarding), but the test mock was not updated to match the new `data.user` shape from `signInWithPassword`. The fix is a 2-line mock update.

These gaps do not prevent onboarding, publishing, or viewing the public page — the core goal is substantially achieved. However, PAGE-05 and PAGE-06 requirements are explicitly listed in the phase requirements, and the test failure means the suite is not fully green as documented in the SUMMARY.

---

## Overall Assessment

The Phase 1 Foundation is **substantively complete**. Authentication, onboarding wizard, DB schema, dashboard, page customization, availability, and visibility controls all work correctly. The public profile page renders with hero, credentials, bio, timezone-aware availability calendar, social links, and accent color theming.

The two content gaps (hourly rate display and sticky Book Now CTA) are small additions — the components and data exist, they just need to be connected. The test failure is a 2-line mock fix.

---

_Verified: 2026-03-05T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
