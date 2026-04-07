import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// vi.hoisted ensures mock variables are available before module imports are hoisted
const {
  mockPaymentIntentsRetrieve,
  mockPaymentIntentsCapture,
  mockSendSessionCompleteEmail,
  mockReviewsInsert,
} = vi.hoisted(() => ({
  mockPaymentIntentsRetrieve: vi.fn(),
  mockPaymentIntentsCapture: vi.fn(),
  mockSendSessionCompleteEmail: vi.fn().mockResolvedValue(undefined),
  mockReviewsInsert: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

// Mock Stripe — class-based so `new Stripe()` works
vi.mock('stripe', () => {
  class MockStripe {
    paymentIntents = {
      retrieve: mockPaymentIntentsRetrieve,
      capture: mockPaymentIntentsCapture,
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_secretKey?: string) {}
  }
  return { default: MockStripe }
})

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock supabaseAdmin — reviews insert chain
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'reviews') return { insert: mockReviewsInsert }
      return { insert: vi.fn(), select: vi.fn() }
    }),
  },
}))

// Mock email module
vi.mock('@/lib/email', () => ({
  sendSessionCompleteEmail: mockSendSessionCompleteEmail,
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const TEACHER_ID = 'teacher-uuid-123'
const USER_ID = 'user-uuid-456'
const BOOKING_ID = 'booking-uuid-789'
const PI_ID = 'pi_test_abc123'
const AMOUNT = 5000

describe('markSessionComplete', () => {
  let mockGetClaims: Mock
  let mockBookingMaybeSingle: Mock
  let mockBookingUpdate: Mock
  let mockBookingUpdateEq: Mock

  beforeEach(async () => {
    vi.clearAllMocks()

    // Auth mock — happy path returns a valid user
    mockGetClaims = vi.fn().mockResolvedValue({
      data: { claims: { sub: USER_ID } },
    })

    // Teacher lookup — returns a valid teacher
    const mockTeacherSingle = vi.fn().mockResolvedValue({
      data: { id: TEACHER_ID },
      error: null,
    })

    // Booking lookup — returns a confirmed booking with PI
    mockBookingMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: BOOKING_ID, stripe_payment_intent: PI_ID },
    })

    // Booking update chain: .update({...}).eq('id', bookingId)
    mockBookingUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null })
    mockBookingUpdate = vi.fn(() => ({ eq: mockBookingUpdateEq }))

    // Supabase .from() dispatcher — routes to correct chain by table name
    const mockFrom = vi.fn((table: string) => {
      if (table === 'teachers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockTeacherSingle,
            })),
          })),
        }
      }
      if (table === 'bookings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: mockBookingMaybeSingle,
                })),
              })),
            })),
          })),
          update: mockBookingUpdate,
        }
      }
      return {}
    })

    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as Mock).mockResolvedValue({
      auth: { getClaims: mockGetClaims },
      from: mockFrom,
    })

    // Stripe mocks — happy path defaults
    mockPaymentIntentsRetrieve.mockResolvedValue({
      amount_capturable: AMOUNT,
      amount: AMOUNT,
    })
    mockPaymentIntentsCapture.mockResolvedValue({ id: PI_ID })
  })

  it('retrieves PaymentIntent and calls paymentIntents.capture() with correct amount', async () => {
    const { markSessionComplete } = await import('@/actions/bookings')
    const result = await markSessionComplete(BOOKING_ID)

    expect(result).toEqual({ success: true })
    expect(mockPaymentIntentsRetrieve).toHaveBeenCalledWith(PI_ID)
    expect(mockPaymentIntentsCapture).toHaveBeenCalledWith(PI_ID, {
      amount_to_capture: AMOUNT,
      application_fee_amount: Math.round(AMOUNT * 0.07),
    })
  })

  it('application_fee_amount is exactly 7% of amount_capturable (STRIPE-07)', async () => {
    const testAmount = 7777
    mockPaymentIntentsRetrieve.mockResolvedValue({
      amount_capturable: testAmount,
      amount: testAmount,
    })

    const { markSessionComplete } = await import('@/actions/bookings')
    await markSessionComplete(BOOKING_ID)

    // Cast through unknown[] to avoid TS2493 on tuple index access
    const captureCall = mockPaymentIntentsCapture.mock.calls[0] as unknown[]
    const captureOpts = captureCall[1] as Record<string, unknown>
    // 7777 * 0.07 = 544.39 → Math.round → 544
    expect(captureOpts.application_fee_amount).toBe(Math.round(testAmount * 0.07))
    expect(captureOpts.application_fee_amount).toBe(544)
  })

  it("booking status is updated to 'completed' after capture", async () => {
    const { markSessionComplete } = await import('@/actions/bookings')
    await markSessionComplete(BOOKING_ID)

    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', amount_cents: AMOUNT })
    )
    expect(mockBookingUpdateEq).toHaveBeenCalledWith('id', BOOKING_ID)
  })

  it('sendSessionCompleteEmail is called with the bookingId after capture', async () => {
    const { markSessionComplete } = await import('@/actions/bookings')
    await markSessionComplete(BOOKING_ID)

    expect(mockSendSessionCompleteEmail).toHaveBeenCalledWith(
      BOOKING_ID,
      expect.any(String) // review token — 64-char hex string
    )
  })

  it("returns { error } if booking not found or not in 'confirmed' state", async () => {
    mockBookingMaybeSingle.mockResolvedValue({ data: null })

    const { markSessionComplete } = await import('@/actions/bookings')
    const result = await markSessionComplete(BOOKING_ID)

    expect(result).toEqual({ error: 'Booking not found or not in confirmed state' })
    expect(mockPaymentIntentsRetrieve).not.toHaveBeenCalled()
  })

  it("returns { error: 'Not authenticated' } if no user session", async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: {} } })

    const { markSessionComplete } = await import('@/actions/bookings')
    const result = await markSessionComplete(BOOKING_ID)

    expect(result).toEqual({ error: 'Not authenticated' })
    expect(mockPaymentIntentsRetrieve).not.toHaveBeenCalled()
  })
})
