import { describe, it, expect } from 'vitest'
import { generateBio } from '@/lib/utils/bio'
import { isDraftPage } from '@/lib/utils/profile'

// Unit tests for the logic used by /[slug]/page.tsx
// (We test the utility functions rather than the RSC directly since RSC needs a full Next.js server)

describe('public profile slug page logic', () => {
  it('generates bio containing teacher name and school', () => {
    const bio = generateBio({
      full_name: 'Ms. Test Teacher',
      subjects: ['Reading', 'Writing'],
      grade_levels: ['1st', '2nd'],
      school: 'Springfield Elementary',
      years_experience: 5,
    })
    expect(bio).toContain('Ms. Test Teacher')
    expect(bio).toContain('Reading')
  })

  it('draft page logic returns graceful not-available state for draft teacher', () => {
    // draft teacher with no preview param -> show "Page not available"
    const showDraft = isDraftPage({ is_published: false, preview: undefined })
    expect(showDraft).toBe(true)
  })

  it('preview=true bypasses draft gate', () => {
    const showDraft = isDraftPage({ is_published: false, preview: 'true' })
    expect(showDraft).toBe(false)
  })
})
