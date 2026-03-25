# S03 Research: OG Image Platform Verification

**Requirement:** OG-01 — OG image renders correctly across major platforms  
**Calibration:** Targeted research — known technology (Next.js opengraph-image.tsx, OG meta spec), infrastructure already exists, main work is verification + fixing known gaps.

---

## Summary

The OG infrastructure from M003 is production-ready: `opengraph-image.tsx` generates a 1200×630 PNG at edge runtime with teacher photo, name, subjects, school, location, and Tutelo branding. `generateMetadata()` in `[slug]/page.tsx` sets `openGraph` and `twitter` metadata. `metadataBase` is hardcoded to `https://tutelo.app` in `layout.tsx`.

The slice has **two real code gaps** and **one verification task**:

1. **`generateMetadata` missing `openGraph.url` and `openGraph.images`** — Next.js auto-injects the OG image from `opengraph-image.tsx`, but `openGraph.url` is never set, so `og:url` is absent from the rendered `<head>`. Facebook's scraper uses `og:url` for deduplication/caching; missing it can cause stale or duplicate previews.

2. **`twitter` metadata missing `images`** — Next.js auto-injects `twitter:image` from `opengraph-image.tsx` as well, but the `twitter` block in `generateMetadata` sets `card`, `title`, `description` explicitly without `images`. According to Next.js behavior (verified from source 3-27), when `opengraph-image.tsx` exists the image is auto-injected into BOTH `og:image` and `twitter:image` meta tags. This appears to be working correctly by convention, but explicitly setting `twitter.images` is safer for X.com/iMessage fallback paths.

3. **Platform verification** — Facebook Sharing Debugger, WhatsApp link preview, iMessage unfurl, and optionally Slack/Discord. No code can substitute for this; it must be done manually or via a headless scrape of the rendered `<head>`.

The existing unit test (`tests/unit/og-metadata.test.ts`, 4 tests passing) covers `generateMetadata` output but does not test the `opengraph-image.tsx` render function or the final assembled `<head>` tags.

---

## Recommendation

**Two code changes + one verification pass:**

1. Add `openGraph.url` (the canonical profile URL) and explicitly reference `openGraph.images` to `generateMetadata` in `src/app/[slug]/page.tsx`.
2. Add explicit `twitter.images` to the `twitter` block.
3. Run the Facebook Sharing Debugger against a live tutelo.app slug and document the result. Optionally test WhatsApp (paste link in chat) and iMessage.

No new files, no new routes, no new dependencies. The existing `opengraph-image.tsx` does not need changes — 1200×630 PNG at edge runtime is the correct approach for all target platforms.

---

## Implementation Landscape

### Files involved

| File | Role | Change needed |
|---|---|---|
| `src/app/[slug]/page.tsx` | `generateMetadata()` — emits OG meta tags | Add `openGraph.url`, add explicit `openGraph.images` reference (or confirm auto-injection is sufficient), add `twitter.images` |
| `src/app/[slug]/opengraph-image.tsx` | Image generation — edge runtime | No changes needed |
| `src/app/layout.tsx` | `metadataBase: new URL("https://tutelo.app")` | No changes needed |
| `tests/unit/og-metadata.test.ts` | 4 passing tests for `generateMetadata` | Extend with assertions for `og:url`, `twitter.images` |

### What Next.js auto-injects from `opengraph-image.tsx`

When `opengraph-image.tsx` exists alongside `page.tsx`, Next.js automatically adds:
```html
<meta property="og:image" content="https://tutelo.app/[slug]/opengraph-image" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:image" content="https://tutelo.app/[slug]/opengraph-image" />
<meta name="twitter:image:type" content="image/png" />
<meta name="twitter:image:width" content="1200" />
<meta name="twitter:image:height" content="630" />
```

These are merged with `generateMetadata()` output. The `opengraph-image.tsx` image URL includes a cache-busting hash suffix in production (e.g., `opengraph-image?abc123`). This is standard Next.js behavior — no action needed.

### What's currently missing from `generateMetadata`

The current `openGraph` block:
```ts
openGraph: {
  title,
  description,
  type: 'profile',
}
```

Missing:
- `url: \`https://tutelo.app/\${slug}\`` — Facebook uses `og:url` as the canonical key for its link cache. Without it, the scraper may use the page URL directly (which usually works), but explicit `og:url` is the correct practice and avoids cache confusion on redirects.

The current `twitter` block:
```ts
twitter: {
  card: 'summary_large_image',
  title,
  description,
}
```

Missing:
- `images` — while Next.js auto-injects `twitter:image` from `opengraph-image.tsx`, being explicit prevents edge cases where the auto-injection order matters. The image URL to use: Next.js 13+ convention is to reference the opengraph-image route directly (auto-injection handles this), so explicitly adding `images: [\`/\${slug}/opengraph-image\`]` is redundant. The safer minimal fix is to confirm auto-injection is working in the verified head output.

### Platform compatibility assessment

