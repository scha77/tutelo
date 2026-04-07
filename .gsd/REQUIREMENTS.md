# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### PERF-01 — Profile page served from CDN cache (ISR)
- Class: quality-attribute
- Status: active
- Description: The public teacher profile page `/[slug]` is served as ISR-cached static HTML from Vercel's CDN. Cold TTFB drops from ~800ms (dynamic SSR) to ~50ms (CDN edge). Page revalidates on-demand when the teacher saves profile changes.
- Why it matters: The profile page is the parent conversion surface — the single most-visited page. Every 100ms of TTFB improvement measurably increases conversion.
- Source: user
- Primary owning slice: M012/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Requires `generateStaticParams` + `export const revalidate` + `revalidatePath` in profile save actions. `revalidatePath('/[slug]', 'page')` is already called in `src/actions/profile.ts` but is currently a no-op because the page has no cache. Vercel Hobby ISR write limit is 1,000/day — well within range at current scale.

### PERF-02 — Directory pages served from CDN cache (ISR)
- Class: quality-attribute
- Status: active
- Description: `/tutors` and `/tutors/[category]` are served as ISR-cached pages. `/tutors/[category]` already has `export const revalidate = 3600` and `generateStaticParams`. `/tutors` (main directory with search params) needs a caching strategy that handles dynamic filters without busting all caches.
- Why it matters: Directory pages are SEO entry points — fast TTFB directly affects crawl budget and ranking.
- Source: inferred
- Primary owning slice: M012/S02
- Supporting slices: none
- Validation: unmapped
- Notes: `/tutors` has dynamic `searchParams` which prevents full static generation. Strategy: static shell + client-side filter state, or separate the base listing (cacheable) from the filtered view.

### PERF-03 — Dashboard pages cache query results with unstable_cache
- Class: quality-attribute
- Status: active
- Description: All teacher dashboard pages with significant DB queries (requests, sessions, students, waitlist, availability, promote, analytics) use `unstable_cache` with appropriate TTLs and `revalidateTag` invalidation. Navigation between pages should be instant on re-visit within the TTL window.
- Why it matters: Teachers use the dashboard daily. Redundant DB round-trips on every nav click add latency and Supabase quota usage.
- Source: user
- Primary owning slice: M012/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Overview and analytics already have `unstable_cache`. Extend the pattern to requests, sessions, students, waitlist. Invalidation must be wired to the mutations that change each page's data (booking status changes, student additions, etc.).

### PERF-04 — All public images served via next/image with explicit sizing
- Class: quality-attribute
- Status: active
- Description: Every image on the public profile page (banner, avatar/profile photo, any thumbnails) goes through `next/image` with either explicit `width`/`height` or `fill` + sized container. No `<img>` tags on public-facing pages.
- Why it matters: `next/image` provides automatic WebP conversion, lazy loading, and prevents CLS (layout shift). Raw `<img>` tags on the LCP path delay Time to Interactive and hurt Core Web Vitals.
- Source: inferred
- Primary owning slice: M012/S04
- Supporting slices: none
- Validation: unmapped
- Notes: HeroSection (banner + avatar) was rewritten in M011. Verify both use `next/image` correctly with the Supabase storage domain already in `next.config.ts`.

### PERF-05 — Motion library not loaded in dashboard JS bundle
- Class: quality-attribute
- Status: active
- Description: The `motion` library (v12.36.0, ~50KB) must not appear in dashboard route chunks. Dashboard animations were converted to CSS keyframes in the post-M011 perf pass. Remaining `motion` usage (landing page, onboarding, profile entrance, More panel) should be code-split so it only loads on those specific routes.
- Why it matters: Every KB of JS in the dashboard bundle delays Time to Interactive for teachers. Motion is already unnecessary in dashboard routes after the CSS animation conversion.
- Source: user
- Primary owning slice: M012/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Current motion users: `AnimatedProfile` (profile page), `AnimatedSection`/`AnimatedSteps`/`TeacherMockSection` (landing), `OnboardingWizard` (onboarding), `MobileBottomNav` More panel, `FlyerPreview`/`QRCodeCard`/`SwipeFileCard` (dashboard — need to assess whether these can be converted to CSS). `SwipeFileSection` (dashboard/promote) uses motion client. `PageTransition` and `AnimatedButton` used in dashboard — these are the bundle leak candidates.

