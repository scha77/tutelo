# S02: Sentry Integration & Error Handling Audit — UAT

**Milestone:** M013
**Written:** 2026-04-07T14:39:37.041Z

## UAT: Sentry Integration & Error Handling Audit

### Preconditions
- `NEXT_PUBLIC_SENTRY_DSN` set in `.env.local` (or empty — SDK no-ops gracefully)
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` optionally set for source map upload
- All dependencies installed (`npm install` completed)
- Dev server available via `npm run dev`

### Test 1: Error Boundary Captures to Sentry (Client-Side)

1. Start dev server: `npm run dev`
2. Navigate to any page
3. Trigger a client-side error (e.g., temporarily add `throw new Error('test-sentry')` in a component render)
4. **Expected:** Error boundary renders fallback UI. If `NEXT_PUBLIC_SENTRY_DSN` is set, error appears in Sentry dashboard with stack trace and component tree context.
5. **Without DSN:** Console shows the error, no Sentry network request fires — SDK no-ops.

### Test 2: Server Error Capture via onRequestError

1. Create a temporary API route that throws: `export function GET() { throw new Error('sentry-server-test') }`
2. Hit the route via browser or curl
3. **Expected:** If DSN set, error appears in Sentry with server runtime label. `onRequestError` hook captures the unhandled error automatically via instrumentation.ts.

### Test 3: Build Succeeds Without Sentry Auth Token

1. Ensure `SENTRY_AUTH_TOKEN` is NOT set (unset or absent from `.env.local`)
2. Run `npx next build`
3. **Expected:** Build completes successfully. Console shows `[sentry] Source map upload skipped: ...` warning (not a build failure). Source maps are not uploaded but all other Sentry features work.

### Test 4: Catch Block Coverage Audit

1. Run: `rg 'captureException' src/actions/ src/app/api/ src/lib/ -g '*.ts' | wc -l`
2. **Expected:** ≥ 44 occurrences across 18 files.
3. Run: `rg 'catch' src/actions/ src/app/api/ src/lib/ -g '*.ts' -g '*.tsx' --no-heading`
4. Review each catch block — it should either have `captureException`, `console.error` with context, or be one of: JSON parse guard, timezone fallback, cookie read-only, redirect throw, or client-side `setError()`.
5. **Expected:** No silent catch-and-ignore patterns.

### Test 5: Test Suite Integrity

1. Run: `npx vitest run`
2. **Expected:** 470+ tests pass, 0 failures. All 20 test files with Sentry imports have `vi.mock('@sentry/nextjs')`.

### Test 6: Type Safety

1. Run: `npx tsc --noEmit`
2. **Expected:** 0 type errors. All `import * as Sentry from '@sentry/nextjs'` statements resolve.

### Test 7: PII Protection

1. Inspect all three Sentry config files: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
2. **Expected:** All contain `sendDefaultPii: false`. No student names, emails, or phone numbers should be sent to Sentry by default.

### Test 8: Tunnel Route (Ad-Blocker Bypass)

1. Check `next.config.ts` for `tunnelRoute: '/monitoring'`
2. In production with DSN set, Sentry events route through `/monitoring` instead of `sentry.io` — bypasses common ad-blockers.
3. **Expected:** Network tab shows POST to `/monitoring` (not `o*.ingest.sentry.io`).

### Edge Cases

- **No DSN configured:** All Sentry calls no-op. No errors thrown, no network requests. Build and runtime work normally.
- **Invalid DSN:** Sentry SDK logs a warning to console but does not crash the application.
- **Sentry service outage:** `captureException` calls fail silently — they never block the primary request flow or user interaction.
