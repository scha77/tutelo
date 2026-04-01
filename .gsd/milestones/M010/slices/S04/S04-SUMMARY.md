---
id: S04
parent: M010
milestone: M010
provides:
  - conversations + messages DB tables with RLS, indexes, and Realtime publication (migration 0019)
  - POST /api/messages with conversation upsert and rate-limited email notifications
  - GET /api/messages with participant validation and ordered results
  - GET /api/conversations with last-message preview and role detection
  - ChatWindow client component — reusable for future messaging features
  - Messages nav items in both teacher and parent sidebar navigation
  - NewMessageEmail React Email template
  - 21 unit tests covering all messaging API paths
requires:
  - slice: S01
    provides: Parent account model (auth.users for parent_id FK in conversations table), parent dashboard routing infrastructure, ParentSidebar (picks up new Messages nav item from parentNavItems)
affects:
  - S05 (Admin Dashboard) — no dependency on S04, but admin activity feed may want to surface recent messages if desired
key_files:
  - supabase/migrations/0019_messaging.sql
  - src/app/api/messages/route.ts
  - src/app/api/conversations/route.ts
  - src/emails/NewMessageEmail.tsx
  - src/lib/nav.ts
  - src/lib/parent-nav.ts
  - src/app/(parent)/parent/messages/page.tsx
  - src/app/(dashboard)/dashboard/messages/page.tsx
  - src/components/messaging/ChatWindow.tsx
  - src/app/(parent)/parent/messages/[conversationId]/page.tsx
  - src/app/(dashboard)/dashboard/messages/[conversationId]/page.tsx
  - src/__tests__/messaging.test.ts
key_decisions:
  - One conversation per teacher+parent pair enforced by UNIQUE(teacher_id, parent_id) with race-condition-safe 23505 handler in POST /api/messages
  - Only parents can initiate new conversations via teacherId; teachers must reply to existing conversations via conversationId
  - Server component list pages query supabaseAdmin directly instead of fetching internal /api/conversations — matches project convention
  - ChatWindow receives initialMessages as props from server component — no client-side fetch on mount, just Realtime for live updates
  - Optimistic send with rollback: message appended immediately with temp ID, removed on failure, replaced with confirmed row when Realtime INSERT arrives
  - Realtime deduplication: incoming INSERT events check for existing message ID and replace optimistic version rather than appending duplicate
  - Email send failures caught/logged but never fail the message insert — messaging availability > notification reliability
  - Email rate-limit at 5-minute cooldown per conversation via last_notified_at column — prevents spam from rapid message bursts
patterns_established:
  - First Supabase Realtime usage in the project: postgres_changes subscription on messages table, filtered by conversation_id, RLS automatically enforced, channel cleanup via supabase.removeChannel(channel) in useEffect return
  - Optimistic UI pattern in ChatWindow: assign temp ID → append to state → POST to API → replace temp with confirmed on success, rollback on failure
  - Server-component chat detail pages as thin wrappers: fetch initial data server-side, pass as props to client ChatWindow — zero client-side fetch on mount
observability_surfaces:
  - console.error('[POST /api/messages] Message insert failed:', error) — DB insert failures logged to server console
  - console.error('[POST /api/messages] Email notification failed:', err) — email failures logged separately, never surfaced to caller
  - console.warn('[messaging-email] No email for recipient...') — missing recipient email logged as warning
  - console.error('[ChatWindow] Send failed:', err) — client-side send failures logged to browser console
  - console.error('[ChatWindow] Network error:', err) — network failures on message send logged to browser console
drill_down_paths:
  - .gsd/milestones/M010/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M010/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M010/slices/S04/tasks/T03-SUMMARY.md
  - .gsd/milestones/M010/slices/S04/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-04-01T14:23:16.615Z
blocker_discovered: false
---

# S04: Teacher-Parent Messaging

**Built full teacher-parent messaging: DB schema + RLS + Realtime publication, three API routes, ChatWindow client component with live Supabase Realtime subscription and optimistic send, conversation list + chat detail pages for both roles, rate-limited email notifications, and 21 passing unit tests.**

## What Happened

S04 delivered a complete text-only messaging system between teachers and parents in four tasks with zero blockers and clean TypeScript throughout.

