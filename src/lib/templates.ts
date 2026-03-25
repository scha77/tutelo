/**
 * Announcement templates for the Promote page swipe file.
 *
 * Pure functions — no React, no server deps. Each template's `render()`
 * interpolates teacher profile data and gracefully omits null/missing fields.
 */

export interface TeacherTemplateData {
  full_name: string
  slug: string
  subjects: string[] | null
  hourly_rate: number | null
  school: string | null
  city: string | null
  state: string | null
  bio: string | null
  headline: string | null
  grade_levels: string[] | null
}

export interface Template {
  id: string
  title: string
  description: string
  /** The channel this template is designed for */
  channel: 'email' | 'social' | 'print'
  render: (data: TeacherTemplateData) => string
}

// ── helpers ──────────────────────────────────────────────────────────

function profileUrl(slug: string): string {
  return `https://tutelo.com/${slug}`
}

function formatSubjects(subjects: string[] | null): string {
  if (!subjects || subjects.length === 0) return 'various subjects'
  if (subjects.length === 1) return subjects[0]
  if (subjects.length === 2) return `${subjects[0]} and ${subjects[1]}`
  return `${subjects.slice(0, -1).join(', ')}, and ${subjects[subjects.length - 1]}`
}

function formatRate(rate: number | null): string | null {
  if (rate == null) return null
  return `$${Number(rate).toFixed(0)}/hr`
}

function formatLocation(city: string | null, state: string | null): string | null {
  if (city && state) return `${city}, ${state}`
  if (city) return city
  if (state) return state
  return null
}

function formatGradeLevels(levels: string[] | null): string | null {
  if (!levels || levels.length === 0) return null
  return levels.join(', ')
}

// ── templates ────────────────────────────────────────────────────────

const emailSignature: Template = {
  id: 'email-signature',
  title: 'Email Signature',
  description: 'Drop this into your email signature to let parents know you tutor.',
  channel: 'email',
  render(data) {
    const lines: string[] = []
    lines.push(`${data.full_name} — Private Tutoring Available`)

    const subjects = formatSubjects(data.subjects)
    lines.push(`Subjects: ${subjects}`)

    const rate = formatRate(data.hourly_rate)
    if (rate) lines.push(`Rate: ${rate}`)

    const location = formatLocation(data.city, data.state)
    if (location) lines.push(`Location: ${location}`)

    lines.push('')
    lines.push(`Book a session: ${profileUrl(data.slug)}`)

    return lines.join('\n')
  },
}

const newsletterBlurb: Template = {
  id: 'newsletter-blurb',
  title: 'Newsletter Blurb',
  description: 'A short paragraph for your school newsletter or parent email blast.',
  channel: 'email',
  render(data) {
    const subjects = formatSubjects(data.subjects)
    const url = profileUrl(data.slug)

    let blurb = `Looking for extra help in ${subjects}? ${data.full_name} offers private tutoring`

    const location = formatLocation(data.city, data.state)
    if (location) {
      blurb += ` in ${location}`
    }

    const rate = formatRate(data.hourly_rate)
    if (rate) {
      blurb += ` at ${rate}`
    }

    blurb += '.'

    if (data.headline) {
      blurb += ` ${data.headline}.`
    }

    blurb += `\n\nLearn more and book a session at ${url}`

    return blurb
  },
}

const socialPost: Template = {
  id: 'social-post',
  title: 'Social Media Post',
  description: 'Ready to paste into Facebook, Instagram, Nextdoor, or X.',
  channel: 'social',
  render(data) {
    const subjects = formatSubjects(data.subjects)
    const url = profileUrl(data.slug)

    const lines: string[] = []
    lines.push(`📚 Now accepting new tutoring students!`)
    lines.push('')
    lines.push(`I'm ${data.full_name}, and I tutor ${subjects}.`)

    const rate = formatRate(data.hourly_rate)
    const location = formatLocation(data.city, data.state)
    const details: string[] = []
    if (location) details.push(`📍 ${location}`)
    if (rate) details.push(`💰 ${rate}`)

    if (details.length > 0) {
      lines.push(details.join(' | '))
    }

    lines.push('')
    lines.push(`Book a session here: ${url}`)
    lines.push('')
    lines.push('#tutoring #privatetutoring #education')

    return lines.join('\n')
  },
}

const backToSchoolHandout: Template = {
  id: 'back-to-school',
  title: 'Back-to-School Handout',
  description: 'A text block for flyers, handouts, or school bulletin boards.',
  channel: 'print',
  render(data) {
    const subjects = formatSubjects(data.subjects)
    const url = profileUrl(data.slug)

    const lines: string[] = []
    lines.push('PRIVATE TUTORING AVAILABLE')
    lines.push('')

    let intro = `${data.full_name}`
    if (data.school) {
      intro += ` at ${data.school}`
    }
    intro += ` is offering private tutoring in ${subjects}.`
    lines.push(intro)

    const gradeLevels = formatGradeLevels(data.grade_levels)
    if (gradeLevels) {
      lines.push(`Grade levels: ${gradeLevels}`)
    }

    const rate = formatRate(data.hourly_rate)
    if (rate) {
      lines.push(`Rate: ${rate}`)
    }

    const location = formatLocation(data.city, data.state)
    if (location) {
      lines.push(`Location: ${location}`)
    }

    lines.push('')
    lines.push(`Book online: ${url}`)

    return lines.join('\n')
  },
}

// ── public API ───────────────────────────────────────────────────────

export const templates: Template[] = [
  emailSignature,
  newsletterBlurb,
  socialPost,
  backToSchoolHandout,
]

export { formatSubjects, formatRate, formatLocation, formatGradeLevels, profileUrl }
