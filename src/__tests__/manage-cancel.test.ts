import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock supabase admin
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

// Mock email module (Resend constructor throws without API key)
const { mockSendCancellationEmail, mockSendRecurringCancellationEmail } = vi.hoisted(() => {
  return {
    mockSendCancellationEmail: vi.fn().mockResolvedValue(undefined),
    mockSendRecurringCancellationEmail: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('@/lib/email', () => ({
  sendCancellationEmail: mockSendCancellationEmail,
  sendRecurringCancellationEmail: mockSendRecurringCancellationEmail,
  sendCheckoutLinkEmail: vi.fn(),
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendSessionReminderEmail: vi.fn().mockResolvedValue(undefined),
}))

// Stripe mock — class pattern for ESM (vi.hoisted)
const { MockStripeClass, paymentIntentsCancelMock } = vi.hoisted(() => {
  const paymentIntentsCancelMock = vi.fn()
  class MockStripeClass {
    paymentIntents = { cancel: paymentIntentsCancelMock, create: vi.fn() }
    webhooks = { constructEvent: vi.fn() }
  }
  return { MockStripeClass, paymentIntentsCancelMock }
})

vi.mock('stripe', () => ({
  default: MockStripeClass,
}))

// --- Helpers ---

function makeRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Chainable Supabase mock factory
function makeChain(finalValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = [
    'select', 'eq', 'in', 'is', 'not', 'gte', 'update', 'single',
    'maybeSingle', 'order',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Terminal — resolves with the provided value
  ;(chain as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) =>
    Promise.resolve(finalValue).then(resolve)
  return chain
}

// ============================================================
// cancel-session route tests
// ============================================================
describe('POST /api/manage/cancel-session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'

    vi.mock('@/lib/supabase/service', () => ({
      supabaseAdmin: { from: vi.fn() },
    }))
    vi.mock('@/lib/email', () => ({
      sendCancellationEmail: mockSendCancellationEmail,
      sendRecurringCancellationEmail: mockSendRecurringCancellationEmail,
      sendCheckoutLinkEmail: vi.fn(),
      sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
      sendSessionReminderEmail: vi.fn().mockResolvedValue(undefined),
    }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
  })

  it('returns 400 for missing fields', async () => {
    const { POST } = await import('@/app/api/manage/cancel-session/route')
    const res = await POST(
      makeRequest('http://localhost/api/manage/cancel-session', { bookingId: 'b1' })
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Missing required/)
  })

  it('returns 404 for invalid token', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const scheduleChain = makeChain({ data: null, error: null })
    vi.mocked(supabaseAdmin.from).mockReturnValue(scheduleChain as never)

    const { POST } = await import('@/app/api/manage/cancel-session/route')
    const res = await POST(
      makeRequest('http://localhost/api/manage/cancel-session', {
        bookingId: 'b1',
        token: 'bad-token',
      })
    )
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toMatch(/Invalid or expired/)
  })

  it('returns 404 when booking does not belong to schedule', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const scheduleChain = makeChain({ data: { id: 'sched-1' }, error: null })
    const bookingChain = makeChain({ data: null, error: null })

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(scheduleChain as never)
      .mockReturnValueOnce(bookingChain as never)

    const { POST } = await import('@/app/api/manage/cancel-session/route')
    const res = await POST(
      makeRequest('http://localhost/api/manage/cancel-session', {
        bookingId: 'wrong-booking',
        token: 'valid-token',
      })
    )
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toMatch(/not found/)
  })

  it('successfully cancels a session with Stripe PI void', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const scheduleChain = makeChain({ data: { id: 'sched-1' }, error: null })
    const bookingChain = makeChain({
      data: { id: 'b1', stripe_payment_intent: 'pi_test_123', status: 'confirmed' },
      error: null,
    })
    const updateChain = makeChain({ data: null, error: null })

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(scheduleChain as never)
      .mockReturnValueOnce(bookingChain as never)
      .mockReturnValueOnce(updateChain as never)

    paymentIntentsCancelMock.mockResolvedValue({ id: 'pi_test_123', status: 'canceled' })

    const { POST } = await import('@/app/api/manage/cancel-session/route')
    const res = await POST(
      makeRequest('http://localhost/api/manage/cancel-session', {
        bookingId: 'b1',
        token: 'valid-token',
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify Stripe PI was cancelled
    expect(paymentIntentsCancelMock).toHaveBeenCalledWith('pi_test_123')

    // Verify cancellation email was sent
    expect(mockSendCancellationEmail).toHaveBeenCalledWith('b1')
  })

  it('successfully cancels a session without Stripe PI', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const scheduleChain = makeChain({ data: { id: 'sched-1' }, error: null })
    const bookingChain = makeChain({
      data: { id: 'b1', stripe_payment_intent: null, status: 'requested' },
      error: null,
    })
    const updateChain = makeChain({ data: null, error: null })

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(scheduleChain as never)
      .mockReturnValueOnce(bookingChain as never)
      .mockReturnValueOnce(updateChain as never)

    const { POST } = await import('@/app/api/manage/cancel-session/route')
    const res = await POST(
      makeRequest('http://localhost/api/manage/cancel-session', {
        bookingId: 'b1',
        token: 'valid-token',
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // No Stripe call when no PI
    expect(paymentIntentsCancelMock).not.toHaveBeenCalled()

    // Email still sent
    expect(mockSendCancellationEmail).toHaveBeenCalledWith('b1')
  })
})

// ============================================================
// cancel-series route tests
// ============================================================
describe('POST /api/manage/cancel-series', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'

    vi.mock('@/lib/supabase/service', () => ({
      supabaseAdmin: { from: vi.fn() },
    }))
    vi.mock('@/lib/email', () => ({
      sendCancellationEmail: mockSendCancellationEmail,
      sendRecurringCancellationEmail: mockSendRecurringCancellationEmail,
      sendCheckoutLinkEmail: vi.fn(),
      sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
      sendSessionReminderEmail: vi.fn().mockResolvedValue(undefined),
    }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
  })

  it('returns 400 for missing token', async () => {
    const { POST } = await import('@/app/api/manage/cancel-series/route')
    const res = await POST(
      makeRequest('http://localhost/api/manage/cancel-series', {})
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Missing required/)
  })

  it('returns 404 for invalid token', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const scheduleChain = makeChain({ data: null, error: null })
    vi.mocked(supabaseAdmin.from).mockReturnValue(scheduleChain as never)

    const { POST } = await import('@/app/api/manage/cancel-series/route')
    const res = await POST(
      makeRequest('http://localhost/api/manage/cancel-series', {
        token: 'bad-token',
      })
    )
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toMatch(/Invalid or expired/)
  })

  it('returns cancelledCount 0 when no future bookings', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const scheduleChain = makeChain({ data: { id: 'sched-1' }, error: null })
    const bookingsChain = makeChain({ data: [], error: null })

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(scheduleChain as never)
      .mockReturnValueOnce(bookingsChain as never)

    const { POST } = await import('@/app/api/manage/cancel-series/route')
    const res = await POST(
      makeRequest('http://localhost/api/manage/cancel-series', {
        token: 'valid-token',
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ success: true, cancelledCount: 0 })
  })

  it('cancels all future bookings, voids PIs, and sends email', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const scheduleChain = makeChain({ data: { id: 'sched-1' }, error: null })
    const bookingsChain = makeChain({
      data: [
        { id: 'b1', stripe_payment_intent: 'pi_1' },
        { id: 'b2', stripe_payment_intent: null },
        { id: 'b3', stripe_payment_intent: 'pi_3' },
      ],
      error: null,
    })
    const updateChain = makeChain({ data: null, error: null })

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(scheduleChain as never)
      .mockReturnValueOnce(bookingsChain as never)
      .mockReturnValueOnce(updateChain as never)

    paymentIntentsCancelMock.mockResolvedValue({ id: 'pi_x', status: 'canceled' })

    const { POST } = await import('@/app/api/manage/cancel-series/route')
    const res = await POST(
      makeRequest('http://localhost/api/manage/cancel-series', {
        token: 'valid-token',
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ success: true, cancelledCount: 3 })

    // Two bookings had PIs, one did not
    expect(paymentIntentsCancelMock).toHaveBeenCalledTimes(2)
    expect(paymentIntentsCancelMock).toHaveBeenCalledWith('pi_1')
    expect(paymentIntentsCancelMock).toHaveBeenCalledWith('pi_3')

    // Series cancellation email was sent
    expect(mockSendRecurringCancellationEmail).toHaveBeenCalledWith({
      scheduleId: 'sched-1',
    })
  })

  it('continues even when Stripe PI void fails', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const scheduleChain = makeChain({ data: { id: 'sched-1' }, error: null })
    const bookingsChain = makeChain({
      data: [
        { id: 'b1', stripe_payment_intent: 'pi_fail' },
        { id: 'b2', stripe_payment_intent: 'pi_ok' },
      ],
      error: null,
    })
    const updateChain = makeChain({ data: null, error: null })

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(scheduleChain as never)
      .mockReturnValueOnce(bookingsChain as never)
      .mockReturnValueOnce(updateChain as never)

    paymentIntentsCancelMock
      .mockRejectedValueOnce(new Error('PI already canceled'))
      .mockResolvedValueOnce({ id: 'pi_ok', status: 'canceled' })

    const { POST } = await import('@/app/api/manage/cancel-series/route')
    const res = await POST(
      makeRequest('http://localhost/api/manage/cancel-series', {
        token: 'valid-token',
      })
    )
    // Should still succeed despite first PI failure
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ success: true, cancelledCount: 2 })
  })
})
