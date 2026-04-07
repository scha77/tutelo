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
const mockAdminSingle = vi.fn()
const mockAdminEq = vi.fn(() => ({ single: mockAdminSingle }))
const mockAdminSelect = vi.fn(() => ({ eq: mockAdminEq }))
const mockAdminFrom = vi.fn(() => ({ select: mockAdminSelect }))

vi.mock('@/lib/supabase/service', () => ({
  supabaseAdmin: { from: mockAdminFrom },
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
    // Restore default mock implementations for the chain
    mockAdminEq.mockReturnValue({ single: mockAdminSingle })
    mockAdminSelect.mockReturnValue({ eq: mockAdminEq })
    mockAdminFrom.mockReturnValue({ select: mockAdminSelect })
  })

  it('returns personalized title and description for a valid teacher slug', async () => {
    mockAdminSingle.mockResolvedValue({
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
    expect((metadata.openGraph as Record<string, unknown>)?.type).toBe('profile')
    expect((metadata.openGraph as Record<string, unknown>)?.url).toBe('https://tutelo.app/ms-johnson')
    expect((metadata.twitter as Record<string, unknown>)?.card).toBe('summary_large_image')
  })

  it('returns generic Tutelo fallback for an invalid slug', async () => {
    mockAdminSingle.mockResolvedValue({ data: null, error: null })

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'nonexistent-teacher' }),
    })

    expect(metadata.title).toBe('Tutelo')
    expect(metadata.description).toContain('Tutelo')
    // Should NOT have openGraph.type === 'profile' for fallback
    expect(metadata.openGraph).toBeUndefined()
  })

  it('handles teacher with no subjects gracefully', async () => {
    mockAdminSingle.mockResolvedValue({
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
    expect((metadata.openGraph as Record<string, unknown>)?.url).toBe('https://tutelo.app/mr-smith')
  })

  it('handles teacher with null subjects array', async () => {
    mockAdminSingle.mockResolvedValue({
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
    expect((metadata.openGraph as Record<string, unknown>)?.url).toBe('https://tutelo.app/ms-davis')
  })
})
