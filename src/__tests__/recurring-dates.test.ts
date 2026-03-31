import { describe, it, expect } from 'vitest'
import { generateRecurringDates } from '@/lib/utils/recurring'

describe('generateRecurringDates', () => {
  it('generates 6 weekly sessions starting on a Tuesday', () => {
    const dates = generateRecurringDates('2026-04-07', 'weekly', 6)
    expect(dates).toEqual([
      '2026-04-07',
      '2026-04-14',
      '2026-04-21',
      '2026-04-28',
      '2026-05-05',
      '2026-05-12',
    ])
  })

  it('generates 4 biweekly sessions starting on a Tuesday', () => {
    const dates = generateRecurringDates('2026-04-07', 'biweekly', 4)
    expect(dates).toEqual([
      '2026-04-07',
      '2026-04-21',
      '2026-05-05',
      '2026-05-19',
    ])
  })

  it('handles minimum count of 2', () => {
    const dates = generateRecurringDates('2026-04-07', 'weekly', 2)
    expect(dates).toHaveLength(2)
    expect(dates).toEqual(['2026-04-07', '2026-04-14'])
  })

  it('handles maximum count of 26 weekly sessions', () => {
    const dates = generateRecurringDates('2026-04-07', 'weekly', 26)
    expect(dates).toHaveLength(26)
    expect(dates[0]).toBe('2026-04-07')
    // 26 weeks = ~6 months: April 7 + 25 * 7 = 175 days = September 29
    expect(dates[25]).toBe('2026-09-29')
  })

  it('crosses month boundaries correctly', () => {
    // Start near end of January — should cross into February
    const dates = generateRecurringDates('2026-01-27', 'weekly', 4)
    expect(dates).toEqual([
      '2026-01-27',
      '2026-02-03',
      '2026-02-10',
      '2026-02-17',
    ])
  })

  it('crosses year boundaries correctly', () => {
    // Start in December — should cross into January next year
    const dates = generateRecurringDates('2026-12-22', 'weekly', 4)
    expect(dates).toEqual([
      '2026-12-22',
      '2026-12-29',
      '2027-01-05',
      '2027-01-12',
    ])
  })

  it('handles biweekly across month/year boundaries', () => {
    const dates = generateRecurringDates('2026-11-24', 'biweekly', 4)
    expect(dates).toEqual([
      '2026-11-24',
      '2026-12-08',
      '2026-12-22',
      '2027-01-05',
    ])
  })

  it('generates single session when count is 1', () => {
    // Although the schema enforces min 2, the function itself is pure
    const dates = generateRecurringDates('2026-04-07', 'weekly', 1)
    expect(dates).toEqual(['2026-04-07'])
  })
})
