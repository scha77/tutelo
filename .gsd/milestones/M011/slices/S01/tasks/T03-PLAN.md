---
estimated_steps: 11
estimated_files: 3
skills_used: []
---

# T03: Upgrade ReviewsSection with SVG stars, elevated cards, and reviewer avatars — wire accentColor and verify all tests

The ReviewsSection has the most constraints: 3 unit tests in src/__tests__/dashboard-reviews.test.ts that call ReviewsSection({ reviews }) directly and check JSON.stringify output for '4.7', '" review"', 'Review 0'...'Review 4'. The tests check serialized JSX structure, not rendered HTML.

Changes:
1. Replace unicode ★ with inline SVG stars in renderStars() — use <svg viewBox='0 0 20 20'> with <path> for a star shape, filled yellow-400 or gray-200. The tests don't directly assert on star characters (they check '4.7' and review text), so SVG replacement is safe.
2. Upgrade review cards from 'rounded-lg border p-4' to 'rounded-xl border bg-card shadow-sm p-5' for elevation.
3. Add reviewer initial avatar: small div with rounded-full, accent-colored background showing first letter of reviewer_name (or 'A' for Anonymous). This requires an accentColor prop.
4. Add text-wrap: pretty on review_text.
5. Upgrade aggregate rating header: SVG stars + rating number + count with better typography.
6. Add accentColor prop to ReviewsSection interface.
7. Wire accentColor in page.tsx: pass `accentColor={teacher.accent_color}` to the ReviewsSection component.
8. Run full verification: vitest (474 pass), tsc --noEmit (clean), next build (success).

CRITICAL: Do NOT rename or remove the `firstNameFromEmail` export — it is tested. Do NOT change the component's behavior of returning null for empty reviews or slicing to 5. The avg rating calculation and count display logic must produce identical string values.

## Inputs

- ``src/components/profile/ReviewsSection.tsx` — current unicode stars, plain cards, no accentColor prop`
- ``src/app/[slug]/page.tsx` — T01 output: updated page with SocialLinks styling, needs accentColor wiring to ReviewsSection`
- ``src/__tests__/dashboard-reviews.test.ts` — existing tests that must continue to pass (checks '4.7', '" review"', 'Review 0'..'Review 4', firstNameFromEmail)`

## Expected Output

- ``src/components/profile/ReviewsSection.tsx` — SVG stars, elevated cards, reviewer avatars, accentColor prop`
- ``src/app/[slug]/page.tsx` — accentColor wired to ReviewsSection`

## Verification

npx vitest run --reporter=dot 2>&1 | tail -3 && npx tsc --noEmit && npx next build 2>&1 | tail -5
