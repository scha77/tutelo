import { describe, it, expect } from 'vitest'
import {
  templates,
  formatSubjects,
  formatRate,
  formatLocation,
  formatGradeLevels,
  profileUrl,
  type TeacherTemplateData,
  type Template,
} from '@/lib/templates'

// ── fixtures ─────────────────────────────────────────────────────────

const fullTeacher: TeacherTemplateData = {
  full_name: 'Ms. Johnson',
  slug: 'ms-johnson',
  subjects: ['Math', 'Science', 'English'],
  hourly_rate: 65,
  school: 'Springfield Elementary',
  city: 'Portland',
  state: 'OR',
  bio: 'Experienced educator passionate about STEM.',
  headline: 'Making math fun for 10+ years',
  grade_levels: ['3rd', '4th', '5th'],
}

const minimalTeacher: TeacherTemplateData = {
  full_name: 'Mr. Smith',
  slug: 'mr-smith',
  subjects: null,
  hourly_rate: null,
  school: null,
  city: null,
  state: null,
  bio: null,
  headline: null,
  grade_levels: null,
}

const emptyArraysTeacher: TeacherTemplateData = {
  full_name: 'Dr. Lee',
  slug: 'dr-lee',
  subjects: [],
  hourly_rate: null,
  school: null,
  city: null,
  state: null,
  bio: null,
  headline: null,
  grade_levels: [],
}

const singleSubjectTeacher: TeacherTemplateData = {
  full_name: 'Ms. Davis',
  slug: 'ms-davis',
  subjects: ['Chemistry'],
  hourly_rate: 50,
  school: null,
  city: 'Austin',
  state: 'TX',
  bio: null,
  headline: null,
  grade_levels: ['9th', '10th'],
}

const twoSubjectsTeacher: TeacherTemplateData = {
  full_name: 'Mr. Park',
  slug: 'mr-park',
  subjects: ['Physics', 'Calculus'],
  hourly_rate: 80,
  school: 'Central High',
  city: null,
  state: 'CA',
  bio: null,
  headline: 'AP exam specialist',
  grade_levels: null,
}

// ── helper tests ─────────────────────────────────────────────────────

describe('profileUrl', () => {
  it('builds the correct Tutelo URL', () => {
    expect(profileUrl('ms-johnson')).toBe('https://tutelo.com/ms-johnson')
  })
})

describe('formatSubjects', () => {
  it('returns "various subjects" for null', () => {
    expect(formatSubjects(null)).toBe('various subjects')
  })

  it('returns "various subjects" for empty array', () => {
    expect(formatSubjects([])).toBe('various subjects')
  })

  it('returns the single subject as-is', () => {
    expect(formatSubjects(['Math'])).toBe('Math')
  })

  it('joins two subjects with "and"', () => {
    expect(formatSubjects(['Math', 'Science'])).toBe('Math and Science')
  })

  it('uses Oxford comma for three or more subjects', () => {
    expect(formatSubjects(['Math', 'Science', 'English'])).toBe(
      'Math, Science, and English'
    )
  })

  it('handles four subjects with Oxford comma', () => {
    expect(formatSubjects(['A', 'B', 'C', 'D'])).toBe('A, B, C, and D')
  })
})

describe('formatRate', () => {
  it('returns null for null rate', () => {
    expect(formatRate(null)).toBeNull()
  })

  it('formats integer rate', () => {
    expect(formatRate(65)).toBe('$65/hr')
  })

  it('rounds decimal rate to integer display', () => {
    expect(formatRate(49.99)).toBe('$50/hr')
  })

  it('formats zero rate', () => {
    expect(formatRate(0)).toBe('$0/hr')
  })
})

describe('formatLocation', () => {
  it('returns null when both city and state are null', () => {
    expect(formatLocation(null, null)).toBeNull()
  })

  it('returns "City, ST" when both present', () => {
    expect(formatLocation('Portland', 'OR')).toBe('Portland, OR')
  })

  it('returns city alone when state is null', () => {
    expect(formatLocation('Portland', null)).toBe('Portland')
  })

  it('returns state alone when city is null', () => {
    expect(formatLocation(null, 'OR')).toBe('OR')
  })
})

