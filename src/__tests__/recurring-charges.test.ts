import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock supabase admin
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

// Mock email module (Resend constructor throws without API key)
const { mockSendRecurringPaymentFailedEmail } = vi.hoisted(() => {
  const mockSendRecurringPaymentFailedEmail = vi.fn().mockResolvedValue(undefined)
  return { mockSendRecurringPaymentFailedEmail }
})

vi.mock('@/lib/email', () => ({
  sendRecurringPaymentFailedEmail: mockSendRecurringPaymentFailedEmail,
  sendCheckoutLinkEmail: vi.fn(),
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendSessionReminderEmail: vi.fn().mockResolvedValue(undefined),
}))

// Stripe mock — class pattern for ESM (vi.hoisted)
const { MockStripeClass, paymentIntentsCreateMock } = vi.hoisted(() => {
  const paymentIntentsCreateMock = vi.fn()
  class MockStripeClass {
    paymentIntents = { create: paymentIntentsCreateMock }
    webhooks = { constructEvent: vi.fn() }
  }
  return { MockStripeClass, paymentIntentsCreateMock }
})

vi.mock('stripe', () => ({
  default: MockStripeClass,
}))

// Mock computeSessionAmount
const { mockComputeSessionAmount } = vi.hoisted(() => {
  const mockComputeSessionAmount = vi.fn().mockReturnValue(5000) // $50.00 default
  return { mockComputeSessionAmount }
})

vi.mock('@/lib/utils/booking', () => ({
  computeSessionAmount: mockComputeSessionAmount,
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
  withMonitor: vi.fn((_slug: string, fn: () => unknown) => fn()),
}))

// --- Helpers ---

function makeRequest(authHeader?: string) {
  return new NextRequest('http://localhost/api/cron/recurring-charges', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

function makeMockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-recurring-1',
    teacher_id: 'teacher-1',
    start_time: '16:00',
    end_time: '17:00',
    recurring_schedule_id: 'sched-1',
    recurring_schedules: {
      stripe_customer_id: 'cus_test_123',
      stripe_payment_method_id: 'pm_test_visa',
      teachers: {
        stripe_account_id: 'acct_test_teacher',
        hourly_rate: 50,
        full_name: 'Jane Smith',
        social_email: 'jane@example.com',
      },
    },
    ...overrides,
  }
}

// Chainable Supabase mock factory
function makeChain(finalValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is', 'not', 'update', 'single', 'maybeSingle', 'gte', 'lte', 'in']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Terminal — resolves with the provided value
  ;(chain as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) =>
    Promise.resolve(finalValue).then(resolve)
  return chain
}

