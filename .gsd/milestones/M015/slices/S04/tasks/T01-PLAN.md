---
estimated_steps: 7
estimated_files: 4
skills_used: []
---

# T01: Wire checkLimit to all four public endpoints

Replace the old in-memory `rateLimit` import with `checkLimit` from `src/lib/rate-limit.ts` in waitlist and track-view routes. Add rate limiting to verify-email (GET route, no existing limiter) and auth server actions (signIn/signUp, use `headers()` from `next/headers` for IP extraction).

Steps:
1. In `src/app/api/waitlist/route.ts`: replace `import { rateLimit } from '@/lib/utils/rate-limit'` with `import { checkLimit } from '@/lib/rate-limit'`. Change the sync `if (!rateLimit(...))` call to `const { allowed } = await checkLimit(ip, 'waitlist', { max: 5, window: '1 m' })` followed by `if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })`. The handler is already async.
2. In `src/app/api/track-view/route.ts`: same swap — replace `rateLimit` import with `checkLimit`. Change to `const { allowed } = await checkLimit(ip, 'track-view', { max: 30, window: '1 m' })` (bump from 10 to 30 — page views fire frequently on normal browsing). Keep the same 429 response pattern.
3. In `src/app/api/verify-email/route.ts`: add `import { checkLimit } from '@/lib/rate-limit'` at top. At the start of the GET handler, extract IP with `const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'`, then `const { allowed } = await checkLimit(ip, 'verify-email', { max: 5, window: '1 m' })`. If not allowed, return `NextResponse.json({ error: 'Too many requests' }, { status: 429 })` (JSON response, not a redirect — distinguishes abuse from legitimate requests).
4. In `src/actions/auth.ts`: add `import { headers } from 'next/headers'` and `import { checkLimit } from '@/lib/rate-limit'`. In both `signIn` and `signUp`, at the top of each function (before any Supabase calls), add: `const headersList = await headers()` then `const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'` then `const { allowed } = await checkLimit(ip, 'auth', { max: 10, window: '1 m' })`. If not allowed, return `{ error: 'Too many requests. Please try again later.' }` (same return shape as existing error returns).
5. Run `npm run build` to verify no type errors.

## Inputs

- `src/lib/rate-limit.ts`
- `src/app/api/waitlist/route.ts`
- `src/app/api/track-view/route.ts`
- `src/app/api/verify-email/route.ts`
- `src/actions/auth.ts`

## Expected Output

- `src/app/api/waitlist/route.ts`
- `src/app/api/track-view/route.ts`
- `src/app/api/verify-email/route.ts`
- `src/actions/auth.ts`

## Verification

npm run build exits 0. grep -q 'checkLimit' src/app/api/waitlist/route.ts && grep -q 'checkLimit' src/app/api/track-view/route.ts && grep -q 'checkLimit' src/app/api/verify-email/route.ts && grep -q 'checkLimit' src/actions/auth.ts
