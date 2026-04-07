---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T02: Fix messaging.test.ts — update conversations mock chain for batch .or() pattern

In the 'GET /api/conversations' describe block, replace the 3rd `fromMock.mockReturnValueOnce(...)` in each of the 3 failing tests with the new `.select().or()` chain shape. The `.or()` call returns an array of `{ conversation_id, body, sender_id, created_at }` objects (one per conversation). All other test blocks (POST /api/messages, email rate-limiting, GET /api/messages) are already passing — do not change them.

## Inputs

- `src/app/api/conversations/route.ts`

## Expected Output

- `src/__tests__/messaging.test.ts (fixed mock chains)`

## Verification

npx vitest run src/__tests__/messaging.test.ts — 0 failures