describe('formatGradeLevels', () => {
  it('returns null for null', () => {
    expect(formatGradeLevels(null)).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(formatGradeLevels([])).toBeNull()
  })

  it('joins grade levels with commas', () => {
    expect(formatGradeLevels(['3rd', '4th', '5th'])).toBe('3rd, 4th, 5th')
  })

  it('returns single grade level as-is', () => {
    expect(formatGradeLevels(['K'])).toBe('K')
  })
})

// ── template collection ──────────────────────────────────────────────

describe('templates collection', () => {
  it('exports exactly 4 templates', () => {
    expect(templates).toHaveLength(4)
  })

  it('each template has required fields', () => {
    for (const t of templates) {
      expect(t.id).toBeTruthy()
      expect(t.title).toBeTruthy()
      expect(t.description).toBeTruthy()
      expect(['email', 'social', 'print']).toContain(t.channel)
      expect(typeof t.render).toBe('function')
    }
  })

  it('has unique ids', () => {
    const ids = templates.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes the four expected templates', () => {
    const ids = templates.map((t) => t.id)
    expect(ids).toContain('email-signature')
    expect(ids).toContain('newsletter-blurb')
    expect(ids).toContain('social-post')
    expect(ids).toContain('back-to-school')
  })
})

// ── per-template rendering tests ─────────────────────────────────────

function getTemplate(id: string): Template {
  const t = templates.find((t) => t.id === id)
  if (!t) throw new Error(`Template "${id}" not found`)
  return t
}

/** Assert a rendered string contains no "null" or "undefined" artifacts */
function assertNoLeaks(output: string) {
  expect(output).not.toContain('undefined')
  expect(output).not.toContain('null')
  // Also check for empty label artifacts like "Rate: " with nothing after
  const lines = output.split('\n')
  for (const line of lines) {
    if (line.match(/^(Rate|Location|Subjects|Grade levels):\s*$/)) {
      throw new Error(`Empty label line detected: "${line}"`)
    }
  }
}

describe('Email Signature template', () => {
  const tpl = getTemplate('email-signature')

  it('renders all fields for full teacher', () => {
    const output = tpl.render(fullTeacher)
    expect(output).toContain('Ms. Johnson')
    expect(output).toContain('Math, Science, and English')
    expect(output).toContain('$65/hr')
    expect(output).toContain('Portland, OR')
    expect(output).toContain('https://tutelo.com/ms-johnson')
    assertNoLeaks(output)
  })

  it('omits rate and location for minimal teacher', () => {
    const output = tpl.render(minimalTeacher)
    expect(output).toContain('Mr. Smith')
    expect(output).toContain('various subjects')
    expect(output).toContain('https://tutelo.com/mr-smith')
    expect(output).not.toContain('Rate:')
    expect(output).not.toContain('Location:')
    assertNoLeaks(output)
  })

  it('handles empty arrays same as null', () => {
    const output = tpl.render(emptyArraysTeacher)
    expect(output).toContain('various subjects')
    assertNoLeaks(output)
  })
})

describe('Newsletter Blurb template', () => {
  const tpl = getTemplate('newsletter-blurb')

  it('renders full teacher with headline, location, and rate', () => {
    const output = tpl.render(fullTeacher)
    expect(output).toContain('Ms. Johnson')
    expect(output).toContain('Math, Science, and English')
    expect(output).toContain('Portland, OR')
    expect(output).toContain('$65/hr')
    expect(output).toContain('Making math fun for 10+ years')
    expect(output).toContain('https://tutelo.com/ms-johnson')
    assertNoLeaks(output)
  })

  it('omits location, rate, and headline for minimal teacher', () => {
    const output = tpl.render(minimalTeacher)
    expect(output).toContain('Mr. Smith')
    expect(output).toContain('various subjects')
    expect(output).not.toContain('$')
    expect(output).toContain('https://tutelo.com/mr-smith')
    assertNoLeaks(output)
  })

  it('includes location but omits rate when rate is null', () => {
    const withLocation: TeacherTemplateData = {
      ...minimalTeacher,
      city: 'Denver',
      state: 'CO',
    }
    const output = tpl.render(withLocation)
    expect(output).toContain('Denver, CO')
    expect(output).not.toContain('$')
    assertNoLeaks(output)
  })

  it('includes rate but omits location when location is null', () => {
    const withRate: TeacherTemplateData = {
      ...minimalTeacher,
      hourly_rate: 40,
    }
    const output = tpl.render(withRate)
    expect(output).toContain('$40/hr')
    expect(output).not.toMatch(/in [A-Z]/) // no location phrase
    assertNoLeaks(output)
  })
})

