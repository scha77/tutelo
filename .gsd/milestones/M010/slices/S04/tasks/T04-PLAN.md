---
estimated_steps: 7
estimated_files: 1
skills_used: []
---

# T04: Add messaging test coverage for API routes and email rate-limiting

Write comprehensive unit tests for the messaging API routes covering auth guards, participant validation, message creation, conversation auto-creation, email rate-limit logic, and conversation listing.

Follow the established test pattern from `src/__tests__/parent-children.test.ts`: vi.mock supabase server/service modules, mock getUser for auth, mock supabaseAdmin.from() chains for DB operations, test each route handler directly.

Test areas:
- POST /api/messages: unauthenticated → 401, non-participant → 403, valid message creation, conversation auto-creation when teacher_id provided without conversation_id, empty body → 400, body > 2000 chars → 400
- POST /api/messages email: email sent when last_notified_at is null, email sent when last_notified_at > 5 min ago, email skipped when last_notified_at < 5 min ago, email failure doesn't fail message insert
- GET /api/messages: unauthenticated → 401, returns messages ordered by created_at, non-participant → 403
- GET /api/conversations: unauthenticated → 401, returns conversations for teacher role, returns conversations for parent role, includes last message preview

## Inputs

- ``src/app/api/messages/route.ts` — message API route to test (created in T01)`
- ``src/app/api/conversations/route.ts` — conversations API route to test (created in T01)`
- ``src/__tests__/parent-children.test.ts` — established test pattern (vi.mock, auth setup, supabaseAdmin mock chains)`
- ``src/emails/NewMessageEmail.tsx` — email template import (created in T01, needs to be mockable)`

## Expected Output

- ``src/__tests__/messaging.test.ts` — comprehensive test file covering POST/GET /api/messages auth guards, participant checks, message creation, conversation auto-creation, email rate-limit logic, GET /api/conversations auth and role-based listing`

## Verification

npx vitest run src/__tests__/messaging.test.ts && npx vitest run
