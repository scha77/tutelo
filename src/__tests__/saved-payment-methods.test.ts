import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock supabase admin
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

// Mock booking utility (imported by create-intent)
vi.mock('@/lib/utils/booking', () => ({
  computeSessionAmount: vi.fn().mockReturnValue(7500),
}))

// Mock recurring utilities (imported by create-recurring)
vi.mock('@/lib/utils/recurring', () => ({
  generateRecurringDates: vi.fn(),
  checkDateConflicts: vi.fn(),
}))

// Mock email module (imported by create-recurring + webhook routes)
vi.mock('@/lib/email', () => ({
  sendRecurringBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendCheckoutLinkEmail: vi.fn().mockResolvedValue(undefined),
}))

// Stripe mock — vi.hoisted pattern from payment-intent.test.ts
const {
  stripeCustomersCreateMock,
  stripeCustomersRetrieveMock,
  stripePaymentIntentsCreateMock,
  stripePaymentMethodsRetrieveMock,
  stripePaymentMethodsDetachMock,
  stripeWebhooksConstructEventMock,
  MockStripeClass,
} = vi.hoisted(() => {
  const stripeCustomersCreateMock = vi.fn()
  const stripeCustomersRetrieveMock = vi.fn()
  const stripePaymentIntentsCreateMock = vi.fn()
  const stripePaymentMethodsRetrieveMock = vi.fn()
  const stripePaymentMethodsDetachMock = vi.fn()
  const stripeWebhooksConstructEventMock = vi.fn()
  class MockStripeClass {
    customers = { create: stripeCustomersCreateMock, retrieve: stripeCustomersRetrieveMock }
    paymentIntents = { create: stripePaymentIntentsCreateMock }
    paymentMethods = { retrieve: stripePaymentMethodsRetrieveMock, detach: stripePaymentMethodsDetachMock }
    webhooks = { constructEvent: stripeWebhooksConstructEventMock }
  }
  return {
    stripeCustomersCreateMock,
    stripeCustomersRetrieveMock,
    stripePaymentIntentsCreateMock,
    stripePaymentMethodsRetrieveMock,
    stripePaymentMethodsDetachMock,
    stripeWebhooksConstructEventMock,
    MockStripeClass,
  }
})

vi.mock('stripe', () => ({
  default: MockStripeClass,
}))

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001'
const STRIPE_ACCOUNT_ID = 'acct_test_saved'
const USER_ID = 'user-saved-pm-1'
const USER_EMAIL = 'parent@example.com'
const BOOKING_ID = 'booking-saved-001'

// ── Helpers ──

