import { describe, it, vi, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// vi.hoisted ensures mock variables are available before module imports are hoisted
const { mockSendSessionReminderEmail, mockSendSmsReminder } = vi.hoisted(() => {
  const mockSendSessionReminderEmail = vi.fn().mockResolvedValue(undefined)
  const mockSendSmsReminder = vi.fn().mockResolvedValue(undefined)
  return { mockSendSessionReminderEmail, mockSendSmsReminder }
})

// Mock email module
vi.mock('@/lib/email', () => ({
  sendSessionReminderEmail: mockSendSessionReminderEmail,
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendFollowUpEmail: vi.fn().mockResolvedValue(undefined),
  sendUrgentFollowUpEmail: vi.fn().mockResolvedValue(undefined),
  sendCheckoutLinkEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendSessionCompleteEmail: vi.fn().mockResolvedValue(undefined),
}))

// Mock SMS module
vi.mock('@/lib/sms', () => ({
  sendSmsReminder: mockSendSmsReminder,
  sendSmsCancellation: vi.fn().mockResolvedValue(undefined),
}))

// Chainable Supabase mock factory
function makeChain(finalValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is', 'update', 'single', 'maybeSingle', 'gte', 'lte', 'in']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Terminal — resolves with the provided value
  ;(chain as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) =>
    Promise.resolve(finalValue).then(resolve)
  return chain
}

// Supabase mock state — updated per-test
let mockFromImpl: (table: string) => unknown = () => makeChain({ data: [] })

vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn((...args: unknown[]) => mockFromImpl(args[0] as string)),
  },
}))

describe('GET /api/cron/session-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
  })

  function makeRequest(authHeader?: string) {
    return new NextRequest('http://localhost/api/cron/session-reminders', {
      method: 'GET',
      headers: authHeader ? { authorization: authHeader } : {},
    })
  }

  it('returns 401 when Authorization header is missing or incorrect', async () => {
    const { GET } = await import('@/app/api/cron/session-reminders/route')

    const noAuth = await GET(makeRequest())
    expect(noAuth.status).toBe(401)

    const wrongAuth = await GET(makeRequest('Bearer wrong-secret'))
    expect(wrongAuth.status).toBe(401)
  })

  it('sends reminder email only to bookings with booking_date = tomorrow and reminder_sent_at IS NULL', async () => {
    const tomorrowUtc = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    // Simulate: one confirmed session tomorrow with no reminder sent yet
    const sessions = [{ id: 'booking-1', booking_date: tomorrowUtc }]
    const selectChain = makeChain({ data: sessions })
    const updateChain = makeChain({ data: [{ id: 'booking-1' }] })

    mockFromImpl = (table: string) => {
      if (table === 'bookings') {
        // First call (select) returns sessions; second call (update) returns updated row
        const fromMock = vi.fn()
          .mockReturnValueOnce(selectChain)
          .mockReturnValueOnce(updateChain)
        return fromMock()
      }
      return makeChain({ data: [] })
    }

    // Intercept from() calls to count uses
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)

    // Build chains in-order: first call selects sessions, second updates
    const selectResult = makeChain({ data: sessions })
    const updateResult = makeChain({ data: [{ id: 'booking-1' }] })
    fromSpy.mockReturnValueOnce(selectResult as never).mockReturnValueOnce(updateResult as never)

    const { GET } = await import('@/app/api/cron/session-reminders/route')
    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(1)
    expect(body.checked).toBe(1)
    expect(mockSendSessionReminderEmail).toHaveBeenCalledWith('booking-1')
    expect(mockSendSmsReminder).toHaveBeenCalledWith('booking-1')
  })

  it('idempotent: second cron run skips bookings where reminder_sent_at is already set', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)

    // Sessions query returns one booking
    const sessions = [{ id: 'booking-2' }]
    const selectResult = makeChain({ data: sessions })
    // Update returns empty array — row was already updated (reminder_sent_at already set)
    const updateResult = makeChain({ data: [] })

    fromSpy.mockReturnValueOnce(selectResult as never).mockReturnValueOnce(updateResult as never)

    const { GET } = await import('@/app/api/cron/session-reminders/route')
    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    // sent = 0 because update returned [] (reminder_sent_at was already set)
    expect(body.sent).toBe(0)
    expect(body.checked).toBe(1)
    expect(mockSendSessionReminderEmail).not.toHaveBeenCalled()
  })

  it('increments sent count only when conditional update succeeds', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)

    // Two sessions: first update succeeds, second update fails (already sent)
    const sessions = [{ id: 'booking-3' }, { id: 'booking-4' }]
    const selectResult = makeChain({ data: sessions })
    const updateSuccess = makeChain({ data: [{ id: 'booking-3' }] })
    const updateSkipped = makeChain({ data: [] })

    fromSpy
      .mockReturnValueOnce(selectResult as never)
      .mockReturnValueOnce(updateSuccess as never)
      .mockReturnValueOnce(updateSkipped as never)

    const { GET } = await import('@/app/api/cron/session-reminders/route')
    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(1)
    expect(body.checked).toBe(2)
    expect(mockSendSessionReminderEmail).toHaveBeenCalledTimes(1)
    expect(mockSendSessionReminderEmail).toHaveBeenCalledWith('booking-3')
  })

  it('does not send reminder for cancelled or completed bookings', async () => {
    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromSpy = vi.mocked(supabaseAdmin.from)

    // Query filtered on status=confirmed means cancelled/completed never appear
    const selectResult = makeChain({ data: [] }) // no sessions match filters

    fromSpy.mockReturnValueOnce(selectResult as never)

    const { GET } = await import('@/app/api/cron/session-reminders/route')
    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(0)
    expect(body.checked).toBe(0)
    expect(mockSendSessionReminderEmail).not.toHaveBeenCalled()
  })
})
