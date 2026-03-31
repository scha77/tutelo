---
estimated_steps: 39
estimated_files: 4
skills_used: []
---

# T03: Track-view API route + fire-and-forget on /[slug]

Create src/app/api/track-view/route.ts.

POST handler:
1. Parse body: { teacherId: string }. Return 400 if missing.
2. Read User-Agent from request headers.
3. Call isBot(userAgent) from bot-filter.ts.
4. Insert row into page_views via supabaseAdmin (service role — anonymous caller, no session).
5. Return 201 { ok: true }.
6. On any error: return 500 { error: '...' }, never throw.

In src/app/[slug]/page.tsx, add a non-blocking fetch call inside the server component after the teacher query succeeds:
```ts
// Fire-and-forget page view tracking — do NOT await
// Using a relative URL won't work in RSC; use absolute URL or a direct DB insert
```

Actually, for RSC performance: instead of a fetch from the server component (which would be server → server), do the insert directly in the page using supabaseAdmin. But supabaseAdmin contains the service role key — keep it server-only. Pattern:
- Import createAdminClient from @/lib/supabase/admin (create this if not exists)
- After the teacher query succeeds, run a fire-and-forget insert:
```ts
import { createAdminClient } from '@/lib/supabase/admin'
// in the page component:
const headersList = await headers()
const userAgent = headersList.get('user-agent')
if (!isBot(userAgent) && teacher) {
  createAdminClient()
    .from('page_views')
    .insert({ teacher_id: teacher.id, user_agent: userAgent, is_bot: false })
    .then(() => {}) // truly non-blocking
    .catch(() => {}) // swallow errors — never block page render
}
```

Check if src/lib/supabase/admin.ts exists first. If it does, use it. If not, create it:
```ts
import { createClient } from '@supabase/supabase-js'
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
```

## Inputs

- `src/lib/utils/bot-filter.ts`
- `src/lib/supabase/admin.ts`

## Expected Output

- `src/app/api/track-view/route.ts`
- `src/lib/supabase/admin.ts (if not exists)`
- `src/app/[slug]/page.tsx (updated with fire-and-forget tracking)`

## Verification

npx tsc --noEmit passes. npm run build passes. /api/track-view in route manifest.
