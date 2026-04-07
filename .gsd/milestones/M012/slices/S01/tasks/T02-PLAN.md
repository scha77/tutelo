---
estimated_steps: 5
estimated_files: 1
skills_used:
  - react-best-practices
---

# T02: Convert profile page to ISR — remove dynamic APIs, add generateStaticParams

**Slice:** S01 — Profile Page ISR + On-Demand Revalidation
**Milestone:** M012

## Description

This is the core task that delivers PERF-01. Convert `src/app/[slug]/page.tsx` from a fully dynamic page to an ISR-cached page by:
1. Removing the two dynamic API blockers (`headers()` and `searchParams`)
2. Adding `generateStaticParams` to pre-render published teacher profiles at build time
3. Adding `export const revalidate = 3600` for time-based background revalidation
4. Wiring in the ViewTracker client component (created in T01) for page-view tracking
5. Using `draftMode()` (from `next/headers`) for the preview check instead of `searchParams`

**Critical context for executor:**

The page currently uses two dynamic Next.js APIs that opt it out of the Full Route Cache:
- `headers()` (line 3) — used for bot-detection in page-view tracking
- `searchParams` (page component prop) — used for `?preview=true` preview mode

Both must be removed for ISR to activate. With PPR disabled (this project doesn't use PPR), any dynamic API access in the Server Component makes the ENTIRE route dynamic.

**Reference implementation:** `src/app/tutors/[category]/page.tsx` already uses the exact ISR pattern needed:
```
export const revalidate = 3600
export async function generateStaticParams() { ... }
```
Follow the same pattern.

**`generateStaticParams` must use `supabaseAdmin`** (service role client from `src/lib/supabase/service.ts`) because it runs at build time with no cookies/session context. The existing `createClient()` calls in the page body are fine — at build time they fall back to anon key; at ISR render time they get full context.

**ViewTracker placement:** Replace the inline bot-tracking block (the `headers()` + `isBot` + `supabaseAdmin.insert` block around lines 163-166) with `<ViewTracker teacherId={teacher.id} />` in the JSX return, placed just before the closing `</main>` tag.

**draftMode replacement:** Replace `const isPreview = preview === 'true'` with:
```ts
const { isEnabled: isDraftMode } = await draftMode()
```
Then use `isDraftMode` in the unpublished check: `if (!teacher.is_published && !isDraftMode) return <DraftPage />`

**Import changes:**
- REMOVE: `import { headers } from 'next/headers'` — replaced entirely
- REMOVE: `import { isBot } from '@/lib/utils/bot-filter'` — no longer needed in page
- ADD: `import { draftMode } from 'next/headers'` — for preview check
- ADD: `import { ViewTracker } from './ViewTracker'` — for page view tracking
- KEEP: `import { supabaseAdmin } from '@/lib/supabase/service'` — still needed for `generateStaticParams`

## Steps

1. **Update imports** in `src/app/[slug]/page.tsx`:
   - Remove `import { headers } from 'next/headers'`
   - Remove `import { isBot } from '@/lib/utils/bot-filter'`
   - Add `import { draftMode } from 'next/headers'`
   - Add `import { ViewTracker } from './ViewTracker'`
   - Keep `supabaseAdmin` import (needed for `generateStaticParams`)

2. **Add ISR configuration** after the imports / before `getTeacherBySlug`:
   ```ts
   // ISR: revalidate cached pages every hour; on-demand revalidation overrides this
   export const revalidate = 3600

   export async function generateStaticParams() {
     const { data } = await supabaseAdmin
       .from('teachers')
       .select('slug')
       .eq('is_published', true)
     return (data ?? []).map(({ slug }) => ({ slug }))
   }
   ```

3. **Modify the page component signature** — remove `searchParams`:
   - Change from: `{ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> }`
   - Change to: `{ params }: { params: Promise<{ slug: string }> }`

4. **Replace dynamic API usage in the component body:**
   - Remove `const { preview } = await searchParams`
   - Remove the entire bot-tracking block (the `headersList` / `userAgent` / `isBot` / `supabaseAdmin.insert` block)
   - Add `const { isEnabled: isDraftMode } = await draftMode()` after the `if (!teacher) return notFound()` check
   - Change `if (!teacher.is_published && !isPreview)` to `if (!teacher.is_published && !isDraftMode)`

5. **Wire ViewTracker into JSX** — add `<ViewTracker teacherId={teacher.id} />` just before the closing `</main>` tag in the return statement.

## Must-Haves

- [ ] `headers()` import completely removed from page
- [ ] `searchParams` prop completely removed from page component signature
- [ ] `export const revalidate = 3600` present
- [ ] `generateStaticParams` function present, queries `supabaseAdmin` for published teacher slugs
- [ ] `draftMode()` used for preview check instead of searchParams
- [ ] `<ViewTracker teacherId={teacher.id} />` rendered in JSX
- [ ] `npm run build` shows `/[slug]` as ISR, not Dynamic
- [ ] No TypeScript errors

## Verification

- `npm run build 2>&1 | grep '\[slug\]'` — must show ○ or ◐ (ISR), NOT ƒ (Dynamic)
- `grep -q 'generateStaticParams' src/app/[slug]/page.tsx` — function exists
- `grep -q "export const revalidate" src/app/[slug]/page.tsx` — config exists
- `! grep -q "from 'next/headers'" src/app/[slug]/page.tsx || grep -q "draftMode" src/app/[slug]/page.tsx` — only draftMode imported from next/headers, not headers()
- `! grep -q "searchParams" src/app/[slug]/page.tsx` — searchParams completely removed
- `npx tsc --noEmit` — no type errors

## Inputs

- `src/app/[slug]/page.tsx` — the existing dynamic page to convert (284 lines)
- `src/app/[slug]/ViewTracker.tsx` — the client component created in T01 (must exist before this task)
- `src/lib/supabase/service.ts` — supabaseAdmin used in generateStaticParams
- `src/app/tutors/[category]/page.tsx` — reference implementation for ISR pattern (lines 9, 37)

## Expected Output

- `src/app/[slug]/page.tsx` — converted to ISR with generateStaticParams, revalidate config, ViewTracker, and draftMode
