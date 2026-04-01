# S04: Teacher-Parent Messaging — UAT

**Milestone:** M010
**Written:** 2026-04-01T14:23:16.616Z

# S04 UAT: Teacher-Parent Messaging

## Preconditions
- Local dev server running with Supabase migrations applied through 0019
- Two test accounts: one teacher account (has a teachers row), one parent account (parent-only, no teachers row)
- Both accounts logged in in separate browsers or incognito windows
- Supabase Realtime enabled on the messages table (migration 0019 adds it via `ALTER PUBLICATION supabase_realtime ADD TABLE messages`)

---

## Test Suite

### TC-01: Parent initiates first message to teacher (creates conversation)

**Preconditions:** No existing conversation between this teacher and parent.

1. Parent logs in → navigates to `/parent/messages`
2. **Expected:** Empty state message: guidance to message a teacher (e.g., from their profile page)
3. Parent navigates to teacher's profile page → clicks a "Message" link/button (if wired) or directly navigates to a known teacher's page
4. Parent sends first message via POST /api/messages with `teacherId`
5. **Expected:** 201 response; conversation is created; parent is redirected to `/parent/messages/<conversationId>`
6. **Expected:** ChatWindow displays the sent message aligned right (own message)
7. Teacher navigates to `/dashboard/messages`
8. **Expected:** Conversation appears in teacher's list with parent name, message preview (truncated to 100 chars), relative timestamp

---

### TC-02: Real-time delivery — teacher replies, parent sees it instantly

**Preconditions:** TC-01 complete; parent's ChatWindow open in browser A; teacher in ChatWindow in browser B.

1. Teacher opens conversation in `/dashboard/messages/<conversationId>`
2. Teacher types a reply and presses Enter (or clicks Send button)
3. **Expected:** Message appears in teacher's ChatWindow immediately (optimistic send — visible before API confirms, slightly faded `opacity-70`)
4. **Expected:** Within 1-2 seconds, message appears in parent's ChatWindow in browser A **without any page refresh**
5. **Expected:** Received message is aligned left (other participant), displayed with `bg-muted` style

---

### TC-03: Optimistic send with confirmed replace

1. Parent sends a message
2. **Expected:** Message appears immediately in ChatWindow with slightly faded styling (`_optimistic: true`)
3. After API confirms, **Expected:** Message styling becomes full opacity (confirmed row replaces optimistic placeholder)
4. No duplicate message appears in the list

---

### TC-04: Second message reuses existing conversation (no new thread)

**Preconditions:** TC-01 complete (conversation exists).

1. Parent navigates to `/parent/messages` → clicks the existing conversation
2. Parent sends another message (this time with `conversationId`, not `teacherId`)
3. **Expected:** Message posted to the existing conversation — no second conversation is created for the same teacher+parent pair
4. Teacher's `/dashboard/messages` **Expected:** Still shows one conversation thread, updated last-message preview

---

### TC-05: Conversation list last-message preview and timestamps

1. Teacher has two or more conversations with different parents
2. Teacher navigates to `/dashboard/messages`
3. **Expected:** Each conversation card shows the other participant's name, last message body (truncated to ~100 chars if long), "You:" prefix when last message was from teacher, relative timestamp (e.g., "3 minutes ago", "2 days ago")
4. **Expected:** Conversations sorted by `last_message_at DESC` (most recent first)

---

### TC-06: Messages nav item visible in both sidebars

1. Teacher logs in → **Expected:** "Messages" item with MessageSquare icon visible in desktop sidebar and mobile bottom nav
2. Parent logs in → **Expected:** "Messages" item visible in parent sidebar and mobile nav
3. Clicking Messages link navigates to correct route (`/dashboard/messages` for teacher, `/parent/messages` for parent)

---

### TC-07: Email notification sent on first message

**Preconditions:** Teacher has a `social_email` set. `RESEND_API_KEY` configured.

