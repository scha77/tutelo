import type { Metadata } from 'next'
import { cache } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Instagram, Mail, Globe } from 'lucide-react'
import { format, addDays, startOfToday } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/service'
import { isBot } from '@/lib/utils/bot-filter'
import { HeroSection } from '@/components/profile/HeroSection'
import { CredentialsBar } from '@/components/profile/CredentialsBar'
import { AboutSection } from '@/components/profile/AboutSection'
import { BookingCalendar } from '@/components/profile/BookingCalendar'
import { AtCapacitySection } from '@/components/profile/AtCapacitySection'
import { BookNowCTA } from '@/components/profile/BookNowCTA'
import { ReviewsSection } from '@/components/profile/ReviewsSection'
import { AnimatedProfile } from '@/components/profile/AnimatedProfile'
import { submitBookingRequest } from '@/actions/bookings'

// Deduplicate teacher query between generateMetadata and page component
const getTeacherBySlug = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('teachers')
    .select('*, availability(*)')
    .eq('slug', slug)
    .single()
  return { teacher: data, supabase }
})

// SEO-01: Dynamic OG metadata for teacher profile pages
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { teacher } = await getTeacherBySlug(slug)

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
      url: `https://tutelo.app/${slug}`,
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

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 border-t">
      {hasLinks && (
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {instagram && (
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Instagram className="h-4 w-4" />
              <span>@{instagram}</span>
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
              className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              <span>{website}</span>
            </a>
          )}
        </div>
      )}
      {/* Attribution footer */}
      <p className="text-center text-xs text-muted-foreground/60">
        Powered by{' '}
        <a
          href="https://tutelo.app"
          className="underline underline-offset-2 transition-colors hover:text-muted-foreground"
        >
          Tutelo
        </a>
      </p>
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

  const { teacher, supabase } = await getTeacherBySlug(slug)

  if (!teacher) return notFound()

  // M008/S04: Fire-and-forget page view tracking (non-blocking, bot-filtered)
  const headersList = await headers()
  const userAgent = headersList.get('user-agent')
  if (!isBot(userAgent)) {
    void Promise.resolve(
      supabaseAdmin
        .from('page_views')
        .insert({ teacher_id: teacher.id, user_agent: userAgent, is_bot: false })
    ).catch(() => {}) // never block page render
  }

  const isPreview = preview === 'true'

  // VIS-02: Draft page shows "not available" — NOT notFound()
  if (!teacher.is_published && !isPreview) {
    return <DraftPage />
  }

  // Parallelize all secondary queries — no dependencies between them
  const today = startOfToday()
  const todayStr = format(today, 'yyyy-MM-dd')
  const ninetyDaysFromNow = format(addDays(today, 90), 'yyyy-MM-dd')

  const [
    { data: overrides },
    { data: reviews },
    capacityResult,
    { data: sessionTypes },
  ] = await Promise.all([
    // S02-T03: Override availability for the next 90 days
    supabase
      .from('availability_overrides')
      .select('specific_date, start_time, end_time')
      .eq('teacher_id', teacher.id)
      .gte('specific_date', todayStr)
      .lte('specific_date', ninetyDaysFromNow)
      .order('specific_date')
      .order('start_time'),

    // REVIEW-02: Submitted reviews for public profile display
    supabase
      .from('reviews')
      .select('rating, review_text, reviewer_name, created_at')
      .eq('teacher_id', teacher.id)
      .not('rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5),

    // M007-S01: Capacity check — only query if teacher has a capacity limit set
    teacher.capacity_limit != null
      ? supabase
          .from('bookings')
          .select('student_name')
          .eq('teacher_id', teacher.id)
          .in('status', ['confirmed', 'completed'])
          .gte('booking_date', format(addDays(today, -90), 'yyyy-MM-dd'))
      : Promise.resolve({ data: null, error: null }),

    // SESS-02: Session types for session type selector
    supabase
      .from('session_types')
      .select('id, label, price, duration_minutes, sort_order')
      .eq('teacher_id', teacher.id)
      .order('sort_order'),
  ])

  let atCapacity = false
  if (teacher.capacity_limit != null) {
    if (capacityResult.error) {
      console.error('[capacity] Query failed on profile page', {
        teacher_id: teacher.id,
        error: capacityResult.error.message,
      })
    } else if (capacityResult.data) {
      const distinctStudents = new Set(capacityResult.data.map((r: { student_name: string }) => r.student_name)).size
      atCapacity = distinctStudents >= teacher.capacity_limit
    }
  }

  return (
    <main style={{ '--accent': teacher.accent_color } as React.CSSProperties}>
      <AnimatedProfile delay={0}>
        <HeroSection teacher={teacher} />
      </AnimatedProfile>
      <AnimatedProfile delay={0.1}>
        <CredentialsBar teacher={teacher} isVerified={!!teacher.verified_at} />
      </AnimatedProfile>
      <AnimatedProfile delay={0.15}>
        <AboutSection teacher={teacher} />
      </AnimatedProfile>
      {atCapacity ? (
        <AtCapacitySection
          teacherName={teacher.full_name}
          teacherId={teacher.id}
          accentColor={teacher.accent_color}
        />
      ) : (
        <BookingCalendar
          slots={teacher.availability ?? []}
          overrides={overrides ?? []}
          teacherTimezone={teacher.timezone}
          teacherName={teacher.full_name}
          accentColor={teacher.accent_color}
          subjects={teacher.subjects ?? []}
          teacherId={teacher.id}
          submitAction={submitBookingRequest}
          stripeConnected={teacher.stripe_charges_enabled ?? false}
          teacherStripeAccountId={teacher.stripe_account_id ?? undefined}
          sessionTypes={sessionTypes ?? []}
        />
      )}
      {!atCapacity && <BookNowCTA />}
      <AnimatedProfile delay={0.2}>
        <ReviewsSection reviews={reviews ?? []} accentColor={teacher.accent_color} />
      </AnimatedProfile>
      <SocialLinks
        instagram={teacher.social_instagram}
        email={teacher.social_email}
        website={teacher.social_website}
      />
    </main>
  )
}
