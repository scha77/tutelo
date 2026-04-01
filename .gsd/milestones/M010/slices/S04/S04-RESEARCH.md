# S04 Research: Teacher-Parent Messaging

**Slice:** S04 — Teacher-Parent Messaging  
**Milestone:** M010  
**Gathered:** 2026-04-01  
**Requirements:** PARENT-06, MSG-01, MSG-02, MSG-03

---

## Summary

S04 is a moderately complex slice. The UI pattern (chat page, message list, message input) is well-understood React. The new territory is **Supabase Realtime** — first use in this project — and the **email notification** strategy. Both are solvable with established patterns from the library docs and the project's existing email infrastructure. Schema and API design are straightforward given the prior art from S01. The main risks are (1) Realtime + RLS interaction correctness and (2) rate-limiting email notifications per MSG-03 without adding a background queue.

---

## Requirements Owned

| ID | Description | Key Constraint |
|----|-------------|----------------|
| PARENT-06 | In-app messaging between parent and teacher | One thread per teacher-parent relationship. Text only. |
| MSG-01 | conversations + messages tables; auto-create thread on first message | Both teacher and parent can initiate |
| MSG-02 | Real-time delivery via Supabase Realtime postgres_changes | First use of Realtime in project; requires table replication enabled |
| MSG-03 | Email notification to recipient on new message | Rate-limited (batch within 5-min window). Uses existing Resend infrastructure. |

---

## Implementation Landscape

### Database Schema (migration 0019)

Two new tables are needed:

**`conversations`** — one row per teacher-parent relationship:
```sql
CREATE TABLE conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  parent_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_teacher_parent_unique UNIQUE (teacher_id, parent_id)
);
```

**`messages`** — messages within a conversation:
```sql
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at);
```

**RLS on `conversations`** — teacher sees/modifies their rows; parent sees/modifies their rows:
```sql
-- teachers: can see conversations where their teachers.user_id = auth.uid()
-- parents: can see conversations where parent_id = auth.uid()
```
The RLS needs a join to `teachers` for the teacher side:
```sql
CREATE POLICY "conversation_participant_select" ON conversations FOR SELECT
  USING (
    parent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM teachers WHERE teachers.id = teacher_id AND teachers.user_id = auth.uid()
    )
  );
CREATE POLICY "conversation_participant_insert" ON conversations FOR INSERT
  WITH CHECK (
    parent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM teachers WHERE teachers.id = teacher_id AND teachers.user_id = auth.uid()
    )
  );
```

**RLS on `messages`** — participant in conversation can read/write:
```sql
CREATE POLICY "message_participant_select" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (
          c.parent_id = auth.uid()
          OR EXISTS (SELECT 1 FROM teachers t WHERE t.id = c.teacher_id AND t.user_id = auth.uid())
        )
    )
  );
-- Same pattern for INSERT with WITH CHECK
```

**Realtime replication** — must add both tables to `supabase_realtime` publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```
This is a **manual Supabase dashboard step** (or can be in the migration SQL). Prior project migrations do not use `ALTER PUBLICATION`, so this is new. Confirmed the SQL syntax from Supabase docs. Important: Realtime `postgres_changes` respects RLS automatically — no extra authorization config needed for `postgres_changes` (unlike `broadcast`/`presence` which need `private: true`).

**Email rate-limiting** — Add `last_notified_at` to `conversations`:
```sql
ALTER TABLE conversations ADD COLUMN last_notified_at TIMESTAMPTZ;
```
The send-message API checks: if `now() - last_notified_at > 5 minutes`, send email and update `last_notified_at`. This is simple, atomic enough for the volume at this stage, and requires no background queue.

---

### API Layer

**`POST /api/messages`** — send a message (create conversation if needed, insert message, trigger email if rate window passed):
- Auth: `getUser()` — must be authenticated
- Body: `{ conversation_id?: string, teacher_id?: string, body: string }`
- If `conversation_id` is provided: verify the caller is a participant, then insert message
- If no `conversation_id` but `teacher_id`: upsert conversation (ON CONFLICT DO NOTHING + re-fetch), then insert message
- Rate-limit email: check `conversations.last_notified_at`, send if >5 min ago or null, then UPDATE `last_notified_at = NOW()`
- Returns: `{ message: MessageRow, conversation_id: string }`

**`GET /api/messages?conversation_id=xxx`** — fetch messages for a conversation:
- Auth: `getUser()` + participant check
- Returns: `{ messages: MessageRow[] }` ordered by `created_at ASC`
- Limit 100 most recent (pagination out of scope for M010)

**`GET /api/conversations`** — list all conversations for the logged-in user:
- Auth: `getUser()`
- For teacher: join `teachers` to get teacher_id, then fetch conversations where `teacher_id = teacher.id` + join most recent message + parent user email (via `supabaseAdmin.auth.admin.getUserById`)
- For parent: fetch conversations where `parent_id = user.id` + join most recent message + teacher name
- **Recipient email lookup**: `supabaseAdmin.auth.admin.getUserById(userId)` — confirmed the admin client (`SUPABASE_SERVICE_SECRET_KEY`) supports this; no current use in the codebase but the method exists on `@supabase/supabase-js` admin API. Alternative: store parent email in `conversations` table at creation time (simpler, avoids admin auth call per row). **Preferred approach**: denormalize `parent_email TEXT` onto `conversations` at INSERT time, populated from `getUser().email`. Teacher name comes from `teachers` join. This avoids admin API complexity entirely.

---

### Supabase Realtime Integration

The client-side chat component will use the browser Supabase client to subscribe to message inserts:

```typescript
const supabase = createClient() // browser client
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      setMessages(prev => [...prev, payload.new as MessageRow])
    }
  )
  .subscribe()

