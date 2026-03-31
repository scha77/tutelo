import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkDateConflicts } from '@/lib/utils/recurring'

// Helper to create a chainable Supabase mock for .from(table).select().eq().in()...
function createMockSupabase(options: {
  bookings?: Array<{ booking_date: string; start_time: string }>
  bookingsError?: { message: string } | null
  availability?: Array<{ day_of_week: number; start_time: string; end_time: string }>
  availabilityError?: { message: string } | null
  overrides?: Array<{ specific_date: string; start_time: string; end_time: string }>
  overridesError?: { message: string } | null
}) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'bookings') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => ({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: options.bookings ?? [],
                  error: options.bookingsError ?? null,
                }),
              }),
            }),
          })),
        }),
      }
    }
    if (table === 'availability') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: options.availability ?? [],
            error: options.availabilityError ?? null,
          }),
        }),
      }
    }
    if (table === 'availability_overrides') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: options.overrides ?? [],
              error: options.overridesError ?? null,
            }),
          }),
        }),
      }
    }
    return {}
  })

  return { from: fromMock } as never
}

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001'

describe('checkDateConflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all dates as available when no conflicts exist', async () => {
    const supabase = createMockSupabase({
      bookings: [],
      availability: [
        { day_of_week: 2, start_time: '14:00:00', end_time: '18:00:00' }, // Tuesday 2–6pm
      ],
      overrides: [],
    })

    const dates = ['2026-04-07', '2026-04-14', '2026-04-21']
    const result = await checkDateConflicts(TEACHER_ID, dates, '16:00', '17:00', supabase)

    expect(result.available).toEqual(['2026-04-07', '2026-04-14', '2026-04-21'])
    expect(result.skipped).toEqual([])
  })

  it('skips date with existing booking (reason: already booked)', async () => {
    const supabase = createMockSupabase({
      bookings: [
        { booking_date: '2026-04-14', start_time: '16:00:00' },
      ],
      availability: [
        { day_of_week: 2, start_time: '14:00:00', end_time: '18:00:00' },
      ],
      overrides: [],
    })

    const dates = ['2026-04-07', '2026-04-14', '2026-04-21']
    const result = await checkDateConflicts(TEACHER_ID, dates, '16:00', '17:00', supabase)

    expect(result.available).toEqual(['2026-04-07', '2026-04-21'])
    expect(result.skipped).toEqual([
      { date: '2026-04-14', reason: 'already booked' },
    ])
  })

  it('skips date when teacher has no availability (reason: not available)', async () => {
    const supabase = createMockSupabase({
      bookings: [],
      availability: [
        // Only Monday availability — Tuesday dates will fail
        { day_of_week: 1, start_time: '14:00:00', end_time: '18:00:00' },
      ],
      overrides: [],
    })

    const dates = ['2026-04-07', '2026-04-14'] // Both Tuesdays
    const result = await checkDateConflicts(TEACHER_ID, dates, '16:00', '17:00', supabase)

    expect(result.available).toEqual([])
    expect(result.skipped).toEqual([
      { date: '2026-04-07', reason: 'not available' },
      { date: '2026-04-14', reason: 'not available' },
    ])
  })

  it('skips date when override blocks availability (empty override = blocked)', async () => {
    const supabase = createMockSupabase({
      bookings: [],
      availability: [
        { day_of_week: 2, start_time: '14:00:00', end_time: '18:00:00' },
      ],
      // Override exists for 2026-04-14 but with a window that does NOT cover 16:00–17:00
      overrides: [
        { specific_date: '2026-04-14', start_time: '09:00:00', end_time: '12:00:00' },
      ],
    })

    const dates = ['2026-04-07', '2026-04-14', '2026-04-21']
    const result = await checkDateConflicts(TEACHER_ID, dates, '16:00', '17:00', supabase)

    // 04-07 and 04-21 use recurring (Tuesday 2-6pm covers 4-5pm) → available
    // 04-14 has an override that doesn't cover 4-5pm → skipped
    expect(result.available).toEqual(['2026-04-07', '2026-04-21'])
    expect(result.skipped).toEqual([
      { date: '2026-04-14', reason: 'not available' },
    ])
  })

  it('allows date when override provides covering availability', async () => {
    const supabase = createMockSupabase({
      bookings: [],
      availability: [], // No recurring availability
      overrides: [
        { specific_date: '2026-04-07', start_time: '15:00:00', end_time: '18:00:00' },
      ],
    })

    const dates = ['2026-04-07']
    const result = await checkDateConflicts(TEACHER_ID, dates, '16:00', '17:00', supabase)

    expect(result.available).toEqual(['2026-04-07'])
    expect(result.skipped).toEqual([])
  })

  it('handles all dates conflicted — empty available, all skipped', async () => {
    const supabase = createMockSupabase({
      bookings: [
        { booking_date: '2026-04-07', start_time: '16:00:00' },
        { booking_date: '2026-04-14', start_time: '16:00:00' },
      ],
      availability: [
        { day_of_week: 2, start_time: '14:00:00', end_time: '18:00:00' },
      ],
      overrides: [],
    })

    const dates = ['2026-04-07', '2026-04-14']
    const result = await checkDateConflicts(TEACHER_ID, dates, '16:00', '17:00', supabase)

    expect(result.available).toEqual([])
    expect(result.skipped).toEqual([
      { date: '2026-04-07', reason: 'already booked' },
      { date: '2026-04-14', reason: 'already booked' },
    ])
  })

  it('handles empty dates array', async () => {
    const supabase = createMockSupabase({})
    const result = await checkDateConflicts(TEACHER_ID, [], '16:00', '17:00', supabase)

    expect(result.available).toEqual([])
    expect(result.skipped).toEqual([])
  })

  it('handles mixed conflicts: booking + no availability + override block', async () => {
    const supabase = createMockSupabase({
      bookings: [
        { booking_date: '2026-04-07', start_time: '16:00:00' }, // booked
      ],
      availability: [
        { day_of_week: 2, start_time: '14:00:00', end_time: '18:00:00' }, // Tuesday
      ],
      overrides: [
        // 04-21 override to morning only — blocks 4pm slot
        { specific_date: '2026-04-21', start_time: '08:00:00', end_time: '12:00:00' },
      ],
    })

    // 04-07 = booked, 04-14 = available (Tuesday recurring), 04-21 = override blocks, 04-28 = available
    const dates = ['2026-04-07', '2026-04-14', '2026-04-21', '2026-04-28']
    const result = await checkDateConflicts(TEACHER_ID, dates, '16:00', '17:00', supabase)

    expect(result.available).toEqual(['2026-04-14', '2026-04-28'])
    expect(result.skipped).toEqual([
      { date: '2026-04-07', reason: 'already booked' },
      { date: '2026-04-21', reason: 'not available' },
    ])
  })
})
