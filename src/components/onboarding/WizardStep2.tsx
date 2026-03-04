'use client'

import { useFormContext, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { FullOnboardingData } from '@/lib/schemas/onboarding'

export const SUBJECTS = [
  'Math',
  'Reading/ELA',
  'Science',
  'Social Studies',
  'Writing',
  'Test Prep',
  'Foreign Language',
  'Art',
  'Music',
  'Other',
]

export const GRADE_LEVELS = ['K-2', '3-5', '6-8', '9-12']

const RATE_BENCHMARKS: Record<string, string> = {
  default: '$35–65/hr',
}

function getRateBenchmark(): string {
  return RATE_BENCHMARKS.default
}

export function WizardStep2() {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<FullOnboardingData>()

  const selectedSubjects = watch('subjects') ?? []
  const selectedGradeLevels = watch('grade_levels') ?? []

  return (
    <div className="space-y-6">
      {/* Subjects */}
      <div className="space-y-2">
        <Label>Subjects you teach</Label>
        <Controller
          name="subjects"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((subject) => {
                const isSelected = (field.value ?? []).includes(subject)
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => {
                      const current = field.value ?? []
                      if (isSelected) {
                        field.onChange(current.filter((s: string) => s !== subject))
                      } else {
                        field.onChange([...current, subject])
                      }
                    }}
                    className="focus:outline-none"
                  >
                    <Badge
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer select-none px-3 py-1.5 text-sm"
                    >
                      {subject}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        />
        {errors.subjects && (
          <p className="text-sm text-destructive">{errors.subjects.message}</p>
        )}
        {selectedSubjects.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {selectedSubjects.length} selected
          </p>
        )}
      </div>

      {/* Grade levels */}
      <div className="space-y-2">
        <Label>Grade levels</Label>
        <Controller
          name="grade_levels"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {GRADE_LEVELS.map((grade) => {
                const isSelected = (field.value ?? []).includes(grade)
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => {
                      const current = field.value ?? []
                      if (isSelected) {
                        field.onChange(current.filter((g: string) => g !== grade))
                      } else {
                        field.onChange([...current, grade])
                      }
                    }}
                    className="focus:outline-none"
                  >
                    <Badge
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer select-none px-3 py-1.5 text-sm"
                    >
                      {grade}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        />
        {errors.grade_levels && (
          <p className="text-sm text-destructive">{errors.grade_levels.message}</p>
        )}
        {selectedGradeLevels.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {selectedGradeLevels.length} selected
          </p>
        )}
      </div>

      {/* Hourly rate */}
      <div className="space-y-1">
        <Label htmlFor="hourly_rate">Hourly rate (USD)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            $
          </span>
          <Input
            id="hourly_rate"
            type="number"
            min={10}
            max={500}
            step={5}
            placeholder="45"
            className="pl-7"
            {...register('hourly_rate')}
            aria-invalid={!!errors.hourly_rate}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Most teachers charge {getRateBenchmark()}
        </p>
        {errors.hourly_rate && (
          <p className="text-sm text-destructive">{errors.hourly_rate.message}</p>
        )}
      </div>
    </div>
  )
}
