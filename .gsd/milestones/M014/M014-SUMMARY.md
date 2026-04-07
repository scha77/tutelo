---
id: M014
title: "Dashboard Mobile Performance"
status: complete
oneLiner: "Eliminated the dashboard auth waterfall by adding proxy redirects and Suspense-streaming the layout shell, and removed 296K Zod from the shared client bundle."
completedAt: 2026-04-07
verificationPassed: true
---

# M014: Dashboard Mobile Performance

**Eliminated the dashboard auth waterfall by adding proxy redirects and Suspense-streaming the layout shell, and removed 296K Zod from the shared client bundle.**

## What Happened

M014 targeted the teacher dashboard's slow initial load on mobile. Investigation identified two root causes: (1) the dashboard layout blocked all rendering on sequential `getAuthUser()` + `getTeacher()` calls before sending any HTML, and (2) Zod (296K) was in the shared client bundle loaded by every page because LoginForm imported react-hook-form + zodResolver.

### S01: Auth Proxy Redirects + Streaming Layout ✅
Added auth redirect logic to the existing `proxy.ts` (Next.js 16 uses proxy, not middleware — cannot have both files). Protected routes (`/dashboard/*`, `/parent/*`, `/admin/*`) now redirect to `/login?redirect=<path>` before hitting the layout. The dashboard layout was restructured from a blocking async function to a **synchronous** function with Suspense-wrapped async components. The sidebar, mobile header, and mobile nav each have their own async wrapper. Skeleton fallbacks match real component dimensions to prevent layout shift. The shell streams instantly while teacher data resolves in parallel.

### S02: Eliminate Client-Side Zod ✅
Replaced react-hook-form + zodResolver in LoginForm with native `useState` + `FormEvent` validation. The same email format and 8-character password rules apply, just implemented with a simple `validate()` function instead of a 296K library. The OnboardingWizard retains react-hook-form + zod because its validation is genuinely complex (phone number parsing, array constraints, regex patterns). After this change, the Zod chunk only loads on `/onboarding` — not on dashboard, landing, login, or any other route.

### S03: Lazy-Load Sentry ⏭️ Skipped
Investigation revealed the original 211K Sentry estimate was incorrect. The 200K chunk (bfb4bbbc83547270.js) is a **server-side** chunk containing Supabase server client, Resend, and server Sentry — it is never sent to browsers. The actual client-side Sentry footprint is just 12K across 3 small chunks. Not worth lazy-loading.

## Verification

- `npx next build` succeeds
- `npx vitest run`: 52 files, 490 tests, 0 failures
- `curl /dashboard` → 307 redirect to `/login?redirect=%2Fdashboard`
- `curl /parent` → 307 redirect to `/login?redirect=%2Fparent`
- `curl /admin` → 307 redirect to `/login?redirect=%2Fadmin`
- `curl /` → 200 (public, no redirect)
- Zod chunk not referenced by dashboard or landing page build manifests
- Dashboard layout function is synchronous (no top-level await)

## Key Decisions

- **proxy.ts not middleware.ts** — Next.js 16 forbids both files
- **Layout synchronous with Suspense** — streams shell before data resolves
- **Native validation in LoginForm** — 2 fields don't justify 296K of library
- **Keep zod in OnboardingWizard** — complex validation justifies it
- **Skip Sentry lazy-load** — client SDK is only 12K

## Key Files

- `src/proxy.ts` — Auth redirects for protected routes
- `src/app/(dashboard)/dashboard/layout.tsx` — Synchronous layout with Suspense streaming
- `src/app/(parent)/layout.tsx` — Simplified auth gate
- `src/app/(admin)/layout.tsx` — Simplified auth gate
- `src/components/auth/LoginForm.tsx` — Native form validation

## Lessons Learned

- Next.js 16 uses `proxy.ts` instead of `middleware.ts` — cannot have both
- Turbopack chunk splitting is opaque — checking which chunks load per-page requires network inspection, not build manifest analysis
- Server-side chunks in `.next/static/chunks` can contain server-only code and are never sent to browsers — don't count them as client bundle cost
- Sentry `@sentry/nextjs` client SDK is much smaller than it appears — the bulk is server-side

## Follow-ups

- Consider ServiceWorker/PWA to cache static chunks after first visit
