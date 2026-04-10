import { describe, it, expect, vi, beforeEach } from 'vitest'

const { captureMessageMock, flushMock, verifyMock } = vi.hoisted(() => ({
  captureMessageMock: vi.fn(),
  flushMock: vi.fn().mockResolvedValue(true),
  verifyMock: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({
  captureMessage: captureMessageMock,
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
  flush: flushMock,
}))

vi.mock('@/lib/webhooks/resend', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/webhooks/resend')>()
  return {
    ...actual,
    verifyResendWebhook: verifyMock,
  }
})

import { POST } from '@/app/api/webhooks/resend/route'

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/webhooks/resend', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': 'msg_test123',
      'svix-timestamp': String(Math.floor(Date.now() / 1000)),
      'svix-signature': 'v1,dGVzdA==',
      ...headers,
    },
    body,
  })
}

function makePayload(type: string, overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    type,
    created_at: '2026-04-10T00:00:00Z',
    data: {
      email_id: 'email_test_456',
      from: 'noreply@tutelo.app',
      to: ['parent@example.com'],
      subject: 'Your booking is confirmed',
      ...overrides,
    },
  })
}

describe('POST /api/webhooks/resend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_test_secret'
  })

  it('returns 401 when svix headers are missing', async () => {
    const req = new Request('http://localhost/api/webhooks/resend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: makePayload('email.delivered'),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(captureMessageMock).not.toHaveBeenCalled()
  })

  it('returns 401 when signature is invalid', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    const req = makeRequest(makePayload('email.bounced'))
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(captureMessageMock).not.toHaveBeenCalled()
  })

  it('captures bounced event in Sentry with tags', async () => {
    const payload = {
      type: 'email.bounced',
      created_at: '2026-04-10T00:00:00Z',
      data: {
        email_id: 'email_bounce_001',
        from: 'noreply@tutelo.app',
        to: ['bounced@example.com'],
        subject: 'Your booking is confirmed',
      },
    }
    verifyMock.mockReturnValue(payload)
    const req = makeRequest(JSON.stringify(payload))
    const res = await POST(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ received: true })

    expect(captureMessageMock).toHaveBeenCalledOnce()
    expect(captureMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('email.bounced'),
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({
          email_event: 'bounced',
          email_id: 'email_bounce_001',
        }),
      })
    )
  })

  it('captures complained event in Sentry', async () => {
    const payload = {
      type: 'email.complained',
      created_at: '2026-04-10T00:00:00Z',
      data: {
        email_id: 'email_complaint_001',
        from: 'noreply@tutelo.app',
        to: ['angry@example.com'],
        subject: 'Session reminder',
      },
    }
    verifyMock.mockReturnValue(payload)
    const req = makeRequest(JSON.stringify(payload))
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(captureMessageMock).toHaveBeenCalledOnce()
    expect(captureMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('email.complained'),
      expect.objectContaining({
        tags: expect.objectContaining({ email_event: 'complained' }),
      })
    )
  })

  it('captures delivery_delayed event in Sentry', async () => {
    const payload = {
      type: 'email.delivery_delayed',
      created_at: '2026-04-10T00:00:00Z',
      data: {
        email_id: 'email_delayed_001',
        from: 'noreply@tutelo.app',
        to: ['slow@example.com'],
        subject: 'Booking update',
      },
    }
    verifyMock.mockReturnValue(payload)
    const req = makeRequest(JSON.stringify(payload))
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(captureMessageMock).toHaveBeenCalledOnce()
    expect(captureMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('email.delivery_delayed'),
      expect.objectContaining({
        tags: expect.objectContaining({ email_event: 'delivery_delayed' }),
      })
    )
  })

  it('does NOT alert Sentry on delivered event (too noisy)', async () => {
    const payload = {
      type: 'email.delivered',
      created_at: '2026-04-10T00:00:00Z',
      data: {
        email_id: 'email_delivered_001',
        from: 'noreply@tutelo.app',
        to: ['happy@example.com'],
        subject: 'You are booked',
      },
    }
    verifyMock.mockReturnValue(payload)
    const req = makeRequest(JSON.stringify(payload))
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(captureMessageMock).not.toHaveBeenCalled()
  })

  it('does NOT alert Sentry on opened event', async () => {
    const payload = {
      type: 'email.opened',
      created_at: '2026-04-10T00:00:00Z',
      data: {
        email_id: 'email_opened_001',
        from: 'noreply@tutelo.app',
        to: ['curious@example.com'],
        subject: 'Check this out',
      },
    }
    verifyMock.mockReturnValue(payload)
    const req = makeRequest(JSON.stringify(payload))
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(captureMessageMock).not.toHaveBeenCalled()
  })

  it('returns 500 when RESEND_WEBHOOK_SECRET is not set', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET
    const req = makeRequest(makePayload('email.bounced'))
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
