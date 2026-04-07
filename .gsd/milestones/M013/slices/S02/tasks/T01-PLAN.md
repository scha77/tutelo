---
estimated_steps: 32
estimated_files: 8
skills_used: []
---

# T01: Install Sentry SDK, Create Config Files & Wire Error Boundaries

## Description

Bootstrap the Sentry Next.js SDK. Install the package, create the four required config files at the project root, wrap `next.config.ts` with `withSentryConfig`, and wire `Sentry.captureException` into both error boundary files.

**Important:** `src/app/global-error.tsx` does NOT have a `useEffect` — you must add one (import `useEffect` from React, wrap the `Sentry.captureException(error)` call in `useEffect(() => { ... }, [error])`).

`src/app/error.tsx` already has `useEffect(() => { console.error(...) }, [error])` — add `Sentry.captureException(error)` inside the existing `useEffect` callback, before or after the `console.error` call.

Env vars (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) are referenced via `process.env` but may not be set in all environments. The SDK gracefully no-ops when DSN is undefined. Source map upload must use `errorHandler` to warn-not-fail so builds succeed without `SENTRY_AUTH_TOKEN`.

## Steps

1. Run `npm install @sentry/nextjs` to add the package.
2. Create `sentry.client.config.ts` at project root with `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, sendDefaultPii: false })`.
3. Create `sentry.server.config.ts` at project root with `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1, sendDefaultPii: false })`.
4. Create `sentry.edge.config.ts` at project root with minimal `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1, sendDefaultPii: false })`.
5. Create `src/instrumentation.ts` with `register()` function that conditionally imports server/edge configs based on `process.env.NEXT_RUNTIME`, and exports `onRequestError = Sentry.captureRequestError`.
6. Wrap `next.config.ts`: import `withSentryConfig` from `@sentry/nextjs`, wrap `export default nextConfig` with `withSentryConfig(nextConfig, { org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, authToken: process.env.SENTRY_AUTH_TOKEN, silent: !process.env.CI, tunnelRoute: '/monitoring', errorHandler: (err) => { console.warn('[sentry] Source map upload skipped:', err.message) } })`.
7. Read `src/app/error.tsx`. Add `import * as Sentry from '@sentry/nextjs'` at top. Add `Sentry.captureException(error)` inside the existing `useEffect` callback.
8. Read `src/app/global-error.tsx`. Add `import { useEffect } from 'react'` and `import * as Sentry from '@sentry/nextjs'`. Add `useEffect(() => { Sentry.captureException(error) }, [error])` inside the component body before the return statement.
9. Run `npx next build` to verify the build succeeds with the Sentry wrapper.

## Must-Haves

- [ ] `@sentry/nextjs` installed in package.json
- [ ] 4 config files created (sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts, src/instrumentation.ts)
- [ ] next.config.ts wrapped with withSentryConfig
- [ ] error.tsx calls Sentry.captureException in useEffect
- [ ] global-error.tsx has useEffect added and calls Sentry.captureException
- [ ] Build succeeds even without SENTRY_AUTH_TOKEN (errorHandler prevents build failure)
- [ ] sendDefaultPii is false (student data protection)

## Verification

- `npx next build` completes without errors
- `grep -q 'captureException' src/app/error.tsx` returns 0
- `grep -q 'captureException' src/app/global-error.tsx` returns 0
- `grep -q 'useEffect' src/app/global-error.tsx` returns 0

## Observability Impact

- Signals added: Sentry SDK initialization on client, server, and edge runtimes. `onRequestError` hook captures unhandled request errors automatically.
- How a future agent inspects this: Check Sentry dashboard for incoming errors. Locally, `console.warn('[sentry]')` messages indicate source map upload status.
- Failure state exposed: Error boundaries now report to Sentry before rendering fallback UI — previously errors were only in browser console.

## Inputs

- ``next.config.ts` — existing Next.js config to wrap with withSentryConfig`
- ``src/app/error.tsx` — existing error boundary, has useEffect already`
- ``src/app/global-error.tsx` — existing global error boundary, needs useEffect added`
- ``package.json` — add @sentry/nextjs dependency`

## Expected Output

- ``sentry.client.config.ts` — client SDK init config`
- ``sentry.server.config.ts` — server SDK init config`
- ``sentry.edge.config.ts` — edge runtime SDK init config`
- ``src/instrumentation.ts` — Next.js instrumentation hook with onRequestError`
- ``next.config.ts` — wrapped with withSentryConfig`
- ``src/app/error.tsx` — wired with Sentry.captureException`
- ``src/app/global-error.tsx` — wired with useEffect + Sentry.captureException`
- ``package.json` — @sentry/nextjs added`

## Verification

npx next build && grep -q 'captureException' src/app/error.tsx && grep -q 'captureException' src/app/global-error.tsx && grep -q 'useEffect' src/app/global-error.tsx
