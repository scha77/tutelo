import { Ratelimit, type Duration } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import * as Sentry from '@sentry/nextjs'

/**
 * Distributed rate limiter backed by Upstash Redis.
 *
 * Provides a `checkLimit(ip, endpointKey, opts)` API that returns
 * whether a request is allowed. Fails open on missing env vars or
 * Redis errors — never blocks traffic due to infrastructure issues.
 *
 * Ratelimit instances are cached per {max, window} tuple so different
 * endpoints can have different limits without creating redundant clients.
 *
 * The old in-memory rate limiter at `src/lib/utils/rate-limit.ts`
 * remains for callers that haven't migrated yet.
 */

export type { Duration }

export interface CheckLimitResult {
  allowed: boolean
  remaining?: number
  reset?: number
}

// Cache Ratelimit instances keyed by "max:window" to avoid
// re-creating clients for the same configuration
const instances = new Map<string, Ratelimit>()

function getOrCreateLimiter(max: number, window: Duration): Ratelimit {
  const cacheKey = `${max}:${window}`
  const existing = instances.get(cacheKey)
  if (existing) return existing

  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(max, window),
  })

  instances.set(cacheKey, limiter)
  return limiter
}

/**
 * Check whether a request should be allowed under the rate limit.
 *
 * @param ip        - Client IP address
 * @param endpointKey - Logical endpoint name (e.g. 'api/contact', 'api/booking')
 * @param opts.max  - Maximum requests allowed in the window
 * @param opts.window - Time window (e.g. '1 m', '10 s', '1 h') — Upstash Duration format
 * @returns `{ allowed, remaining, reset }` — always resolves, never throws
 */
export async function checkLimit(
  ip: string,
  endpointKey: string,
  opts: { max: number; window: Duration }
): Promise<CheckLimitResult> {
  try {
    // Fail open when Upstash is not configured
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      console.warn('Rate limiting disabled: missing UPSTASH env vars')
      return { allowed: true }
    }

    const limiter = getOrCreateLimiter(opts.max, opts.window)
    const compositeKey = `${endpointKey}:${ip}`
    const result = await limiter.limit(compositeKey)

    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    // Fail open — never block traffic due to rate-limiter failure
    Sentry.captureException(error)
    return { allowed: true }
  }
}
