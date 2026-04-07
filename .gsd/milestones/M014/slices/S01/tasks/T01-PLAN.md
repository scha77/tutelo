---
estimated_steps: 6
estimated_files: 1
skills_used: []
---

# T01: Create Supabase auth middleware

1. Read @supabase/ssr docs for middleware pattern
2. Create src/middleware.ts with createServerClient
3. Protect /dashboard/*, /parent/*, /admin/* routes
4. Redirect unauthenticated users to /login
5. Configure matcher to skip static files and API routes
6. Test locally with unauthenticated request

## Inputs

- `src/lib/supabase/server.ts`
- `src/lib/supabase/auth-cache.ts`

## Expected Output

- `src/middleware.ts`

## Verification

curl -s -o /dev/null -w '%{http_code} %{redirect_url}' http://localhost:3456/dashboard returns 307 /login without hitting the layout