**T01 — Backend infrastructure**: Migration 0019 creates `conversations` (one per teacher+parent pair, enforced by UNIQUE constraint) and `messages` (text body, 1–2000 chars enforced by CHECK constraints, indexed by conversation_id+created_at). RLS policies restrict reads and writes to conversation participants. `messages` is published to `supabase_realtime` for live delivery. Three API routes handle all messaging operations: `GET /api/messages?conversationId=<uuid>` returns ordered messages with participant verification; `POST /api/messages` accepts either a `conversationId` (existing thread) or `teacherId` (first message — triggers conversation upsert with race-condition-safe 23505 handler); `GET /api/conversations` returns all threads for the caller with last-message preview and role-auto-detection. `NewMessageEmail` React Email template with sender name, message preview, and deep-link to the correct dashboard. Rate-limit: `last_notified_at` on conversations is checked before sending — emails are suppressed when < 5 minutes have elapsed since the last notification for that conversation. Email failures are caught and logged but never fail the message insert.

**T02 — Navigation + conversation list pages**: `MessageSquare` icon + Messages nav item added to `src/lib/nav.ts` (teacher, `/dashboard/messages`) and `src/lib/parent-nav.ts` (parent, `/parent/messages`). Two server-component list pages query `supabaseAdmin` directly (project convention — avoids fragile cookie-forwarding via internal fetch), resolve participant display names, render linked conversation cards with last-message preview truncated to 100 chars, "You:" prefix for own messages, relative timestamps via `date-fns formatDistanceToNow`, and empty-state guidance.

**T03 — ChatWindow + chat detail pages**: `src/components/messaging/ChatWindow.tsx` is a `'use client'` component that: receives `initialMessages` + conversation metadata as props; sets up a `postgres_changes` subscription filtered by `conversation_id`; deduplicates incoming events (replaces optimistic placeholder when confirmed UUID arrives); handles sending via `POST /api/messages` with optimistic local append and rollback on network failure; auto-scrolls to bottom on new messages; supports Enter-to-send (Shift+Enter for newlines); cleans up the channel on unmount. Two thin server-component wrapper pages at `/parent/messages/[conversationId]` and `/dashboard/messages/[conversationId]` verify participant access, fetch initial messages ordered by `created_at`, resolve participant names, and render ChatWindow.

**T04 — Tests**: 21 tests in `src/__tests__/messaging.test.ts` covering all four describe blocks — POST /api/messages (auth, validation, participant checks, message creation, conversation auto-creation, teacher restriction), email rate-limiting (null/stale/recent `last_notified_at`, email failure resilience), GET /api/messages (auth, validation, participant check, ordered results), GET /api/conversations (auth, teacher role, parent role, body truncation). Key implementation detail: Resend mock uses `function()` (not arrow function) because the route calls `new Resend()` at module scope. Full suite: 465 tests across 49 files, 0 failures, 0 regressions.

## Verification

All slice-level verification checks passed:
- `npx tsc --noEmit` → 0 errors
- `test -f supabase/migrations/0019_messaging.sql` → ✅
- `grep -q 'supabase_realtime' supabase/migrations/0019_messaging.sql` → ✅
- `test -f src/app/api/messages/route.ts` → ✅
- `test -f src/app/api/conversations/route.ts` → ✅
- `test -f src/emails/NewMessageEmail.tsx` → ✅
- `grep -q 'Messages' src/lib/parent-nav.ts` → ✅
- `grep -q 'Messages' src/lib/nav.ts` → ✅
- `test -f src/app/(parent)/parent/messages/page.tsx` → ✅
- `test -f src/app/(dashboard)/dashboard/messages/page.tsx` → ✅
- `test -f src/components/messaging/ChatWindow.tsx` → ✅
- `test -f src/app/(parent)/parent/messages/[conversationId]/page.tsx` → ✅
- `test -f src/app/(dashboard)/dashboard/messages/[conversationId]/page.tsx` → ✅
- `npx vitest run src/__tests__/messaging.test.ts` → 21/21 pass
- `npx vitest run` (full suite) → 465/465 pass, 49 files, 0 failures

## Requirements Advanced

