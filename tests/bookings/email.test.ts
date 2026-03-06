import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BookingRequestData } from '@/lib/schemas/booking'

// Mock resend before importing email module
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}))

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const mockBookingData: BookingRequestData = {
  teacherId: '550e8400-e29b-41d4-a716-446655440000',
  studentName: 'Emma',
  subject: 'Math',
  email: 'parent@example.com',
  bookingDate: '2026-04-15',
  startTime: '15:00',
  endTime: '16:00',
}

describe('sendBookingEmail', () => {
  let sendEmailMock: ReturnType<typeof vi.fn>
  let mockSupabaseSelect: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Get the mocked Resend instance's send function
    const { Resend } = await import('resend')
    const resendInstance = new (Resend as ReturnType<typeof vi.fn>)()
    sendEmailMock = resendInstance.emails.send

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
