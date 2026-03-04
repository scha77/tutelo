import { describe, it, expect } from 'vitest'
import { generateSlug } from '@/lib/utils/slugify'

describe('generateSlug', () => {
  it('converts "Sarah Johnson" to "sarah-johnson"', () => {
    expect(generateSlug('Sarah Johnson')).toBe('sarah-johnson')
  })
  it('handles special characters and accents', () => {
    expect(generateSlug('María García')).toBe('maria-garcia')
  })
  it('handles apostrophes', () => {
    expect(generateSlug("O'Brien Smith")).toBe('obrien-smith')
  })
})
