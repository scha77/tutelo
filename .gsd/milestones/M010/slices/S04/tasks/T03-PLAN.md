---
estimated_steps: 15
estimated_files: 3
skills_used: []
---

# T03: Build shared ChatWindow component and chat detail pages with Realtime

Create the shared ChatWindow client component that handles message display, Realtime subscription for live updates, and message sending. Then wire it into conversation detail pages for both parent and teacher.

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

## Inputs

- ``src/app/api/messages/route.ts` — GET endpoint for fetching messages, POST endpoint for sending (created in T01)`
- ``src/app/api/conversations/route.ts` — conversation data structure (created in T01)`
- ``src/lib/supabase/client.ts` — browser Supabase client for Realtime subscription`
- ``src/app/(parent)/parent/messages/page.tsx` — parent messages list page (created in T02, establishes the route pattern)`
- ``src/app/(dashboard)/dashboard/messages/page.tsx` — teacher messages list page (created in T02, establishes the route pattern)`
- ``src/components/ui/textarea.tsx` — existing textarea component for message input`

## Expected Output

- ``src/components/messaging/ChatWindow.tsx` — shared client component with Realtime subscription, message list, message input, optimistic send, cleanup on unmount`
- ``src/app/(parent)/parent/messages/[conversationId]/page.tsx` — parent chat detail page (server component wrapper → ChatWindow)`
- ``src/app/(dashboard)/dashboard/messages/[conversationId]/page.tsx` — teacher chat detail page (server component wrapper → ChatWindow)`

## Verification

npx tsc --noEmit && test -f src/components/messaging/ChatWindow.tsx && test -f 'src/app/(parent)/parent/messages/[conversationId]/page.tsx' && test -f 'src/app/(dashboard)/dashboard/messages/[conversationId]/page.tsx'
