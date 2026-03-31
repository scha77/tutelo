# S01: Directory Page & Filters

**Goal:** Build /tutors directory page with teacher card grid and URL-param-driven filters (subject, grade level, city/state, price range). Server-rendered, SEO-friendly. No search yet — search is S02.
**Demo:** After this: /tutors page live with working filters. Filtering by 'Math' shows only math teachers.

## Tasks
- [x] **T01: TeacherCard component built with photo/avatar, verified badge, subject pills, location, and hourly rate.** — Create src/components/directory/TeacherCard.tsx. Props: teacher (id, slug, full_name, photo_url, subjects, grade_levels, city, state, hourly_rate, school, headline, verified_at). Renders: photo (with fallback avatar), name, verified badge if verified_at is set, school, subjects as pill tags (max 3 + overflow count), city/state, hourly rate. Links to /{slug}. Follows design guidelines: 4pt grid, visual hierarchy (name large, secondary info smaller/lighter). Export as named export. No server-side logic — pure presentational component.
  - Estimate: 45m
  - Files: src/components/directory/TeacherCard.tsx
  - Verify: npx tsc --noEmit passes. Component file exists.
- [x] **T02: DirectoryFilters client component built with subject/grade/price selects, debounced city input, and active filter chips.** — Create src/components/directory/DirectoryFilters.tsx as a 'use client' component. Reads current filter values from URL search params (useSearchParams). Renders: subject multi-select (from SUBJECT_LIST constant), grade level multi-select (from GRADE_LEVELS constant), city text input, price range select (Any / Under $30 / $30-$60 / $60-$100 / $100+). On filter change, pushes updated URL params via router.push (useRouter). Debounce city input 300ms. Export SUBJECT_LIST and GRADE_LEVELS as named exports from this file or a sibling constants file — these are reused by the server query in T03.

Subject list (use these exact values): ['Math', 'Reading', 'Writing', 'Science', 'History', 'English', 'Spanish', 'French', 'SAT Prep', 'ACT Prep', 'Chemistry', 'Biology', 'Physics', 'Algebra', 'Geometry', 'Calculus', 'Computer Science', 'Art', 'Music']

Grade levels: ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade', 'College']
  - Estimate: 60m
  - Files: src/components/directory/DirectoryFilters.tsx, src/lib/constants/directory.ts
  - Verify: npx tsc --noEmit passes.
- [x] **T03: /tutors page built with server-side Supabase query, filter integration, responsive card grid, and proper meta tags. Build passes.** — Create src/app/tutors/page.tsx as an async server component.

1. Read searchParams: subject (string), grade (string), city (string), maxPrice (string), minPrice (string).
2. Build Supabase query on teachers table: select id, slug, full_name, photo_url, subjects, grade_levels, city, state, hourly_rate, school, headline, verified_at. Filter: is_published = true. If subject param: .contains('subjects', [subject]). If grade param: .contains('grade_levels', [grade]). If city param: .ilike('city', '%' + city + '%'). If maxPrice: .lte('hourly_rate', maxPrice). If minPrice: .gte('hourly_rate', minPrice). Order by created_at desc. Limit 50.
3. Render: page title 'Find a Tutor', subtitle. DirectoryFilters component (client boundary). Teacher card grid (responsive: 1 col mobile, 2 col tablet, 3 col desktop). If no results: empty state message. If query error: log error, render empty state (fail open).
4. generateMetadata: title 'Find a Tutor | Tutelo', description 'Browse verified tutors...', canonical https://tutelo.app/tutors.

Suspense boundary around DirectoryFilters so page is not blocked by client hydration.
  - Estimate: 90m
  - Files: src/app/tutors/page.tsx
  - Verify: npx tsc --noEmit passes. npm run build passes. /tutors in route manifest (grep .next/server/app-paths-manifest.json for '/tutors').
