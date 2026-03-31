---
estimated_steps: 16
estimated_files: 2
skills_used: []
---

# T01: Category pages /tutors/[category]

Create src/app/tutors/[category]/page.tsx.

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

## Inputs

- `src/components/directory/TeacherCard.tsx`
- `src/lib/constants/directory.ts`
- `src/app/tutors/page.tsx`

## Expected Output

- `src/app/tutors/[category]/page.tsx`

## Verification

npx tsc --noEmit passes. npm run build passes with /tutors/[category] in route manifest.