describe('GET /api/cron/recurring-charges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.CRON_SECRET = 'test-secret'
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'

    // Re-apply mocks after resetModules
    vi.mock('@/lib/supabase/service', () => ({
      supabaseAdmin: { from: vi.fn() },
    }))
    vi.mock('@/lib/email', () => ({
      sendRecurringPaymentFailedEmail: mockSendRecurringPaymentFailedEmail,
      sendCheckoutLinkEmail: vi.fn(),
      sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
      sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
      sendSessionReminderEmail: vi.fn().mockResolvedValue(undefined),
    }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
    vi.mock('@/lib/utils/booking', () => ({
      computeSessionAmount: mockComputeSessionAmount,
    }))
  })

  it('returns 401 without CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/recurring-charges/route')

    const noAuth = await GET(makeRequest())
    expect(noAuth.status).toBe(401)

    const wrongAuth = await GET(makeRequest('Bearer wrong-secret'))
    expect(wrongAuth.status).toBe(401)
  })

  it('returns no-op when no sessions tomorrow', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const selectChain = makeChain({ data: [], error: null })
    vi.mocked(supabaseAdmin.from).mockReturnValue(selectChain as never)

    const { GET } = await import('@/app/api/cron/recurring-charges/route')
    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ charged: 0, failed: 0, skipped: 0, checked: 0 })
    expect(paymentIntentsCreateMock).not.toHaveBeenCalled()
  })

  it('successful charge: creates PI and confirms booking', async () => {
    const session = makeMockSession()
    const { supabaseAdmin } = await import('@/lib/supabase/service')

    // First call: select sessions; subsequent calls: update booking
    const selectChain = makeChain({ data: [session], error: null })
    const updateChain = makeChain({ data: null, error: null })

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(selectChain as never) // select sessions
      .mockReturnValueOnce(updateChain as never) // update booking to confirmed

    paymentIntentsCreateMock.mockResolvedValue({
      id: 'pi_recurring_test_123',
      status: 'requires_capture',
    })

    const { GET } = await import('@/app/api/cron/recurring-charges/route')
    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ charged: 1, failed: 0, skipped: 0, checked: 1 })

    // Verify PI created with correct params
    expect(paymentIntentsCreateMock).toHaveBeenCalledWith(
      {
        amount: 5000,
        currency: 'usd',
        customer: 'cus_test_123',
        payment_method: 'pm_test_visa',
        off_session: true,
        confirm: true,
        capture_method: 'manual',
        transfer_data: { destination: 'acct_test_teacher' },
        application_fee_amount: Math.round(5000 * 0.07),
        metadata: {
          booking_id: 'booking-recurring-1',
          teacher_id: 'teacher-1',
          recurring_schedule_id: 'sched-1',
        },
      },
      {
        idempotencyKey: 'recurring-charge-booking-recurring-1',
      }
    )
  })

  it('failed charge: marks booking payment_failed and sends notification email', async () => {
    const session = makeMockSession()
    const { supabaseAdmin } = await import('@/lib/supabase/service')

    const selectChain = makeChain({ data: [session], error: null })
    const updateChain = makeChain({ data: null, error: null })

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(selectChain as never) // select sessions
      .mockReturnValueOnce(updateChain as never) // update booking to payment_failed

    // Simulate Stripe card_declined error
    const stripeError = new Error('Your card was declined.') as Error & { code: string }
    stripeError.code = 'card_declined'
    paymentIntentsCreateMock.mockRejectedValue(stripeError)

    const { GET } = await import('@/app/api/cron/recurring-charges/route')
    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ charged: 0, failed: 1, skipped: 0, checked: 1 })

    // Verify email notification was fired
    expect(mockSendRecurringPaymentFailedEmail).toHaveBeenCalledWith({
      bookingId: 'booking-recurring-1',
    })
  })

  it('skips sessions with null payment_method', async () => {
    const session = makeMockSession({
      recurring_schedules: {
        stripe_customer_id: 'cus_test_123',
        stripe_payment_method_id: null, // No saved payment method
        teachers: {
          stripe_account_id: 'acct_test_teacher',
          hourly_rate: 50,
          full_name: 'Jane Smith',
          social_email: 'jane@example.com',
        },
      },
    })

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const selectChain = makeChain({ data: [session], error: null })
    vi.mocked(supabaseAdmin.from).mockReturnValue(selectChain as never)

    const { GET } = await import('@/app/api/cron/recurring-charges/route')
    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ charged: 0, failed: 0, skipped: 1, checked: 1 })
    // No PI should be created for skipped sessions
    expect(paymentIntentsCreateMock).not.toHaveBeenCalled()
  })

  it('query filters on status=requested so confirmed sessions are not re-charged', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const selectChain = makeChain({ data: [], error: null })
    vi.mocked(supabaseAdmin.from).mockReturnValue(selectChain as never)

    const { GET } = await import('@/app/api/cron/recurring-charges/route')
    await GET(makeRequest('Bearer test-secret'))

    // Verify the select chain includes .eq('status', 'requested')
    const fromMock = vi.mocked(supabaseAdmin.from)
    expect(fromMock).toHaveBeenCalledWith('bookings')

    // The chain methods on the returned object should have been called with status filter
    const chain = selectChain as Record<string, ReturnType<typeof vi.fn>>
    expect(chain.eq).toHaveBeenCalledWith('status', 'requested')
  })

  it('application fee calculated at 7%', async () => {
    // Use a specific amount where 7% is clearly verifiable
    mockComputeSessionAmount.mockReturnValue(10000) // $100.00

    const session = makeMockSession()
    const { supabaseAdmin } = await import('@/lib/supabase/service')

    const selectChain = makeChain({ data: [session], error: null })
    const updateChain = makeChain({ data: null, error: null })
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(selectChain as never)
      .mockReturnValueOnce(updateChain as never)

    paymentIntentsCreateMock.mockResolvedValue({
      id: 'pi_fee_test',
      status: 'requires_capture',
    })

    const { GET } = await import('@/app/api/cron/recurring-charges/route')
    await GET(makeRequest('Bearer test-secret'))

    expect(paymentIntentsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10000,
        application_fee_amount: 700, // 7% of $100.00 = $7.00
      }),
      expect.any(Object)
    )
  })

  it('handles mixed results: one charged, one failed, one skipped', async () => {
    const chargeableSession = makeMockSession({ id: 'booking-ok' })
    const failSession = makeMockSession({ id: 'booking-fail' })
    const skipSession = makeMockSession({
      id: 'booking-skip',
      recurring_schedules: {
        stripe_customer_id: 'cus_test',
        stripe_payment_method_id: null,
        teachers: {
          stripe_account_id: 'acct_test',
          hourly_rate: 50,
          full_name: 'Jane',
          social_email: null,
        },
      },
    })

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const selectChain = makeChain({
      data: [chargeableSession, failSession, skipSession],
      error: null,
    })
    const updateChain1 = makeChain({ data: null, error: null })
    const updateChain2 = makeChain({ data: null, error: null })

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(selectChain as never) // select
      .mockReturnValueOnce(updateChain1 as never) // update booking-ok
      .mockReturnValueOnce(updateChain2 as never) // update booking-fail

    paymentIntentsCreateMock
      .mockResolvedValueOnce({ id: 'pi_ok', status: 'requires_capture' })
      .mockRejectedValueOnce(new Error('expired_card'))

    const { GET } = await import('@/app/api/cron/recurring-charges/route')
    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ charged: 1, failed: 1, skipped: 1, checked: 3 })
  })
})
