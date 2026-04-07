import { describe, it, vi } from 'vitest'

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
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))

describe('GET /api/cron/auto-cancel', () => {
  it.todo('returns 401 when Authorization header is missing or has wrong CRON_SECRET')

  it.todo(
    'cancels requested bookings older than 48hr where teacher stripe_charges_enabled = false'
  )

  it.todo(
    'does NOT cancel bookings where teacher now has stripe_charges_enabled = true (teacher connected after booking)'
  )

  it.todo(
    'is idempotent — running twice cancels 0 rows on second run because status is already cancelled'
  )

  it.todo(
    'sends cancellation email AFTER updating status to cancelled, not before (email only on successful update)'
  )
})
