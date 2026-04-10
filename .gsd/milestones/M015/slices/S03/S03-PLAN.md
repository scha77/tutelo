# S03: Rate Limiting Primitive

**Goal:** Build the rate-limit primitive without wiring it to any endpoints yet. Isolates the decision of which store to use (Upstash vs Vercel KV vs header-based) and lets us unit-test it in isolation.
**Demo:** After this: After this: A rate-limiting helper is available at `src/lib/rate-limit.ts` backed by a distributed store. Calling `checkLimit(ip, 'endpoint-key', { max: 10, window: '1m' })` returns allowed/blocked.

## Tasks
