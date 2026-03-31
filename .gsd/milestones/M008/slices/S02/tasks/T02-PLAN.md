---
estimated_steps: 15
estimated_files: 2
skills_used: []
---

# T02: Wire search input + textSearch query

Add a search text input to DirectoryFilters and a 'q' param to the /tutors page query.

1. In src/components/directory/DirectoryFilters.tsx:
   - Read q = searchParams.get('q') ?? '' at the top alongside subject/grade/city/priceKey
   - Add a SearchInput (same debounce pattern as CityInput) before the Select dropdowns
   - SearchInput props: defaultValue={q}, onCommit={(v) => navigate('q', v || null)}, placeholder='Search tutors...', className='w-52'
   - Show 'q' as an active chip if set (label: `"${q}"`)

2. In src/app/tutors/page.tsx:
   - Add q to the destructured searchParams
   - After building the base query, add:
     ```ts
     if (q && q.trim()) {
       query = query.textSearch('search_vector', q.trim(), { type: 'websearch', config: 'english' })
     }
     ```
   - Add q to filterLabels if set

## Inputs

- `src/components/directory/DirectoryFilters.tsx`
- `src/app/tutors/page.tsx`
- `supabase/migrations/0012_teachers_search_vector.sql`

## Expected Output

- `src/components/directory/DirectoryFilters.tsx (updated)`
- `src/app/tutors/page.tsx (updated)`

## Verification

npx tsc --noEmit passes (no new errors). npm run build passes.
