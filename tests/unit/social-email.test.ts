import { describe, it, expect, vi, beforeEach } from 'vitest'

// Build a chainable Supabase mock for the teachers table
const mockInsert = vi.fn(() => ({ error: null }))
const mockMaybeSingle = vi.fn()
const mockEqSelect = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelectId = vi.fn(() => ({ eq: mockEqSelect }))

const mockEqUpdate = vi.fn(() => ({ error: null }))
const mockUpdate = vi.fn(() => ({ eq: mockEqUpdate }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'teachers') {
    return {
      select: mockSelectId,
      insert: mockInsert,
      update: mockUpdate,
    }
  }
  return {}
})

const mockGetUser = vi.fn()
const mockGetClaims = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
      getClaims: mockGetClaims,
    },
  })),
}))

vi.mock('@/lib/utils/slugify', () => ({
  findUniqueSlug: vi.fn(async (name: string) => name.toLowerCase().replace(/\s+/g, '-')),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Import after mocks
const { saveWizardStep } = await import('@/actions/onboarding')

describe('saveWizardStep social_email auto-population', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated user with claims
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: 'user-123' } },
    })
  })

  it('auto-sets social_email from auth email on INSERT (new teacher)', async () => {
    // No existing teacher row
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    // getUser returns auth email
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'teacher@example.com' } },
    })
    mockInsert.mockReturnValue({ error: null })

    const result = await saveWizardStep(1, { full_name: 'Ms. Johnson' })

    expect(result.error).toBeUndefined()

    // Verify insert was called with social_email from auth
    expect(mockInsert).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertArg = (mockInsert.mock.calls[0] as any[])[0]
    expect(insertArg.social_email).toBe('teacher@example.com')
    expect(insertArg.full_name).toBe('Ms. Johnson')
    expect(insertArg.user_id).toBe('user-123')
  })

  it('falls back to null social_email when getUser() fails', async () => {
    // No existing teacher row
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    // getUser throws
    mockGetUser.mockRejectedValue(new Error('Auth service unavailable'))
    mockInsert.mockReturnValue({ error: null })

    const result = await saveWizardStep(1, { full_name: 'Mr. Smith' })

    expect(result.error).toBeUndefined()

    // Insert still happens — social_email is null (graceful fallback)
    expect(mockInsert).toHaveBeenCalledTimes(1)
    const insertArg = (mockInsert.mock.calls[0] as unknown[])[0] as Record<string, unknown>
    expect(insertArg.social_email).toBeNull()
  })

  it('falls back to null when getUser() returns no email', async () => {
    // No existing teacher row
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    // getUser returns user with no email (edge case)
    mockGetUser.mockResolvedValue({
      data: { user: { email: undefined } },
    })
    mockInsert.mockReturnValue({ error: null })

    const result = await saveWizardStep(1, { full_name: 'Ms. Davis' })

    expect(result.error).toBeUndefined()

    const insertArg = (mockInsert.mock.calls[0] as unknown[])[0] as Record<string, unknown>
    expect(insertArg.social_email).toBeNull()
  })

  it('does NOT call getUser() on UPDATE (existing teacher)', async () => {
    // Existing teacher row
    mockMaybeSingle.mockResolvedValue({ data: { id: 'teacher-456' }, error: null })
    mockEqUpdate.mockReturnValue({ error: null })

    const result = await saveWizardStep(2, { subjects: ['Math'] } as any)

    expect(result.error).toBeUndefined()

    // getUser should NOT be called — only applies to INSERT branch
    expect(mockGetUser).not.toHaveBeenCalled()
    // update was called, not insert
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns error when user is not authenticated', async () => {
    // No authenticated user
    mockGetClaims.mockResolvedValue({
      data: { claims: null },
    })

    const result = await saveWizardStep(1, { full_name: 'Anonymous' })

    expect(result.error).toBe('Not authenticated')
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
