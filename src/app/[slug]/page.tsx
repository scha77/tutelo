import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Instagram, Mail, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { HeroSection } from '@/components/profile/HeroSection'
import { CredentialsBar } from '@/components/profile/CredentialsBar'
import { AboutSection } from '@/components/profile/AboutSection'
import { BookingCalendar } from '@/components/profile/BookingCalendar'
import { BookNowCTA } from '@/components/profile/BookNowCTA'
import { ReviewsSection } from '@/components/profile/ReviewsSection'
import { AnimatedProfile } from '@/components/profile/AnimatedProfile'
import { submitBookingRequest } from '@/actions/bookings'

// SEO-01: Dynamic OG metadata for teacher profile pages
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  const supabase = await createClient()
  const { data: teacher } = await supabase
    .from('teachers')
    .select('full_name, subjects, school, city, state, photo_url')
    .eq('slug', slug)
    .single()

  if (!teacher) {
    return {
      title: 'Tutelo',
      description:
        'Tutelo helps classroom teachers launch professional tutoring pages in minutes — manage bookings, share your link, and grow your practice.',
    }
  }

  const subjectList = teacher.subjects?.length
    ? teacher.subjects.join(', ')
    : 'various subjects'
  const locationParts = [teacher.city, teacher.state].filter(Boolean)
  const location = locationParts.length ? ` in ${locationParts.join(', ')}` : ''

  const title = `${teacher.full_name} — Tutoring on Tutelo`
  const description = `Book tutoring sessions with ${teacher.full_name} for ${subjectList}${location}. ${teacher.school ? `Teacher at ${teacher.school}. ` : ''}Schedule easily on Tutelo.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

// VIS-02: Graceful draft state — NOT a 404
function DraftPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Page not available</h1>
        <p className="text-muted-foreground">
          This teacher&apos;s page is not currently active.
        </p>
      </div>
    </main>
  )
}

interface SocialLinksProps {
  instagram: string | null
  email: string | null
  website: string | null
}

function SocialLinks({ instagram, email, website }: SocialLinksProps) {
  const hasLinks = instagram || email || website
  if (!hasLinks) return null

  return (
    <section className="mx-auto max-w-3xl px-4 py-4 border-t">
      <div className="flex flex-wrap justify-center gap-4">
        {instagram && (
          <a
            href={`https://instagram.com/${instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Instagram className="h-4 w-4" />
            <span>@{instagram}</span>
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span>{email}</span>
          </a>
        )}
        {website && (
          <a
            href={website.startsWith('http') ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span>{website}</span>
          </a>
        )}
      </div>
    </section>
  )
}

export default async function TeacherProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const { preview } = await searchParams

  const supabase = await createClient()
  const { data: teacher } = await supabase
    .from('teachers')
    .select('*, availability(*)')
    .eq('slug', slug)
    .single()

  if (!teacher) return notFound()

  const isPreview = preview === 'true'

  // VIS-02: Draft page shows "not available" — NOT notFound()
  if (!teacher.is_published && !isPreview) {
    return <DraftPage />
  }

  // REVIEW-02: Fetch submitted reviews for public profile display
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, review_text, reviewer_name, created_at')
    .eq('teacher_id', teacher.id)
    .not('rating', 'is', null) // only submitted reviews (stub rows have rating = null)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <main style={{ '--accent': teacher.accent_color } as React.CSSProperties}>
      <AnimatedProfile delay={0}>
        <HeroSection teacher={teacher} />
      </AnimatedProfile>
      <AnimatedProfile delay={0.1}>
        <CredentialsBar teacher={teacher} />
      </AnimatedProfile>
      <AnimatedProfile delay={0.15}>
        <AboutSection teacher={teacher} />
      </AnimatedProfile>
      <BookingCalendar
        slots={teacher.availability ?? []}
        teacherTimezone={teacher.timezone}
        teacherName={teacher.full_name}
        accentColor={teacher.accent_color}
        subjects={teacher.subjects ?? []}
        teacherId={teacher.id}
        submitAction={submitBookingRequest}
        stripeConnected={teacher.stripe_charges_enabled ?? false}
        teacherStripeAccountId={teacher.stripe_account_id ?? undefined}
      />
      <BookNowCTA />
      <AnimatedProfile delay={0.2}>
        <ReviewsSection reviews={reviews ?? []} />
      </AnimatedProfile>
      <SocialLinks
        instagram={teacher.social_instagram}
        email={teacher.social_email}
        website={teacher.social_website}
      />
    </main>
  )
}
