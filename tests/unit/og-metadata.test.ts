import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the server Supabase client used by generateMetadata
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}))

// Mock transitive dependencies pulled in by page.tsx imports
vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: vi.fn() },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}))

// Import after mock setup
const { generateMetadata } = await import('@/app/[slug]/page')

describe('generateMetadata for teacher /[slug] pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns personalized title and description for a valid teacher slug', async () => {
    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Ms. Johnson',
        subjects: ['Math', 'Science'],
        school: 'Springfield Elementary',
        city: 'Portland',
        state: 'OR',
        photo_url: 'https://example.com/photo.jpg',
      },
      error: null,
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'ms-johnson' }),
    })

    expect(metadata.title).toContain('Ms. Johnson')
    expect(metadata.title).toContain('Tutelo')
    expect(metadata.description).toContain('Ms. Johnson')
    expect(metadata.description).toContain('Math')
    expect(metadata.description).toContain('Portland')
    expect(metadata.description).toContain('Springfield Elementary')
    expect(metadata.openGraph?.title).toContain('Ms. Johnson')
    expect(metadata.openGraph?.type).toBe('profile')
    expect(metadata.twitter?.card).toBe('summary_large_image')
  })

  it('returns generic Tutelo fallback for an invalid slug', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'nonexistent-teacher' }),
    })

    expect(metadata.title).toBe('Tutelo')
    expect(metadata.description).toContain('Tutelo')
    // Should NOT have openGraph.type === 'profile' for fallback
    expect(metadata.openGraph).toBeUndefined()
  })

  it('handles teacher with no subjects gracefully', async () => {
    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Mr. Smith',
        subjects: [],
        school: null,
        city: null,
        state: null,
        photo_url: null,
      },
      error: null,
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'mr-smith' }),
    })

    expect(metadata.title).toContain('Mr. Smith')
    expect(metadata.description).toContain('various subjects')
    // Should not crash or include "undefined"
    expect(metadata.description).not.toContain('undefined')
    expect(metadata.description).not.toContain('null')
  })

  it('handles teacher with null subjects array', async () => {
    mockSingle.mockResolvedValue({
      data: {
        full_name: 'Ms. Davis',
        subjects: null,
        school: 'Central High',
        city: 'Austin',
        state: 'TX',
        photo_url: null,
      },
      error: null,
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'ms-davis' }),
    })

    expect(metadata.title).toContain('Ms. Davis')
    expect(metadata.description).toContain('various subjects')
    expect(metadata.description).toContain('Austin')
  })
})
