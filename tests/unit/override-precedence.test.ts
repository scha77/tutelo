import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getSlotsForDate } from '@/lib/utils/slots'
import type { AvailabilitySlot, AvailabilityOverride } from '@/lib/utils/slots'

// Jan 8, 2030 is a Tuesday (day_of_week = 2)
const FUTURE_DATE = new Date(2030, 0, 8) // Tuesday, January 8, 2030
const FUTURE_DATE_STR = '2030-01-08'

const TZ = 'America/New_York'

// Recurring slots: Tuesday 10:00–11:00 and 14:00–15:00
const recurringSlots: AvailabilitySlot[] = [
  {
    id: 'rec-1',
    teacher_id: 'teacher-1',
    day_of_week: 2, // Tuesday
    start_time: '10:00:00',
    end_time: '11:00:00',
  },
  {
    id: 'rec-2',
    teacher_id: 'teacher-1',
    day_of_week: 2, // Tuesday
    start_time: '14:00:00',
    end_time: '15:00:00',
  },
]

describe('getSlotsForDate — override-wins-recurring precedence', () => {
  beforeEach(() => {
    // Fake timers so `new Date()` inside getSlotsForDate returns our controlled time
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('no override for date → returns recurring slots for that day-of-week', () => {
    vi.setSystemTime(new Date(2030, 0, 8, 0, 0, 0))

    const result = getSlotsForDate(FUTURE_DATE, recurringSlots, TZ, TZ, [])

    expect(result).toHaveLength(2)
    expect(result[0].slotId).toBe('rec-1')
    expect(result[0].startRaw).toBe('10:00')
    expect(result[0].endRaw).toBe('11:00')
    expect(result[1].slotId).toBe('rec-2')
    expect(result[1].startRaw).toBe('14:00')
    expect(result[1].endRaw).toBe('15:00')
  })

  it('override exists for date → returns only override slots, ignoring recurring', () => {
    vi.setSystemTime(new Date(2030, 0, 8, 0, 0, 0))

    const overrides: AvailabilityOverride[] = [
      { specific_date: FUTURE_DATE_STR, start_time: '09:00', end_time: '09:30' },
      { specific_date: FUTURE_DATE_STR, start_time: '16:00', end_time: '17:00' },
    ]

    const result = getSlotsForDate(FUTURE_DATE, recurringSlots, TZ, TZ, overrides)

    // Only override slots returned — recurring 10:00 and 14:00 are ignored
    expect(result).toHaveLength(2)
    expect(result[0].slotId).toBe(`${FUTURE_DATE_STR}-09:00`)
    expect(result[0].startRaw).toBe('09:00')
    expect(result[0].endRaw).toBe('09:30')
    expect(result[1].slotId).toBe(`${FUTURE_DATE_STR}-16:00`)
    expect(result[1].startRaw).toBe('16:00')
    expect(result[1].endRaw).toBe('17:00')
  })

  it('override with zero usable windows for date → returns empty even if recurring exists', () => {
    // Set system time to noon so morning override windows are filtered as "past"
    vi.setSystemTime(new Date(2030, 0, 8, 12, 0, 0))

    const overrides: AvailabilityOverride[] = [
      { specific_date: FUTURE_DATE_STR, start_time: '08:00', end_time: '09:00' },
    ]

    // The override window 08:00–09:00 is past relative to noon EST.
    // Since override rows matched the date, recurring is still ignored → empty.
    const result = getSlotsForDate(FUTURE_DATE, recurringSlots, TZ, TZ, overrides)
    expect(result).toEqual([])
  })

  it('overrides for OTHER dates do not affect this date → recurring returned', () => {
    vi.setSystemTime(new Date(2030, 0, 8, 0, 0, 0))

    const overrides: AvailabilityOverride[] = [
      { specific_date: '2030-01-09', start_time: '09:00', end_time: '10:00' },
    ]

    const result = getSlotsForDate(FUTURE_DATE, recurringSlots, TZ, TZ, overrides)

    expect(result).toHaveLength(2)
    expect(result[0].slotId).toBe('rec-1')
    expect(result[1].slotId).toBe('rec-2')
  })

  it('override slots are sorted by startRaw', () => {
    vi.setSystemTime(new Date(2030, 0, 8, 0, 0, 0))

    const overrides: AvailabilityOverride[] = [
      { specific_date: FUTURE_DATE_STR, start_time: '16:00', end_time: '17:00' },
      { specific_date: FUTURE_DATE_STR, start_time: '09:00', end_time: '10:00' },
    ]

    const result = getSlotsForDate(FUTURE_DATE, recurringSlots, TZ, TZ, overrides)
    expect(result[0].startRaw).toBe('09:00')
    expect(result[1].startRaw).toBe('16:00')
  })

  it('day with no recurring slots and no overrides → empty array', () => {
    vi.setSystemTime(new Date(2030, 0, 9, 0, 0, 0))

    // Jan 9, 2030 is Wednesday (day_of_week = 3) — no recurring slots for that day
    const wednesday = new Date(2030, 0, 9)
    const result = getSlotsForDate(wednesday, recurringSlots, TZ, TZ, [])
    expect(result).toEqual([])
  })
})
