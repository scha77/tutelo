import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TeacherCard } from '@/components/directory/TeacherCard'
import { DirectoryFilters } from '@/components/directory/DirectoryFilters'
import { PRICE_RANGES } from '@/lib/constants/directory'

export const metadata: Metadata = {
  title: 'Find a Tutor | Tutelo',
  description:
    'Browse verified tutors for math, reading, SAT prep, and more. Filter by subject, grade level, location, and price to find the right teacher for your child.',
  openGraph: {
    title: 'Find a Tutor | Tutelo',
    description:
      'Browse verified tutors for math, reading, SAT prep, and more.',
    url: 'https://tutelo.app/tutors',
    type: 'website',
  },
  alternates: {
    canonical: 'https://tutelo.app/tutors',
  },
}

interface PageProps {
  searchParams: Promise<{
    subject?: string
    grade?: string
    city?: string
    price?: string
    q?: string
  }>
}

export default async function TutorsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { subject, grade, city, price: priceKey, q } = params

  // Resolve price range from key (e.g. "30-60" → { min: 30, max: 60 })
  const priceRange = priceKey
    ? PRICE_RANGES.find((r) => `${r.min ?? '0'}-${r.max ?? 'inf'}` === priceKey) ?? null
    : null

  const supabase = await createClient()

  let query = supabase
    .from('teachers')
    .select(
      'id, slug, full_name, photo_url, subjects, grade_levels, city, state, hourly_rate, school, headline, verified_at'
    )
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (subject) {
    query = query.contains('subjects', [subject])
  }
  if (grade) {
    query = query.contains('grade_levels', [grade])
  }
  if (city) {
    query = query.ilike('city', `%${city}%`)
  }
  if (priceRange?.max != null) {
    query = query.lte('hourly_rate', priceRange.max)
  }
  if (priceRange?.min != null) {
    query = query.gte('hourly_rate', priceRange.min)
  }
  if (q && q.trim()) {
    query = query.textSearch('search_vector', q.trim(), {
      type: 'websearch',
      config: 'english',
    })
  }

  const { data: teachers, error } = await query

  if (error) {
    // Fail open — log but don't block the page
    console.error('[/tutors] directory query error', { error: error.message })
  }

  const results = teachers ?? []

  // Human-readable active filter summary for the results count line
  const filterLabels: string[] = []
  if (q)       filterLabels.push(`"${q}"`)
  if (subject) filterLabels.push(subject)
  if (grade)   filterLabels.push(grade)
  if (city)    filterLabels.push(city)
  if (priceRange && priceRange.label !== 'Any price') filterLabels.push(priceRange.label)

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Find a Tutor
        </h1>
        <p className="mt-2 text-muted-foreground">
          Classroom teachers offering 1-on-1 tutoring for your child.
        </p>
      </div>

      {/* Filters — client component, wrapped in Suspense so the page shell
          renders immediately without waiting for client hydration */}
      <Suspense fallback={<FilterSkeleton />}>
        <DirectoryFilters />
      </Suspense>

      {/* Results summary */}
      <div className="mt-6 mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {results.length === 0
            ? 'No tutors found'
            : results.length === 50
            ? '50+ tutors'
            : `${results.length} tutor${results.length === 1 ? '' : 's'}`}
          {filterLabels.length > 0 && (
            <span> matching{' '}
              <span className="font-medium text-foreground">
                {filterLabels.join(', ')}
              </span>
            </span>
          )}
        </p>
      </div>

      {/* Teacher grid */}
      {results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </div>
      ) : (
        <EmptyState hasFilters={filterLabels.length > 0} />
      )}
    </main>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterSkeleton() {
  return (
    <div className="flex flex-wrap gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-10 w-36 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-lg font-medium text-foreground">No tutors found</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFilters
          ? 'Try adjusting or clearing your filters.'
          : 'No tutors have published their pages yet. Check back soon.'}
      </p>
    </div>
  )
}
