---
estimated_steps: 5
estimated_files: 3
skills_used: []
---

# T01: Lazy-load Sentry client SDK

1. Modify sentry.client.config.ts to use dynamic import pattern
2. Or: use @sentry/nextjs lazyLoadIntegrations config if available
3. Or: wrap Sentry.init in a requestIdleCallback / setTimeout(0) pattern
4. Verify the Sentry chunks no longer appear in the initial page load waterfall
5. Verify captureException still works after the lazy init completes

## Inputs

- `sentry.client.config.ts`
- `next.config.ts`

## Expected Output

- `Modified sentry.client.config.ts`

## Verification

npx next build && check Sentry chunks not in root manifest && npx vitest run
