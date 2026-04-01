# S04: Teacher-Parent Messaging

**Goal:** Teacher-parent messaging with real-time delivery and email notifications — one thread per relationship, text only, Supabase Realtime for live updates, rate-limited email notifications via existing Resend infrastructure.
**Demo:** After this: Teacher sends a message from their dashboard. Parent sees it appear in real-time on their dashboard. New message triggers email notification to recipient

## Tasks
- [x] **T01: Built conversations + messages DB schema with RLS/Realtime, three messaging API routes, NewMessageEmail template, and rate-limited email notifications** — Build the full backend for teacher-parent messaging: migration 0019 with conversations + messages tables, RLS policies, Realtime publication; three API endpoints (GET /api/conversations, GET /api/messages, POST /api/messages); NewMessageEmail React Email template; rate-limited email sending on new messages.

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
  - Estimate: 2h
  - Files: supabase/migrations/0019_messaging.sql, src/app/api/messages/route.ts, src/app/api/conversations/route.ts, src/emails/NewMessageEmail.tsx
  - Verify: npx tsc --noEmit && test -f supabase/migrations/0019_messaging.sql && grep -q 'supabase_realtime' supabase/migrations/0019_messaging.sql && test -f src/app/api/messages/route.ts && test -f src/app/api/conversations/route.ts && test -f src/emails/NewMessageEmail.tsx
- [ ] **T02: Add Messages nav items and build conversation list pages** — Wire Messages into both parent and teacher navigation, then build the conversation list pages that show all threads for the logged-in user with last message preview.

The parent sidebar and mobile nav automatically pick up items from `parentNavItems` in `src/lib/parent-nav.ts`. The teacher sidebar picks up from `navItems` in `src/lib/nav.ts`, and MobileBottomNav also reads from `navItems`.

Both conversation list pages are server components that fetch from GET /api/conversations and render a linked list of conversations.
  - Estimate: 1h
  - Files: src/lib/parent-nav.ts, src/lib/nav.ts, src/app/(parent)/parent/messages/page.tsx, src/app/(dashboard)/dashboard/messages/page.tsx
  - Verify: npx tsc --noEmit && grep -q 'Messages' src/lib/parent-nav.ts && grep -q 'Messages' src/lib/nav.ts && test -f src/app/(parent)/parent/messages/page.tsx && test -f src/app/(dashboard)/dashboard/messages/page.tsx
- [ ] **T03: Build shared ChatWindow component and chat detail pages with Realtime** — Create the shared ChatWindow client component that handles message display, Realtime subscription for live updates, and message sending. Then wire it into conversation detail pages for both parent and teacher.

ChatWindow is a 'use client' component that:
1. Receives initial messages and conversation metadata as props
2. Sets up a Supabase Realtime `postgres_changes` subscription on the `messages` table filtered by `conversation_id`
3. Appends new messages from the subscription to local state
4. Handles message sending via POST /api/messages with optimistic local append
5. Cleans up subscription on unmount via `supabase.removeChannel(channel)`
6. Uses the browser Supabase client (`src/lib/supabase/client.ts`) for the Realtime subscription

The parent chat page at `/parent/messages/[conversationId]/page.tsx` and teacher chat page at `/dashboard/messages/[conversationId]/page.tsx` are thin wrappers: server component that fetches initial messages from GET /api/messages, resolves participant names, then renders ChatWindow.

Key implementation details from research:
- `postgres_changes` respects RLS automatically — no extra auth config needed
- Filter param: `conversation_id=eq.${conversationId}` narrows WAL broadcast
- Cleanup: `supabase.removeChannel(channel)` in useEffect return
- Supabase client auto-reconnects on network drops — no manual reconnect logic
- Optimistic append: add message to local state immediately on send, before API confirms
  - Estimate: 1.5h
  - Files: src/components/messaging/ChatWindow.tsx, src/app/(parent)/parent/messages/[conversationId]/page.tsx, src/app/(dashboard)/dashboard/messages/[conversationId]/page.tsx
  - Verify: npx tsc --noEmit && test -f src/components/messaging/ChatWindow.tsx && test -f 'src/app/(parent)/parent/messages/[conversationId]/page.tsx' && test -f 'src/app/(dashboard)/dashboard/messages/[conversationId]/page.tsx'
- [ ] **T04: Add messaging test coverage for API routes and email rate-limiting** — Write comprehensive unit tests for the messaging API routes covering auth guards, participant validation, message creation, conversation auto-creation, email rate-limit logic, and conversation listing.

Follow the established test pattern from `src/__tests__/parent-children.test.ts`: vi.mock supabase server/service modules, mock getUser for auth, mock supabaseAdmin.from() chains for DB operations, test each route handler directly.

Test areas:
- POST /api/messages: unauthenticated → 401, non-participant → 403, valid message creation, conversation auto-creation when teacher_id provided without conversation_id, empty body → 400, body > 2000 chars → 400
- POST /api/messages email: email sent when last_notified_at is null, email sent when last_notified_at > 5 min ago, email skipped when last_notified_at < 5 min ago, email failure doesn't fail message insert
- GET /api/messages: unauthenticated → 401, returns messages ordered by created_at, non-participant → 403
- GET /api/conversations: unauthenticated → 401, returns conversations for teacher role, returns conversations for parent role, includes last message preview
  - Estimate: 1.5h
  - Files: src/__tests__/messaging.test.ts
  - Verify: npx vitest run src/__tests__/messaging.test.ts && npx vitest run