- PARENT-06 — Full in-app messaging implemented: conversations table with one thread per teacher-parent relationship, messages table, three API routes, ChatWindow with Realtime live updates, conversation list and detail pages for both roles, email notifications
- MSG-01 — conversations table with UNIQUE(teacher_id, parent_id) + messages table; thread auto-created on first message; both teacher and parent can send
- MSG-02 — ChatWindow subscribes to postgres_changes on messages filtered by conversation_id; new messages appear instantly without page refresh; deduplication handles optimistic-send race
- MSG-03 — Rate-limited email via Resend on every new message; 5-min cooldown per conversation; NewMessageEmail template with preview and deep link; failures never block message insert

## Requirements Validated

- PARENT-06 — tsc clean, all 13 output files exist, 21/21 messaging unit tests pass, full suite 465 tests 0 failures
- MSG-01 — migration 0019 has UNIQUE(teacher_id, parent_id); T04 tests confirm auto-creation and reuse of existing conversation
- MSG-02 — ChatWindow postgres_changes subscription implemented with filter + deduplication + cleanup; messages table added to supabase_realtime publication in migration 0019
- MSG-03 — T04 email rate-limiting tests: email sent when last_notified_at null, sent when stale (>5min), skipped when recent (<5min), message insert succeeds even when email throws

## New Requirements Surfaced

- Unread message count / badge on nav items would improve discoverability — needs read_at column or separate reads table (not scoped to S04)

## Requirements Invalidated or Re-scoped

None.

## Deviations

Server component conversation list pages query supabaseAdmin directly rather than fetching internal /api/conversations. This matches the established project convention and avoids cookie-forwarding complexity — deviates from the T02 plan statement but is functionally correct and consistent with all other pages.

## Known Limitations

- Supabase Realtime is not enabled automatically from the migration in production — operator must run `ALTER PUBLICATION supabase_realtime ADD TABLE messages` in the production DB (or apply migration 0019) before live updates work in the deployed environment.
- No read receipts or unread message counts — thread shows all messages flat with no unread indicators. 
- Parent-to-teacher conversation initiation only; teachers reply via conversationId. Teachers cannot cold-start a conversation with a parent who hasn't messaged first.
- Email recipient resolution for parents uses `supabaseAdmin.auth.admin.getUserById` — works only server-side. Parent email must exist in Supabase Auth (always true for registered parents).

## Follow-ups

- Apply migration 0019 to production Supabase to enable Realtime on messages table.
- Consider unread badge count on Messages nav items (requires a `read_at` column or a separate reads table).
- Mobile layout of ChatWindow may need fixed-height adjustment for small viewports with soft keyboards — current `h-[calc(100vh-4rem)]` may clip on iOS.

## Files Created/Modified

- `supabase/migrations/0019_messaging.sql` — New migration: conversations + messages tables with RLS, CHECK constraints, indexes, UNIQUE(teacher_id, parent_id), and supabase_realtime publication
- `src/app/api/messages/route.ts` — New: GET (fetch ordered messages) + POST (send message, conversation upsert, rate-limited email notification)
- `src/app/api/conversations/route.ts` — New: GET (list conversations for authenticated user with last-message preview, role auto-detection)
- `src/emails/NewMessageEmail.tsx` — New React Email template: sender name, message preview, deep link to conversation
- `src/lib/nav.ts` — Added Messages nav item (MessageSquare icon, /dashboard/messages) to teacher sidebar navItems
- `src/lib/parent-nav.ts` — Added Messages nav item (MessageSquare icon, /parent/messages) to parent sidebar parentNavItems
- `src/app/(parent)/parent/messages/page.tsx` — New: server-component conversation list page for parents — shows all threads with teacher names, last-message preview, relative timestamps
- `src/app/(dashboard)/dashboard/messages/page.tsx` — New: server-component conversation list page for teachers — shows all threads with parent names, last-message preview, relative timestamps
- `src/components/messaging/ChatWindow.tsx` — New: 'use client' component with Realtime subscription, optimistic send+rollback, deduplication, auto-scroll, Enter-to-send
- `src/app/(parent)/parent/messages/[conversationId]/page.tsx` — New: thin server-component wrapper for parent chat — fetches initial messages, resolves teacher name, renders ChatWindow
- `src/app/(dashboard)/dashboard/messages/[conversationId]/page.tsx` — New: thin server-component wrapper for teacher chat — fetches initial messages, resolves parent name, renders ChatWindow
- `src/__tests__/messaging.test.ts` — New: 21 tests across POST /api/messages, email rate-limiting, GET /api/messages, GET /api/conversations
