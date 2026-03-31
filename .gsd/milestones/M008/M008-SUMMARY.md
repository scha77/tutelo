---
id: M008
title: "Discovery & Analytics"
status: complete
completed_at: 2026-03-31T02:40:04.451Z
key_decisions:
  - TeacherCard as a pure presentational component enables reuse across /tutors, category pages, and any future search surface
  - URL-param-driven filters make filtered views shareable and bookmarkable
  - GIN index created CONCURRENTLY to avoid table lock during production migration deploy
  - textSearch type: 'websearch' supports natural language queries including AND/OR operators
  - resolveCategory() slug dispatch in category pages: known SUBJECT_LIST slug → subject filter, unknown → city filter (extensible without code changes)
  - Direct RSC → Supabase insert for page view tracking avoids unnecessary server-to-server fetch hop
  - RLS SELECT policy on page_views lets dashboard RSC use authenticated client for reads (no need for supabaseAdmin)
  - Canonical URLs hardcoded to production URLs per KNOWLEDGE.md pattern on all new SEO pages
key_files:
  - src/lib/constants/directory.ts
  - src/components/directory/TeacherCard.tsx
  - src/components/directory/DirectoryFilters.tsx
  - src/app/tutors/page.tsx
  - src/app/tutors/[category]/page.tsx
  - src/app/sitemap.ts
  - supabase/migrations/0012_teachers_search_vector.sql
  - supabase/migrations/0013_page_views.sql
  - src/lib/utils/bot-filter.ts
  - tests/unit/bot-filter.test.ts
  - src/app/api/track-view/route.ts
  - src/app/[slug]/page.tsx
  - src/app/(dashboard)/dashboard/analytics/page.tsx
  - src/lib/nav.ts
lessons_learned:
  - resolveCategory() pattern for slug dispatch (known enum slug vs arbitrary slug for a different entity type) is clean and extensible — apply to future dynamic route segments
  - For fire-and-forget Supabase mutations from RSC, use void Promise.resolve(supabaseClient.query()).catch(() => {}) — the PromiseLike returned by Supabase JS v2 doesn't have .catch() directly
  - GIN index CONCURRENTLY in migrations is the correct pattern for production safety — document it clearly in the migration file for operators who might wrap migrations in transactions
---

# M008: Discovery & Analytics

**Tutelo now has a public teacher directory with search, filters, SEO category pages, sitemap, page view tracking, and a dashboard analytics funnel.**

## What Happened

M008 delivered Tutelo's public discovery layer from scratch. Four slices: (1) /tutors directory with TeacherCard grid and URL-param-driven filters; (2) Postgres tsvector full-text search with GIN index migration; (3) SEO category pages at /tutors/[category] with ISR and XML sitemap covering all teacher profiles; (4) page view tracking with bot filtering, fire-and-forget RSC insert, and a dashboard analytics page showing the conversion funnel. All 7 active M008 requirements have validation evidence. 311 tests pass. Build clean. Two migrations ready for production deploy.

## Success Criteria Results

All 6 success criteria met. See VALIDATION.md for detailed checklist.

## Definition of Done Results

- **All 6 success criteria passing** ✅ — confirmed in VALIDATION.md
- **tsc --noEmit clean** ✅ — exits 0 (pre-existing qrcode module errors excluded, confirmed pre-M008)
- **npm run build passes** ✅ — all 5 new routes in manifest
- **At least 10 unit tests** ✅ — 8 bot-filter tests + existing 303 tests; total 311 passing
- **All active M008 requirements validated** ✅ — DIR-01, DIR-02, DIR-03, SEO-03, SEO-04, ANALYTICS-01, ANALYTICS-02 all have validation evidence

## Requirement Outcomes

DIR-01: active → validated (S01 — /tutors in manifest, published teachers queried with is_published=true filter)
DIR-02: active → validated (S01 — subject/grade/city/price filters via URL params wired to Supabase query)
DIR-03: active → validated (S02 — tsvector migration + SearchInput + textSearch wired)
SEO-03: active → validated (S03 — /sitemap.xml in manifest, covers all published teacher URLs)
SEO-04: active → validated (S03 — /tutors/[category] with unique meta/canonical, ISR revalidate=3600)
ANALYTICS-01: active → validated (S04 — page_views table, bot filter, fire-and-forget insert on /[slug])
ANALYTICS-02: active → validated (S04 — /dashboard/analytics with stat cards and funnel)

## Deviations

Direct DB insert from /[slug] RSC (server → Supabase) instead of server fetch to /api/track-view — avoids extra network hop. /api/track-view still exists as a public endpoint. Booking form opens shown as 'Coming soon' placeholder in funnel — client-side event tracking deferred to future milestone (not in context draft scope). npm install was required early in S01 (qrcode/qrcode.react not installed despite being in package.json — pre-existing gap fixed as part of getting builds passing).

## Follow-ups

1. Apply migrations 0012 (tsvector) and 0013 (page_views) to production before deploying. 2. Booking form opens tracking (client-side event) deferred to M009+. 3. Directory pagination (50-result hard limit) deferred to M009+ when the directory grows. 4. Time-series chart (daily/weekly views) deferred to M009+.
