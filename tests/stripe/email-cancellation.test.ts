import { describe, it, vi } from 'vitest'

// vi.hoisted ensures mock variables are available before module imports are hoisted
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

// Mock supabaseAdmin — service role client used in email functions
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

describe('sendCancellationEmail (NOTIF-05)', () => {
  it.todo('sends to both parent email and teacher social_email')

  it.todo('both emails use CancellationEmail template')
})
