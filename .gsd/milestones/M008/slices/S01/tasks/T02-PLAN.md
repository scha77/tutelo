---
estimated_steps: 3
estimated_files: 2
skills_used: []
---

# T02: DirectoryFilters component

Create src/components/directory/DirectoryFilters.tsx as a 'use client' component. Reads current filter values from URL search params (useSearchParams). Renders: subject multi-select (from SUBJECT_LIST constant), grade level multi-select (from GRADE_LEVELS constant), city text input, price range select (Any / Under $30 / $30-$60 / $60-$100 / $100+). On filter change, pushes updated URL params via router.push (useRouter). Debounce city input 300ms. Export SUBJECT_LIST and GRADE_LEVELS as named exports from this file or a sibling constants file — these are reused by the server query in T03.

Subject list (use these exact values): ['Math', 'Reading', 'Writing', 'Science', 'History', 'English', 'Spanish', 'French', 'SAT Prep', 'ACT Prep', 'Chemistry', 'Biology', 'Physics', 'Algebra', 'Geometry', 'Calculus', 'Computer Science', 'Art', 'Music']

Grade levels: ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade', 'College']

## Inputs

- `src/components/directory/TeacherCard.tsx`

## Expected Output

- `src/components/directory/DirectoryFilters.tsx`
- `src/lib/constants/directory.ts`

## Verification

npx tsc --noEmit passes.
