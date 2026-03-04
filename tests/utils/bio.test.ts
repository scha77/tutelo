import { describe, it, expect } from 'vitest'
import { generateBio } from '@/lib/utils/bio'

const baseTeacher = {
  full_name: 'Sarah Johnson',
  subjects: ['Math', 'Science'],
  grade_levels: ['3rd', '4th', '5th'],
  school: 'Lincoln Elementary',
  years_experience: 8,
}

describe('bio generator util', () => {
  it('generates a bio string containing teacher name', () => {
    const bio = generateBio(baseTeacher)
    expect(bio).toContain('Sarah Johnson')
  })

  it('includes subject in generated bio', () => {
    const bio = generateBio(baseTeacher)
    expect(bio).toContain('Math')
  })

  it('includes grade level in generated bio', () => {
    const bio = generateBio(baseTeacher)
    expect(bio).toContain('3rd')
  })

  it('returns at least 50 characters', () => {
    const bio = generateBio(baseTeacher)
    expect(bio.length).toBeGreaterThanOrEqual(50)
  })

  it('handles missing optional fields gracefully — no "undefined" or "null" in output', () => {
    const bio = generateBio({
      full_name: 'Alex Smith',
      subjects: ['English'],
      grade_levels: ['9th'],
      school: null,
      years_experience: null,
    })
    expect(bio).not.toContain('undefined')
    expect(bio).not.toContain('null')
    expect(bio).toContain('Alex Smith')
  })

  it('handles empty subjects array gracefully', () => {
    const bio = generateBio({
      full_name: 'Pat Lee',
      subjects: [],
      grade_levels: ['K'],
      school: null,
      years_experience: 3,
    })
    expect(bio).not.toContain('undefined')
    expect(bio).not.toContain('null')
    expect(bio.length).toBeGreaterThanOrEqual(20)
  })
})
