# S01 Research: Profile Page ISR + On-Demand Revalidation

**Gathered:** 2026-04-06
**Requirements owned:** PERF-01 (ISR on /[slug]), PERF-07 (revalidate on teacher save)

---

## Summary

The profile page (`src/app/[slug]/page.tsx`) is fully dynamic (284 lines, RSC). ISR is straightforward to add — `generateStaticParams` + `export const revalidate` — but the page currently uses two dynamic APIs that **must** be removed first or ISR caching will never activate:

1. `headers()` — reads User-Agent for bot-detection page-view tracking (lines 163–166)
2. `searchParams` — reads `?preview=true` for the onboarding preview-my-page feature (lines 150, 153, 156, 173)

In Next.js 16.1.6 (App Router, no PPR), accessing either of these in a Server Component opts the entire route out of the Full Route Cache. With PPR disabled, there is no partial caching — the whole page is either statically cached or fully dynamic. Vercel will never emit `x-vercel-cache: HIT` for a page that reads `headers()` or `searchParams`.

Three server actions also call `revalidatePath('/[slug]', 'page')`, which is currently a no-op. Once ISR is live, these activate automatically for on-demand revalidation (PERF-07). A `/api/track-view` endpoint already exists and handles bot filtering — so the page-view tracking migration is a one-liner client component.

**Verdict: Targeted research. The pattern is established in the codebase (`/tutors/[category]`). The main work is removing dynamic APIs from the RSC, wiring `generateStaticParams`, and handling the preview use case cleanly.**

---

## Recommendation

**Build order:**
1. Create `ViewTracker` client component (replaces `headers()` inline tracking)
2. Implement `draftMode()` preview flow (replaces `searchParams` preview check — preserves teacher onboarding UX)
3. Add `generateStaticParams` + `export const revalidate` to profile page
4. Remove dynamic API imports (`headers`, `searchParams`) from page
5. Optionally tighten `revalidatePath` calls in actions to be slug-specific

Steps 1 and 2 are prerequisites — without them, adding ISR in step 3 would silently produce no caching effect (the build would report the route as ISR but Vercel CDN would still bypass cache).

---

## Implementation Landscape

### `src/app/[slug]/page.tsx` (primary file, 284 lines)

**What it does:** Fetches teacher data (with `React.cache()` dedup), runs parallel secondary queries (overrides, reviews, capacity check, session types), renders the full public profile page.

**Dynamic API blockers to remove:**
- Line 3: `import { headers } from 'next/headers'` — remove entirely
- Lines 150, 153, 156: `searchParams` prop + `const { preview } = await searchParams` — remove from page signature
- Lines 163–166: Bot-tracking block using `headersList.get('user-agent')` — replace with `<ViewTracker teacherId={teacher.id} />` client component
- Line 173: `const isPreview = preview === 'true'` — remove; replace with `draftMode().isEnabled`

**Add:**
```ts
export const revalidate = 3600  // 1-hour background revalidation; on-demand overrides this

export async function generateStaticParams() {
  const { data } = await supabaseAdmin
    .from('teachers')
    .select('slug')
    .eq('is_published', true)
  return (data ?? []).map(({ slug }) => ({ slug }))
}
```

**Key constraint:** `generateStaticParams` runs at build time with no cookies context. Must use `supabaseAdmin` (service role), not `createClient()`. The secondary queries in the page body use `createClient()` which works because: (a) at build time, Supabase SSR client falls back to anon key (empty cookie jar), and (b) at ISR render time, full cookies context is available. This is confirmed by `/tutors/[category]/page.tsx` which already uses the same pattern (`createClient()` + `revalidate = 3600` + `generateStaticParams`).

**The `React.cache()` dedup (`getTeacherBySlug`)** is safe to keep — it deduplicates the teacher query between `generateMetadata` and the page component within the same render.

### `src/app/[slug]/ViewTracker.tsx` (NEW client component)

```tsx
'use client'
import { useEffect } from 'react'

export function ViewTracker({ teacherId }: { teacherId: string }) {
  useEffect(() => {
    fetch('/api/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId }),
    }).catch(() => {})  // fire-and-forget, never block render
  }, [teacherId])
  return null
}
```

`/api/track-view/route.ts` already exists and handles bot detection via User-Agent from the server-side request context. The ViewTracker fires after hydration — bots that don't execute JS won't trigger it, but that's actually correct: bot-executed JS would have set `headlesschrome` in the user-agent anyway and `/api/track-view` filters that server-side.

