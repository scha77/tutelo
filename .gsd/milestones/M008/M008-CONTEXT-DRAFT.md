---
depends_on: [M006]
---

# M008: Discovery & Analytics

**Gathered:** 2026-03-25
**Status:** Draft — needs dedicated discussion before planning

## Project Description

Right now parents can only find teachers via direct link. This milestone builds a public teacher directory at /tutors with search, filters, SEO-optimized category pages, XML sitemap, and page view analytics so teachers can see their funnel.

## Why This Milestone

Discovery is the growth engine. Teachers share their links 1:1 — the directory enables 1:many organic discovery via Google. Analytics close the loop: teachers can see if their promotion efforts (QR codes, swipe file) are driving views and bookings.

## Key Decisions from Discussion

- **Directory type:** Public SEO-friendly directory that Google indexes. Not just an internal search tool.
- **Search tech:** Postgres full-text search with tsvector/GIN index via Supabase .textSearch() API. No external search service needed at this scale.
- **Category pages:** SEO-optimized pages at /tutors/math, /tutors/chicago, etc. — filtered views of the directory with proper meta tags.
- **Analytics level:** Full conversion funnel — views → booking form opens → completed bookings. Not just booking stats.
- **View tracking:** Lightweight middleware or edge function counter. Must filter bots. New `page_views` table.

## Provisional Scope

### In Scope
- /tutors directory page with teacher cards
- Filters: subject, grade level, city/state, price range (via URL query params)
- Full-text search across name, school, subjects, bio (tsvector + GIN index migration)
- SEO category pages (/tutors/math, /tutors/[city])
- XML sitemap (Next.js sitemap.ts)
- Page view tracking on /[slug] pages
- Dashboard analytics section with view count + conversion funnel
- Proper meta tags on all directory/category pages

### Out of Scope
- Algolia/Meilisearch or any external search service
- Map-based teacher discovery
- Teacher ranking algorithm (just sort by relevance/newest)
- Real-time analytics (daily aggregation is sufficient)

## Relevant Requirements
- DIR-01, DIR-02, DIR-03, SEO-03, SEO-04, ANALYTICS-01, ANALYTICS-02

## Open Questions
- Should category pages be statically generated at build time or dynamically rendered? (Depends on how many valid categories exist)
- Should analytics show daily/weekly/monthly breakdowns?
- Should the directory show average rating per teacher?
