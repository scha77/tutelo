import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSendWaitlistNotificationEmail = vi.fn()
vi.mock('@/lib/email', () => ({
  sendWaitlistNotificationEmail: (...args: unknown[]) => mockSendWaitlistNotificationEmail(...args),
}))

const mockGetCapacityStatus = vi.fn()
vi.mock('@/lib/utils/capacity', () => ({
  getCapacityStatus: (...args: unknown[]) => mockGetCapacityStatus(...args),
}))

// Supabase admin mock — tracks chained calls per table
const mockWaitlistSelect = vi.fn()
const mockWaitlistUpdate = vi.fn()
const mockTeacherSelect = vi.fn()

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'teachers') return { select: mockTeacherSelect }
      if (table === 'waitlist') return { select: mockWaitlistSelect, update: mockWaitlistUpdate }
      return {}
    },
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEACHER_ID = 'teacher-uuid-001'

function setupTeacher(
  teacher: { capacity_limit: number | null; slug: string; full_name: string } | null
) {
  const singleMock = vi.fn().mockResolvedValue({ data: teacher })
  const eqMock = vi.fn().mockReturnValue({ single: singleMock })
  mockTeacherSelect.mockReturnValue({ eq: eqMock })
}

function setupWaitlistEntries(entries: { id: string; parent_email: string }[] | null) {
  const isMock = vi.fn().mockResolvedValue({ data: entries })
  const eqMock = vi.fn().mockReturnValue({ is: isMock })
  mockWaitlistSelect.mockReturnValue({ eq: eqMock })
}

function setupWaitlistUpdate() {
  const inMock = vi.fn().mockResolvedValue({ error: null })
  mockWaitlistUpdate.mockReturnValue({ in: inMock })
  return inMock
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkAndNotifyWaitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns early when teacher has no capacity_limit (null)', async () => {
    setupTeacher({ capacity_limit: null, slug: 'jane-doe', full_name: 'Jane Doe' })

    const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist')
    await checkAndNotifyWaitlist(TEACHER_ID)

    expect(mockGetCapacityStatus).not.toHaveBeenCalled()
    expect(mockSendWaitlistNotificationEmail).not.toHaveBeenCalled()
  })

  it('returns early when teacher not found in DB', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null })
    const eqMock = vi.fn().mockReturnValue({ single: singleMock })
    mockTeacherSelect.mockReturnValue({ eq: eqMock })

    const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist')
    await checkAndNotifyWaitlist(TEACHER_ID)

    expect(mockGetCapacityStatus).not.toHaveBeenCalled()
    expect(mockSendWaitlistNotificationEmail).not.toHaveBeenCalled()
  })

  it('returns early when teacher is still at capacity after cancellation', async () => {
    setupTeacher({ capacity_limit: 3, slug: 'jane-doe', full_name: 'Jane Doe' })
    mockGetCapacityStatus.mockResolvedValue({ atCapacity: true, activeStudentCount: 3 })

    const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist')
    await checkAndNotifyWaitlist(TEACHER_ID)

    expect(mockGetCapacityStatus).toHaveBeenCalled()
    expect(mockSendWaitlistNotificationEmail).not.toHaveBeenCalled()
  })

  it('sends emails and stamps notified_at for 2 unnotified entries when capacity freed', async () => {
    setupTeacher({ capacity_limit: 3, slug: 'jane-doe', full_name: 'Jane Doe' })
    mockGetCapacityStatus.mockResolvedValue({ atCapacity: false, activeStudentCount: 2 })
    setupWaitlistEntries([
      { id: 'w1', parent_email: 'parent1@test.com' },
      { id: 'w2', parent_email: 'parent2@test.com' },
    ])
    mockSendWaitlistNotificationEmail.mockResolvedValue(undefined)
    const inMock = setupWaitlistUpdate()

    const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist')
    await checkAndNotifyWaitlist(TEACHER_ID)

    // Both emails sent with correct args
    expect(mockSendWaitlistNotificationEmail).toHaveBeenCalledTimes(2)
    expect(mockSendWaitlistNotificationEmail).toHaveBeenCalledWith(
      'parent1@test.com',
      'Jane Doe',
      'jane-doe'
    )
    expect(mockSendWaitlistNotificationEmail).toHaveBeenCalledWith(
      'parent2@test.com',
      'Jane Doe',
      'jane-doe'
    )

    // Batch update called with both IDs
    expect(mockWaitlistUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ notified_at: expect.any(String) })
    )
    expect(inMock).toHaveBeenCalledWith('id', ['w1', 'w2'])
  })

  it('returns early with no emails when capacity freed but no unnotified entries', async () => {
    setupTeacher({ capacity_limit: 3, slug: 'jane-doe', full_name: 'Jane Doe' })
    mockGetCapacityStatus.mockResolvedValue({ atCapacity: false, activeStudentCount: 2 })
    setupWaitlistEntries([])

    const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist')
    await checkAndNotifyWaitlist(TEACHER_ID)

    expect(mockSendWaitlistNotificationEmail).not.toHaveBeenCalled()
    expect(mockWaitlistUpdate).not.toHaveBeenCalled()
  })

  it('stamps only successful entries when one email fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    setupTeacher({ capacity_limit: 3, slug: 'jane-doe', full_name: 'Jane Doe' })
    mockGetCapacityStatus.mockResolvedValue({ atCapacity: false, activeStudentCount: 2 })
    setupWaitlistEntries([
      { id: 'w1', parent_email: 'fail@test.com' },
      { id: 'w2', parent_email: 'success@test.com' },
    ])

    // First call fails, second succeeds
    mockSendWaitlistNotificationEmail
      .mockRejectedValueOnce(new Error('Resend API error'))
      .mockResolvedValueOnce(undefined)

    const inMock = setupWaitlistUpdate()

    const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist')
    await checkAndNotifyWaitlist(TEACHER_ID)

    // Both attempted
    expect(mockSendWaitlistNotificationEmail).toHaveBeenCalledTimes(2)

    // Only w2 stamped (w1 failed)
    expect(inMock).toHaveBeenCalledWith('id', ['w2'])

    // Error logged for failed entry
    expect(errorSpy).toHaveBeenCalledWith(
      '[waitlist] Failed to send notification',
      expect.objectContaining({
        teacher_id: TEACHER_ID,
        parent_email: 'fail@test.com',
      })
    )

    errorSpy.mockRestore()
  })

  it('logs top-level error and does not crash on unexpected failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Make teacher query throw
    const eqMock = vi.fn().mockReturnValue({
      single: vi.fn().mockRejectedValue(new Error('DB connection lost')),
    })
    mockTeacherSelect.mockReturnValue({ eq: eqMock })

    const { checkAndNotifyWaitlist } = await import('@/lib/utils/waitlist')
    await checkAndNotifyWaitlist(TEACHER_ID)

    expect(errorSpy).toHaveBeenCalledWith(
      '[waitlist] checkAndNotifyWaitlist failed',
      expect.objectContaining({ teacher_id: TEACHER_ID })
    )

    errorSpy.mockRestore()
  })
})