### Preview Mode: `draftMode()` Approach

Next.js 16.1.6 has `draftMode()` available (`next/dist/server/request/draft-mode`). `draftMode().isEnabled` is ISR-compatible: it bypasses Full Route Cache for requests carrying the draft mode cookie, letting unpublished teachers preview their page without polluting the ISR cache.

**New file: `src/app/api/draft/[slug]/route.ts`**
```ts
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

// Secret token to prevent public draft mode activation
// Set DRAFT_MODE_SECRET in env vars

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (token !== process.env.DRAFT_MODE_SECRET) {
    return new Response('Invalid token', { status: 401 })
  }
  ;(await draftMode()).enable()
  redirect(`/${slug}`)
}
```

**`src/app/[slug]/page.tsx` — preview check (replaces searchParams):**
```ts
import { draftMode } from 'next/headers'
// ...
const { isEnabled: isDraftMode } = await draftMode()
if (!teacher.is_published && !isDraftMode) {
  return <DraftPage />
}
```

**`src/components/onboarding/WizardStep3.tsx` (line 173) — change `window.open` URL:**
```ts
// Before:
window.open(`/${slug}?preview=true`, '_blank')
// After:
window.open(`/api/draft/${slug}?token=${process.env.NEXT_PUBLIC_DRAFT_MODE_SECRET}`, '_blank')
```

**Simpler alternative if draftMode is too much churn:** The preview feature is teacher-only (onboarding WizardStep3). An acceptable simplification: teachers who want to preview their unpublished page can toggle `is_published` temporarily, preview it, then unpublish again. This avoids the entire draftMode infrastructure. However, this is UX-degrading and not recommended.

**Recommended approach:** draftMode with a shared secret in env. Low complexity, correct behavior, no ongoing churn.

### `src/actions/profile.ts` — Revalidation

Three revalidatePath calls: lines 63, 85 (both in `updateProfile` and `updatePublishStatus`).

Currently: `revalidatePath('/[slug]', 'page')` — no-op until ISR lands, then revalidates ALL slugs.

**Once ISR is live**, this works correctly as a broad revalidation. For precision (avoiding unnecessary CDN misses for other teachers), optionally refine to slug-specific:
```ts
// At end of updateProfile — after the DB update succeeds:
const { data: teacher } = await supabase
  .from('teachers')
  .select('slug')
  .eq('user_id', userId)
  .single()
if (teacher?.slug) revalidatePath(`/${teacher.slug}`)
else revalidatePath('/[slug]', 'page')  // fallback
```
`updateTag('teacher-${userId}')` is already called — this invalidates the `unstable_cache` for the teacher row.

### `src/actions/bookings.ts` — Revalidation  

Line 65: `revalidatePath('/[slug]', 'page')` in `submitBookingRequest`.

When a booking is submitted, the teacher's capacity count changes. The slug is derivable from `parsed.data.teacherId`:
```ts
const { data: t } = await supabaseAdmin.from('teachers').select('slug').eq('id', parsed.data.teacherId).single()
if (t?.slug) revalidatePath(`/${t.slug}`)
else revalidatePath('/[slug]', 'page')
```
Note: `supabaseAdmin` is already imported via dynamic import in this function.

### `src/actions/availability.ts` — Revalidation

Lines 84, 156, 190: `revalidatePath('/[slug]', 'page')`.

The actions have `userId` available via `getClaims()`. Can add slug lookup:
```ts
const { data: t } = await supabase.from('teachers').select('slug').eq('user_id', userId).single()
if (t?.slug) revalidatePath(`/${t.slug}`)
```
This requires changing `getTeacherId()` helper to return `{ id, slug }` — a minor refactor. **Low priority:** the broad `revalidatePath('/[slug]', 'page')` already works correctly; slug precision is a nice-to-have.

### Middleware (`src/proxy.ts`)

The middleware matches all routes including `/[slug]` and calls `getSession()`. For **unauthenticated** visitors (the typical public profile visitor), no Supabase session exists, so `getSession()` returns no session and no `Set-Cookie` header is added. Vercel CDN caches responses without `Set-Cookie` headers. **No change needed.**

For authenticated requests (teachers viewing their own profile), cookies ARE set — those requests bypass CDN cache. This is correct: the ISR cache is for public anonymous visitors.

### OG Image (`src/app/[slug]/opengraph-image.tsx`)