// Cleanup in useEffect return:
return () => { supabase.removeChannel(channel) }
```

Key facts:
- `postgres_changes` **does not** need `private: true` — RLS on `messages` table filters automatically
- The `filter` param (`conversation_id=eq.xxx`) narrows the WAL broadcast efficiently
- **Must enable Realtime on messages table** via `ALTER PUBLICATION supabase_realtime ADD TABLE messages` — this must be in the migration SQL or it won't work in production
- `channel.unsubscribe()` + `supabase.removeChannel(channel)` in `useEffect` cleanup to prevent leaks
- If subscription drops (network) — Supabase client auto-reconnects, so no manual reconnect logic needed

---

### Email Notification (MSG-03)

**New email template**: `src/emails/NewMessageEmail.tsx` — minimal React Email component showing sender name, message preview (first 200 chars), and a CTA button to the conversation.

**Recipient email resolution**:
- If recipient is teacher: use `teachers.social_email` (same pattern as all existing email sends)
- If recipient is parent: use the `parent_email` denormalized on `conversations` table

**Rate limiting**: tracked via `conversations.last_notified_at` column. The POST `/api/messages` route:
1. Determines recipient (whoever is NOT the sender)
2. Checks `last_notified_at` — skip email if within 5-minute window
3. Sends email via existing `resend` client (same pattern as `src/lib/email.ts`)
4. Updates `last_notified_at = NOW()` on the conversation row

No background job needed. Email send is inline in the route handler. Failure to send email should NOT fail the message insert — wrap email send in try/catch.

---

### Nav Updates

**ParentSidebar / ParentMobileNav / parent-nav.ts** — add Messages nav item:
- Icon: `MessageSquare` from lucide-react
- href: `/parent/messages`
- `parent-nav.ts`: add `{ href: '/parent/messages', label: 'Messages', icon: MessageSquare }`

**Teacher dashboard** — teacher needs a messages page too. Add to `src/lib/nav.ts`:
- `{ href: '/dashboard/messages', label: 'Messages', icon: MessageSquare }`
- Position: after Sessions (or near bottom)

The teacher messages page lives at `src/app/(dashboard)/dashboard/messages/page.tsx`. The parent messages page lives at `src/app/(parent)/parent/messages/page.tsx` and `src/app/(parent)/parent/messages/[conversationId]/page.tsx`.

---

### UI Component Plan

Three page surfaces:

1. **Conversation list page** (`/parent/messages`, `/dashboard/messages`):
   - Server component. Fetches conversations via `GET /api/conversations`.
   - Lists conversations: teacher/parent name + last message preview + timestamp.
   - "Start conversation" CTA for parent (picks teacher from booking history).

2. **Chat page** (`/parent/messages/[id]`, `/dashboard/messages/[id]`):
   - `'use client'` component (needs Realtime subscription).
   - Initial messages fetched server-side or via API on mount.
   - `ChatWindow` component: scrollable message list + sticky input bar.
   - `useEffect` mounts Realtime subscription, cleans up on unmount.
   - Message send: POST to `/api/messages`, optimistic append to local state.

3. **Message input**:
   - `Textarea` from `src/components/ui/textarea.tsx` (already installed).
   - Cmd/Ctrl+Enter or button submit.
   - Disable while sending.

Shared component: `src/components/messaging/ChatWindow.tsx` (used by both teacher and parent pages to avoid duplication).

---

### File Map

**New files:**
- `supabase/migrations/0019_messaging.sql`
- `src/app/api/messages/route.ts` (GET + POST)
- `src/app/api/conversations/route.ts` (GET)
- `src/components/messaging/ChatWindow.tsx`
- `src/app/(parent)/parent/messages/page.tsx`
- `src/app/(parent)/parent/messages/[conversationId]/page.tsx`
- `src/app/(dashboard)/dashboard/messages/page.tsx`
- `src/app/(dashboard)/dashboard/messages/[conversationId]/page.tsx`
- `src/emails/NewMessageEmail.tsx`
- `src/__tests__/messaging.test.ts`

**Modified files:**
- `src/lib/parent-nav.ts` — add Messages nav item
- `src/lib/nav.ts` — add Messages nav item for teacher dashboard
- `src/components/parent/ParentSidebar.tsx` — (auto-picks up from parent-nav.ts)
- `src/components/parent/ParentMobileNav.tsx` — (auto-picks up from parent-nav.ts)
- `src/components/dashboard/MobileBottomNav.tsx` — add Messages tab (may need manual addition)
- `src/components/dashboard/Sidebar.tsx` — (auto-picks up from nav.ts)

---

## Key Risks and Constraints

1. **Realtime replication must be enabled** via `ALTER PUBLICATION supabase_realtime ADD TABLE messages` — include this in migration 0019. Without it, `postgres_changes` subscriptions are silently ignored. This is a production-blocking requirement.

2. **RLS on `conversations` requires a subquery join to `teachers`** — the teacher's `auth.uid()` is not directly in `conversations.teacher_id` (that FK points to `teachers.id`). The pattern `EXISTS (SELECT 1 FROM teachers WHERE id = teacher_id AND user_id = auth.uid())` is proven in other policies in this project (see migration 0001, bookings RLS lines 113-121).

3. **Parent email for notification** — stored as `parent_email TEXT` on `conversations` at creation time (from `getUser().email`). This avoids the admin auth API and is consistent with the pattern used throughout (`parent_email` on `bookings`). If parent changes auth email, old conversations retain the old email — acceptable for M010 scope.

4. **MobileBottomNav for teacher** — `src/components/dashboard/MobileBottomNav.tsx` constructs its items from `navItems` in `src/lib/nav.ts`. Adding Messages to `nav.ts` will auto-add it. But the nav has 10 items already — adding an 11th may overflow. Check if it renders icon-only (it does — no labels), so 11 icons is visually acceptable. The teacher mobile nav was designed with 10 icons (Inbox, Sessions, Students, Waitlist, Page, Availability, Promote, Analytics, Settings, Sign Out). May want to review the spacing, but not a blocker.

5. **First use of Realtime** — no reconnection handling needed (Supabase client auto-reconnects), but the subscription status should be surfaced to the user if SUBSCRIBED state is never reached (e.g., if Realtime is not enabled on the table). Consider showing a "Live updates unavailable" indicator if status !== 'SUBSCRIBED' after a timeout.

6. **Rate-limit is per-conversation, not per-sender** — this means if both teacher and parent are active in a thread, they each get at most one email per 5 minutes from the OTHER party. The `last_notified_at` approach conflates "last time any email was sent in this conversation" with per-recipient rate limiting. Simpler, and sufficient for M010 scope.

---

## Recommended Task Decomposition

**T01 — Schema + API routes (migration + /api/messages + /api/conversations)**
- Create migration 0019 (conversations, messages, RLS, replication)
- `/api/conversations` GET
- `/api/messages` GET + POST (with email send + rate limit)
- `NewMessageEmail.tsx` template
- Verify: tsc clean, POST creates message, email send path reached

**T02 — Nav updates + conversation list pages**
- Update `src/lib/parent-nav.ts` and `src/lib/nav.ts` with Messages
- Parent messages list page (`/parent/messages`)
- Teacher messages list page (`/dashboard/messages`)
- Verify: pages render, nav item active, tsc clean

**T03 — Chat UI with Realtime**
- `ChatWindow` shared component with Realtime subscription hook
- Parent chat page (`/parent/messages/[conversationId]`)
- Teacher chat page (`/dashboard/messages/[conversationId]`)
- Verify: messages send/receive in UI, Realtime subscription mounted/cleaned up

**T04 — Test coverage**
- `src/__tests__/messaging.test.ts`: API route tests (auth guards, participant checks, rate limit logic, email send/skip logic)
- Verify: targeted tests pass, full suite passes, tsc clean

---

## Skills Discovered

No new skills installed — React Email, Resend, Supabase are all already in use and documented in the codebase. Supabase Realtime docs fetched via `get_library_docs` confirmed the subscription pattern and RLS interaction.
