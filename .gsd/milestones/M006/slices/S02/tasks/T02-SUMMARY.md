---
id: T02
parent: S02
milestone: M006
key_files:
  - src/components/dashboard/SwipeFileCard.tsx
  - src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx
  - src/app/(dashboard)/dashboard/promote/page.tsx
key_decisions:
  - Used textarea (not input) for clipboard execCommand fallback since template content is multi-line
  - Separated SwipeFileSection into its own 'use client' component to keep the promote page as a server component while enabling stagger animations
duration: ""
verification_result: passed
completed_at: 2026-03-25T18:45:41.608Z
blocker_discovered: false
---

# T02: Build SwipeFileCard component with copy-to-clipboard and integrate announcement templates into promote page

**Build SwipeFileCard component with copy-to-clipboard and integrate announcement templates into promote page**

## What Happened

Created three files to deliver the swipe file UI:

1. **`SwipeFileCard.tsx`** — A `'use client'` component that renders a single announcement template card. Follows the exact CopyLinkButton clipboard pattern (navigator.clipboard with execCommand textarea fallback, "Copied!" state with 2s timeout). Uses a `<pre>` with `whitespace-pre-wrap` for the template content to preserve line breaks. Copy button uses `microPress` animation from the shared animation library, matching the QRCodeCard download button pattern.

2. **`SwipeFileSection.tsx`** — A `'use client'` wrapper that handles the stagger animation. Uses `staggerContainer`/`staggerItem` variants from `@/lib/animation` following the exact pattern from `AnimatedList.tsx`. Maps over the 4 templates from `src/lib/templates.ts`, renders each with the teacher's interpolated data, and wraps them in motion divs for staggered entrance.

3. **Updated `promote/page.tsx`** — Expanded the Supabase `.select()` query to include `school, bio, headline, grade_levels, city, state` (the fields needed for template interpolation). Builds a `TeacherTemplateData` object from the fetched row with null coalescing for optional fields, then passes it to `SwipeFileSection` which renders below the existing QR code and flyer sections.

The separation into SwipeFileSection was necessary because the promote page is a server component (async, does Supabase auth), but stagger animations require client-side motion — so the animated list lives in its own client boundary. Used textarea instead of input for the clipboard fallback since template content is multi-line.

## Verification

All three verification checks pass:
1. `npx tsc --noEmit` — zero type errors (exit 0)
2. `npm run build` — compiled and generated all 26 static pages successfully (exit 0)
3. `npx vitest run tests/unit/templates.test.ts` — 59/59 tests pass, confirming no template regression

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 3300ms |
| 2 | `npm run build` | 0 | ✅ pass | 17200ms |
| 3 | `npx vitest run tests/unit/templates.test.ts` | 0 | ✅ pass | 793ms |


## Deviations

- Plan referenced `TEMPLATES` export but actual export is `templates` — used correct name.
- Created a separate `SwipeFileSection.tsx` client component instead of inlining the stagger logic into the server component page, since `staggerContainer`/`staggerItem` require motion client imports that can't live in a server component.
- Plan listed `social_email, social_website, social_instagram` in the expanded select, but those fields aren't used by any template — expanded with `school, bio, headline, grade_levels, city, state` which are the actual fields `TeacherTemplateData` needs.

## Known Issues

None.

## Files Created/Modified

- `src/components/dashboard/SwipeFileCard.tsx`
- `src/app/(dashboard)/dashboard/promote/SwipeFileSection.tsx`
- `src/app/(dashboard)/dashboard/promote/page.tsx`
