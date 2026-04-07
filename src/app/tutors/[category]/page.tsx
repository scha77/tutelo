import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/service'
import { TeacherCard } from '@/components/directory/TeacherCard'
import { SUBJECT_LIST } from '@/lib/constants/directory'

// Revalidate every hour — teachers publish/unpublish infrequently
export const revalidate = 3600

// ── Slug helpers ──────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase().replace(/ /g, '-')
}

function fromLocationSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Determine if the category slug matches a known subject
function resolveCategory(category: string):
  | { type: 'subject'; subject: string; label: string }
  | { type: 'location'; city: string; label: string } {
  const subject = SUBJECT_LIST.find((s) => toSlug(s) === category)
  if (subject) {
    return { type: 'subject', subject, label: subject }
  }
  const city = fromLocationSlug(category)
  return { type: 'location', city, label: city }
}

// ── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return SUBJECT_LIST.map((subject) => ({
    category: toSlug(subject),
  }))
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const resolved = resolveCategory(category)

  const title =
    resolved.type === 'subject'
      ? `${resolved.label} Tutors | Tutelo`
      : `Tutors in ${resolved.label} | Tutelo`

  const description =
    resolved.type === 'subject'
      ? `Find qualified ${resolved.label.toLowerCase()} tutors on Tutelo. Browse teacher profiles, rates, and availability.`
      : `Find tutors near ${resolved.label} on Tutelo. Browse local teacher profiles, rates, and availability.`

  const url = `https://tutelo.app/tutors/${category}`

  return {
    title,
    description,
    openGraph: { title, description, url, type: 'website' },
    alternates: { canonical: url },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ category: string }>
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params
  const resolved = resolveCategory(category)

  let query = supabaseAdmin
    .from('teachers')
    .select(
      'id, slug, full_name, photo_url, subjects, grade_levels, city, state, hourly_rate, school, headline, verified_at'
    )
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (resolved.type === 'subject') {
    query = query.contains('subjects', [resolved.subject])
  } else {
    query = query.ilike('city', `%${resolved.city}%`)
  }

  const { data: teachers, error } = await query

  if (error) {
    console.error('[/tutors/[category]] query error', {
      category,
      error: error.message,
    })
  }

  const results = teachers ?? []

  const heading =
    resolved.type === 'subject'
      ? `${resolved.label} Tutors`
      : `Tutors in ${resolved.label}`

  const subtitle =
    resolved.type === 'subject'
      ? `Classroom teachers offering ${resolved.label.toLowerCase()} tutoring`
      : `Classroom teachers available near ${resolved.label}`

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/tutors"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All tutors
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {heading}
        </h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      </div>

      {/* Results count */}
      <p className="mb-6 text-sm text-muted-foreground">
        {results.length === 0
          ? 'No tutors found'
          : results.length === 50
          ? '50+ tutors'
          : `${results.length} tutor${results.length === 1 ? '' : 's'}`}
      </p>

      {/* Teacher grid */}
      {results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium text-foreground">No tutors found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            There are no published tutors in this category yet.{' '}
            <Link href="/tutors" className="underline underline-offset-4 hover:text-foreground">
              Browse all tutors
            </Link>
          </p>
        </div>
      )}
    </main>
  )
}
