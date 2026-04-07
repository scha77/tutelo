---
estimated_steps: 5
estimated_files: 2
skills_used: []
---

# T03: Verify and test

1. Run full test suite
2. Verify middleware redirects unauthenticated requests
3. Verify dashboard renders with authenticated session
4. Check parent routes also protected
5. Verify no regressions on login, callback, or public routes

## Inputs

- `src/middleware.ts`
- `src/app/(dashboard)/dashboard/layout.tsx`

## Expected Output

- Update the implementation and proof artifacts needed for this task.

## Verification

npx vitest run passes all tests. Manual verification of redirect behavior.