describe('Social Media Post template', () => {
  const tpl = getTemplate('social-post')

  it('renders full teacher with emoji details and hashtags', () => {
    const output = tpl.render(fullTeacher)
    expect(output).toContain('📚')
    expect(output).toContain('Ms. Johnson')
    expect(output).toContain('Math, Science, and English')
    expect(output).toContain('📍 Portland, OR')
    expect(output).toContain('💰 $65/hr')
    expect(output).toContain('#tutoring')
    expect(output).toContain('https://tutelo.com/ms-johnson')
    assertNoLeaks(output)
  })

  it('omits details line entirely for minimal teacher', () => {
    const output = tpl.render(minimalTeacher)
    expect(output).toContain('Mr. Smith')
    expect(output).toContain('various subjects')
    expect(output).not.toContain('📍')
    expect(output).not.toContain('💰')
    expect(output).toContain('#tutoring')
    assertNoLeaks(output)
  })

  it('includes location without rate', () => {
    const output = tpl.render(singleSubjectTeacher)
    expect(output).toContain('📍 Austin, TX')
    expect(output).toContain('💰 $50/hr')
    assertNoLeaks(output)
  })

  it('includes only state when city is null', () => {
    const output = tpl.render(twoSubjectsTeacher)
    expect(output).toContain('📍 CA')
    expect(output).toContain('💰 $80/hr')
    assertNoLeaks(output)
  })
})

describe('Back-to-School Handout template', () => {
  const tpl = getTemplate('back-to-school')

  it('renders full teacher with school, grade levels, rate, location', () => {
    const output = tpl.render(fullTeacher)
    expect(output).toContain('PRIVATE TUTORING AVAILABLE')
    expect(output).toContain('Ms. Johnson at Springfield Elementary')
    expect(output).toContain('Math, Science, and English')
    expect(output).toContain('Grade levels: 3rd, 4th, 5th')
    expect(output).toContain('Rate: $65/hr')
    expect(output).toContain('Location: Portland, OR')
    expect(output).toContain('https://tutelo.com/ms-johnson')
    assertNoLeaks(output)
  })

  it('omits school, grade levels, rate, and location for minimal teacher', () => {
    const output = tpl.render(minimalTeacher)
    expect(output).toContain('Mr. Smith')
    expect(output).not.toContain(' at ')
    expect(output).not.toContain('Grade levels:')
    expect(output).not.toContain('Rate:')
    expect(output).not.toContain('Location:')
    expect(output).toContain('various subjects')
    assertNoLeaks(output)
  })

  it('includes school in intro when present', () => {
    const output = tpl.render(twoSubjectsTeacher)
    expect(output).toContain('Mr. Park at Central High')
    assertNoLeaks(output)
  })

  it('includes grade levels when present', () => {
    const output = tpl.render(singleSubjectTeacher)
    expect(output).toContain('Grade levels: 9th, 10th')
    assertNoLeaks(output)
  })

  it('handles empty arrays same as null for grade_levels', () => {
    const output = tpl.render(emptyArraysTeacher)
    expect(output).not.toContain('Grade levels:')
    assertNoLeaks(output)
  })
})

// ── cross-cutting: no template ever leaks nulls ──────────────────────

describe('no template leaks null/undefined for any fixture', () => {
  const fixtures = [
    { name: 'full', data: fullTeacher },
    { name: 'minimal', data: minimalTeacher },
    { name: 'empty-arrays', data: emptyArraysTeacher },
    { name: 'single-subject', data: singleSubjectTeacher },
    { name: 'two-subjects', data: twoSubjectsTeacher },
  ]

  for (const fixture of fixtures) {
    for (const tpl of templates) {
      it(`${tpl.id} renders cleanly with "${fixture.name}" data`, () => {
        const output = tpl.render(fixture.data)
        assertNoLeaks(output)
        // Every template must include the teacher's name and URL
        expect(output).toContain(fixture.data.full_name)
        expect(output).toContain(`https://tutelo.com/${fixture.data.slug}`)
      })
    }
  }
})
