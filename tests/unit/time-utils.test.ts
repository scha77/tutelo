import { describe, it, expect } from 'vitest'
import {
  generate5MinOptions,
  formatTimeLabel,
  validateNoOverlap,
} from '@/lib/utils/time'

describe('generate5MinOptions', () => {
  const options = generate5MinOptions()

  it('returns exactly 288 items', () => {
    expect(options).toHaveLength(288)
  })

  it('first item is "00:00"', () => {
    expect(options[0]).toBe('00:00')
  })

  it('last item is "23:55"', () => {
    expect(options[287]).toBe('23:55')
  })

  it('item at index 6 is "00:30"', () => {
    expect(options[6]).toBe('00:30')
  })

  it('item at index 12 is "01:00"', () => {
    expect(options[12]).toBe('01:00')
  })

  it('all items match HH:MM format', () => {
    const hhmmRegex = /^\d{2}:\d{2}$/
    for (const opt of options) {
      expect(opt).toMatch(hhmmRegex)
    }
  })

  it('has no duplicates', () => {
    const unique = new Set(options)
    expect(unique.size).toBe(288)
  })
})

describe('formatTimeLabel', () => {
  it('converts "00:00" to "12:00 AM" (midnight)', () => {
    expect(formatTimeLabel('00:00')).toBe('12:00 AM')
  })

  it('converts "12:00" to "12:00 PM" (noon)', () => {
    expect(formatTimeLabel('12:00')).toBe('12:00 PM')
  })

  it('converts "15:30" to "3:30 PM"', () => {
    expect(formatTimeLabel('15:30')).toBe('3:30 PM')
  })

  it('converts "08:05" to "8:05 AM"', () => {
    expect(formatTimeLabel('08:05')).toBe('8:05 AM')
  })

  it('converts "23:55" to "11:55 PM"', () => {
    expect(formatTimeLabel('23:55')).toBe('11:55 PM')
  })

  it('converts "01:00" to "1:00 AM"', () => {
    expect(formatTimeLabel('01:00')).toBe('1:00 AM')
  })

  it('converts "12:30" to "12:30 PM"', () => {
    expect(formatTimeLabel('12:30')).toBe('12:30 PM')
  })
})

describe('validateNoOverlap', () => {
  it('accepts an empty array', () => {
    expect(validateNoOverlap([])).toEqual({ valid: true })
  })

  it('accepts a single valid window', () => {
    expect(
      validateNoOverlap([{ start_time: '08:00', end_time: '10:00' }])
    ).toEqual({ valid: true })
  })

  it('rejects a single window where end_time <= start_time', () => {
    const result = validateNoOverlap([
      { start_time: '10:00', end_time: '08:00' },
    ])
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error).toContain('08:00')
    expect(result.error).toContain('10:00')
  })

  it('rejects a single window where end_time === start_time', () => {
    const result = validateNoOverlap([
      { start_time: '10:00', end_time: '10:00' },
    ])
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('accepts two non-overlapping windows', () => {
    expect(
      validateNoOverlap([
        { start_time: '08:00', end_time: '10:00' },
        { start_time: '14:00', end_time: '16:00' },
      ])
    ).toEqual({ valid: true })
  })

  it('accepts two adjacent (touching) windows', () => {
    expect(
      validateNoOverlap([
        { start_time: '08:00', end_time: '10:00' },
        { start_time: '10:00', end_time: '12:00' },
      ])
    ).toEqual({ valid: true })
  })

  it('rejects two overlapping windows', () => {
    const result = validateNoOverlap([
      { start_time: '08:00', end_time: '10:00' },
      { start_time: '09:00', end_time: '11:00' },
    ])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Overlap detected')
  })

  it('rejects when one overlap exists among several valid windows', () => {
    const result = validateNoOverlap([
      { start_time: '08:00', end_time: '09:00' },
      { start_time: '10:00', end_time: '11:00' },
      { start_time: '10:30', end_time: '12:00' }, // overlaps with previous
      { start_time: '14:00', end_time: '15:00' },
    ])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Overlap detected')
  })

  it('detects overlaps even when input is unsorted', () => {
    const result = validateNoOverlap([
      { start_time: '14:00', end_time: '16:00' },
      { start_time: '08:00', end_time: '10:00' },
      { start_time: '09:00', end_time: '11:00' }, // overlaps with 08:00–10:00
    ])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Overlap detected')
  })

  it('accepts multiple non-overlapping windows in unsorted order', () => {
    expect(
      validateNoOverlap([
        { start_time: '14:00', end_time: '16:00' },
        { start_time: '08:00', end_time: '10:00' },
        { start_time: '10:00', end_time: '12:00' },
      ])
    ).toEqual({ valid: true })
  })

  it('provides a descriptive error identifying overlapping windows', () => {
    const result = validateNoOverlap([
      { start_time: '08:00', end_time: '10:00' },
      { start_time: '09:00', end_time: '11:00' },
    ])
    expect(result.valid).toBe(false)
    // Error should mention both windows
    expect(result.error).toContain('08:00')
    expect(result.error).toContain('10:00')
    expect(result.error).toContain('09:00')
    expect(result.error).toContain('11:00')
  })
})