**1200×630 PNG at edge runtime** satisfies:
- **Facebook / WhatsApp**: Optimal. Standard OG dimensions (1.91:1 ratio). Facebook link preview uses `og:image`. WhatsApp uses the same OG tags.
- **iMessage / iOS**: Uses OG tags for link preview cards. 1200×630 works fine. iMessage caches aggressively — first unfurl is sticky. No code change needed.
- **Slack / Discord**: Both support standard OG. Discord uses `og:image` + `og:title` + `og:description`. Slack uses Twitter Card as fallback. Both work with current setup.
- **X.com (Twitter)**: `summary_large_image` card with 1200×630 is correct. X no longer has a public card validator that shows images, but the meta tags are correct.

**No platform-specific image variants needed.** 1200×630 PNG is the universal standard for link previews.

### Streaming metadata concern (Next.js 16)

Next.js 16 introduced streaming metadata (`<Suspense>` for metadata resolution). According to the docs (source 2-24,2-25,2-26): "Streaming metadata is disabled for bots and crawlers that expect metadata to be in the `<head>` tag (e.g., Twitterbot, Slackbot, Bingbot). These are detected by using the User Agent header from the incoming request."

This means: for social media crawlers, metadata is resolved synchronously and placed in `<head>` before the response body — the correct behavior. No `htmlLimitedBots` config is needed.

The current `next.config.ts` is minimal (no experimental flags), which is correct.

### Photo URL in OG image — potential render issue

`opengraph-image.tsx` fetches `teacher.photo_url` from Supabase and passes it to `<img src={teacher.photo_url}>` inside `ImageResponse`. This works if `photo_url` is a publicly accessible HTTPS URL. If `photo_url` is a Supabase storage URL requiring auth, the edge-runtime fetch will fail silently and the `hasPhoto` branch will still try to render the broken URL (since `hasPhoto = !!teacher.photo_url` is truthy regardless of fetch success).

The code already handles this gracefully: if `hasPhoto` is true but the image URL returns a 403, Satori (the underlying renderer) will silently substitute a blank space for the broken image. The initials fallback only fires when `photo_url` is `null`. **This is a known limitation, not a bug to fix in S03.** Supabase storage URLs for profile photos should be public-read by policy (they're user-uploaded profile photos).

### Caching behavior

`opengraph-image.tsx` uses `export const runtime = 'edge'` with no `revalidate` export. According to Next.js docs (source 1-25): "opengraph-image.js and twitter-image.js are special Route Handlers that is cached by default unless it uses a Request-time API or dynamic config option." Since the file uses dynamic `params` (the slug), Next.js treats it as dynamic and does NOT statically cache it. Each request to `/[slug]/opengraph-image` fetches fresh data from Supabase.

For platforms that aggressively cache (Facebook, iMessage): the image URL contains a hash suffix in production that changes on deploy. Forcing a cache refresh requires using the Facebook Sharing Debugger's "Scrape Again" button. This is expected behavior.

---

## How to Verify

### Programmatic (unit test extension)
Extend `tests/unit/og-metadata.test.ts` to assert:
- `metadata.openGraph.url` equals `https://tutelo.app/ms-johnson`
- `metadata.openGraph.images` is present (or confirm absence is intentional)
- `metadata.twitter.card` is `summary_large_image`

### Manual / integration (the real proof)
1. Deploy to production (or use a live tutelo.app teacher slug)
2. **Facebook Sharing Debugger** (`developers.facebook.com/tools/debug`): paste `https://tutelo.app/[slug]`, click "Debug", then "Scrape Again". Verify `og:image`, `og:title`, `og:description`, `og:url` are all present and correct. The preview card should show the teacher's photo, name, and subjects.
3. **WhatsApp**: paste `https://tutelo.app/[slug]` in a WhatsApp chat (without sending). A preview card should appear with the teacher photo and name.
4. **iMessage**: paste the URL in iMessage. A rich link preview card should appear.
5. **Slack/Discord**: paste the URL and verify the unfurl.

Verify command for local HTML head inspection:
```bash
curl -s -H "Accept: text/html" "https://tutelo.app/[slug]" | grep -E 'og:|twitter:'
```

### Build verification (no regression)
```bash
npx vitest run
npm run build
```

---

## What the Planner Should Know

- **Only file that needs code changes:** `src/app/[slug]/page.tsx` — add `url` to `openGraph` block. Optionally add `images` references explicitly for belt-and-suspenders.
- **Test file to extend:** `tests/unit/og-metadata.test.ts` — add `og:url` assertion.
- **No new dependencies, no new routes, no schema changes.**
- **The real acceptance criterion for OG-01 is manual/live verification**, not unit tests. Unit tests can only verify the metadata object shape; only a real crawl can confirm the platform actually renders the preview card.
- **Platform verification should be documented as evidence** (screenshot or debugger output) for the slice completion record.
- **Streaming metadata is not an issue** — Next.js 16 automatically disables it for known crawlers.
- **Image dimensions are correct** — 1200×630 PNG satisfies Facebook, WhatsApp, iMessage, Slack, Discord, and X.
- **No twitter-image.tsx needed** — `opengraph-image.tsx` auto-populates both `og:image` and `twitter:image`.
