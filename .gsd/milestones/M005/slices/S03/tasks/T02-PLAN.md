---
estimated_steps: 5
estimated_files: 2
---

# T02: Build server action and API route for the verification flow

**Slice:** S03 — School Email Verification & Badge Gating
**Milestone:** M005

## Description

Implement the two backend endpoints that drive the verification flow: (1) a `requestSchoolEmailVerification` server action that teachers call from the dashboard to initiate verification — it generates a token, writes it to the DB, and sends the verification email; (2) a public GET route at `/api/verify-email` that handles the email link click — it validates the token, stamps `verified_at`, and redirects back to the dashboard.

## Steps

1. **Create `src/actions/verification.ts`:**
   - Add `'use server'` directive at top.
   - Import `createClient` from `@/lib/supabase/server`, `revalidatePath` from `next/cache`, `z` from `zod`.
   - Import `generateVerificationToken`, `sendVerificationEmail` from `@/lib/verification`.
   - Export `async function requestSchoolEmailVerification(email: string): Promise<{ error?: string }>`.
   - Auth: call `const supabase = await createClient()`, then `const { data: { user } } = await supabase.auth.getUser()`. If no user, return `{ error: 'Not authenticated' }`.
   - Validate email: `const parsed = z.string().email().safeParse(email)`. If invalid, return `{ error: 'Invalid email address' }`.
   - Generate token: `const token = generateVerificationToken()`.
   - Compute expiry: `const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()`.
   - Look up teacher: `const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle()`. If not found, return `{ error: 'Teacher not found' }`.
   - Write token: `await supabase.from('teachers').update({ school_email_verification_token: token, school_email_verification_expires_at: expiresAt }).eq('id', teacher.id)`.
   - Send email: wrap `await sendVerificationEmail(email, token)` in try/catch. On error, return `{ error: 'Failed to send verification email' }`.
   - Revalidate: `revalidatePath('/dashboard/settings')`.
   - Return `{}` (empty object = success).

2. **Create `src/app/api/verify-email/route.ts`:**
   - Import `NextResponse` from `next/server`, `supabaseAdmin` from `@/lib/supabase/service`, `isTokenExpired` from `@/lib/verification`.
   - Export `async function GET(request: Request)`.
   - Read token: `const { searchParams } = new URL(request.url)`, `const token = searchParams.get('token')`.
   - If no token: redirect to `/dashboard/settings?error=invalid`.
   - Query teacher by token: `const { data: teacher } = await supabaseAdmin.from('teachers').select('id, school_email_verification_expires_at').eq('school_email_verification_token', token).maybeSingle()`.
   - If no teacher found: redirect to `/dashboard/settings?error=invalid`.
   - Check expiry: `if (isTokenExpired(teacher.school_email_verification_expires_at))` → redirect to `/dashboard/settings?error=expired`.
   - Stamp verified_at: `await supabaseAdmin.from('teachers').update({ verified_at: new Date().toISOString(), school_email_verification_token: null, school_email_verification_expires_at: null }).eq('id', teacher.id)`.
   - Redirect to success: `return NextResponse.redirect(new URL('/dashboard/settings?verified=true', request.url))`.

3. **Important constraints:**
   - The verify-email route uses `supabaseAdmin` (service role), NOT `createClient()`. The teacher may click the link in a different browser where they have no session. This is the same pattern used in `sendCancellationEmail`, `sendSessionReminderEmail`, and cron handlers.
   - The server action uses `createClient()` + `getUser()` for auth (session-based, dashboard context). This follows the knowledge doc "Auth Pattern: getUser() not getClaims()".
   - Redirects in the route handler must use `NextResponse.redirect(new URL('/path', request.url))` to construct the full URL correctly.
   - One pending token at a time — re-submitting overwrites previous token. This is intentional.

## Must-Haves

- [ ] `requestSchoolEmailVerification` validates email format, requires auth, generates token + 24h expiry, writes to DB, sends email
- [ ] `requestSchoolEmailVerification` returns `{ error: string }` on failure and `{}` on success
- [ ] GET `/api/verify-email` validates token, checks expiry, stamps `verified_at`, clears token columns
- [ ] GET `/api/verify-email` redirects to `/dashboard/settings?verified=true` on success
- [ ] GET `/api/verify-email` redirects to `/dashboard/settings?error=invalid` on missing/bad token
- [ ] GET `/api/verify-email` redirects to `/dashboard/settings?error=expired` on expired token
- [ ] Route uses `supabaseAdmin` (not session-based client)
- [ ] Server action uses `getUser()` for auth (not `getClaims()`)

## Verification

- `npm run build` — zero errors (both files compile)
- Manual integration: calling action writes token to teachers row; hitting GET route with valid token sets `verified_at` and redirects

## Observability Impact

- Signals added/changed: failed token lookups return distinct error params (`invalid` vs `expired`) enabling diagnosis from URL params
- How a future agent inspects this: query `teachers` table for `school_email_verification_token`, `school_email_verification_expires_at`, `verified_at` columns
- Failure state exposed: redirect URL params (`?error=invalid`, `?error=expired`) visible in browser; email send failures returned as `{ error }` from the action

## Inputs

- `src/lib/verification.ts` — `generateVerificationToken()`, `isTokenExpired()`, `sendVerificationEmail()` (from T01)
- `src/lib/supabase/service.ts` — `supabaseAdmin` export for RLS-bypassing DB queries
- `src/lib/supabase/server.ts` — `createClient()` for session-based auth in the server action
- `src/actions/profile.ts` — reference for server action auth pattern (`getUser()`)
- `src/app/api/connect-stripe/route.ts` — reference for API route pattern

## Expected Output

- `src/actions/verification.ts` — server action `requestSchoolEmailVerification` with `'use server'` directive
- `src/app/api/verify-email/route.ts` — GET route handler that validates token and stamps `verified_at`