Uses `export const runtime = 'edge'` and a public anon Supabase client. No changes needed — OG images have their own caching (not affected by the page's ISR config).

### `next.config.ts`

No changes needed. The Supabase storage domain is already in `remotePatterns` for `next/image`. Node.js runtime is used throughout (edge was removed after hitting Hobby 1MB limit — no change here).

---

## Environment Variables Required

If implementing draftMode:
- `DRAFT_MODE_SECRET` (server-only) — random string, gates the `/api/draft/[slug]` enable endpoint
- `NEXT_PUBLIC_DRAFT_MODE_SECRET` (client-accessible) — same value, used in WizardStep3 to construct the preview URL

Note: `NEXT_PUBLIC_DRAFT_MODE_SECRET` being public is acceptable because the preview endpoint only shows unpublished teacher pages (which display "Page not available" to unauthenticated visitors anyway). The secret just prevents random people from enabling draft mode. At current scale this is sufficient; a signed JWT per-session would be more robust.

---

## Verification Commands

```bash
# Build output should show /[slug] as ISR (○ Static or ◐ ISR), not ƒ Dynamic
npm run build

# After deploy: curl to check CDN cache header
curl -I https://tutelo.app/[some-published-slug]
# Expect: x-vercel-cache: HIT (second request after warmup)

# Local verification (ISR timing doesn't apply locally, but build output shows route type):
npm run build 2>&1 | grep '\[slug\]'
```

**Integration proof (PERF-07):**
1. Teacher saves profile change in dashboard
2. Wait ~2 seconds for revalidation
3. Visit `/[teacher-slug]` — should show updated content, not stale cache

---

## Risks & Gotchas

1. **`generateStaticParams` + `createClient()` in page body**: Confirmed safe. At build time, `createClient()` operates as an anon Supabase client (no cookies). Public teacher data is readable via RLS. Established by the existing `/tutors/[category]` page which uses the same pattern.

2. **`headers()` removal breaks bot tracking**: Mitigated by `ViewTracker` client component. Bots that don't execute JS won't fire the tracker — but the `/api/track-view` endpoint's own server-side bot filter handles JS-capable bots correctly.

3. **`draftMode()` token leaking**: `NEXT_PUBLIC_DRAFT_MODE_SECRET` is visible in client JS. Acceptable for the preview use case (unpublished pages show "Page not available" to non-draft-mode visitors regardless). Can be improved with per-session signed tokens later.

4. **ISR + booking calendar slot freshness**: `BookingCalendar` is a `'use client'` component that fetches live slot availability client-side. The ISR-cached HTML contains the static shell (teacher info, session types, UI structure). Live booking slots are NOT baked into the cache — they hydrate fresh on the client. ✓ No correctness risk.

5. **Broad revalidatePath('/[slug]', 'page') scope**: Already correct behavior — marks all teacher profile pages stale. On-demand ISR means each page only re-renders when next visited. The 1,000/day ISR write limit applies to actual re-renders, not the revalidate call itself. At current scale, well within limits.

6. **Middleware runs on /[slug]**: No `Set-Cookie` for anonymous visitors (no Supabase session to refresh). CDN caching is unaffected. Verified by reading the proxy implementation.

---

## Files Changed (Complete List)

| File | Action | Purpose |
|------|--------|---------|
| `src/app/[slug]/page.tsx` | Modify | Add ISR config, remove dynamic APIs, add ViewTracker |
| `src/app/[slug]/ViewTracker.tsx` | Create | Client component for fire-and-forget page view tracking |
| `src/app/api/draft/[slug]/route.ts` | Create | Enable draftMode and redirect (for preview feature) |
| `src/actions/profile.ts` | Modify | Tighten revalidatePath to slug-specific (optional) |
| `src/actions/bookings.ts` | Modify | Tighten revalidatePath to slug-specific (optional) |
| `src/actions/availability.ts` | Modify | Tighten revalidatePath to slug-specific (optional) |
| `src/components/onboarding/WizardStep3.tsx` | Modify | Update preview URL to use draftMode endpoint |
| `.env.local` / Vercel env | Update | Add DRAFT_MODE_SECRET + NEXT_PUBLIC_DRAFT_MODE_SECRET |

---

## Skills Discovered

No new skills installed. This work uses established Next.js ISR patterns already present in the codebase (`/tutors/[category]` as reference implementation) and the existing Supabase admin client pattern from `auth-cache.ts`.
