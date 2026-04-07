import { describe, it, vi, expect, beforeEach } from 'vitest'

// vi.hoisted ensures mock variables are available before module imports are hoisted
const { mockCheckoutSessionsCreate, mockWebhooksConstructEvent } = vi.hoisted(() => {
  const mockCheckoutSessionsCreate = vi.fn()
  const mockWebhooksConstructEvent = vi.fn()
  return { mockCheckoutSessionsCreate, mockWebhooksConstructEvent }
})

// Mock Stripe — class-based so `new Stripe()` works
vi.mock('stripe', () => {
  class MockStripe {
    checkout = { sessions: { create: mockCheckoutSessionsCreate } }
    webhooks = { constructEvent: mockWebhooksConstructEvent }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_secretKey?: string) {}
  }
  return { default: MockStripe }
})

// Mock supabaseAdmin — service role client used in webhook handlers
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

// Mock email module to assert sendCheckoutLinkEmail and sendBookingConfirmationEmail calls
vi.mock('@/lib/email', () => ({
  sendCheckoutLinkEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendFollowUpEmail: vi.fn().mockResolvedValue(undefined),
  sendUrgentFollowUpEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))

// Helper: build a fake Stripe event for testing
function makeFakeAccountUpdatedEvent(chargesEnabled = true) {
  return {
    type: 'account.updated',
    data: {
      object: {
        id: 'acct_teacher123',
        charges_enabled: chargesEnabled,
      },
    },
  }
}

function makeFakeCheckoutCompletedEvent(bookingId: string, paymentIntentId = 'pi_test123') {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test',
        payment_intent: paymentIntentId,
        metadata: { booking_id: bookingId },
      },
    },
  }
}

function makeRequest() {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body: 'raw',
    headers: { 'stripe-signature': 'sig' },
  })
}

describe('createCheckoutSessionsForTeacher (account.updated handler)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a Checkout session with capture_method: manual for each requested booking where stripe_payment_intent is null', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route')
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const { sendCheckoutLinkEmail } = await import('@/lib/email')

    // Stripe event returns account.updated with charges_enabled: true
    mockWebhooksConstructEvent.mockReturnValue(makeFakeAccountUpdatedEvent(true))

    // Checkout session create returns a session with a URL
    mockCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_new',
      url: 'https://checkout.stripe.com/pay/cs_new',
    })

    // Teacher lookup — not yet activated
    const teacherChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'teacher-uuid-1', stripe_charges_enabled: false },
        error: null,
      }),
    }

    // Update teacher row (mark charges_enabled)
    const teacherUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    // Bookings query returns one pending booking (teacher accepted before Stripe connected)
    const bookingsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'booking-pending-1',
            status: 'pending',
            parent_email: 'parent@test.com',
            student_name: 'Alex',
            subject: 'Math',
            booking_date: '2026-04-01',
            stripe_payment_intent: null,
            teachers: { hourly_rate: 60 },
          },
        ],
        error: null,
      }),
    }

    // Booking update chain (stores checkout URL and confirms booking)
    const bookingUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 'booking-pending-1' }], error: null }),
    }

    let fromCallCount = 0
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'teachers') {
        fromCallCount++
        // First call: select teacher; second call: update teacher
        return fromCallCount === 1 ? (teacherChain as never) : (teacherUpdateChain as never)
      }
      if (table === 'bookings') {
        return (fromCallCount === 1 ? bookingsChain : bookingUpdateChain) as never
      }
      return bookingsChain as never
    })

    // Simplify: use call order
    let callIdx = 0
    vi.mocked(supabaseAdmin.from).mockImplementation(() => {
      callIdx++
      if (callIdx === 1) return teacherChain as never   // select teacher
      if (callIdx === 2) return teacherUpdateChain as never  // update teacher
      if (callIdx === 3) return bookingsChain as never  // select bookings
      return bookingUpdateChain as never                 // update booking checkout URL
    })

    const response = await POST(makeRequest())
    expect(response.status).toBe(200)
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledOnce()
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent_data: expect.objectContaining({
          capture_method: 'manual',
        }),
        metadata: expect.objectContaining({ booking_id: 'booking-pending-1' }),
      })
    )
    expect(sendCheckoutLinkEmail).toHaveBeenCalledWith(
      'parent@test.com',
      'Alex',
      'https://checkout.stripe.com/pay/cs_new'
    )
  })

  it('skips bookings that already have stripe_payment_intent set (idempotency — prevents duplicate Checkout sessions)', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route')
    const { supabaseAdmin } = await import('@/lib/supabase/service')

    mockWebhooksConstructEvent.mockReturnValue(makeFakeAccountUpdatedEvent(true))

    const teacherChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'teacher-uuid-2', stripe_charges_enabled: false },
        error: null,
      }),
    }
    const teacherUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    // Booking already has stripe_payment_intent set — IS NULL filter returns empty
    const bookingsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    let callIdx = 0
    vi.mocked(supabaseAdmin.from).mockImplementation(() => {
      callIdx++
      if (callIdx === 1) return teacherChain as never
      if (callIdx === 2) return teacherUpdateChain as never
      return bookingsChain as never
    })

    const response = await POST(makeRequest())
    expect(response.status).toBe(200)
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled()
  })
})

describe('checkout.session.completed handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates booking status to confirmed and stores stripe_payment_intent when current status is pending', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route')
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const { sendBookingConfirmationEmail } = await import('@/lib/email')

    mockWebhooksConstructEvent.mockReturnValue(
      makeFakeCheckoutCompletedEvent('booking-pending-2', 'pi_abc')
    )

    const bookingUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 'booking-pending-2' }], error: null }),
    }

    vi.mocked(supabaseAdmin.from).mockReturnValue(bookingUpdateChain as never)

    const response = await POST(makeRequest())
    expect(response.status).toBe(200)
    expect(bookingUpdateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed', stripe_payment_intent: 'pi_abc' })
    )
    expect(sendBookingConfirmationEmail).toHaveBeenCalledWith('booking-pending-2')
  })

  it('does NOT update booking if status is already confirmed (idempotency guard on status = requested)', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route')
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const { sendBookingConfirmationEmail } = await import('@/lib/email')

    mockWebhooksConstructEvent.mockReturnValue(
      makeFakeCheckoutCompletedEvent('booking-confirmed-1', 'pi_xyz')
    )

    // .in('status', ['requested', 'pending']) matches zero rows when status is 'confirmed' — no-op update, no error
    const bookingUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // Supabase returns { error: null } even when 0 rows matched
      in: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),  // 0 rows matched
    }

    vi.mocked(supabaseAdmin.from).mockReturnValue(bookingUpdateChain as never)

    const response = await POST(makeRequest())
    expect(response.status).toBe(200)
    // sendBookingConfirmationEmail is NOT called when the update matches zero rows
    // (booking was already confirmed on a previous delivery)
    // The idempotency guard is at the DB level: .in('status', ['requested', 'pending']) matches 0 rows
    // The webhook is idempotent: same result regardless of re-delivery
    expect(bookingUpdateChain.in).toHaveBeenCalledWith('status', ['requested', 'pending'])
    expect(sendBookingConfirmationEmail).not.toHaveBeenCalled()
  })
})
