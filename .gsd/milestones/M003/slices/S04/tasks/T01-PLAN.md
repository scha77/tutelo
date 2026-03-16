---
estimated_steps: 5
estimated_files: 2
---

# T01: Add dynamic OG metadata and image route to teacher /[slug] pages

**Slice:** S04 — OG Tags, Email Fix & Deploy
**Milestone:** M003

## Description

Add personalized Open Graph metadata to teacher profile pages so that when a teacher shares their `tutelo.app/[slug]` link on social media, email, or newsletters, the preview shows their name, photo, subjects, and location instead of generic Tutelo branding. This requires two additions: a `generateMetadata()` export in the existing page.tsx and a new `opengraph-image.tsx` file-based OG image route.

## Steps

1. Add `generateMetadata()` export to `src/app/[slug]/page.tsx`:
   - Use the same async `params: Promise<{ slug: string }>` pattern as the page component
   - Query Supabase for teacher by slug (select: `full_name`, `subjects`, `school`, `city`, `state`, `photo_url`)
   - Return personalized `title`, `description`, and `openGraph` object with `type: 'profile'`
   - For not-found slugs, return generic Tutelo fallback metadata (title: "Tutelo", description: default)
   - Do NOT set `openGraph.images` manually — the file-based `opengraph-image.tsx` handles this automatically

2. Create `src/app/[slug]/opengraph-image.tsx`:
   - Export `runtime = 'edge'`, `alt`, `size` (1200×630), and `contentType = 'image/png'`
   - Default export is an async function receiving `{ params }` (check Next.js 16 signature — may be `{ params: Promise<{ slug: string }> }` or plain object for file-based routes)
   - Create an anonymous Supabase client using `createClient()` from `@supabase/supabase-js` directly (NOT `server.ts` which uses `cookies()` — unavailable on edge)
   - Query teacher: `full_name`, `photo_url`, `subjects`, `school`, `city`, `state`
   - Render a styled card using JSX in `ImageResponse`:
     - Background: brand primary `#3b4d3e` or gradient
     - Teacher name prominently displayed
     - If `photo_url` exists, fetch the image and render it; if null, render a colored circle with initials
     - Subjects listed as pills/tags
     - Location (city, state) if available
     - Tutelo logo/branding in corner
   - For not-found slugs, render a generic Tutelo branded card
   - Load Inter font via Google Fonts fetch for consistent typography

3. Handle the photo_url edge case:
   - `photo_url` can be null — use initials fallback (first letter of first + last name)
   - `photo_url` is a public Supabase storage URL — directly fetchable from edge runtime
   - Use `<img>` tag in ImageResponse JSX (not `next/image`)

4. Verify `metadataBase` in `src/app/layout.tsx` is already set to `https://tutelo.app` — confirm the OG image URL will resolve correctly as a relative path

5. Run `npm run build` to verify no TypeScript errors or build failures from the new exports

## Must-Haves

- [ ] `generateMetadata()` returns personalized title/description for valid teacher slugs
- [ ] `generateMetadata()` returns generic Tutelo fallback for invalid slugs (no error/crash)
- [ ] `opengraph-image.tsx` generates a PNG image with teacher name and subjects
- [ ] OG image gracefully handles missing `photo_url` (initials fallback)
- [ ] Edge runtime compatibility — no `cookies()` or Node.js-only APIs in OG image route
- [ ] `npm run build` passes

## Verification

- `npm run build` succeeds with no errors
- Start dev server, `curl -s http://localhost:3000/[valid-slug]` and grep for `og:title` containing teacher name
- `curl -I http://localhost:3000/[valid-slug]/opengraph-image` returns `content-type: image/png` with 200 status
- Visit `/[valid-slug]/opengraph-image` in browser and visually confirm the card renders correctly

## Observability Impact

- Signals added/changed: OG image route returns HTTP 200 with `content-type: image/png` for valid slugs; generic fallback card for invalid slugs (no 500s)
- How a future agent inspects this: `curl -I https://tutelo.app/[slug]/opengraph-image` to check status and content type; view page source for `og:title` / `og:description` meta tags
- Failure state exposed: Build error if TypeScript types are wrong; 500 response on OG image route if Supabase query fails (visible in Vercel function logs)

## Inputs

- `src/app/[slug]/page.tsx` — existing teacher profile page with async params pattern and Supabase query
- `src/app/layout.tsx` — `metadataBase: new URL("https://tutelo.app")` already set
- `src/lib/supabase/client.ts` — browser client pattern (reference for edge-safe client creation)
- S04-RESEARCH.md — constraints on edge runtime, params signature, photo_url handling

## Expected Output

- `src/app/[slug]/page.tsx` — updated with `generateMetadata()` export returning personalized OG tags
- `src/app/[slug]/opengraph-image.tsx` — new file generating styled OG image cards per teacher
