---
estimated_steps: 3
estimated_files: 2
skills_used: []
---

# T01: Create template definitions and unit tests

Create `src/lib/templates.ts` — a pure TypeScript module (no React, no server dependencies) that defines 4 announcement templates for teachers to copy-paste into email and social media. Each template interpolates teacher profile data and gracefully handles null/missing optional fields.

Then write `tests/unit/templates.test.ts` with comprehensive Vitest unit tests covering all interpolation edge cases.

**Requirements delivered:** SWIPE-01 (4 pre-written announcement templates interpolated with teacher data).

## Inputs

- `vitest.config.ts`
- `tests/unit/og-metadata.test.ts`

## Expected Output

- `src/lib/templates.ts`
- `tests/unit/templates.test.ts`

## Verification

npx vitest run tests/unit/templates.test.ts && npx tsc --noEmit
