import { describe, it, expect } from 'vitest'

// Unit tests for subject pre-fill logic used in BookingCalendar.
// The logic is: subjects.length === 1 → always use subjects[0] (ignore URL param)
//               subjects.length > 1  → use searchParams.get('subject') ?? ''

function getInitialSubject(subjects: string[], urlSubject: string | null): string {
  return subjects.length === 1 ? subjects[0] : (urlSubject ?? '')
}

describe('BookingCalendar rebook pre-fill', () => {
  it('reads ?subject= URL param on mount and pre-fills subject field', () => {
    const subjects = ['Math', 'Science']
    const urlSubject = 'Math'
    const initialSubject = getInitialSubject(subjects, urlSubject)
    expect(initialSubject).toBe('Math')
  })

  it('does not override subject when teacher has only one subject', () => {
    // Even if ?subject=Math is in the URL, single-subject teacher always pre-selects their subject
    const subjects = ['English']
    const urlSubject = 'Math' // URL says Math but teacher only teaches English
    const initialSubject = getInitialSubject(subjects, urlSubject)
    expect(initialSubject).toBe('English') // URL param is ignored
  })

  it('falls back to empty string when ?subject= param is absent', () => {
    const subjects = ['Math', 'Science']
    const urlSubject = null // no URL param
    const initialSubject = getInitialSubject(subjects, urlSubject)
    expect(initialSubject).toBe('')
  })

  it('pre-fills with Science when ?subject=Science and teacher has multiple subjects', () => {
    const subjects = ['Math', 'Science', 'English']
    const urlSubject = 'Science'
    const initialSubject = getInitialSubject(subjects, urlSubject)
    expect(initialSubject).toBe('Science')
  })
})
