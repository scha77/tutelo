# M014: Dashboard Mobile Performance

## Vision
Make the teacher dashboard feel fast on mobile by eliminating the server-side auth waterfall that blocks rendering, and trimming avoidable JS from the shared bundle. The layout shell (sidebar, bottom nav, skeleton) should appear instantly while page data streams in. Secondary: cut ~800K of shared JS (Zod, Sentry, motion) that bloats every page even though most routes don't use it.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Auth Middleware for Dashboard Streaming | medium | — | ✅ | Navigate to /dashboard on mobile — layout shell with sidebar and skeleton appears immediately while page data loads. Unauthenticated users redirect to /login without hitting the layout at all. |
| S02 | Eliminate Client-Side Zod | low | — | ✅ | npx next build shows no chunk containing ZodObject. LoginForm and OnboardingWizard validation still works. |
| S03 | Lazy-Load Sentry Client SDK | low | — | ⬜ | Dashboard page loads without Sentry JS in the initial chunk waterfall. Errors still reach Sentry after hydration. |
