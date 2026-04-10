import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// vi.hoisted ensures mock variables are available before module imports are hoisted
const { mockSendCancellationEmail } = vi.hoisted(() => {
  const mockSendCancellationEmail = vi.fn().mockResolvedValue(undefined)
  return { mockSendCancellationEmail }
})

// Mock email module
vi.mock('@/lib/email', () => ({
  sendCancellationEmail: mockSendCancellationEmail,
  sendFollowUpEmail: vi.fn().mockResolvedValue(undefined),
  sendUrgentFollowUpEmail: vi.fn().mockResolvedValue(undefined),
  sendCheckoutLinkEmail: vi.fn().mockResolvedValue(undefined),
}))

// Mock supabaseAdmin — service role client used in cron handlers
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: mockFrom },
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
  withMonitor: vi.fn((_slug: string, fn: () => unknown) => fn()),
}))

const CRON_SECRET = 'test-cron-secret'

function makeRequest(token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  return new NextRequest('http://localhost/api/cron/auto-cancel', { headers })
}

/**
 * Sets up supabaseAdmin.from() mock chains for the auto-cancel route.
 *
 * Chains mocked:
 *  1. from('bookings').select(...).eq(...).lt(...)  → bookings query
 *  2. from('teachers').select(...).eq(...).maybeSingle() → teacher lookup
 *  3. from('bookings').update(...).eq(...).eq(...).select(...) → status update
 */
function setupMocks(options: {
  bookings?: Array<{ id: string; parent_email: string; teacher_id: string }>
  teacher?: { stripe_charges_enabled: boolean; social_email?: string; full_name?: string } | null
  updateResult?: { data: Array<{ id: string }> }
}) {
  const { bookings = [], teacher = null, updateResult = { data: [] } } = options

  mockFrom.mockImplementation((table: string) => {
    if (table === 'bookings') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => ({ data: bookings })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => updateResult),
            })),
          })),
        })),
      }
    }
    if (table === 'teachers') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({ data: teacher })),
          })),
        })),
      }
    }
    return {}
  })
}

describe('GET /api/cron/auto-cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  it('returns 401 when Authorization header is missing or has wrong CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/auto-cancel/route')

    // Missing header
    const resp1 = await GET(makeRequest())
    expect(resp1.status).toBe(401)

    // Wrong secret
    const resp2 = await GET(makeRequest('wrong-secret'))
    expect(resp2.status).toBe(401)
  })

  it('cancels requested bookings older than 48hr where teacher stripe_charges_enabled = false', async () => {
    const booking = { id: 'b1', parent_email: 'parent@test.com', teacher_id: 't1' }
    setupMocks({
      bookings: [booking],
      teacher: { stripe_charges_enabled: false, social_email: 'teacher@test.com', full_name: 'Test Teacher' },
      updateResult: { data: [{ id: 'b1' }] },
    })

    const { GET } = await import('@/app/api/cron/auto-cancel/route')
    const resp = await GET(makeRequest(CRON_SECRET))
    const json = await resp.json()

    expect(json).toEqual({ cancelled: 1, total_checked: 1 })
    expect(mockSendCancellationEmail).toHaveBeenCalledWith('b1')
  })

  it('does NOT cancel when teacher has stripe_charges_enabled = true (teacher connected after booking)', async () => {
    const booking = { id: 'b2', parent_email: 'parent@test.com', teacher_id: 't2' }
    setupMocks({
      bookings: [booking],
      teacher: { stripe_charges_enabled: true, social_email: 'teacher@test.com', full_name: 'Connected Teacher' },
    })

    const { GET } = await import('@/app/api/cron/auto-cancel/route')
    const resp = await GET(makeRequest(CRON_SECRET))
    const json = await resp.json()

    expect(json).toEqual({ cancelled: 0, total_checked: 1 })
    expect(mockSendCancellationEmail).not.toHaveBeenCalled()
  })

  it('is idempotent — running twice cancels 0 rows on second run because status is already cancelled', async () => {
    const booking = { id: 'b3', parent_email: 'parent@test.com', teacher_id: 't3' }
    // Simulate re-run: query still returns the booking (mock doesn't filter by status),
    // but the update returns empty because .eq('status', 'requested') no longer matches
    setupMocks({
      bookings: [booking],
      teacher: { stripe_charges_enabled: false },
      updateResult: { data: [] },
    })

    const { GET } = await import('@/app/api/cron/auto-cancel/route')
    const resp = await GET(makeRequest(CRON_SECRET))
    const json = await resp.json()

    expect(json).toEqual({ cancelled: 0, total_checked: 1 })
    expect(mockSendCancellationEmail).not.toHaveBeenCalled()
  })

  it('sends cancellation email AFTER updating status to cancelled, not before (email only on successful update)', async () => {
    const callOrder: string[] = []
    const booking = { id: 'b4', parent_email: 'parent@test.com', teacher_id: 't4' }

    // Custom mock with call-order tracking
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              lt: vi.fn(() => ({ data: [booking] })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => {
                  callOrder.push('status-updated')
                  return { data: [{ id: 'b4' }] }
                }),
              })),
            })),
          })),
        }
      }
      if (table === 'teachers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => ({ data: { stripe_charges_enabled: false } })),
            })),
          })),
        }
      }
      return {}
    })

    mockSendCancellationEmail.mockImplementation(async () => {
      callOrder.push('email-sent')
    })

    const { GET } = await import('@/app/api/cron/auto-cancel/route')
    await GET(makeRequest(CRON_SECRET))

    expect(callOrder).toEqual(['status-updated', 'email-sent'])
  })
})
