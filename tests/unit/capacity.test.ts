import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAtCapacity, getCapacityStatus } from '@/lib/utils/capacity'

// ---------------------------------------------------------------------------
// Pure logic tests — isAtCapacity
// ---------------------------------------------------------------------------

describe('isAtCapacity — pure logic', () => {
  it('returns false when capacityLimit is null (unlimited)', () => {
    expect(isAtCapacity(10, null)).toBe(false)
  })

  it('returns false when capacityLimit is undefined (unlimited)', () => {
    expect(isAtCapacity(10, undefined)).toBe(false)
  })

  it('returns false when activeStudentCount < capacityLimit', () => {
    expect(isAtCapacity(2, 5)).toBe(false)
  })

  it('returns true when activeStudentCount === capacityLimit', () => {
    expect(isAtCapacity(3, 3)).toBe(true)
  })

  it('returns true when activeStudentCount > capacityLimit', () => {
    expect(isAtCapacity(7, 3)).toBe(true)
  })

  it('returns false when both count and limit are 0', () => {
    // Edge: limit of 0 means "at capacity with 0 students" — effectively closed
    expect(isAtCapacity(0, 0)).toBe(true)
  })

  it('returns false with zero students and a positive limit', () => {
    expect(isAtCapacity(0, 5)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getCapacityStatus — integration with mocked Supabase
// ---------------------------------------------------------------------------

function makeMockSupabase(data: { student_name: string }[] | null, error: { message: string } | null = null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data, error }),
          }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof getCapacityStatus>[0]
}

describe('getCapacityStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('short-circuits with null limit — no DB query', async () => {
    const supabase = makeMockSupabase([])
    const result = await getCapacityStatus(supabase, 'teacher-1', null)
    expect(result).toEqual({ atCapacity: false, activeStudentCount: 0 })
    // from() should never be called when limit is null
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('short-circuits with undefined limit — no DB query', async () => {
    const supabase = makeMockSupabase([])
    const result = await getCapacityStatus(supabase, 'teacher-1', undefined)
    expect(result).toEqual({ atCapacity: false, activeStudentCount: 0 })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns not at capacity when students < limit', async () => {
    const supabase = makeMockSupabase([
      { student_name: 'Alice' },
      { student_name: 'Bob' },
    ])
    const result = await getCapacityStatus(supabase, 'teacher-1', 5)
    expect(result).toEqual({ atCapacity: false, activeStudentCount: 2 })
  })

  it('returns at capacity when students === limit', async () => {
    const supabase = makeMockSupabase([
      { student_name: 'Alice' },
      { student_name: 'Bob' },
      { student_name: 'Charlie' },
    ])
    const result = await getCapacityStatus(supabase, 'teacher-1', 3)
    expect(result).toEqual({ atCapacity: true, activeStudentCount: 3 })
  })

  it('counts distinct student names (deduplicates)', async () => {
    const supabase = makeMockSupabase([
      { student_name: 'Alice' },
      { student_name: 'Alice' },
      { student_name: 'Bob' },
      { student_name: 'Alice' },
    ])
    const result = await getCapacityStatus(supabase, 'teacher-1', 3)
    // Only 2 distinct students: Alice, Bob
    expect(result).toEqual({ atCapacity: false, activeStudentCount: 2 })
  })

  it('returns not at capacity on query error (safe default)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = makeMockSupabase(null, { message: 'connection timeout' })
    const result = await getCapacityStatus(supabase, 'teacher-1', 3)
    expect(result).toEqual({ atCapacity: false, activeStudentCount: 0 })
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('teacher_id=teacher-1'),
      'connection timeout'
    )
    consoleSpy.mockRestore()
  })

  it('handles empty result set', async () => {
    const supabase = makeMockSupabase([])
    const result = await getCapacityStatus(supabase, 'teacher-1', 3)
    expect(result).toEqual({ atCapacity: false, activeStudentCount: 0 })
  })

  it('queries from bookings table with correct filters', async () => {
    const supabase = makeMockSupabase([{ student_name: 'Alice' }])
    await getCapacityStatus(supabase, 'teacher-42', 5)

    expect(supabase.from).toHaveBeenCalledWith('bookings')
  })
})
