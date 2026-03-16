import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateSlotsFromWindow, getSlotsForDate } from '@/lib/utils/slots'
import type { AvailabilitySlot, AvailabilityOverride } from '@/lib/utils/slots'

// Jan 8, 2030 is a Tuesday (day_of_week = 2)
const DATE_STR = '2030-01-08'
const TZ = 'America/New_York'

describe('generateSlotsFromWindow — 30-min expansion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Set system time to midnight so all future slots pass the past-slot filter
    vi.setSystemTime(new Date(2030, 0, 8, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('window shorter than 30 min produces zero slots', () => {
    const now = new Date()
    const result = generateSlotsFromWindow(DATE_STR, '03:40', '04:00', now, TZ, TZ)
    expect(result).toEqual([])
  })

  it('window exactly 30 min produces one slot', () => {
    const now = new Date()
    const result = generateSlotsFromWindow(DATE_STR, '15:00', '15:30', now, TZ, TZ)
    expect(result).toHaveLength(1)
    expect(result[0].slotId).toBe(`${DATE_STR}-15:00`)
    expect(result[0].startRaw).toBe('15:00')
    expect(result[0].endRaw).toBe('15:30')
  })

  it('non-aligned boundaries (3:30–4:45) produce two slots', () => {
    const now = new Date()
    const result = generateSlotsFromWindow(DATE_STR, '03:30', '04:45', now, TZ, TZ)
    expect(result).toHaveLength(2)
    expect(result[0].startRaw).toBe('03:30')
    expect(result[0].endRaw).toBe('04:00')
    expect(result[1].startRaw).toBe('04:00')
    expect(result[1].endRaw).toBe('04:30')
  })

  it('large window (3:00–6:00) produces six slots', () => {
    const now = new Date()
    const result = generateSlotsFromWindow(DATE_STR, '03:00', '06:00', now, TZ, TZ)
    expect(result).toHaveLength(6)
    const expectedStarts = ['03:00', '03:30', '04:00', '04:30', '05:00', '05:30']
    const expectedEnds = ['03:30', '04:00', '04:30', '05:00', '05:30', '06:00']
    result.forEach((slot, i) => {
      expect(slot.startRaw).toBe(expectedStarts[i])
      expect(slot.endRaw).toBe(expectedEnds[i])
      expect(slot.slotId).toBe(`${DATE_STR}-${expectedStarts[i]}`)
    })
  })

  it('past-slot filtering per increment — filters individual slots, not entire window', () => {
    // Set time to 15:15 EST — the 15:00 slot is past, the 15:30 slot is still future
    vi.setSystemTime(new Date(2030, 0, 8, 15, 15, 0))
    const now = new Date()

    const result = generateSlotsFromWindow(DATE_STR, '15:00', '16:00', now, TZ, TZ)
    // 15:00 is past (15:00 <= 15:15), 15:30 is future (15:30 > 15:15)
    expect(result).toHaveLength(1)
    expect(result[0].startRaw).toBe('15:30')
    expect(result[0].endRaw).toBe('16:00')
  })

  it('all slots past → returns empty array', () => {
    // Set time to 17:00 EST — all slots in 15:00–16:00 window are past
    vi.setSystemTime(new Date(2030, 0, 8, 17, 0, 0))
    const now = new Date()

    const result = generateSlotsFromWindow(DATE_STR, '15:00', '16:00', now, TZ, TZ)
    expect(result).toEqual([])
  })

  it('slotId uses ${dateStr}-${startRaw} format', () => {
    const now = new Date()
    const result = generateSlotsFromWindow(DATE_STR, '10:00', '11:00', now, TZ, TZ)
    expect(result[0].slotId).toBe('2030-01-08-10:00')
    expect(result[1].slotId).toBe('2030-01-08-10:30')
  })
})

describe('getSlotsForDate — 30-min expansion integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2030, 0, 8, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('multiple recurring windows per day → slots from both windows', () => {
    const recurringSlots: AvailabilitySlot[] = [
      {
        id: 'rec-1',
        teacher_id: 'teacher-1',
        day_of_week: 2,
        start_time: '10:00:00',
        end_time: '11:00:00',
      },
      {
        id: 'rec-2',
        teacher_id: 'teacher-1',
        day_of_week: 2,
        start_time: '14:00:00',
        end_time: '15:00:00',
      },
    ]

    const date = new Date(2030, 0, 8) // Tuesday
    const result = getSlotsForDate(date, recurringSlots, TZ, TZ, [])

    // 10:00–11:00 → 2 slots, 14:00–15:00 → 2 slots = 4 total
    expect(result).toHaveLength(4)
    expect(result[0].startRaw).toBe('10:00')
    expect(result[1].startRaw).toBe('10:30')
    expect(result[2].startRaw).toBe('14:00')
    expect(result[3].startRaw).toBe('14:30')
  })

  it('override path produces 30-min slots (not one per window)', () => {
    const overrides: AvailabilityOverride[] = [
      { specific_date: DATE_STR, start_time: '16:00', end_time: '17:00' },
    ]

    const date = new Date(2030, 0, 8)
    const result = getSlotsForDate(date, [], TZ, TZ, overrides)

    expect(result).toHaveLength(2)
    expect(result[0].startRaw).toBe('16:00')
    expect(result[0].endRaw).toBe('16:30')
    expect(result[1].startRaw).toBe('16:30')
    expect(result[1].endRaw).toBe('17:00')
  })
})
