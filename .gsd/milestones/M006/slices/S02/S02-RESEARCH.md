# S02: Copy-Paste Swipe File — Research

**Slice:** M006/S02
**Requirements owned:** SWIPE-01, SWIPE-02

---

## Summary

This is a light implementation slice. Every pattern it needs already exists in the codebase. No new libraries, no new infrastructure, no risky integration. The work is: (1) create `src/lib/templates.ts` with template definitions and interpolation logic, (2) create `src/components/dashboard/SwipeFileCard.tsx` with copy-to-clipboard and the "Copied!" micro-interaction, (3) add a `SwipeFile` section to the existing promote page.

---

## Implementation Landscape

### Existing Promote Page — S01 Output

`src/app/(dashboard)/dashboard/promote/page.tsx` is the RSC shell built in S01. It already:
- Fetches `slug, full_name, subjects, hourly_rate` from `teachers` via `supabase.auth.getUser()`
- Renders `QRCodeCard` and `FlyerPreview`
- Follows the `getUser() → .from('teachers').select(...).eq('user_id', ...).maybeSingle() → redirect` auth pattern (KNOWLEDGE: "Auth Pattern: getUser() not getClaims()")

**Action needed:** Expand the `.select()` to include additional fields for template interpolation (`city`, `state`, `social_email`, `social_website`, `social_instagram`). Then import and render `SwipeFile` below the flyer section.

### Copy-to-Clipboard Pattern

`src/app/(dashboard)/dashboard/requests/CopyLinkButton.tsx` is the canonical reference:
- `'use client'`
- `navigator.clipboard.writeText(text)` in a try/catch with `document.execCommand('copy')` fallback
- `useState(false)` for copied state, `setTimeout(() => setCopied(false), 2000)` reset
- Renders `<Check className="h-4 w-4 text-green-600" />` + "Copied!" when true, `<Copy className="h-4 w-4" />` + label when false
- Inline button with `hover:bg-muted transition-colors`

The `SwipeFileCard` copy button is structurally identical to `CopyLinkButton` but copies multi-line template text instead of a URL.

### Animation Pattern

`QRCodeCard` and `FlyerPreview` both use:
```ts
import * as m from 'motion/react-client'
import { fadeSlideUp, microPress } from '@/lib/animation'
// ...
<m.div {...fadeSlideUp}>...</m.div>
<m.button {...microPress}>...</m.button>
```
`SwipeFileCard` should follow the same pattern. KNOWLEDGE guidelines specify micro-interactions (like "Copied!" sliding up) for action confirmation — the `microPress` spring on the button satisfies this; the state-swap from Copy → Check is the visual confirmation. No extra animation needed.

### Teacher Data Shape

Relevant fields from the `teachers` table for template interpolation:

| Field | Type | Notes |
|---|---|---|
| `slug` | `TEXT` | Used for profile URL |
| `full_name` | `TEXT NOT NULL` | Always present |
| `subjects` | `TEXT[]` | May be empty `[]` |
| `hourly_rate` | `NUMERIC(10,2)` | May be null |
| `city` | `TEXT` | May be null |
| `state` | `CHAR(2)` | May be null |
| `social_email` | `TEXT` | May be null |
| `social_website` | `TEXT` | May be null |
| `social_instagram` | `TEXT` | May be null |

Template interpolation must handle nulls gracefully — omit optional fields rather than rendering "null" or "undefined" in the template text.

### Template File — `src/lib/templates.ts`

This is a pure TS module (no React, no server dependencies). It should export:
1. A `TeacherTemplateData` type containing the subset of teacher fields needed
2. A `Template` type: `{ id: string; label: string; description: string; render: (data: TeacherTemplateData) => string }`
3. A `TEMPLATES: Template[]` array with 4+ entries
4. A utility `interpolate(template: Template, data: TeacherTemplateData): string` (or just call `template.render(data)` directly)

This module is pure logic — easy to unit test with Vitest following the pattern in `tests/unit/og-metadata.test.ts`.

**4 required templates (SWIPE-01):**

1. **Email Signature** — Multi-line block: name, subjects, "Book a session" link, optional location/rate. Suitable for pasting into Gmail/Outlook signature editor.
2. **Newsletter Blurb** — 2-3 sentence parent newsletter paragraph. Introduces the teacher's tutoring availability, subjects, and booking link.
3. **Social Post** — Short, punchy post (fits Twitter/X, Facebook, LinkedIn). Name, subjects, CTA, URL with hashtags.
4. **Back-to-School Handout** — Formal short paragraph for a paper handout given to parents at back-to-school night.

Each template should handle the optional fields gracefully: if `hourly_rate` is null, omit the rate line; if no `city`/`state`, omit location; if no `social_email`, omit from email sig.

### SwipeFileCard Component

`src/components/dashboard/SwipeFileCard.tsx` — client component. Receives a `Template` and `TeacherTemplateData`, renders:
- Card with template label and description header
- Scrollable/preformatted text area showing the interpolated template text (read-only `<textarea>` or `<pre>`)
- Copy button using the CopyLinkButton pattern

The section container in the promote page (or a dedicated `SwipeFile` wrapper component) can render a heading + a list of `SwipeFileCard`s staggered with `staggerContainer`/`staggerItem` from `@/lib/animation`.

### Promote Page Update

`src/app/(dashboard)/dashboard/promote/page.tsx` needs:
1. Expanded select: add `city, state, social_email, social_website, social_instagram` to the `.select()` call
2. Build a `TeacherTemplateData` object from the fetched teacher row
3. Import and render a `SwipeFile` section (or render `SwipeFileCard` directly) below `FlyerPreview`

### Test Coverage

The template interpolation logic in `src/lib/templates.ts` is the only new pure-logic module and should have a Vitest unit test at `tests/unit/templates.test.ts`. Tests should cover:
- Each template renders without throwing when all fields are present
- Each template omits optional fields when null (no "null", "undefined" strings in output)
- Subjects array renders correctly: multiple subjects, single subject, empty array
- Profile URL is correctly constructed as `https://tutelo.app/{slug}`

No test needed for `SwipeFileCard.tsx` itself (UI component with clipboard — difficult to test without a browser environment and not the project's current test pattern).

---

## Task Decomposition Recommendation

Two tasks:

**T01 — Template logic + unit tests**
- Create `src/lib/templates.ts` with `TeacherTemplateData` type, `Template` type, 4 template definitions, and `TEMPLATES` array
- Write `tests/unit/templates.test.ts` covering interpolation edge cases
- Verify: `npx vitest run tests/unit/templates.test.ts` passes; `npx tsc --noEmit` exits 0

**T02 — SwipeFileCard component + promote page integration**
- Create `src/components/dashboard/SwipeFileCard.tsx` (client component, copy button pattern from CopyLinkButton)
- Update `src/app/(dashboard)/dashboard/promote/page.tsx` to expand select and render swipe file section
- Verify: `npx tsc --noEmit` exits 0; `npm run build` exits 0; promote page renders all 4 templates; copy button changes to "Copied!" and resets after 2s

---

## Constraints

- No new npm packages needed — everything is web standard (`navigator.clipboard`) or already in the project
- Dashboard font size cap: 24px max (KNOWLEDGE typography rule)
- 4pt spacing grid (KNOWLEDGE layout rule)
- Template text area should be readable but compact — use `text-sm` consistent with other dashboard UI
- `SwipeFileCard` must implement all four button states (KNOWLEDGE affordance rule): default, hover, active/press via `microPress`, disabled (N/A here since copy always works)
