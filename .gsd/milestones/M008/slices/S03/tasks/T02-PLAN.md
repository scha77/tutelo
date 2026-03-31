---
estimated_steps: 7
estimated_files: 2
skills_used: []
---

# T02: XML sitemap at /sitemap.xml

Create src/app/sitemap.ts following Next.js built-in sitemap generation API.

The file must export a default async function that returns MetadataRoute.Sitemap.

Entries to include:
1. Static pages: { url: 'https://tutelo.app/tutors', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 }, and one entry per subject category page (from SUBJECT_LIST).
2. Dynamic teacher pages: query Supabase for all rows where is_published=true, select slug + updated_at. Return { url: 'https://tutelo.app/{slug}', lastModified: updated_at ?? new Date(), changeFrequency: 'weekly', priority: 0.8 } for each.

Use createClient from @/lib/supabase/server. The sitemap route runs at request time (SSR, no ISR needed — Google crawls sitemaps infrequently).

Note: teachers table may not have an updated_at column — check migration 0001 and fall back to new Date() if missing.

## Inputs

- `src/lib/constants/directory.ts`
- `src/lib/supabase/server.ts`
- `supabase/migrations/0001_initial_schema.sql`

## Expected Output

- `src/app/sitemap.ts`

## Verification

npm run build passes. /sitemap.xml route present in Next.js output (built-in sitemap.ts is registered automatically).
