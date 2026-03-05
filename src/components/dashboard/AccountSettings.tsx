'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateProfile } from '@/actions/profile'

interface Teacher {
  full_name: string
  school: string | null
  city: string | null
  state: string | null
  years_experience: number | null
  photo_url: string | null
  subjects: string[]
  grade_levels: string[]
  timezone: string
}

interface AccountSettingsProps {
  teacher: Teacher
}

export function AccountSettings({ teacher }: AccountSettingsProps) {
  const [fullName, setFullName] = useState(teacher.full_name)
  const [school, setSchool] = useState(teacher.school ?? '')
  const [city, setCity] = useState(teacher.city ?? '')
  const [state, setState] = useState(teacher.state ?? '')
  const [yearsExp, setYearsExp] = useState(
    teacher.years_experience != null ? String(teacher.years_experience) : ''
  )
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateProfile({
        full_name: fullName,
        school: school || null,
        city: city || null,
        state: state || null,
        years_experience: yearsExp ? parseInt(yearsExp, 10) : null,
      })
      if (result.error) {
        toast.error('Failed to save: ' + result.error)
      } else {
        toast.success('Settings saved!')
      }
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold">Account Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Update your professional profile information.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="school">School</Label>
          <Input
            id="school"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="Your school name"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              maxLength={2}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="years-exp">Years of experience</Label>
          <Input
            id="years-exp"
            type="number"
            min="0"
            max="60"
            value={yearsExp}
            onChange={(e) => setYearsExp(e.target.value)}
            placeholder="e.g. 5"
          />
        </div>

        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-1">Timezone: {teacher.timezone}</p>
          <p className="text-xs text-muted-foreground">
            To change your timezone, update it in the onboarding page.
          </p>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
