import { describe, it, expect, vi, beforeEach } from 'vitest'

// Resend mock — vi.hoisted() pattern for ESM module-level instantiation
const { MockResend, emailsSendMock } = vi.hoisted(() => {
  const emailsSendMock = vi.fn().mockResolvedValue({ id: 'email_test_123' })
  class MockResend {
    emails = { send: emailsSendMock }
  }
  return { MockResend, emailsSendMock }
})

vi.mock('resend', () => ({
  Resend: MockResend,
}))

// Mock the email template to avoid JSX rendering issues in tests
vi.mock('@/emails/SchoolVerificationEmail', () => ({
  SchoolVerificationEmail: vi.fn((props: { verificationUrl: string }) => ({
    type: 'SchoolVerificationEmail',
    props,
  })),
}))

describe('generateVerificationToken', () => {
  it('returns a string matching UUID v4 format', async () => {
    const { generateVerificationToken } = await import('@/lib/verification')
    const token = generateVerificationToken()
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('returns a different token on each call', async () => {
    const { generateVerificationToken } = await import('@/lib/verification')
    const token1 = generateVerificationToken()
    const token2 = generateVerificationToken()
    expect(token1).not.toBe(token2)
  })
})

describe('isTokenExpired', () => {
  it('returns true for a date 1 hour in the past', async () => {
    const { isTokenExpired } = await import('@/lib/verification')
    const pastDate = new Date(Date.now() - 60 * 60 * 1000)
    expect(isTokenExpired(pastDate)).toBe(true)
  })

  it('returns false for a date 1 hour in the future', async () => {
    const { isTokenExpired } = await import('@/lib/verification')
    const futureDate = new Date(Date.now() + 60 * 60 * 1000)
    expect(isTokenExpired(futureDate)).toBe(false)
  })

  it('returns true for epoch date (edge case)', async () => {
    const { isTokenExpired } = await import('@/lib/verification')
    expect(isTokenExpired(new Date(0))).toBe(true)
  })

  it('handles string dates correctly', async () => {
    const { isTokenExpired } = await import('@/lib/verification')
    const futureIso = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    expect(isTokenExpired(futureIso)).toBe(false)
  })
})

describe('sendVerificationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_API_KEY = 're_test_key'
  })

  it('calls resend.emails.send with correct to, from, and subject', async () => {
    const { sendVerificationEmail } = await import('@/lib/verification')
    await sendVerificationEmail('teacher@school.edu', 'test-token-123')

    expect(emailsSendMock).toHaveBeenCalledTimes(1)
    expect(emailsSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'teacher@school.edu',
        from: 'Tutelo <noreply@tutelo.app>',
        subject: 'Verify your school email on Tutelo',
      })
    )
  })

  it('passes a truthy react prop (email template rendered)', async () => {
    const { sendVerificationEmail } = await import('@/lib/verification')
    await sendVerificationEmail('teacher@school.edu', 'test-token-123')

    const callArgs = emailsSendMock.mock.calls[0][0]
    expect(callArgs.react).toBeTruthy()
  })

  it('builds verification URL using NEXT_PUBLIC_APP_URL and token', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.tutelo.app'

    // Re-import to pick up env change
    vi.resetModules()
    const { sendVerificationEmail } = await import('@/lib/verification')
    await sendVerificationEmail('teacher@school.edu', 'abc-def-token')

    const callArgs = emailsSendMock.mock.calls[0][0]
    // The react prop is our mock which receives props including verificationUrl
    expect(callArgs.react.props.verificationUrl).toBe(
      'https://test.tutelo.app/api/verify-email?token=abc-def-token'
    )
  })
})
