'use client'

import { useFormContext, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FullOnboardingData } from '@/lib/schemas/onboarding'
import { createClient } from '@/lib/supabase/client'

const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'],
  ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'],
  ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'],
  ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
  ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
  ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
]

interface WizardStep1Props {
  userId: string
}

export function WizardStep1({ userId }: WizardStep1Props) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<FullOnboardingData>()

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `profile-images/${userId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('profile-images').upload(path, file, {
      upsert: true,
    })

    if (!error) {
      const { data } = supabase.storage.from('profile-images').getPublicUrl(path)
      setValue('photo_url', data.publicUrl)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          placeholder="Sarah Johnson"
          {...register('full_name')}
          aria-invalid={!!errors.full_name}
        />
        {errors.full_name && (
          <p className="text-sm text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="school">School name</Label>
        <Input
          id="school"
          placeholder="Lincoln Elementary"
          {...register('school')}
          aria-invalid={!!errors.school}
        />
        {errors.school && (
          <p className="text-sm text-destructive">{errors.school.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="Austin"
            {...register('city')}
            aria-invalid={!!errors.city}
          />
          {errors.city && (
            <p className="text-sm text-destructive">{errors.city.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="state">State</Label>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger id="state" className="w-full" aria-invalid={!!errors.state}>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(([abbr, name]) => (
                    <SelectItem key={abbr} value={abbr}>
                      {abbr} — {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.state && (
            <p className="text-sm text-destructive">{errors.state.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="years_experience">Years of teaching experience</Label>
        <Input
          id="years_experience"
          type="number"
          min={0}
          max={50}
          placeholder="5"
          {...register('years_experience')}
          aria-invalid={!!errors.years_experience}
        />
        {errors.years_experience && (
          <p className="text-sm text-destructive">{errors.years_experience.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="photo_upload">Profile photo (optional)</Label>
        <input
          id="photo_upload"
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
        />
        <p className="text-xs text-muted-foreground">Upload a professional headshot. Max 5 MB.</p>
      </div>
    </div>
  )
}
