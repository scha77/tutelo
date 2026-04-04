/**
 * Simple in-memory rate limiter for serverless environments.
 * Each warm instance tracks its own counters — not globally coordinated,
 * but sufficient to curb abuse on low-traffic public endpoints.
 */

const store = new Map<string, { count: number; resetAt: number }>()

// Periodically prune expired entries to avoid unbounded memory growth
const PRUNE_INTERVAL = 60_000
let lastPrune = Date.now()

function prune(now: number) {
  if (now - lastPrune < PRUNE_INTERVAL) return
  lastPrune = now
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key)
  }
}

/**
 * Returns true if the request should be allowed, false if rate-limited.
 */
export function rateLimit(
  key: string,
  { maxRequests = 10, windowMs = 60_000 } = {}
): boolean {
  const now = Date.now()
  prune(now)

  const entry = store.get(key)
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  entry.count++
  return entry.count <= maxRequests
}
