---
estimated_steps: 6
estimated_files: 1
skills_used: []
---

# T03: /tutors page (server component + query)

Create src/app/tutors/page.tsx as an async server component.

1. Read searchParams: subject (string), grade (string), city (string), maxPrice (string), minPrice (string).
2. Build Supabase query on teachers table: select id, slug, full_name, photo_url, subjects, grade_levels, city, state, hourly_rate, school, headline, verified_at. Filter: is_published = true. If subject param: .contains('subjects', [subject]). If grade param: .contains('grade_levels', [grade]). If city param: .ilike('city', '%' + city + '%'). If maxPrice: .lte('hourly_rate', maxPrice). If minPrice: .gte('hourly_rate', minPrice). Order by created_at desc. Limit 50.
3. Render: page title 'Find a Tutor', subtitle. DirectoryFilters component (client boundary). Teacher card grid (responsive: 1 col mobile, 2 col tablet, 3 col desktop). If no results: empty state message. If query error: log error, render empty state (fail open).
4. generateMetadata: title 'Find a Tutor | Tutelo', description 'Browse verified tutors...', canonical https://tutelo.app/tutors.

Suspense boundary around DirectoryFilters so page is not blocked by client hydration.

## Inputs

- `src/components/directory/TeacherCard.tsx`
- `src/components/directory/DirectoryFilters.tsx`
- `src/lib/constants/directory.ts`
- `src/lib/supabase/server.ts`

## Expected Output

- `src/app/tutors/page.tsx`

## Verification

npx tsc --noEmit passes. npm run build passes. /tutors in route manifest (grep .next/server/app-paths-manifest.json for '/tutors').
