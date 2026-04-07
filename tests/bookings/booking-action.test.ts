import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

// Mock email module (created in Plan 02-03; intentionally missing now)
vi.mock('@/lib/email', () => ({
  sendBookingEmail: vi.fn().mockResolvedValue(undefined),
}))

// Mock supabaseAdmin — required since bookings.ts imports it at module level (Plan 05-03)
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

// Mock Supabase server client
const mockGetClaims = vi.fn()
const mockTeacherSingle = vi.fn()
const mockUpdate = vi.fn()
const mockUpdateEq1 = vi.fn()
const mockUpdateEq2 = vi.fn()
const mockUpdateEq3 = vi.fn()

// We need a chainable mock for .from().update().eq().eq().eq()
// Build chain per-call using a factory
function buildUpdateChain(result: unknown) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }
  // Override the last eq to resolve with result
  let eqCount = 0
  chain.eq.mockImplementation(() => {
    eqCount++
    if (eqCount >= 3) {
      return Promise.resolve(result)
    }
    return chain
  })
  return chain
}

const mockFrom = vi.fn()

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getClaims: mockGetClaims,
    },
    from: mockFrom,
  })),
}))

describe('acceptBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("changes booking status to 'pending' and returns { success: true }", async () => {
    // Arrange — authenticated teacher
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: 'user-123' } },
    })

    const teacherChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'teacher-456' }, error: null }),
    }

    // count=1 means one row was updated
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    let updateEqCount = 0
    updateChain.eq.mockImplementation(() => {
      updateEqCount++
      if (updateEqCount >= 3) {
        return Promise.resolve({ count: 1, error: null })
      }
      return updateChain
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'teachers') return teacherChain
      if (table === 'bookings') return updateChain
      return {}
    })

    const { acceptBooking } = await import('@/actions/bookings')
    const result = await acceptBooking('booking-789')

    // Assert
    expect(result).toEqual({ success: true })
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' })
    )
  })

  it("returns { error: 'Not authenticated' } when no claims", async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null } })

    const { acceptBooking } = await import('@/actions/bookings')
    const result = await acceptBooking('booking-789')

    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it("returns { error: 'Teacher not found' } when teacher query fails", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: 'user-123' } },
    })

    const teacherChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'teachers') return teacherChain
      return {}
    })

    const { acceptBooking } = await import('@/actions/bookings')
    const result = await acceptBooking('booking-789')

    expect(result).toEqual({ error: 'Teacher not found' })
  })
})

describe('declineBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("changes booking status to 'cancelled' and returns { success: true }", async () => {
    // Arrange — authenticated teacher
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: 'user-123' } },
    })

    const teacherChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'teacher-456' }, error: null }),
    }

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    let updateEqCount = 0
    updateChain.eq.mockImplementation(() => {
      updateEqCount++
      if (updateEqCount >= 3) {
        return Promise.resolve({ count: 1, error: null })
      }
      return updateChain
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'teachers') return teacherChain
      if (table === 'bookings') return updateChain
      return {}
    })

    const { declineBooking } = await import('@/actions/bookings')
    const result = await declineBooking('booking-789')

    // Assert
    expect(result).toEqual({ success: true })
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    )
  })

  it("returns { error: 'Not authenticated' } when no claims", async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null } })

    const { declineBooking } = await import('@/actions/bookings')
    const result = await declineBooking('booking-789')

    expect(result).toEqual({ error: 'Not authenticated' })
  })
})
