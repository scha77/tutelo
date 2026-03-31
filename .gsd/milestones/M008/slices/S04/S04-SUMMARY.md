---
id: S04
parent: M008
milestone: M008
provides:
  - page_views data for future time-series analytics
  - Bot filter utility reusable for any future tracking surface
requires:
  - slice: S01
    provides: /tutors directory (confirmed pages work end-to-end)
affects:
  []
key_files:
  - supabase/migrations/0013_page_views.sql
  - src/lib/utils/bot-filter.ts
  - src/app/[slug]/page.tsx
  - src/app/(dashboard)/dashboard/analytics/page.tsx
  - src/lib/nav.ts
key_decisions:
  - RLS SELECT policy on page_views allows teachers to read their own rows with authenticated client
  - Fire-and-forget via void Promise.resolve().catch() — type-safe and non-blocking
  - supabaseAdmin (service.ts) used for inserts (unauthenticated context), RLS SELECT policy used for dashboard reads
  - Conversion rate = completed bookings / total views — honest given currently available data
patterns_established:
  - void Promise.resolve(supabaseClient.from().insert()).catch(() => {}) for fire-and-forget Supabase mutations from RSC (PromiseLike vs Promise type safety)
observability_surfaces:
  - page_views table queryable for funnel analysis
  - console.error on track-view insert failure with teacherId context
  - console.error on /api/track-view insert error with teacherId context
drill_down_paths:
  - milestones/M008/slices/S04/tasks/T01-SUMMARY.md
  - milestones/M008/slices/S04/tasks/T02-SUMMARY.md
  - milestones/M008/slices/S04/tasks/T03-SUMMARY.md
  - milestones/M008/slices/S04/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-31T02:37:46.349Z
blocker_discovered: false
---

# S04: Page View Tracking & Dashboard Analytics

**Page view tracking and dashboard analytics shipped \u2014 8 bot-filter tests pass, funnel visible in dashboard, build clean.**

## What Happened

Four tasks: (1) migration 0013 creates page_views table with indexes and RLS; (2) isBot() utility with 8 passing tests; (3) fire-and-forget tracking wired into /[slug] page + /api/track-view API route; (4) dashboard analytics page with stat cards and funnel. Analytics nav item added. All compile clean, build passes.

## Verification

tsc --noEmit clean. npm run build passes with /dashboard/analytics and /api/track-view in manifest. 8 bot-filter unit tests pass.

## Requirements Advanced

- ANALYTICS-01 — page_views table + fire-and-forget insert on /[slug] with bot filtering
- ANALYTICS-02 — /dashboard/analytics page shows total views, 30-day views, completed bookings, and conversion rate funnel

## Requirements Validated

- ANALYTICS-01 — page_views table in migration 0013. /[slug]/page.tsx fires non-blocking insert with isBot() filter. /api/track-view POST route available. 8 bot-filter unit tests pass.
- ANALYTICS-02 — /dashboard/analytics in route manifest. Page renders total views, 30-day views, completed bookings, and conversion rate. Funnel section with 4 stages. Analytics nav item in sidebar.

## New Requirements Surfaced

- Booking form opens tracking needs client-side event (deferred to future milestone)

## Requirements Invalidated or Re-scoped

None.

## Deviations

Direct DB insert from RSC for page view tracking (server \u2192 Supabase) rather than server fetch to /api/track-view \u2014 avoids the extra network hop and is cleaner for an RSC. /api/track-view still exists as a public endpoint for potential client-side use.

## Known Limitations

Booking form opens not yet tracked (client-side event needed). Shown as 'Coming soon' in funnel. No time-series chart (daily/weekly breakdown) \u2014 aggregate counts only for MVP.

## Follow-ups

Booking form opens tracking (client-side event) deferred to a future milestone \u2014 currently shown as 'Coming soon' placeholder in the funnel.

## Files Created/Modified

- `supabase/migrations/0013_page_views.sql` — page_views table with indexes, RLS, and SELECT policy for teacher reads
- `src/lib/utils/bot-filter.ts` — isBot() utility with 20 bot UA patterns
- `tests/unit/bot-filter.test.ts` — 8 unit tests for bot filter (all pass)
- `src/app/api/track-view/route.ts` — /api/track-view POST route with bot filtering and supabaseAdmin insert
- `src/app/[slug]/page.tsx` — Added fire-and-forget page view tracking after teacher query succeeds. Added headers() import.
- `src/app/(dashboard)/dashboard/analytics/page.tsx` — Analytics dashboard page: 4 stat cards + funnel visualization + empty state nudge
- `src/lib/nav.ts` — Added BarChart2 import and Analytics nav item between Promote and Settings