1. Parent sends first message to teacher
2. **Expected:** Teacher receives email notification: subject "New message from [Parent Name]", contains message preview, link to `/dashboard/messages/<conversationId>`
3. `conversations.last_notified_at` is updated in DB

---

### TC-08: Email rate-limit — rapid messages suppress redundant emails

**Preconditions:** An existing conversation where `last_notified_at` was updated < 5 minutes ago.

1. Parent sends 3 messages in quick succession (< 5 minutes from last notification)
2. **Expected:** Only the first message (or the message that reset the timer) triggers an email; subsequent messages within the 5-minute window do not send additional emails
3. After 5 minutes elapses, next message **Expected:** triggers a new email

---

### TC-09: Non-participant cannot read or send messages (403 guard)

1. Authenticated user who is **not** a participant in conversation `X` attempts `GET /api/messages?conversationId=X`
2. **Expected:** 403 Forbidden response: `{"error": "Not a participant in this conversation"}`
3. Same user attempts `POST /api/messages` with `conversationId: X` and a valid body
4. **Expected:** 403 Forbidden

---

### TC-10: Unauthenticated request returns 401

1. Call `GET /api/messages?conversationId=<any-uuid>` without a valid session cookie
2. **Expected:** 401 Unauthorized
3. Call `POST /api/messages` without session
4. **Expected:** 401 Unauthorized
5. Call `GET /api/conversations` without session
6. **Expected:** 401 Unauthorized

---

### TC-11: Message validation — empty body rejected

1. Authenticated participant sends `POST /api/messages` with body: `{"conversationId": "<valid>", "body": ""}`
2. **Expected:** 400 Bad Request with Zod validation error (body is required / cannot be blank)
3. Send with body of all whitespace: `{"body": "   "}`
4. **Expected:** 400 Bad Request (refine check: `val.trim().length > 0`)

---

### TC-12: Message validation — body exceeds 2000 chars rejected

1. Send `POST /api/messages` with a body of 2001 characters
2. **Expected:** 400 Bad Request: "Message must be 2000 characters or less"
3. Send with exactly 2000 characters
4. **Expected:** 201 Created — boundary is inclusive

---

### TC-13: Teacher cannot initiate conversation via teacherId

1. Authenticated teacher sends `POST /api/messages` with `{"teacherId": "<some-teacher-uuid>", "body": "Hello"}`
2. **Expected:** 400 Bad Request: "Teachers must use conversationId to reply. Only parents can start new conversations."

---

### TC-14: Realtime cleanup — no memory leak on navigation

1. Open a chat page (ChatWindow subscribes to Realtime)
2. Navigate away from the chat page
3. **Expected:** No Supabase Realtime channel warnings in browser console about stale channels
4. Navigate back to chat page — **Expected:** A fresh subscription is established

---

### TC-15: ChatWindow Enter-to-send, Shift+Enter for newline

1. Parent focuses the message textarea
2. Types a message, presses **Enter**
3. **Expected:** Message sent (handleSend called); textarea cleared
4. Types a message, presses **Shift+Enter**
5. **Expected:** Newline inserted in textarea; message NOT sent

---

### TC-16: Optimistic rollback on send failure

1. Disable network or intercept `/api/messages` to return 500
2. Parent sends a message
3. **Expected:** Optimistic message appears briefly in ChatWindow
4. **Expected:** After failure response, optimistic message is removed from the list
5. **Expected:** Error logged to browser console (`[ChatWindow] Send failed:`)

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Teacher has no conversations | `/dashboard/messages` shows empty state with guidance |
| Parent has no conversations | `/parent/messages` shows empty state with guidance |
| Message body = exactly 1 char | 201 Created (min length = 1) |
| Last-message preview > 100 chars | Truncated to 100 chars in conversation list card |
| Recipient has no email address (`social_email` null for teacher, no auth email for parent) | Warning logged, no email sent, message still saved successfully |
| Two parents simultaneously send first message to same teacher (race condition) | Both succeed — 23505 unique constraint violation on second insert is caught, second insert re-selects the winning conversation row |

