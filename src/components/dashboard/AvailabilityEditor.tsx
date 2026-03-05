'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updateAvailability } from '@/actions/availability'

interface AvailabilitySlot {
  id: string
  teacher_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

interface AvailabilityEditorProps {
  initialSlots: AvailabilitySlot[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// 8am through 9pm (hour blocks)
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 8..21

function formatHour(hour: number): string {
  if (hour === 12) return '12pm'
  if (hour < 12) return `${hour}am`
  return `${hour - 12}pm`
}

function formatHHMM(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function slotKey(day: number, hour: number): string {
  return `${day}-${formatHHMM(hour)}`
}

function slotsToSet(slots: AvailabilitySlot[]): Set<string> {
  return new Set(
    slots.map((s) => {
      const hour = parseInt(s.start_time.split(':')[0], 10)
      return slotKey(s.day_of_week, hour)
    })
  )
}

export function AvailabilityEditor({ initialSlots }: AvailabilityEditorProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => slotsToSet(initialSlots)
  )
  const [isPending, startTransition] = useTransition()

  function toggleSlot(day: number, hour: number) {
    const key = slotKey(day, hour)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function handleSave() {
    // Reconstruct slot objects from selected keys
    const slots = Array.from(selectedKeys).map((key) => {
      const [dayStr, startTime] = key.split('-')
      const day = parseInt(dayStr, 10)
      const hour = parseInt(startTime.split(':')[0], 10)
      return {
        day_of_week: day,
        start_time: formatHHMM(hour),
        end_time: formatHHMM(hour + 1),
      }
    })

    startTransition(async () => {
      const result = await updateAvailability(slots)
      if (result.error) {
        toast.error('Failed to save availability: ' + result.error)
      } else {
        toast.success('Availability saved!')
      }
    })
  }

  const selectedCount = selectedKeys.size

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-xl font-semibold">Availability</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Click time blocks to toggle your available hours. Each block is 1 hour.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-12 py-2 text-left text-muted-foreground font-normal">
                Time
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="px-1 py-2 text-center text-muted-foreground font-medium"
                >
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
                  const isSelected = selectedKeys.has(slotKey(dayIdx, hour))
                  return (
                    <td key={dayIdx} className="p-0.5">
                      <button
                        type="button"
                        onClick={() => toggleSlot(dayIdx, hour)}
                        className={`w-full h-6 rounded-sm border transition-colors ${
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-muted/50 border-border hover:bg-muted'
                        }`}
                        title={`${DAYS[dayIdx]} ${formatHour(hour)}`}
                        aria-pressed={isSelected}
                        aria-label={`${DAYS[dayIdx]} at ${formatHour(hour)}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          {selectedCount} slot{selectedCount !== 1 ? 's' : ''} selected
        </p>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Availability'}
        </Button>
      </div>
    </div>
  )
}