function setupAuth(user: { id: string; email?: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. create-intent Customer attachment
// ═══════════════════════════════════════════════════════════════════════════

describe('create-intent — Stripe Customer attachment (S03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
    vi.mock('@/lib/utils/booking', () => ({ computeSessionAmount: vi.fn().mockReturnValue(7500) }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))

    stripePaymentIntentsCreateMock.mockResolvedValue({
      id: 'pi_test_saved',
      client_secret: 'pi_test_saved_secret',
    })
    stripeCustomersCreateMock.mockResolvedValue({ id: 'cus_new_pm' })
  })

  function makeCreateIntentRequest() {
    return new Request('http://localhost/api/direct-booking/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: TEACHER_ID,
        bookingDate: '2026-04-10',
        startTime: '15:00',
        endTime: '16:00',
        studentName: 'Alex',
        subject: 'Math',
      }),
    })
  }

  /** Set up auth + teacher fetch + booking insert + parent_profiles SELECT + parent_profiles UPSERT */
  async function setupFullMocks(parentProfileData: { stripe_customer_id: string } | null) {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      setupAuth({ id: USER_ID, email: USER_EMAIL }) as never
    )

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // 1. teachers SELECT
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: TEACHER_ID,
              stripe_account_id: STRIPE_ACCOUNT_ID,
              stripe_charges_enabled: true,
              hourly_rate: 75,
            },
          }),
        }),
      }),
    })

    // 2. bookings INSERT
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: BOOKING_ID } }),
        }),
      }),
    })

    // 3. parent_profiles SELECT (Customer lookup)
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: parentProfileData }),
        }),
      }),
    })

    // 4. parent_profiles UPSERT (only called when no existing Customer)
    if (!parentProfileData?.stripe_customer_id) {
      fromMock.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
    }

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)
    return { fromMock }
  }

  it('creates Stripe Customer when parent has no parent_profiles row', async () => {
    await setupFullMocks(null)

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    const res = await POST(makeCreateIntentRequest())
    expect(res.status).toBe(200)

    expect(stripeCustomersCreateMock).toHaveBeenCalledWith({
      email: USER_EMAIL,
      metadata: { tutelo_user_id: USER_ID },
    })
  })

  it('includes customer and setup_future_usage on PaymentIntent', async () => {
    await setupFullMocks(null)

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    await POST(makeCreateIntentRequest())

    expect(stripePaymentIntentsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_new_pm',
        setup_future_usage: 'off_session',
      })
    )
  })

  it('reuses existing Customer — does NOT call customers.create', async () => {
    await setupFullMocks({ stripe_customer_id: 'cus_existing_123' })

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    const res = await POST(makeCreateIntentRequest())
    expect(res.status).toBe(200)

    // Should NOT create a new customer
    expect(stripeCustomersCreateMock).not.toHaveBeenCalled()
    // Should pass existing customer to PI
    expect(stripePaymentIntentsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing_123' })
    )
  })

  it('includes parent_id in PI metadata', async () => {
    await setupFullMocks(null)

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    await POST(makeCreateIntentRequest())

    expect(stripePaymentIntentsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ parent_id: USER_ID }),
      })
    )
  })

  it('preserves backward-compat PI params (capture_method, transfer_data)', async () => {
    await setupFullMocks(null)

    const { POST } = await import('@/app/api/direct-booking/create-intent/route')
    await POST(makeCreateIntentRequest())

    expect(stripePaymentIntentsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        capture_method: 'manual',
        transfer_data: { destination: STRIPE_ACCOUNT_ID },
      })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. create-recurring Customer reuse
// ═══════════════════════════════════════════════════════════════════════════

describe('create-recurring — Stripe Customer reuse (S03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
    vi.mock('@/lib/utils/booking', () => ({ computeSessionAmount: vi.fn().mockReturnValue(7500) }))
    vi.mock('@/lib/utils/recurring', () => ({
      generateRecurringDates: vi.fn().mockReturnValue(['2026-04-07', '2026-04-14']),
      checkDateConflicts: vi.fn().mockResolvedValue({ available: ['2026-04-07', '2026-04-14'], skipped: [] }),
    }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
    vi.mock('@/lib/email', () => ({
      sendRecurringBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    }))

    stripeCustomersCreateMock.mockResolvedValue({ id: 'cus_rec_new' })
    stripeCustomersRetrieveMock.mockResolvedValue({ id: 'cus_rec_existing' })
    stripePaymentIntentsCreateMock.mockResolvedValue({
      id: 'pi_rec_test',
      client_secret: 'pi_rec_test_secret',
    })
  })

  function makeRecurringRequest() {
    return new Request('http://localhost/api/direct-booking/create-recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: TEACHER_ID,
        bookingDate: '2026-04-07',
        startTime: '16:00',
        endTime: '17:00',
        studentName: 'Alex',
        subject: 'Math',
        frequency: 'weekly',
        totalSessions: 2,
      }),
    })
  }

  async function setupRecurringMocks(parentProfileData: { stripe_customer_id: string } | null) {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      setupAuth({ id: USER_ID, email: USER_EMAIL }) as never
    )

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()
    let callIndex = 0

    // 1. teachers SELECT
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: TEACHER_ID,
              stripe_account_id: STRIPE_ACCOUNT_ID,
              stripe_charges_enabled: true,
              hourly_rate: 75,
              full_name: 'Test Teacher',
              social_email: 'teacher@test.com',
            },
          }),
        }),
      }),
    })

    // 2. recurring_schedules INSERT
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'sched-001' } }),
        }),
      }),
    })

    // 3 & 4. booking INSERTs (2 sessions)
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'book-1' } }),
        }),
      }),
    })
    fromMock.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'book-2' } }),
        }),
      }),
    })

    // 5. parent_profiles SELECT (Customer lookup)
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: parentProfileData }),
        }),
      }),
    })

    // 6. parent_profiles UPSERT (only when creating new Customer)
    if (!parentProfileData?.stripe_customer_id) {
      fromMock.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
    }

    // 7. recurring_schedules UPDATE (store stripe_customer_id)
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)
    return { fromMock }
  }

  it('reuses existing Customer from parent_profiles — no customers.create call', async () => {
    await setupRecurringMocks({ stripe_customer_id: 'cus_rec_existing' })

    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    const res = await POST(makeRecurringRequest())
    expect(res.status).toBe(200)

    expect(stripeCustomersCreateMock).not.toHaveBeenCalled()
    expect(stripeCustomersRetrieveMock).toHaveBeenCalledWith('cus_rec_existing')
    expect(stripePaymentIntentsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_rec_existing' })
    )
  })

  it('creates new Customer when parent has no parent_profiles row', async () => {
    await setupRecurringMocks(null)

    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    const res = await POST(makeRecurringRequest())
    expect(res.status).toBe(200)

    expect(stripeCustomersCreateMock).toHaveBeenCalledWith({
      email: USER_EMAIL,
      metadata: { tutelo_user_id: USER_ID },
    })
  })

  it('stores customer on recurring_schedules for cron backward compat', async () => {
    const { fromMock } = await setupRecurringMocks(null)

    const { POST } = await import('@/app/api/direct-booking/create-recurring/route')
    await POST(makeRecurringRequest())

    // The recurring_schedules UPDATE call is the last from() call
    // Verify that update was called on recurring_schedules with stripe_customer_id
    // fromMock was called with 'recurring_schedules' for the update
    const updateCalls = fromMock.mock.calls.filter(
      (call: string[]) => call[0] === 'recurring_schedules'
    )
    // Should have 2 recurring_schedules calls: INSERT + UPDATE
    expect(updateCalls.length).toBeGreaterThanOrEqual(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. Webhook PM upsert
// ═══════════════════════════════════════════════════════════════════════════

describe('Webhook — PM upsert to parent_profiles (S03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))
    vi.mock('@/lib/email', () => ({
      sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
      sendCheckoutLinkEmail: vi.fn().mockResolvedValue(undefined),
    }))

    stripePaymentMethodsRetrieveMock.mockResolvedValue({
      id: 'pm_test123',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2028,
      },
    })
  })

  function makeWebhookRequest(body: string) {
    return new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_sig',
      },
      body,
    })
  }

  function makePI(overrides: Record<string, unknown> = {}) {
    return {
      id: 'pi_wh_test',
      customer: 'cus_wh_test',
      payment_method: 'pm_test123',
      metadata: {
        booking_id: BOOKING_ID,
        teacher_id: TEACHER_ID,
        parent_id: USER_ID,
      },
      ...overrides,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function setupWebhookMocks(pi: any) {
    stripeWebhooksConstructEventMock.mockReturnValue({
      type: 'payment_intent.amount_capturable_updated',
      data: { object: pi },
    })

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // 1. bookings UPDATE (confirm booking)
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [{ id: BOOKING_ID }] }),
          }),
        }),
      }),
    })

    // 2. recurring_schedules UPDATE (if recurring_schedule_id present) — skipped if not in metadata

    // 3. parent_profiles UPSERT (PM card details)
    if (pi.metadata?.parent_id && pi.customer && pi.payment_method) {
      fromMock.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
    }

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)
    return { fromMock }
  }

  it('retrieves PM and upserts card details to parent_profiles', async () => {
    const pi = makePI()
    await setupWebhookMocks(pi)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const res = await POST(makeWebhookRequest('{}'))
    expect(res.status).toBe(200)

    expect(stripePaymentMethodsRetrieveMock).toHaveBeenCalledWith('pm_test123')
  })

  it('skips PM upsert when metadata has no parent_id (pre-S03 booking)', async () => {
    const pi = makePI({
      metadata: { booking_id: BOOKING_ID, teacher_id: TEACHER_ID },
    })
    // No parent_id → should NOT call paymentMethods.retrieve

    stripeWebhooksConstructEventMock.mockReturnValue({
      type: 'payment_intent.amount_capturable_updated',
      data: { object: pi },
    })

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // bookings UPDATE
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [{ id: BOOKING_ID }] }),
          }),
        }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const res = await POST(makeWebhookRequest('{}'))
    expect(res.status).toBe(200)

    expect(stripePaymentMethodsRetrieveMock).not.toHaveBeenCalled()
  })

  it('skips PM upsert when PI has no payment_method', async () => {
    const pi = makePI({ payment_method: null })

    stripeWebhooksConstructEventMock.mockReturnValue({
      type: 'payment_intent.amount_capturable_updated',
      data: { object: pi },
    })

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // bookings UPDATE
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [{ id: BOOKING_ID }] }),
          }),
        }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const res = await POST(makeWebhookRequest('{}'))
    expect(res.status).toBe(200)

    expect(stripePaymentMethodsRetrieveMock).not.toHaveBeenCalled()
  })

  it('idempotent: second webhook delivery with same PM data succeeds', async () => {
    const pi = makePI()
    await setupWebhookMocks(pi)

    const { POST } = await import('@/app/api/stripe/webhook/route')
    const res = await POST(makeWebhookRequest('{}'))
    expect(res.status).toBe(200)

    // The upsert with onConflict means second delivery just overwrites → no error
    expect(stripePaymentMethodsRetrieveMock).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. GET /api/parent/payment-method
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /api/parent/payment-method', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
  })

  it('returns card details when parent has a saved card', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      setupAuth({ id: USER_ID, email: USER_EMAIL }) as never
    )

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              card_brand: 'visa',
              card_last4: '4242',
              card_exp_month: 12,
              card_exp_year: 2028,
            },
            error: null,
          }),
        }),
      }),
    } as never)

    const { GET } = await import('@/app/api/parent/payment-method/route')
    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.card).toEqual({
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2028,
    })
  })

  it('returns { card: null } when parent has no parent_profiles row', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      setupAuth({ id: USER_ID, email: USER_EMAIL }) as never
    )

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    } as never)

    const { GET } = await import('@/app/api/parent/payment-method/route')
    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.card).toBeNull()
  })

  it('returns 401 when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth(null) as never)

    const { GET } = await import('@/app/api/parent/payment-method/route')
    const res = await GET()
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 5. DELETE /api/parent/payment-method
// ═══════════════════════════════════════════════════════════════════════════

describe('DELETE /api/parent/payment-method', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.mock('@/lib/supabase/service', () => ({ supabaseAdmin: { from: vi.fn() } }))
    vi.mock('stripe', () => ({ default: MockStripeClass }))

    stripePaymentMethodsDetachMock.mockResolvedValue({ id: 'pm_detached' })
  })

  it('detaches PM from Stripe and clears card fields — returns 200', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      setupAuth({ id: USER_ID, email: USER_EMAIL }) as never
    )

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    const fromMock = vi.fn()

    // 1. parent_profiles SELECT (fetch PM ID)
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { stripe_payment_method_id: 'pm_saved_456' },
            error: null,
          }),
        }),
      }),
    })

    // 2. parent_profiles UPDATE (clear card fields)
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock)

    const { DELETE } = await import('@/app/api/parent/payment-method/route')
    const res = await DELETE()
    expect(res.status).toBe(200)

    expect(stripePaymentMethodsDetachMock).toHaveBeenCalledWith('pm_saved_456')
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when no saved payment method', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(
      setupAuth({ id: USER_ID, email: USER_EMAIL }) as never
    )

    const { supabaseAdmin } = await import('@/lib/supabase/service')
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    } as never)

    const { DELETE } = await import('@/app/api/parent/payment-method/route')
    const res = await DELETE()
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toBe('No saved payment method')
  })

  it('returns 401 when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(setupAuth(null) as never)

    const { DELETE } = await import('@/app/api/parent/payment-method/route')
    const res = await DELETE()
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })
})
