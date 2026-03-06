import { describe, it, vi } from 'vitest'

// vi.hoisted ensures mock variables are available before module imports are hoisted
const { mockSendFollowUpEmail, mockSendUrgentFollowUpEmail } = vi.hoisted(() => {
  const mockSendFollowUpEmail = vi.fn().mockResolvedValue(undefined)
  const mockSendUrgentFollowUpEmail = vi.fn().mockResolvedValue(undefined)
  return { mockSendFollowUpEmail, mockSendUrgentFollowUpEmail }
})

// Mock email module
vi.mock('@/lib/email', () => ({
  sendFollowUpEmail: mockSendFollowUpEmail,
  sendUrgentFollowUpEmail: mockSendUrgentFollowUpEmail,
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendCheckoutLinkEmail: vi.fn().mockResolvedValue(undefined),
}))

// Mock supabaseAdmin — service role client used in cron handlers
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

describe('GET /api/cron/stripe-reminders', () => {
  it.todo('returns 401 when Authorization header is missing or has wrong CRON_SECRET')

  it.todo(
    'sends 24hr gentle reminder email to teacher when booking is between 24–48hr old and teacher has no Stripe connection'
  )

  it.todo(
    'sends 48hr urgent email to teacher when booking is older than 48hr and teacher has no Stripe connection'
  )

  it.todo('sends no email when booking is younger than 24hr old')

  it.todo('sends no reminder emails when teacher already has stripe_charges_enabled = true')
})
