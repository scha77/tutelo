# S04: OG Tags, Email Fix & Deploy — Research

**Date:** 2026-03-11

## Summary

S04 has three requirements: SEO-01 (dynamic OG tags on teacher `/[slug]` pages), FIX-01 (auto-populate `social_email` from signup email), and a production deploy. None of these require new dependencies — Next.js 16.1.6 already ships `ImageResponse` via `next/og`, `getUser()` on the existing Supabase client returns the auth email, and the Vercel CLI is installed at `/opt/homebrew/bin/vercel` with `.vercel/project.json` already linked to the project (`prj_EuJH57II811P2XO6WHMMZet2kQCq`).

For SEO-01, the cleanest approach is two file additions to `src/app/[slug]/`: a `generateMetadata()` export in the existing `page.tsx` and a new `opengraph-image.tsx` file that returns `ImageResponse`. The `generateMetadata()` export handles text OG tags (title, description, twitter:card), while `opengraph-image.tsx` generates the visual card with teacher name, photo, and subjects. The teacher's `photo_url` is a public Supabase storage URL (via `getPublicUrl()`) and is directly fetchable from Next.js's edge runtime — no signed-URL handling needed. The `metadataBase: new URL("https://tutelo.app")` is already set in `src/app/layout.tsx`, so relative OG image URLs resolve correctly.

For FIX-01, the fix belongs in `src/actions/onboarding.ts` inside `saveWizardStep`'s first-INSERT branch (when `existing === null`). The existing `getAuthUserId()` helper in that file uses `getClaims()` which only returns the JWT sub. The fix adds a `supabase.auth.getUser()` call at that point to retrieve `data.user.email` and includes `social_email: email` in the INSERT. This covers both email/password signup and Google OAuth flows because `getUser()` always returns the verified email from Supabase Auth regardless of provider. The teacher can later override it in Page Settings.

## Recommendation

**For SEO-01:** Use two-file approach in `src/app/[slug]/`:
1. Add `generateMetadata()` export to existing `page.tsx` — reuses the same `createClient()` + Supabase query pattern already in `TeacherProfilePage`. For a not-found slug, return generic Tutelo metadata as the fallback.
2. Add `opengraph-image.tsx` — file-based OG image route using `ImageResponse`. This runs on the edge runtime. Fetch teacher data with a lightweight Supabase query (name, photo_url, subjects, school, city, state). Render a styled card. Fall back gracefully if teacher not found.

**For FIX-01:** Patch `saveWizardStep` in `src/actions/onboarding.ts` — in the `!existing` branch, call `supabase.auth.getUser()` and add `social_email: userData.user?.email ?? null` to the INSERT. Do not overwrite if the field is already provided in `data`.

**For deploy:** Run `vercel deploy --prod` from the project root after build verification. Vercel CLI is installed. Project is already linked. Auth token will be needed (`vercel login` or `VERCEL_TOKEN` env var).

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| OG image generation | `ImageResponse` from `next/og` (bundled in Next.js 16) | No extra dependency; satori is compiled in; works on edge runtime |
| Dynamic OG metadata | `generateMetadata()` Next.js export | Official API; integrates with `metadataBase`; supports async data fetching |
| Auth email retrieval | `supabase.auth.getUser()` | Returns verified `User` object with `.email`; works for both email/password and OAuth providers |

## Existing Code and Patterns

- `src/app/[slug]/page.tsx` — RSC with `params: Promise<{ slug: string }>` pattern. `generateMetadata()` must use the same async params shape. Both functions will call `createClient()` + the same Supabase query; Next.js deduplicates `fetch()` calls within the same render cycle so there is no double-fetch penalty.
- `src/app/layout.tsx` — Sets `metadataBase: new URL("https://tutelo.app")`. This means relative URLs in `openGraph.images` resolve to `https://tutelo.app/...` automatically. No need to hardcode the full URL in `generateMetadata()`.
- `src/actions/onboarding.ts` — `saveWizardStep()` with `getAuthUserId()` helper using `getClaims()`. The first-INSERT branch is the exact insertion point for FIX-01. `getUser()` should replace the `getClaims()` call there for reliability (same pattern used in dashboard layout and API routes).
- `src/lib/supabase/server.ts` — `createClient()` uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (post-Nov 2025 pattern). All server actions and RSCs use this.
- `src/lib/supabase/service.ts` — `supabaseAdmin` for server-side calls without user session. Not needed for FIX-01 (called from within user's authenticated session) but available if needed.
- `src/components/profile/HeroSection.tsx` — Shows the `photo_url` pattern. Photo is stored as a public Supabase storage URL (`https://gonbqvhcxspjmxtfsfci.supabase.co/storage/v1/object/public/profile-images/...`).
- `src/app/page.tsx` — Shows existing `openGraph` metadata shape used for the landing page. The teacher OG metadata should follow the same structure.
- `.vercel/project.json` — Already linked: `projectId: prj_EuJH57II811P2XO6WHMMZet2kQCq`, `orgId: team_crPM0lD4yotbGfZXoJsDcmBr`. Deploy command: `vercel deploy --prod`.

## Constraints

- `params` in `generateMetadata()` must match the Next.js 16 async params shape: `{ params: Promise<{ slug: string }> }`.
- `opengraph-image.tsx` runs on the edge runtime. Do **not** use Node.js-only APIs. The Supabase JS client works on edge when using `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (no cookie handling needed — OG routes are not authenticated).
- `opengraph-image.tsx` cannot use `createClient()` from `src/lib/supabase/server.ts` (that file uses `next/headers` / `cookies()` which is not available on edge). Use `createClient()` from `src/lib/supabase/client.ts` or create an anonymous Supabase client inline.
- `next/image` is **not** available inside `ImageResponse`. Use a `<img>` tag or fetch the image buffer directly.
- Teacher `photo_url` can be `null` — the OG image must have a graceful fallback (e.g., colored circle with initials or the Tutelo logo).
- The `social_email` column on `teachers` is `TEXT` nullable — the INSERT in `saveWizardStep` should only set it if not already provided in `data` (avoids overwriting an explicitly provided value).
- Vercel CLI requires authentication: `vercel login` or `VERCEL_TOKEN` env var. Ensure Vercel has all required env vars (`SUPABASE_SERVICE_SECRET_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `CRON_SECRET`) set in the project.
- `next.config.ts` currently has no `images.remotePatterns`. If the OG image route uses `<img src={teacher.photo_url}>` inside `ImageResponse`, no config change is needed (edge fetch, not `next/image`). If we use `next/image` anywhere else with Supabase URLs, add `gonbqvhcxspjmxtfsfci.supabase.co` to `remotePatterns`.