### PERF-06 — No Vercel Hobby plan limits exceeded during normal usage
- Class: constraint
- Status: active
- Description: All optimization strategies must keep Tutelo within Vercel Hobby plan limits: no edge runtime bundles over 1MB, no function execution over 60s, ISR writes within 1,000/day, bandwidth within 100GB/month.
- Why it matters: Exceeding Hobby limits causes hard failures (deployment errors, function timeouts, feature blocks) that cannot be resolved without upgrading.
- Source: user
- Primary owning slice: M012/all
- Supporting slices: none
- Validation: unmapped
- Notes: Edge runtime was already removed from dashboard pages after hitting the 1MB bundle limit. The proxy (middleware) is edge-compatible and tiny — keep it. No new edge runtime usage without explicit bundle size verification.

### PERF-07 — Profile page revalidates immediately on teacher save
- Class: primary-user-loop
- Status: active
- Description: When a teacher saves profile changes (bio, subjects, banner, session types, availability), the cached profile page at `/[slug]` revalidates within seconds, not on a time-based schedule. `revalidatePath('/[slug]', 'page')` in profile save actions becomes effective once ISR is enabled.
- Why it matters: "I just updated my bio" → parent still sees the old version for 5 minutes is a broken experience. On-demand ISR eliminates this.
- Source: user
- Primary owning slice: M012/S01
- Supporting slices: M012/S03
- Validation: unmapped
- Notes: `revalidatePath('/[slug]', 'page')` is already called in `src/actions/profile.ts` lines 63 and 85, and in `src/actions/bookings.ts`. These calls are currently no-ops because `/[slug]` has no cache. Once S01 adds ISR, they activate automatically.

## Validated

### UI-01 — Untitled
- Status: validated
- Validation: Validated by M011/S01 — HeroSection, CredentialsBar, ReviewsSection, AboutSection all rebuilt with premium visual treatment. Two-row CredentialsBar layout, taller hero banner with ring-inset avatar, inline SVG star ratings, dynamic --accent color throughout. Build passes.

### UI-02 — Untitled
- Status: validated
- Validation: Validated by M011/S02 — BookingCalendar decomposed into BookingForm, SessionTypeSelector, CalendarGrid, TimeSlotsPanel sub-components. All booking paths (direct, recurring, deferred) confirmed functional. Build passes.

### UI-03 — Untitled
- Status: validated
- Validation: Validated by M011/S03 — MobileBottomNav rebuilt with 4 labeled primary tabs + More panel. ParentMobileNav confirmed with visible text-[10px] labels on all 5 tabs. Build passes.

### UI-04 — Untitled
- Status: validated
- Validation: Validated by M011/S04 — All 11 teacher dashboard pages upgraded: premium card standard (rounded-xl border bg-card shadow-sm), avatar initial circles, empty state pattern, color-mix tinting, tracking-tight headers. Build passes.

### UI-05 — Untitled
- Status: validated
- Validation: Validated by M011/S04 — All 5 parent dashboard pages upgraded with same premium card standard as teacher dashboard. Build passes.

### UI-06 — Untitled
- Status: validated
- Validation: Validated by M011/S05 — Landing page tightening pass applied. SocialLinks always renders attribution footer regardless of teacher social links.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| UI-01 |  | validated | none | none | Validated by M011/S01 — HeroSection, CredentialsBar, ReviewsSection, AboutSection all rebuilt with premium visual treatment. Two-row CredentialsBar layout, taller hero banner with ring-inset avatar, inline SVG star ratings, dynamic --accent color throughout. Build passes. |
| UI-02 |  | validated | none | none | Validated by M011/S02 — BookingCalendar decomposed into BookingForm, SessionTypeSelector, CalendarGrid, TimeSlotsPanel sub-components. All booking paths (direct, recurring, deferred) confirmed functional. Build passes. |
| UI-03 |  | validated | none | none | Validated by M011/S03 — MobileBottomNav rebuilt with 4 labeled primary tabs + More panel. ParentMobileNav confirmed with visible text-[10px] labels on all 5 tabs. Build passes. |
| UI-04 |  | validated | none | none | Validated by M011/S04 — All 11 teacher dashboard pages upgraded: premium card standard (rounded-xl border bg-card shadow-sm), avatar initial circles, empty state pattern, color-mix tinting, tracking-tight headers. Build passes. |
| UI-05 |  | validated | none | none | Validated by M011/S04 — All 5 parent dashboard pages upgraded with same premium card standard as teacher dashboard. Build passes. |
| UI-06 |  | validated | none | none | Validated by M011/S05 — Landing page tightening pass applied. SocialLinks always renders attribution footer regardless of teacher social links. |

## Coverage Summary

- Active requirements: 7 (PERF-01 through PERF-07)
- Mapped to slices: 7 (all mapped to M012 slices)
- Validated: 9 (UI-01 through UI-09)
- Unmapped active requirements: 0
