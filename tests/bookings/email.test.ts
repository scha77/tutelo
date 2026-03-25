import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BookingRequestData } from '@/lib/schemas/booking'

// vi.hoisted ensures the mock variable is available before module imports are hoisted
const { sendEmailMock } = vi.hoisted(() => {
  const sendEmailMock = vi.fn().mockResolvedValue({ id: 'test-email-id' })
  return { sendEmailMock }
})

// Mock resend — use a class constructor pattern so `new Resend()` works
vi.mock('resend', () => {
  class MockResend {
    emails = { send: sendEmailMock }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_apiKey?: string) {}
  }
  return { Resend: MockResend }
})

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock supabaseAdmin — needed because email.ts now imports it for webhook-context functions
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

const mockBookingData: BookingRequestData = {
  teacherId: '550e8400-e29b-41d4-a716-446655440000',
  studentName: 'Emma',
  subject: 'Math',
  email: 'parent@example.com',
  bookingDate: '2026-04-15',
  startTime: '15:00',
  endTime: '16:00',
  parent_sms_opt_in: false,
}

describe('sendBookingEmail', () => {
  let mockSupabaseSelect: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    sendEmailMock.mockClear()

    // Set up Supabase mock chaining: .from().select().eq().single()
    const { createClient } = await import('@/lib/supabase/server')
    mockSupabaseSelect = vi.fn()
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockSupabaseSelect,
          })),
        })),
      })),
    })
  })

  it('sends MoneyWaitingEmail when stripe_charges_enabled is false', async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        full_name: 'Jane Smith',
        social_email: 'jane@example.com',
        stripe_charges_enabled: false,
      },
      error: null,
    })

    const { sendBookingEmail } = await import('@/lib/email')
    await sendBookingEmail('550e8400-e29b-41d4-a716-446655440000', 'booking-123', mockBookingData)

    expect(sendEmailMock).toHaveBeenCalledOnce()
    const callArgs = sendEmailMock.mock.calls[0][0]
    expect(callArgs.subject).toContain('connect Stripe to confirm')
    expect(callArgs.to).toBe('jane@example.com')
  })

  it('sends BookingNotificationEmail when stripe_charges_enabled is true', async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        full_name: 'Jane Smith',
        social_email: 'jane@example.com',
        stripe_charges_enabled: true,
      },
      error: null,
    })

    const { sendBookingEmail } = await import('@/lib/email')
    await sendBookingEmail('550e8400-e29b-41d4-a716-446655440000', 'booking-123', mockBookingData)

    expect(sendEmailMock).toHaveBeenCalledOnce()
    const callArgs = sendEmailMock.mock.calls[0][0]
    expect(callArgs.subject).toContain('New booking request')
    expect(callArgs.to).toBe('jane@example.com')
  })

  it('does NOT send email when social_email is null', async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: {
        full_name: 'Jane Smith',
        social_email: null,
        stripe_charges_enabled: false,
      },
      error: null,
    })

    const { sendBookingEmail } = await import('@/lib/email')
    await sendBookingEmail('550e8400-e29b-41d4-a716-446655440000', 'booking-123', mockBookingData)

    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
