# S02: Copy-Paste Swipe File

**Goal:** Teacher opens the promote page, sees 4+ pre-written announcement templates interpolated with their profile data, clicks copy, and pastes the text into their email client or social media.
**Demo:** Teacher opens the promote page, sees 4+ pre-written announcement templates with their data filled in, clicks copy, and pastes the text into their email client or social media.

## Must-Haves

- 4 announcement templates (Email Signature, Newsletter Blurb, Social Post, Back-to-School Handout) defined in `src/lib/templates.ts`
- Each template interpolates teacher data (name, subjects, rate, location, URL) and gracefully omits null fields
- `SwipeFileCard` component renders each template with a copy-to-clipboard button
- Copy button shows "Copied!" confirmation for 2 seconds then resets
- Promote page renders all 4 template cards below the existing QR/flyer sections
- Unit tests cover template interpolation edge cases (nulls, empty arrays, all fields present)
- `npx vitest run tests/unit/templates.test.ts` passes
- `npx tsc --noEmit` passes
- `npm run build` passes

## Proof Level

- This slice proves: Contract — unit tests prove template interpolation logic; build proves component integration.

## Integration Closure

- Upstream: `src/app/(dashboard)/dashboard/promote/page.tsx` (S01 output — promote page shell)
- New wiring: promote page `.select()` expanded to include template fields; `SwipeFileCard` components rendered in promote page
- What remains: S03 (OG image verification) is independent and doesn't consume S02 output

## Verification

- None — pure client-side UI with no async flows, APIs, or error paths requiring observability.

## Tasks

- [x] **T01: Create template definitions and unit tests** `est:30m`
  Create `src/lib/templates.ts` with TeacherTemplateData type, Template type, and 4 announcement template definitions (Email Signature, Newsletter Blurb, Social Post, Back-to-School Handout). Each template's render function interpolates teacher data and gracefully omits null/undefined fields. Write `tests/unit/templates.test.ts` with Vitest covering all interpolation edge cases.
  - Files: `src/lib/templates.ts`, `tests/unit/templates.test.ts`
  - Verify: npx vitest run tests/unit/templates.test.ts && npx tsc --noEmit

- [x] **T02: Build SwipeFileCard component and integrate into promote page** `est:30m`
  Create `src/components/dashboard/SwipeFileCard.tsx` — a client component that renders a template card with copy-to-clipboard using the CopyLinkButton pattern. Update `src/app/(dashboard)/dashboard/promote/page.tsx` to expand the teacher select query and render all 4 template cards. Follow existing animation patterns (fadeSlideUp, microPress, staggerContainer).
  - Files: `src/components/dashboard/SwipeFileCard.tsx`, `src/app/(dashboard)/dashboard/promote/page.tsx`
  - Verify: npx tsc --noEmit && npm run build

## Files Likely Touched

- src/lib/templates.ts
- tests/unit/templates.test.ts
- src/components/dashboard/SwipeFileCard.tsx
- src/app/(dashboard)/dashboard/promote/page.tsx