## Common Pitfalls

- **Calling `createClient()` from `server.ts` in `opengraph-image.tsx`** — This will fail because `cookies()` from `next/headers` is not available in the edge runtime (OG image routes run on edge). Use the browser Supabase client instead: `createBrowserClient(url, key)` from `@supabase/ssr`, or a simple `createClient(url, key)` from `@supabase/supabase-js` directly for an anonymous read query.
- **Double-fetching teacher data** — `generateMetadata()` and the page component both query the same teacher row. Next.js 16 deduplicates `fetch()` calls within a single request, but Supabase JS uses its own fetch. Keep both queries light (select only what each function needs) and don't worry about caching — they run in the same request lifecycle.
- **`params` type mismatch** — In Next.js 16, both `generateMetadata` and the page component receive `params` as `Promise<{ slug: string }>`. Must `await params` in both. Forgetting to make `generateMetadata` async or forgetting `await` will cause a runtime error.
- **`opengraph-image.tsx` not picking up teacher name** — The file exports a default function that receives `params` as a plain object (not a Promise) when using the file-based OG convention. Verify the exact signature in Next.js 16 docs before coding.
- **`social_email` not auto-populating for Google OAuth** — The fix must work for OAuth too. `saveWizardStep` is called during onboarding regardless of auth method. Using `supabase.auth.getUser()` (API call) inside the server action will correctly return the user's Google email. `getClaims()` (JWT-only) also includes email in the claims, but `getUser()` is more reliable and consistent with the rest of the codebase pattern.
- **OG image caching on social platforms** — After deployment, cached OG previews on LinkedIn/Twitter may not update immediately. This is expected behavior, not a bug.
- **Vercel env var drift** — Local `.env.local` has all secrets. Verify that Vercel project settings have all the same keys before deploying. Missing `RESEND_API_KEY` or `STRIPE_*` secrets will cause runtime errors even if the build succeeds.

## Open Risks

- **Edge runtime + Supabase client**: The `@supabase/supabase-js` client does work in edge/workers contexts for simple unauthenticated queries. Risk is low since we're doing a public SELECT with no RLS user context needed (teachers are publicly readable per `teachers_public_read` policy).
- **OG image font rendering**: `ImageResponse` uses satori which requires explicit font loading via `fetch()`. The default system font may look poor. Consider fetching a Google Font (e.g., Inter) to match app typography. This adds ~10ms latency to OG image generation but is acceptable since OG images are generated on-demand and cached by the CDN.
- **Vercel cold start for OG image route**: First OG image request after a cold deploy may be slow. Edge runtime cold starts are typically <100ms — acceptable for social preview generation.
- **`photo_url` pointing to a deleted/expired image**: Supabase storage public URLs are permanent (no expiry) as long as the bucket exists. Risk is negligible.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Next.js | Built-in (Next.js is project-primary tech) | installed |
| Supabase | Built-in (project uses Supabase throughout) | installed |
| Vercel | No GSD skill needed — CLI deploy is one command | none needed |

## Sources

- `src/app/[slug]/page.tsx` — teacher data query pattern and async params shape for Next.js 16
- `src/actions/onboarding.ts` — `saveWizardStep` first-INSERT branch for FIX-01 injection point
- `src/lib/supabase/server.ts` vs `src/lib/supabase/service.ts` — correct client for each context
- `src/app/layout.tsx` — `metadataBase` already configured for `https://tutelo.app`
- `node_modules/next/dist/server/og/image-response.js` — confirms `ImageResponse` is bundled in Next.js 16.1.6
- `.vercel/project.json` — project already linked to Vercel; deploy is `vercel deploy --prod`
- `supabase/migrations/0001_initial_schema.sql` — `social_email TEXT` is nullable; `teachers_public_read` policy allows anonymous SELECT
