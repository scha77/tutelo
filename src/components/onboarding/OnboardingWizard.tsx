'use client'

import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { toast } from 'sonner'
import type { FullOnboardingData } from '@/lib/schemas/onboarding'
import { FullOnboardingSchema } from '@/lib/schemas/onboarding'
import { saveWizardStep, publishProfile } from '@/actions/onboarding'
import { WizardStep1 } from './WizardStep1'
import { WizardStep2 } from './WizardStep2'
import { WizardStep3 } from './WizardStep3'
import { Button } from '@/components/ui/button'

interface OnboardingWizardProps {
  initialStep: number
  savedData: Partial<FullOnboardingData>
  userId: string
}

const STEP_FIELDS: Record<number, Array<keyof FullOnboardingData>> = {
  1: ['full_name', 'school', 'city', 'state', 'years_experience'],
  2: ['subjects', 'grade_levels', 'hourly_rate'],
  3: ['slug', 'timezone', 'availability'],
}

const STEP_LABELS = ['Your profile', 'Teaching details', 'Availability']

export function OnboardingWizard({ initialStep, savedData, userId }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(
    Math.max(1, Math.min(3, initialStep || 1))
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FullOnboardingData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(FullOnboardingSchema) as unknown as Resolver<FullOnboardingData>,
    defaultValues: {
      full_name: savedData.full_name ?? '',
      school: savedData.school ?? '',
      city: savedData.city ?? '',
      state: savedData.state ?? '',
      years_experience: savedData.years_experience ?? 0,
      photo_url: savedData.photo_url ?? '',
      subjects: savedData.subjects ?? [],
      grade_levels: savedData.grade_levels ?? [],
      hourly_rate: savedData.hourly_rate ?? 45,
      slug: savedData.slug ?? '',
      timezone: savedData.timezone ?? '',
      availability: savedData.availability ?? [],
    },
    mode: 'onTouched',
  })

  async function advanceStep() {
    const fields = STEP_FIELDS[currentStep]
    const isValid = await form.trigger(fields)
    if (!isValid) return

    setIsSubmitting(true)
    try {
      const data = form.getValues()
      const stepData: Partial<FullOnboardingData> = {}
      for (const field of fields) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (stepData as any)[field] = (data as any)[field]
      }

      const result = await saveWizardStep(currentStep, stepData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setCurrentStep((s) => s + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePublish() {
    const fields = STEP_FIELDS[3]
    const isValid = await form.trigger(fields)
    if (!isValid) return

    setIsSubmitting(true)
    try {
      const data = form.getValues()
      const result = await publishProfile(data)
      if (result?.error) {
        toast.error(result.error)
      }
      // On success, publishProfile calls redirect() so we never reach here
    } catch (err: unknown) {
      // redirect() throws a Next.js redirect "error" — that's expected
      // Re-throw so Next.js handles it
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
        throw err
      }
      toast.error('Failed to publish. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1
            const isCompleted = currentStep > stepNum
            const isCurrent = currentStep === stepNum

            return (
              <div key={stepNum} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? '✓' : stepNum}
                </div>
                <span
                  className={`text-xs ${
                    isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          />
        </div>
      </div>

      {/* Step heading */}
      <h2 className="text-xl font-semibold mb-6">
        Step {currentStep}: {STEP_LABELS[currentStep - 1]}
      </h2>

      {/* Form */}
      <FormProvider {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          {currentStep === 1 && <WizardStep1 userId={userId} />}
          {currentStep === 2 && <WizardStep2 />}
          {currentStep === 3 && (
            <WizardStep3 isSubmitting={isSubmitting} onPublish={handlePublish} />
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep((s) => s - 1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 3 && (
              <Button
                type="button"
                onClick={advanceStep}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Next'}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
