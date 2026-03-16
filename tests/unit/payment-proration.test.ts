import { describe, it, expect } from 'vitest'
import { computeSessionAmount } from '@/lib/utils/booking'

describe('computeSessionAmount', () => {
  it('30-min slot charges half the hourly rate', () => {
    expect(computeSessionAmount('15:00', '15:30', 60)).toBe(3000)
  })

  it('60-min slot charges the full hourly rate', () => {
    expect(computeSessionAmount('15:00', '16:00', 60)).toBe(6000)
  })

  it('45-min slot charges three-quarters of the hourly rate', () => {
    expect(computeSessionAmount('15:00', '15:45', 60)).toBe(4500)
  })

  it('zero hourly rate returns 0 cents', () => {
    expect(computeSessionAmount('09:00', '10:00', 0)).toBe(0)
  })

  it('non-standard 20-min duration prorates correctly', () => {
    expect(computeSessionAmount('09:00', '09:20', 60)).toBe(2000)
  })

  it('returns 0 when endTime equals startTime (zero duration)', () => {
    expect(computeSessionAmount('10:00', '10:00', 60)).toBe(0)
  })

  it('returns 0 when endTime is before startTime (negative duration)', () => {
    expect(computeSessionAmount('16:00', '15:00', 60)).toBe(0)
  })
})
