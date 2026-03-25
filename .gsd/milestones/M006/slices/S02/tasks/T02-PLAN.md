---
estimated_steps: 15
estimated_files: 2
skills_used: []
---

# T02: Build SwipeFileCard component and integrate into promote page

Create `src/components/dashboard/SwipeFileCard.tsx` — a `'use client'` component that renders a single announcement template card with:
- Template label and description header
- Read-only preformatted text area showing the interpolated template
- Copy button using the exact CopyLinkButton pattern (navigator.clipboard with execCommand fallback, "Copied!" state with 2s timeout)
- Animation using `fadeSlideUp` and `microPress` from `@/lib/animation`

Then update `src/app/(dashboard)/dashboard/promote/page.tsx` to:
1. Expand the `.select()` query to include `city, state, social_email, social_website, social_instagram`
2. Build a `TeacherTemplateData` object from the fetched row
3. Import `TEMPLATES` from `@/lib/templates` and render `SwipeFileCard` for each template below the existing FlyerPreview section
4. Use `staggerContainer`/`staggerItem` for entrance animation

**Requirements delivered:** SWIPE-02 (one-click copy-to-clipboard for each template).

**Key patterns to follow (read these files):**
- `src/app/(dashboard)/dashboard/requests/CopyLinkButton.tsx` — clipboard pattern with fallback, "Copied!" micro-interaction
- `src/components/dashboard/QRCodeCard.tsx` — card styling, animation imports, `fadeSlideUp`/`microPress` usage
- `src/lib/animation.ts` — `staggerContainer`, `staggerItem` variants for list stagger

## Inputs

- `src/lib/templates.ts`
- `src/app/(dashboard)/dashboard/promote/page.tsx`
- `src/app/(dashboard)/dashboard/requests/CopyLinkButton.tsx`
- `src/lib/animation.ts`
- `src/components/dashboard/QRCodeCard.tsx`

## Expected Output

- `src/components/dashboard/SwipeFileCard.tsx`
- `src/app/(dashboard)/dashboard/promote/page.tsx`

## Verification

npx tsc --noEmit && npm run build
