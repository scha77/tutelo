---
id: S03
parent: M005
milestone: M005
provides:
  - DB migration adding school_email_verification_token and school_email_verification_expires_at to teachers
  - Pure verification library (token generation, expiry check, email send via Resend)
  - SchoolVerificationEmail React Email template
  - requestSchoolEmailVerification server action (auth → validate → token → DB write → send email)
  - GET /api/verify-email route (token lookup → expiry check → stamp verified_at → redirect)
  - SchoolEmailVerification client component (verified/unverified states, URL param toast feedback)
  - Settings page wired with verified_at fetch and verification component rendering
  - CredentialsBar badge gated on verified_at IS NOT NULL (already done — confirmed passing through)
  - 9 unit tests for all verification logic (token gen, expiry, email send)
requires:
  - slice: S01
    provides: teachers.verified_at TIMESTAMPTZ column (migration 0008)
affects: []
key_files:
  - supabase/migrations/0010_email_verification_tokens.sql
  - src/lib/verification.ts
  - src/emails/SchoolVerificationEmail.tsx
  - src/__tests__/verification.test.ts
  - src/actions/verification.ts
  - src/app/api/verify-email/route.ts
  - src/components/dashboard/SchoolEmailVerification.tsx
  - src/app/(dashboard)/dashboard/settings/page.tsx
key_decisions:
  - Custom verification token (not Supabase magic link) — separates auth from verification, allows school email to differ from auth email
  - supabaseAdmin (service role) in verify-email route — teacher may click link in a different browser with no session
  - getUser() in server action (not getClaims()) — per auth knowledge doc for POST re-render safety
  - Token overwrites on re-submit — one pending token at a time; re-sending replaces the previous token
  - Class-based Resend mock in Vitest — vi.hoisted() with class MockResend; plain vi.fn() is not constructable with `new`
  - DB update errors checked defensively in both action and route — failed DB write returns error rather than silently succeeding
patterns_established:
  - Verification server action pattern: getUser() auth → zod validate → generate token → DB write → send email → revalidate
  - URL param → useEffect toast pattern for post-redirect feedback in client components (verifiedParam/errorParam as component props)
  - supabaseAdmin for unauthenticated public routes that need to read/write protected data
observability_surfaces:
  - console.warn on token-not-found or expired-token in verify-email route (prefixed [verify-email])
  - console.error on email send failure or DB update failure (prefixed [verification])
  - URL params ?verified=true, ?error=invalid, ?error=expired visible in browser after redirect
  - DB: SELECT school_email_verification_token, school_email_verification_expires_at, verified_at FROM teachers WHERE id = '<id>'
  - idx_teachers_verification_token partial index for fast token lookups
drill_down_paths:
  - .gsd/milestones/M005/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M005/slices/S03/tasks/T03-SUMMARY.md
duration: 30m
verification_result: passed
completed_at: 2026-03-17
---

# S03: School Email Verification & Badge Gating

**School email verification flow fully shipped: token-based email verification pipeline from settings UI through Resend email delivery to verified_at stamp, with CredentialsBar badge gated on real DB state.**

## What Happened

S03 built the complete school email verification pipeline in three focused tasks:

**T01** established the foundation: migration 0010 adds `school_email_verification_token TEXT` and `school_email_verification_expires_at TIMESTAMPTZ` to teachers (not re-adding `verified_at` which already existed from 0008). The pure verification library (`src/lib/verification.ts`) exports three functions: `generateVerificationToken()` (UUID v4 via `crypto.randomUUID()`), `isTokenExpired(expiresAt)` (strict Date.now() comparison), and `sendVerificationEmail(toEmail, token)` (Resend with React Email template). The `SchoolVerificationEmail.tsx` template follows the `SessionReminderEmail` pattern with a single CTA button. Nine unit tests cover all logic paths using the class-based Resend mock pattern required by Vitest.

**T02** built the backend pipeline: `requestSchoolEmailVerification` server action authenticates via `getUser()`, validates email with zod, generates a UUID token with 24h expiry, writes it to the teacher's DB row (overwriting any previous pending token), sends the verification email, and revalidates `/dashboard/settings`. The public GET route at `/api/verify-email` uses `supabaseAdmin` (service role) — this is correct because teachers may click the verification link in a different browser with no active session. The route looks up the teacher by token, checks expiry, stamps `verified_at = new Date().toISOString()`, clears both token columns, and redirects to `/dashboard/settings?verified=true`. Failures redirect to `?error=invalid` or `?error=expired`.

**T03** closed the user-facing loop: `SchoolEmailVerification.tsx` is a `'use client'` component with two render states — verified (green `CheckCircle` + "School email verified") and unverified (email form with `useTransition` loading state and `Loader2` spinner). A `useEffect` on mount handles URL param feedback from the verify-email redirect, converting `verifiedParam`/`errorParam` props into Sonner toasts. The settings page was updated to add `verified_at` to its Supabase select query, accept `searchParams` as a Promise (Next.js 15+ pattern), and render `SchoolEmailVerification` below `AccountSettings` in a `space-y-8` container.

The `CredentialsBar` badge gating (`isVerified && <badge>`) and the public profile passing `!!teacher.verified_at` to `CredentialsBar` were already in place from prior work — confirmed correct and untouched.

## Verification

