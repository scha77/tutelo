import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── hoisted mocks ────────────────────────────────────────────────────
const { limitMock, MockRatelimit, captureExceptionMock } = vi.hoisted(() => {
  const limitMock = vi.fn()

  class MockRatelimit {
    limit = limitMock
    static slidingWindow(_max: number, _window: string) {
      return 'sliding-window-stub'
    }
  }

  const captureExceptionMock = vi.fn()

  return { limitMock, MockRatelimit, captureExceptionMock }
})

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: MockRatelimit,
}))

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: vi.fn(() => ({})) },
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: captureExceptionMock,
}))

// ── import after mocks ──────────────────────────────────────────────
import { checkLimit } from '@/lib/rate-limit'

// ── test suite ──────────────────────────────────────────────────────
describe('checkLimit', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    // Save and set required env vars
    savedEnv.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
    savedEnv.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token-abc123'

    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original env
    if (savedEnv.UPSTASH_REDIS_REST_URL === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL
    } else {
      process.env.UPSTASH_REDIS_REST_URL = savedEnv.UPSTASH_REDIS_REST_URL
    }
    if (savedEnv.UPSTASH_REDIS_REST_TOKEN === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = savedEnv.UPSTASH_REDIS_REST_TOKEN
    }
  })

  it('allows requests under the limit', async () => {
    limitMock.mockResolvedValue({
      success: true,
      remaining: 9,
      reset: Date.now() + 60_000,
    })

    const result = await checkLimit('192.168.1.1', 'api/contact', {
      max: 10,
      window: '1 m',
    })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
    expect(result.reset).toBeTypeOf('number')
  })

  it('blocks requests over the limit', async () => {
    const resetTime = Date.now() + 60_000
    limitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: resetTime,
    })

    const result = await checkLimit('10.0.0.1', 'api/booking', {
      max: 5,
      window: '1 m',
    })

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.reset).toBe(resetTime)
  })

  it('uses composite key (endpointKey:ip)', async () => {
    limitMock.mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 30_000,
    })

    await checkLimit('1.2.3.4', 'waitlist', { max: 10, window: '1 m' })

    expect(limitMock).toHaveBeenCalledWith('waitlist:1.2.3.4')
  })

  it('uses independent composite keys for different endpoints', async () => {
    limitMock.mockResolvedValue({
      success: true,
      remaining: 9,
      reset: Date.now() + 60_000,
    })

    await checkLimit('5.6.7.8', 'api/contact', { max: 10, window: '1 m' })
    await checkLimit('5.6.7.8', 'api/booking', { max: 10, window: '1 m' })

    expect(limitMock).toHaveBeenCalledTimes(2)
    expect(limitMock).toHaveBeenCalledWith('api/contact:5.6.7.8')
    expect(limitMock).toHaveBeenCalledWith('api/booking:5.6.7.8')
  })

  it('fails open on Redis error and reports to Sentry', async () => {
    const redisError = new Error('connection refused')
    limitMock.mockRejectedValue(redisError)

    const result = await checkLimit('10.0.0.1', 'api/contact', {
      max: 10,
      window: '1 m',
    })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeUndefined()
    expect(captureExceptionMock).toHaveBeenCalledOnce()
    expect(captureExceptionMock).toHaveBeenCalledWith(redisError)
  })

  it('fails open when env vars missing and warns without Sentry', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await checkLimit('10.0.0.1', 'api/contact', {
      max: 10,
      window: '1 m',
    })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeUndefined()
    expect(captureExceptionMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      'Rate limiting disabled: missing UPSTASH env vars'
    )

    warnSpy.mockRestore()
  })
})
