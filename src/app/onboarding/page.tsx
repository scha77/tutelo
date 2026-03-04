import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import type { FullOnboardingData } from '@/lib/schemas/onboarding'

export default async function OnboardingPage() {
  const supabase = await createClient()

  // Get authenticated user via getClaims (not getSession)
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  if (!claims) {
    redirect('/login')
  }

  const userId = claims.sub

  // Query existing teacher row for resume support
  const { data: teacher } = await supabase
    .from('teachers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  // If already published, redirect to dashboard
  if (teacher?.is_published && teacher?.wizard_step === 3) {
    redirect('/dashboard')
  }

  // Build savedData from existing teacher row
  const savedData: Partial<FullOnboardingData> = teacher
    ? {
        full_name: teacher.full_name ?? '',
        school: teacher.school ?? '',
        city: teacher.city ?? '',
        state: teacher.state ?? '',
        years_experience: teacher.years_experience ?? 0,
        photo_url: teacher.photo_url ?? '',
        subjects: teacher.subjects ?? [],
        grade_levels: teacher.grade_levels ?? [],
        hourly_rate: teacher.hourly_rate ?? 45,
        slug: teacher.slug ?? '',
        timezone: teacher.timezone ?? '',
        // availability is loaded separately if needed — wizard will re-populate defaults
        availability: [],
      }
    : {}

  const initialStep = teacher?.wizard_step ?? 1

  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Set up your tutoring page
          </h1>
          <p className="text-muted-foreground mt-2">
            Get a professional tutoring page live in under 7 minutes.
          </p>
        </div>

        <OnboardingWizard
          initialStep={initialStep}
          savedData={savedData}
          userId={userId}
        />
      </div>
    </main>
  )
}
