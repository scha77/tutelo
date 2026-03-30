'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { updateProfile } from '@/actions/profile'

interface CapacitySettingsProps {
  capacityLimit: number | null
  activeStudentCount: number
}

export function CapacitySettings({
  capacityLimit,
  activeStudentCount,
}: CapacitySettingsProps) {
  const [enabled, setEnabled] = useState(capacityLimit !== null)
  const [limit, setLimit] = useState(
    capacityLimit !== null ? String(capacityLimit) : '10'
  )
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const value = enabled ? parseInt(limit, 10) : null

      if (enabled && (isNaN(parseInt(limit, 10)) || parseInt(limit, 10) < 1 || parseInt(limit, 10) > 100)) {
        toast.error('Capacity must be between 1 and 100')
        return
      }

      const result = await updateProfile({ capacity_limit: value })
      if (result.error) {
        toast.error('Failed to save: ' + result.error)
      } else {
        toast.success('Capacity settings saved!')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacity Limit</CardTitle>
        <CardDescription>
          Set the maximum number of active students you can take on. When you
          reach your limit, your profile will show a waitlist signup instead of
          the booking calendar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4 max-w-md">
          <div className="flex items-start gap-2">
            <input
              id="capacity-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="capacity-enabled" className="text-sm">
              Limit the number of active students
            </Label>
          </div>

          {enabled && (
            <div className="space-y-1.5">
              <Label htmlFor="capacity-limit">Maximum students</Label>
              <Input
                id="capacity-limit"
                type="number"
                min="1"
                max="100"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            You currently have{' '}
            <span className="font-medium text-foreground">
              {activeStudentCount}
            </span>{' '}
            active student{activeStudentCount !== 1 ? 's' : ''} (based on
            bookings in the last 90 days).
          </p>

          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
