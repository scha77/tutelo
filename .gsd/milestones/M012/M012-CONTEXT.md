# M012: Performance & Delivery Efficiency

**Gathered:** 2026-04-06
**Status:** Ready for planning

## Project Description

Tutelo is a tutoring marketplace where teachers publish professional booking pages and parents find and book sessions. The public profile page (`/[slug]`) is the conversion surface — every parent interaction starts there. The teacher dashboard is used daily for session management.

## Why This Milestone

Significant first-order performance work was done outside GSD after M011 (auth dedup via React.cache, unstable_cache for teacher/overview data, Promise.all parallelization, loading skeletons everywhere, proxy optimization from getUser→getSession, motion library removed from dashboard list/stats, dynamic import of Stripe/supabaseAdmin). M012 captures the second-order gains:

1. The profile page `/[slug]` is still fully dynamic (SSR on every request, ~800ms TTFB). It should be CDN-cached (ISR) since teacher profiles change rarely.
2. The `revalidatePath('/[slug]', 'page')` calls in profile.ts and bookings.ts are already wired but are currently no-ops because the page has no cache. ISR activation makes them work for free.
3. Dashboard pages beyond overview and analytics still hit Supabase on every navigation.
4. The `motion` library (~50KB) is still present in some dashboard route chunks despite the CSS animation conversion.
5. Vercel Hobby plan constraints are real: edge runtime was already removed after hitting the 1MB bundle limit. Any new optimization must stay within Hobby bounds.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Visit any teacher profile page and see it load from Vercel's CDN in ~50ms TTFB instead of ~800ms dynamic SSR
- Update their profile bio/subjects/banner and see the public page reflect changes within seconds (on-demand ISR revalidation)
- Navigate between dashboard pages (requests, sessions, students, waitlist) and feel instant re-visits within the cache TTL
- Verify the app deploys cleanly on Vercel Hobby with no bundle size or function limit errors

### Entry point / environment

- Entry point: `https://tutelo.app/[slug]` (public), `https://tutelo.app/dashboard` (teacher)
- Environment: Vercel production (Hobby plan)
- Live dependencies: Supabase (DB queries), Vercel CDN (ISR cache)

## Completion Class

- Contract complete means: `generateStaticParams` + `revalidate` present on profile page; `unstable_cache` on all major dashboard pages; build output shows `/[slug]` as ISR; motion library absent from dashboard chunks
- Integration complete means: Teacher saves a profile change → public page reflects it within seconds (revalidatePath activates on ISR-enabled page)
- Operational complete means: Vercel Hobby deploy succeeds cleanly; no bundle size errors or Hobby limit warnings

## Final Integrated Acceptance

- Teacher saves a profile change → visits `/[slug]` → sees the change (not stale cache)
- `npm run build` shows `/[slug]` as ISR (not `ƒ Dynamic`) in route table
- Dashboard pages return cached results on re-navigation within TTL window

## Risks and Unknowns

- **ISR + dynamic booking calendar coexistence** — The profile page contains `BookingCalendar` which is a live client component. ISR caches the HTML shell; the calendar hydrates client-side and fetches live slot data. This is correct but must be verified — no dynamic per-request data (available slots, capacity status) should be baked into the ISR cache.
- **`/tutors` directory with search params** — Full static generation is impossible because search params vary (subject, grade, city, price, q). Decision: use short TTL revalidation (5 min) for the base page. Don't refactor to client-side filtering — too much churn.
- **Motion bundle leak scope** — `PageTransition` and `AnimatedButton` are shared components used in dashboard routes and are the suspected motion bundle leak points. Audit before removing.

## Existing Codebase / Prior Art

- `src/app/[slug]/page.tsx` — 284 lines, purely dynamic RSC. Uses `React.cache()` for teacher query dedup. Has `Promise.all` for parallel queries. No `export const revalidate` or `generateStaticParams` yet.
- `src/lib/supabase/auth-cache.ts` — `React.cache` + `unstable_cache` pattern (teacher row, 60s TTL). Model for all new caching.
- `src/app/(dashboard)/dashboard/page.tsx` — `unstable_cache` with `overview-{teacherId}` tag, 30s TTL. Reference implementation.
- `src/app/tutors/[category]/page.tsx` — Already has `export const revalidate = 3600` + `generateStaticParams`. Reference for S02.
- `src/actions/profile.ts` — `revalidatePath('/[slug]', 'page')` called on save (lines 63, 85). Currently a no-op; activates automatically when ISR is added.
- `src/actions/bookings.ts` — Same `revalidatePath('/[slug]', 'page')` pattern.
- `src/lib/animation.ts` — Central animation variants. Motion used in: AnimatedProfile (profile page), AnimatedSection/AnimatedSteps/TeacherMockSection (landing), OnboardingWizard (onboarding), MobileBottomNav More panel, FlyerPreview/QRCodeCard/SwipeFileCard/SwipeFileSection (dashboard promote), **PageTransition/AnimatedButton (shared — suspected dashboard chunk leak)**.
- `next.config.ts` — Supabase storage domain in `remotePatterns`. Node.js runtime throughout. Edge was removed after 1MB Hobby limit hit.
- `src/proxy.ts` — Middleware using `getSession()` (already optimized). Edge-compatible, tiny.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- PERF-01 — Profile page ISR (S01 primary deliverable)
- PERF-02 — Directory pages ISR (S02)
- PERF-03 — Dashboard query caching (S03)
- PERF-04 — next/image audit on public pages (S04)
- PERF-05 — Motion library out of dashboard bundle (S04)
- PERF-06 — Vercel Hobby constraint (cross-cutting all slices)
- PERF-07 — On-demand revalidation on teacher save (S01, activated by PERF-01)

## Scope

### In Scope

- Add `generateStaticParams` + `export const revalidate` to `/[slug]/page.tsx`
- Verify `revalidatePath` calls in profile/booking actions become effective after ISR
- Add `unstable_cache` to requests, sessions, students, waitlist dashboard pages with invalidation tags
- Wire cache invalidation to mutations that change each page's data
- Audit `/tutors` directory page — add short TTL revalidation
- Audit `next/image` usage on public profile page (banner, avatar)
- Identify and remove motion library from dashboard route chunks
- Verify build deploys cleanly on Vercel Hobby; no bundle size errors

### Out of Scope / Non-Goals

- Service workers / PWA caching
- CDN configuration outside Vercel
- Database query optimization (indexes already added in pre-deploy hardening)
- Real User Monitoring (RUM) / Lighthouse CI
- Upgrading to Vercel Pro

## Technical Constraints

- **Vercel Hobby:** No edge runtime bundles >1MB. Function execution ≤60s. ISR writes ≤1,000/day. Bandwidth ≤100GB/month. No new edge runtime without bundle size verification.
- **ISR + booking calendar:** The calendar's available slots are already fetched client-side (client component). Verify no dynamic-per-request data leaks into the static ISR shell.
- **`unstable_cache` callbacks:** Run outside request context — must use `supabaseAdmin` (service role). Pattern established in overview cache.
- **`revalidatePath('/[slug]', 'page')`:** Revalidates all `/[slug]` paths (not slug-specific). Acceptable because profile saves are infrequent. In actions where the slug IS known, prefer `revalidatePath('/${slug}')` for precision.
