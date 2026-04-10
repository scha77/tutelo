import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── hoisted mocks ────────────────────────────────────────────────────

const { checkLimitMock, captureExceptionMock, supabaseFromMock, supabaseAuthMock, redirectMock, headersMock } = vi.hoisted(() => {
  const checkLimitMock = vi.fn()
  const captureExceptionMock = vi.fn()
  const supabaseFromMock = vi.fn()
  const supabaseAuthMock = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
  }
  const redirectMock = vi.fn()
  const headersMock = vi.fn()
  return { checkLimitMock, captureExceptionMock, supabaseFromMock, supabaseAuthMock, redirectMock, headersMock }
})

vi.mock('@/lib/rate-limit', () => ({
  checkLimit: checkLimitMock,
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: captureExceptionMock,
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: supabaseFromMock,
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: supabaseAuthMock,
    from: supabaseFromMock,
  })),
}))

vi.mock('@/lib/utils/bot-filter', () => ({
  isBot: vi.fn(() => false),
}))

// verify-email imports isTokenExpired at module scope
vi.mock('@/lib/verification', () => ({
  isTokenExpired: vi.fn(() => false),
}))

vi.mock('next/headers', () => ({
  headers: headersMock,
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

// Resend is imported transitively by verification.ts at module scope
vi.mock('resend', () => ({
  Resend: function MockResend() {
    this.emails = { send: vi.fn().mockResolvedValue({ id: 'mock' }) }
  },
}))

// ── helpers ──────────────────────────────────────────────────────────

function makeRequest(method: string, url: string, body?: object): Request {
  const init: RequestInit = {
    method,
    headers: {
      'x-forwarded-for': '1.2.3.4',
      'user-agent': 'Mozilla/5.0 Test',
    },
  }
  if (body) {
    init.body = JSON.stringify(body)
    ;(init.headers as Record<string, string>)['content-type'] = 'application/json'
  }
  return new Request(url, init)
}

function makeNextRequest(method: string, url: string, body?: object) {
  // Next.js route handlers receive NextRequest — a standard Request works for test purposes
  return makeRequest(method, url, body)
}

function mockInsertSuccess() {
  const insertMock = vi.fn().mockResolvedValue({ error: null })
  supabaseFromMock.mockReturnValue({ insert: insertMock })
  return insertMock
}

// ── tests ────────────────────────────────────────────────────────────

describe('Rate-limit wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: allow all requests
    checkLimitMock.mockResolvedValue({ allowed: true })
    // Default headers mock for auth actions
    headersMock.mockResolvedValue(new Map([['x-forwarded-for', '1.2.3.4']]))
  })

  // ── /api/waitlist ────────────────────────────────────────────────
  describe('/api/waitlist POST', () => {
    let handler: (req: Request) => Promise<Response>

    beforeEach(async () => {
      vi.resetModules()
      const mod = await import('@/app/api/waitlist/route')
      handler = mod.POST
    })

    it('returns 201 when rate limit allows', async () => {
      checkLimitMock.mockResolvedValue({ allowed: true })
      mockInsertSuccess()

      const req = makeRequest('POST', 'http://localhost/api/waitlist', {
        teacherId: 'teacher-1',
        email: 'parent@test.com',
      })
      const res = await handler(req)
      expect(res.status).toBe(201)
      expect(checkLimitMock).toHaveBeenCalledWith('1.2.3.4', 'waitlist', { max: 5, window: '1 m' })
    })

    it('returns 429 when rate limited', async () => {
      checkLimitMock.mockResolvedValue({ allowed: false })

      const req = makeRequest('POST', 'http://localhost/api/waitlist', {
        teacherId: 'teacher-1',
        email: 'parent@test.com',
      })
      const res = await handler(req)
      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body.error).toBe('Too many requests')
    })
  })

  // ── /api/track-view ─────────────────────────────────────────────
  describe('/api/track-view POST', () => {
    let handler: (req: Request) => Promise<Response>

    beforeEach(async () => {
      vi.resetModules()
      const mod = await import('@/app/api/track-view/route')
      handler = mod.POST as (req: Request) => Promise<Response>
    })

    it('returns 201 when rate limit allows', async () => {
      checkLimitMock.mockResolvedValue({ allowed: true })
      mockInsertSuccess()

      const req = makeNextRequest('POST', 'http://localhost/api/track-view', {
        teacherId: 'teacher-1',
      })
      const res = await handler(req)
      expect(res.status).toBe(201)
      expect(checkLimitMock).toHaveBeenCalledWith('1.2.3.4', 'track-view', { max: 30, window: '1 m' })
    })

    it('returns 429 when rate limited', async () => {
      checkLimitMock.mockResolvedValue({ allowed: false })

      const req = makeNextRequest('POST', 'http://localhost/api/track-view', {
        teacherId: 'teacher-1',
      })
      const res = await handler(req)
      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body.error).toBe('Too many requests')
    })
  })

  // ── /api/verify-email ───────────────────────────────────────────
  describe('/api/verify-email GET', () => {
    let handler: (req: Request) => Promise<Response>

    beforeEach(async () => {
      vi.resetModules()
      const mod = await import('@/app/api/verify-email/route')
      handler = mod.GET
    })

    it('processes normally when rate limit allows', async () => {
      checkLimitMock.mockResolvedValue({ allowed: true })
      // Token lookup returns no match → redirect to ?error=invalid (still allowed through rate limit)
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: null })
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
      supabaseFromMock.mockReturnValue({ select: selectMock })

      const req = makeRequest('GET', 'http://localhost/api/verify-email?token=test-token')
      const res = await handler(req)
      // Should be a redirect (307/308) — not blocked by rate limiter
      expect([301, 302, 307, 308]).toContain(res.status)
      expect(checkLimitMock).toHaveBeenCalledWith('1.2.3.4', 'verify-email', { max: 5, window: '1 m' })
    })

    it('returns 429 when rate limited', async () => {
      checkLimitMock.mockResolvedValue({ allowed: false })

      const req = makeRequest('GET', 'http://localhost/api/verify-email?token=test-token')
      const res = await handler(req)
      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body.error).toBe('Too many requests')
    })
  })

  // ── auth actions (signIn / signUp) ──────────────────────────────
  describe('auth actions', () => {
    let signIn: (formData: FormData) => Promise<{ error: string } | void>
    let signUp: (formData: FormData) => Promise<{ error: string } | void>

    function makeFormData(email = 'test@example.com', password = 'password123'): FormData {
      const fd = new FormData()
      fd.set('email', email)
      fd.set('password', password)
      return fd
    }

    beforeEach(async () => {
      vi.resetModules()
      const mod = await import('@/actions/auth')
      signIn = mod.signIn
      signUp = mod.signUp
    })

    it('signIn succeeds when rate limit allows', async () => {
      checkLimitMock.mockResolvedValue({ allowed: true })
      // signIn calls signInWithPassword then redirects
      supabaseAuthMock.signInWithPassword.mockResolvedValue({
        error: null,
        data: { user: { id: 'user-1' } },
      })
      // Teacher lookup for routing
      const maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: 'teacher-1' } })
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
      supabaseFromMock.mockReturnValue({ select: selectMock })
      // redirect throws to stop execution
      redirectMock.mockImplementation(() => { throw new Error('NEXT_REDIRECT') })

      const fd = makeFormData()
      await expect(signIn(fd)).rejects.toThrow('NEXT_REDIRECT')
      expect(checkLimitMock).toHaveBeenCalledWith('1.2.3.4', 'auth', { max: 10, window: '1 m' })
    })

    it('signIn returns error when rate limited', async () => {
      checkLimitMock.mockResolvedValue({ allowed: false })

      const fd = makeFormData()
      const result = await signIn(fd)
      expect(result).toEqual({ error: 'Too many requests. Please try again later.' })
      // Should NOT have called signInWithPassword
      expect(supabaseAuthMock.signInWithPassword).not.toHaveBeenCalled()
    })

    it('signUp succeeds when rate limit allows', async () => {
      checkLimitMock.mockResolvedValue({ allowed: true })
      supabaseAuthMock.signUp.mockResolvedValue({ error: null })
      redirectMock.mockImplementation(() => { throw new Error('NEXT_REDIRECT') })

      const fd = makeFormData()
      await expect(signUp(fd)).rejects.toThrow('NEXT_REDIRECT')
      expect(checkLimitMock).toHaveBeenCalledWith('1.2.3.4', 'auth', { max: 10, window: '1 m' })
    })

    it('signUp returns error when rate limited', async () => {
      checkLimitMock.mockResolvedValue({ allowed: false })

      const fd = makeFormData()
      const result = await signUp(fd)
      expect(result).toEqual({ error: 'Too many requests. Please try again later.' })
      // Should NOT have called supabase auth signUp
      expect(supabaseAuthMock.signUp).not.toHaveBeenCalled()
    })
  })
})
