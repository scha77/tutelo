import { describe, it, expect } from 'vitest'
import { convertSlotToTimezone } from '@/lib/utils/timezone'

// Fixed reference: Wednesday = day_of_week 3
const wednesdaySlot = {
  id: 'slot-1',
  teacher_id: 'teacher-1',
  day_of_week: 3,
  start_time: '17:00',
  end_time: '18:00',
}

describe('timezone conversion', () => {
  it('converts 5pm EST slot to 2pm PST for visitor in Pacific timezone', () => {
    // EST = America/New_York, PST = America/Los_Angeles
    // 17:00 EST -> 14:00 PST (3 hour difference in standard time)
    // Use a fixed winter date (no DST): 2025-01-15 (Wednesday)
    const result = convertSlotToTimezone(
      wednesdaySlot,
      'America/New_York',
      'America/Los_Angeles'
    )
    // In standard time (January), EST is UTC-5, PST is UTC-8 — 3 hour diff
    expect(result.startDisplay).toBe('2:00 PM')
    expect(result.endDisplay).toBe('3:00 PM')
  })

  it('converts same timezone returns same time', () => {
    const result = convertSlotToTimezone(
      wednesdaySlot,
      'America/New_York',
      'America/New_York'
    )
    expect(result.startDisplay).toBe('5:00 PM')
    expect(result.endDisplay).toBe('6:00 PM')
  })

  it('returns day offset 0 when no day change', () => {
    const result = convertSlotToTimezone(
      wednesdaySlot,
      'America/New_York',
      'America/Los_Angeles'
    )
    expect(result.dayOffset).toBe(0)
  })

  it('returns positive day offset when converting to next day', () => {
    // 11pm EST (23:00) -> 2am UTC (next day)
    const lateSlot = {
      id: 'slot-2',
      teacher_id: 'teacher-1',
      day_of_week: 3,
      start_time: '23:00',
      end_time: '00:00',
    }
    const result = convertSlotToTimezone(lateSlot, 'America/New_York', 'UTC')
    // 23:00 EST = 04:00 UTC next day
    expect(result.dayOffset).toBe(1)
  })
})
