'use client'

import { useEffect, useState } from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FullOnboardingData } from '@/lib/schemas/onboarding'
import { generateSlugAction } from '@/actions/onboarding'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Time slots: 6am through 10pm (hour blocks)
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6..22

function formatHour(hour: number): string {
  if (hour === 12) return '12pm'
  if (hour < 12) return `${hour}am`
  return `${hour - 12}pm`
}

function formatHHMM(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

// Default availability: Mon-Fri 4pm-8pm (hours 16-19) + Sat-Sun 8am-6pm (hours 8-17)
function getDefaultAvailability(): Array<{ day_of_week: number; start_time: string; end_time: string }> {
  const slots: Array<{ day_of_week: number; start_time: string; end_time: string }> = []

  // Mon-Fri (1-5): 4pm (16) to 8pm (20) — one-hour slots
  for (let day = 1; day <= 5; day++) {
    for (let hour = 16; hour < 20; hour++) {
      slots.push({
        day_of_week: day,
        start_time: formatHHMM(hour),
        end_time: formatHHMM(hour + 1),
      })
    }
  }

  // Sat (6) and Sun (0): 8am (8) to 6pm (18) — one-hour slots
  for (const day of [0, 6]) {
    for (let hour = 8; hour < 18; hour++) {
      slots.push({
        day_of_week: day,
        start_time: formatHHMM(hour),
        end_time: formatHHMM(hour + 1),
      })
    }
  }

  return slots
}

// Build a Set key for quick lookup
function slotKey(day: number, hour: number): string {
  return `${day}-${formatHHMM(hour)}`
}

interface WizardStep3Props {
  isSubmitting: boolean
  onPublish: () => void
}

export function WizardStep3({ isSubmitting, onPublish }: WizardStep3Props) {
  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<FullOnboardingData>()

  const [slugGenerated, setSlugGenerated] = useState(false)
  const [generatingSlug, setGeneratingSlug] = useState(false)

  const slugValue = watch('slug') ?? ''

  // Get timezones from the browser API
  const [timezones, setTimezones] = useState<string[]>([])
  useEffect(() => {
    try {
      const tzList = Intl.supportedValuesOf('timeZone')
      setTimezones(tzList)
    } catch {
      setTimezones(['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'Pacific/Honolulu', 'America/Anchorage'])
    }
  }, [])

  // Auto-set default timezone
  useEffect(() => {
    const currentTz = getValues('timezone')
    if (!currentTz) {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      setValue('timezone', detectedTz)
    }
  }, [getValues, setValue])

  // Auto-generate slug from teacher name if not set
  useEffect(() => {
    if (slugGenerated) return
    const currentSlug = getValues('slug')
    if (currentSlug && currentSlug.length >= 3) {
      setSlugGenerated(true)
      return
    }
    const name = getValues('full_name')
    if (!name) return

    setGeneratingSlug(true)
    generateSlugAction(name)
      .then(({ slug }) => {
        setValue('slug', slug)
        setSlugGenerated(true)
      })
      .finally(() => setGeneratingSlug(false))
  }, [slugGenerated, getValues, setValue])

  // Set default availability if empty
  useEffect(() => {
    const current = getValues('availability')
    if (!current || current.length === 0) {
      setValue('availability', getDefaultAvailability())
    }
  }, [getValues, setValue])

  // Watch availability to build a lookup set
  const availability = watch('availability') ?? []

  const availabilitySet = new Set(
    availability.map((s) => {
      const hour = parseInt(s.start_time.split(':')[0], 10)
      return slotKey(s.day_of_week, hour)
    })
  )

  function toggleSlot(day: number, hour: number) {
    const key = slotKey(day, hour)
    const current = getValues('availability') ?? []

    if (availabilitySet.has(key)) {
      // Remove this slot
      setValue(
        'availability',
        current.filter(
          (s) => !(s.day_of_week === day && s.start_time === formatHHMM(hour))
        )
      )
    } else {
      // Add this slot
      setValue('availability', [
        ...current,
        {
          day_of_week: day,
          start_time: formatHHMM(hour),
          end_time: formatHHMM(hour + 1),
        },
      ])
    }
  }

  function handlePreview() {
    const slug = getValues('slug')
    if (slug) {
      window.open(`/${slug}?preview=true`, '_blank')
    }
  }

  return (
    <div className="space-y-6">
      {/* Slug */}
      <div className="space-y-1">
        <Label htmlFor="slug">Your tutelo.app URL</Label>
        <div className="flex items-center gap-0">
          <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground whitespace-nowrap">
            tutelo.app/
          </span>
          <Input
            id="slug"
            placeholder={generatingSlug ? 'Generating...' : 'your-name'}
            {...register('slug')}
            aria-invalid={!!errors.slug}
            className="rounded-l-none"
            disabled={generatingSlug}
          />
        </div>
        {errors.slug && (
          <p className="text-sm text-destructive">{errors.slug.message}</p>
        )}
        {slugValue && !errors.slug && (
          <p className="text-xs text-muted-foreground">
            tutelo.app/{slugValue}
          </p>
        )}
      </div>

      {/* Timezone */}
      <div className="space-y-1">
        <Label htmlFor="timezone">Your timezone</Label>
        <Controller
          name="timezone"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <SelectTrigger id="timezone" className="w-full" aria-invalid={!!errors.timezone}>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.timezone && (
          <p className="text-sm text-destructive">{errors.timezone.message}</p>
        )}
      </div>

      {/* Availability grid */}
      <div className="space-y-2">
        <Label>Weekly availability</Label>
        <p className="text-xs text-muted-foreground">
          Click time blocks to toggle availability. Each block is 1 hour.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="w-12 text-left py-1 text-muted-foreground font-normal">Time</th>
                {DAYS.map((day) => (
                  <th key={day} className="text-center py-1 text-muted-foreground font-medium px-1">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour}>
                  <td className="py-0.5 pr-2 text-muted-foreground whitespace-nowrap">
                    {formatHour(hour)}
                  </td>
                  {DAYS.map((_, dayIdx) => {
                    const isSelected = availabilitySet.has(slotKey(dayIdx, hour))
                    return (
                      <td key={dayIdx} className="p-0.5">
                        <button
                          type="button"
                          onClick={() => toggleSlot(dayIdx, hour)}
                          className={`w-full h-6 rounded-sm border transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'bg-muted/50 border-border hover:bg-muted'
                          }`}
                          title={`${DAYS[dayIdx]} ${formatHour(hour)}`}
                          aria-pressed={isSelected}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {errors.availability && (
          <p className="text-sm text-destructive">{errors.availability.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {availability.length} slot{availability.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Preview and Publish buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={!slugValue || slugValue.length < 3}
        >
          Preview page
        </Button>
        <Button
          type="button"
          onClick={onPublish}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Publishing...' : 'Publish my page'}
        </Button>
      </div>
    </div>
  )
}
