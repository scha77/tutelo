# S03: Lazy-Load Sentry Client SDK

**Goal:** Defer Sentry client initialization until after hydration so the ~211K SDK does not block initial render.
**Demo:** After this: Dashboard page loads without Sentry JS in the initial chunk waterfall. Errors still reach Sentry after hydration.

## Tasks
- [ ] **T01: Lazy-load Sentry client SDK** — 1. Modify sentry.client.config.ts to use dynamic import pattern
2. Or: use @sentry/nextjs lazyLoadIntegrations config if available
3. Or: wrap Sentry.init in a requestIdleCallback / setTimeout(0) pattern
4. Verify the Sentry chunks no longer appear in the initial page load waterfall
5. Verify captureException still works after the lazy init completes
  - Estimate: 30min
  - Files: sentry.client.config.ts, src/app/error.tsx, src/app/global-error.tsx
  - Verify: npx next build && check Sentry chunks not in root manifest && npx vitest run
