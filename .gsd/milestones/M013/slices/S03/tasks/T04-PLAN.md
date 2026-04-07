---
estimated_steps: 14
estimated_files: 1
skills_used: []
---

# T04: Fix og-metadata mock chain, unskip tests, and run final verification

Fix 4 it.skip() tests in `tests/unit/og-metadata.test.ts` and verify the full suite is clean.

**Root cause:** The mock for `supabaseAdmin.from().select().eq().single()` returns raw teacher data instead of the `{ data, error }` object that Supabase's `.single()` actually returns. Production code does `const { data } = await single()` — so with the current mock, `data` is `undefined` and the metadata function returns the fallback for every test.

**Fix:**
1. Change `mockAdminSingle.mockResolvedValue({ full_name: '...', ... })` → `mockAdminSingle.mockResolvedValue({ data: { full_name: '...', ... }, error: null })`
2. Change `mockAdminSingle.mockResolvedValue(null)` (null teacher test) → `mockAdminSingle.mockResolvedValue({ data: null, error: null })`
3. Change all 4 `it.skip(` → `it(`

**4 tests to unskip:**
1. Returns personalized title and description for a valid teacher slug
2. Returns generic Tutelo fallback for an invalid slug
3. Handles teacher with no subjects gracefully
4. Handles teacher with null subjects array

**Verification assertions already written** — they test metadata.title, metadata.description, metadata.openGraph.url, etc. The assertions should pass once the mock returns the correct shape.

**Potential issue:** React's `cache()` wrapper on `getTeacherBySlug` — in test context without RSC render, `cache` is effectively a pass-through. Each test uses a unique slug, so no caching conflicts.

**Final verification:** Run `npx vitest run` on the full suite. Expected: all files pass, 0 todo, 0 skip, ~490 total tests.

## Inputs

- ``tests/unit/og-metadata.test.ts` — existing test file with 4 it.skip tests`
- ``src/app/[slug]/page.tsx` — production generateMetadata function using supabaseAdmin`

## Expected Output

- ``tests/unit/og-metadata.test.ts` — 4 real passing tests, 0 skips`

## Verification

npx vitest run — expect 0 todo, 0 skip, 0 failures, all files pass. Test count ≥ 490.
