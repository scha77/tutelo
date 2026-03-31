# S03: Category Pages & Sitemap

**Goal:** SEO category pages at /tutors/[category] (subject slugs like 'math', 'sat-prep' and city slugs like 'chicago'). XML sitemap at /sitemap.xml covering all published teacher /[slug] URLs plus /tutors and category pages. ISR with 1-hour revalidation on category pages.
**Demo:** After this: /tutors/math shows only math teachers with 'Math Tutors' in the page title. /sitemap.xml lists all published teacher URLs.

## Tasks
- [x] **T01: Category pages /tutors/[category] built with ISR, unique meta, and subject/location routing. Build passes.** — Create src/app/tutors/[category]/page.tsx.

1. Category slug mapping — two types:
   - Subject slugs: derived from SUBJECT_LIST by lowercasing and replacing spaces with hyphens (e.g. 'SAT Prep' → 'sat-prep', 'Math' → 'math'). Reverse-map on the server to get the original subject name for the Supabase .contains() query.
   - Location slugs: just city names lowercased (e.g. 'chicago', 'new-york'). Reverse by replacing hyphens with spaces and capitalizing.

2. generateStaticParams: return all subject slugs from SUBJECT_LIST.

3. generateMetadata: determine if it's a subject or city category. Subject: title = '{SubjectName} Tutors | Tutelo', description = 'Find {subjectName} tutors...'. Canonical = https://tutelo.app/tutors/{category}.

4. Page body: same query as /tutors page but with the category filter pre-applied (subject OR city depending on type). Show category name as page H1. Link back to /tutors. Render TeacherCard grid. Empty state.

5. export const revalidate = 3600

Slug matching logic:
```ts
const subjectSlugs = SUBJECT_LIST.map(s => s.toLowerCase().replace(/ /g, '-'))
const isSubjectSlug = subjectSlugs.includes(category)
const subjectName = SUBJECT_LIST.find(s => s.toLowerCase().replace(/ /g, '-') === category)
const isLocationSlug = !isSubjectSlug  // treat unknown slugs as city names
const cityName = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
```
  - Estimate: 60m
  - Files: src/app/tutors/[category]/page.tsx, src/lib/constants/directory.ts
  - Verify: npx tsc --noEmit passes. npm run build passes with /tutors/[category] in route manifest.
- [x] **T02: /sitemap.xml built with teacher profiles + category pages + directory. Build passes.** — Create src/app/sitemap.ts following Next.js built-in sitemap generation API.

The file must export a default async function that returns MetadataRoute.Sitemap.

Entries to include:
1. Static pages: { url: 'https://tutelo.app/tutors', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 }, and one entry per subject category page (from SUBJECT_LIST).
2. Dynamic teacher pages: query Supabase for all rows where is_published=true, select slug + updated_at. Return { url: 'https://tutelo.app/{slug}', lastModified: updated_at ?? new Date(), changeFrequency: 'weekly', priority: 0.8 } for each.

Use createClient from @/lib/supabase/server. The sitemap route runs at request time (SSR, no ISR needed — Google crawls sitemaps infrequently).

Note: teachers table may not have an updated_at column — check migration 0001 and fall back to new Date() if missing.
  - Estimate: 30m
  - Files: src/app/sitemap.ts, supabase/migrations/0001_initial_schema.sql
  - Verify: npm run build passes. /sitemap.xml route present in Next.js output (built-in sitemap.ts is registered automatically).