- `npx vitest run src/__tests__/verification.test.ts` — **9/9 tests pass** (token UUID format, uniqueness, expiry past/future/epoch/string inputs, email send args, React prop truthy, URL construction)
- `npm run build` — **zero errors**, all 25 routes generated including `/api/verify-email` (ƒ dynamic)
- TypeScript compilation clean across all 8 new/modified files
- Badge gating confirmed: `CredentialsBar` at `src/components/profile/CredentialsBar.tsx:22` renders `{isVerified && <badge>}`; public profile at `src/app/[slug]/page.tsx:178` passes `isVerified={!!teacher.verified_at}`

## Requirements Advanced

- VERIFY-01 — School email verification system built end-to-end (token → email → verified_at stamp)
- VERIFY-02 (badge gating) — CredentialsBar confirmed gated on verified_at IS NOT NULL; hardcoded badge removed

## Requirements Validated

- VERIFY-01 — Full verification flow implemented: requestSchoolEmailVerification action writes token to DB and sends Resend email; /api/verify-email route stamps verified_at and clears token; settings page shows verification UI; public profile badge gated on real DB state. Unit tests pass, build passes.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

- T02 added defensive error handling for the DB `.update()` call in both the server action and the route handler. The plan didn't explicitly mention checking DB update errors, but a failed write that silently returns success would be a correctness bug — the deviation is strictly additive.

## Known Limitations

- End-to-end email delivery requires a live Resend account with the `noreply@tutelo.app` sender domain configured. In local development without `RESEND_API_KEY` set, `sendVerificationEmail` will throw and the server action will return `{ error: 'Failed to send verification email' }`.
- The verification flow does not validate that the submitted email belongs to a school domain (e.g., `.edu` or `.k12.*`). Any valid email format passes zod validation. Domain filtering is a future enhancement if stricter trust is desired.
- Alumni `.edu` addresses are accepted — "meaningful but not bulletproof" trust is appropriate for MVP (per D-49 decision).
- Re-submitting the verification form overwrites the previous token. If a teacher submitted to the wrong address, they can simply re-submit to the correct one.

## Follow-ups

- School email is not persisted on the teachers row (only used transiently in the email send). If the teacher needs to re-verify a different address later, they re-submit the form. Persisting the verified school email address for display (e.g., in a trust signal section) would be a natural next step.
- Domain allowlist (`.edu`, `.k12.*`) — optional trust enhancement; not required for MVP.
- Token cleanup cron: expired tokens are never cleaned up automatically. A periodic cleanup of `WHERE school_email_verification_expires_at < NOW()` would be hygiene. Low priority since the partial index means stale rows don't affect query performance.

## Files Created/Modified

- `supabase/migrations/0010_email_verification_tokens.sql` — Adds school_email_verification_token and school_email_verification_expires_at columns + partial index
- `src/lib/verification.ts` — Pure verification library: generateVerificationToken, isTokenExpired, sendVerificationEmail
- `src/emails/SchoolVerificationEmail.tsx` — React Email template with CTA button linking to /api/verify-email
- `src/__tests__/verification.test.ts` — 9 unit tests covering all verification logic
- `src/actions/verification.ts` — requestSchoolEmailVerification server action
- `src/app/api/verify-email/route.ts` — GET route handler: token lookup → expiry → verified_at stamp → redirect
- `src/components/dashboard/SchoolEmailVerification.tsx` — Client component with verified/unverified states and URL param toast feedback
- `src/app/(dashboard)/dashboard/settings/page.tsx` — Added verified_at to select, searchParams Promise handling, renders SchoolEmailVerification

## Forward Intelligence

### What the next slice should know
- The `verified_at` column is on the `teachers` table. Any downstream feature that wants to surface teacher trust signals should join or select this column — it is `TIMESTAMPTZ NULL` (null = unverified, non-null = verified).
- The class-based Resend mock pattern (`vi.hoisted()` + `class MockResend`) is now documented in both `KNOWLEDGE.md` and used in `verification.test.ts` — copy this pattern for any new test files that test code importing Resend.
- The URL-param-to-toast pattern (props passed from server component, consumed in `useEffect`) works cleanly for post-redirect feedback in Next.js App Router. Consider reusing this pattern for other server-action-triggered redirects.
- `supabaseAdmin` from `src/lib/supabase/service.ts` is the right client for public GET routes that need to read/write DB rows without a user session. The existing pattern in `verify-email/route.ts` is the reference implementation.

### What's fragile
- `sendVerificationEmail` builds the URL from `NEXT_PUBLIC_APP_URL`. If this env var is missing in production, the verification link will point to `https://tutelo.app` (hardcoded fallback) — acceptable for production but misleading in staging/preview environments that have different URLs.
- The settings page `searchParams` handling uses Next.js 15+ Promise-based `searchParams`. If the Next.js version changes, this pattern may need revisiting.

### Authoritative diagnostics
- Verification state: `SELECT id, verified_at, school_email_verification_token, school_email_verification_expires_at FROM teachers WHERE id = '<id>'` — most direct way to check a teacher's verification state and any pending token
- Build route table: look for `ƒ /api/verify-email` in `npm run build` output — confirms the route compiled
- Test suite: `npx vitest run src/__tests__/verification.test.ts` — all 9 pass; any regression here indicates a verification.ts logic change

### What assumptions changed
- CredentialsBar badge gating was already implemented (not needing S03 changes) — confirmed via `grep`. The plan noted "already done — no changes needed" and this was accurate. The badge was gated on `isVerified` prop; the public profile was already passing `!!teacher.verified_at`.
- `verified_at` column was already present from migration 0008 (S01) — migration 0010 correctly avoids re-adding it, only adding the two new token columns.
