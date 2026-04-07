# M012: Performance & Delivery Efficiency

## Vision
Serve public pages from Vercel's CDN instead of dynamic SSR, extend query caching across all dashboard pages, and trim JS bundle weight — all within Vercel Hobby plan constraints. The profile page load goes from ~800ms dynamic SSR to ~50ms CDN-cached. Dashboard navigation feels instant on re-visit.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Profile Page ISR + On-Demand Revalidation | high | — | ✅ | After this: visiting any /[slug] URL returns a response with x-vercel-cache: HIT header; npm run build shows the route as ISR; saving a profile change in the dashboard causes the public page to reflect the update within seconds. |
| S02 | Directory Pages ISR | low | — | ✅ | After this: /tutors base page and all /tutors/[category] pages are served from CDN cache; filter UX still works; new published teachers appear in directory within the revalidation window. |
| S03 | Dashboard Query Caching | medium | — | ✅ | After this: navigating away from /dashboard/sessions and back within 30 seconds returns the cached result instantly; confirming a booking request invalidates the requests cache so the count updates correctly. |
| S04 | Asset & Bundle Audit | low | — | ⬜ | After this: npm run build output shows no motion-related chunks in dashboard routes; HeroSection banner and avatar confirmed as next/image; build deploys to Vercel Hobby without errors. |
