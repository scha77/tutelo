# S04: Wire Rate Limits to Public Endpoints — UAT

**Milestone:** M015
**Written:** 2026-04-10T05:20:31.334Z

## Preconditions
- Application running locally or in production with Upstash Redis configured (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set)
- A test IP address (use browser or curl)

## Test Cases

### TC-01: Waitlist rate limit (5/min)
1. POST `/api/waitlist` with valid body `{ "email": "test@example.com", "role": "parent" }` — 5 times in rapid succession
2. **Expected:** First 5 requests return 201 (or 409 if email already exists)
3. POST a 6th request within the same minute
4. **Expected:** Response is 429 with body `{ "error": "Too many requests" }`
5. Wait 60 seconds, POST again
6. **Expected:** Request succeeds (201 or 409) — limit has reset

### TC-02: Track-view rate limit (30/min)
1. POST `/api/track-view` with body `{ "teacherId": "valid-teacher-id" }` — 30 times
2. **Expected:** All 30 return 201
3. POST a 31st request within the same minute
4. **Expected:** Response is 429 with body `{ "error": "Too many requests" }`

### TC-03: Verify-email rate limit (5/min)
1. GET `/api/verify-email?token=any-token` — 5 times
2. **Expected:** Each returns normal response (redirect or error based on token validity)
3. Send a 6th GET within the same minute
4. **Expected:** Response is 429 JSON `{ "error": "Too many requests" }` (not a redirect)

### TC-04: Auth signIn rate limit (10/min)
1. Submit the login form with valid credentials 10 times
2. **Expected:** Normal auth behavior (success or validation error)
3. Submit an 11th time within the same minute
4. **Expected:** Form shows error message "Too many requests. Please try again later."
5. Confirm no Supabase auth call was made (observable via network tab — no call to Supabase auth endpoint on the 11th attempt)

### TC-05: Auth signUp rate limit (10/min)
1. Submit the signup form 10 times (even with invalid data)
2. **Expected:** Normal validation/auth behavior
3. Submit an 11th time within the same minute
4. **Expected:** Form shows error message "Too many requests. Please try again later."

### TC-06: Cross-endpoint isolation
1. Hit `/api/waitlist` 5 times (exhaust its limit)
2. Immediately hit `/api/track-view` once
3. **Expected:** Track-view returns 201 — each endpoint has its own bucket, not a shared global limit

### TC-07: Legitimate traffic unaffected
1. Submit one waitlist signup, one login, one page view, one email verification — all within 10 seconds
2. **Expected:** All four succeed — normal usage patterns are well within the limits

### Edge Cases
- **Missing x-forwarded-for header:** All endpoints fall back to `'unknown'` as the IP key. Rate limiting still applies (all requests without forwarded headers share one bucket).
- **Upstash unavailable:** If Redis is down, `checkLimit` should fail open (allow the request) or throw — verify behavior matches your operational posture. Currently checkLimit will throw, and the endpoint will return 500. Consider adding a try/catch wrapper if fail-open is preferred (not implemented in S04 — noted for future consideration).
