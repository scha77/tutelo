---
estimated_steps: 15
estimated_files: 4
skills_used: []
---

# T01: Create messaging schema, API routes, and email notification template

Build the full backend for teacher-parent messaging: migration 0019 with conversations + messages tables, RLS policies, Realtime publication; three API endpoints (GET /api/conversations, GET /api/messages, POST /api/messages); NewMessageEmail React Email template; rate-limited email sending on new messages.

## Failure Modes

| Dependency | On error | On timeout | On malformed response |
|------------|----------|-----------|----------------------|
| Supabase DB (insert message) | Return 500 with error message | N/A (local DB) | Log and return 500 |
| Resend email send | Catch error, log to console.error, do NOT fail the message insert | Catch, log, continue | Catch, log, continue |
| Supabase auth (getUser) | Return 401 Unauthorized | Return 500 | Return 401 |

## Negative Tests

- **Malformed inputs**: Empty message body → rejected by CHECK constraint and Zod validation. Body > 2000 chars → rejected. Missing teacher_id when no conversation_id → 400. Invalid UUID for conversation_id → 400.
- **Error paths**: Unauthenticated request → 401. User not participant in conversation → 403. Non-existent teacher_id → 400. Email send failure → message still saved (non-blocking).
- **Boundary conditions**: First message creates conversation (upsert). Second message to same teacher reuses existing conversation. Rate-limit: message within 5 min of last notification skips email. Message at exactly 5 min boundary sends email.

## Load Profile

- **Shared resources**: DB connections via supabaseAdmin service client (singleton). Resend API (rate-limited externally).
- **Per-operation cost**: POST /api/messages = 1-3 DB queries (participant check, message insert, optional conversation upsert) + 0-1 email send.
- **10x breakpoint**: Resend free tier limits (100 emails/day) — acceptable for MVP. DB queries are indexed.

## Inputs

- ``src/lib/supabase/server.ts` — server Supabase client pattern (createClient + getUser auth)`
- ``src/lib/supabase/service.ts` — admin client (supabaseAdmin) for DB writes bypassing RLS`
- ``src/lib/email.ts` — Resend email send pattern and import conventions`
- ``src/emails/BookingNotificationEmail.tsx` — React Email template pattern (props, structure, styling)`
- ``supabase/migrations/0018_parent_profiles.sql` — latest migration (confirms 0019 is next)`
- ``src/app/api/direct-booking/create-intent/route.ts` — API route pattern (auth, body parsing, error handling)`

## Expected Output

- ``supabase/migrations/0019_messaging.sql` — conversations + messages tables, RLS policies, indexes, Realtime publication, last_notified_at column`
- ``src/app/api/messages/route.ts` — GET (fetch messages by conversation_id) + POST (send message, upsert conversation, rate-limited email)`
- ``src/app/api/conversations/route.ts` — GET (list conversations for logged-in user with last message preview and participant info)`
- ``src/emails/NewMessageEmail.tsx` — React Email template with sender name, message preview, CTA button to conversation`

## Verification

npx tsc --noEmit && test -f supabase/migrations/0019_messaging.sql && grep -q 'supabase_realtime' supabase/migrations/0019_messaging.sql && test -f src/app/api/messages/route.ts && test -f src/app/api/conversations/route.ts && test -f src/emails/NewMessageEmail.tsx
