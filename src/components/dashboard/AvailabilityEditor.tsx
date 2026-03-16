'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Tabs } from 'radix-ui'
import { Plus, X, CalendarIcon, Undo2 } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { updateAvailability, saveOverrides, deleteOverridesForDate } from '@/actions/availability'
import {
  generate5MinOptions,
  formatTimeLabel,
  validateNoOverlap,
  type TimeWindow,
} from '@/lib/utils/time'

// ── Types ──────────────────────────────────────────────────────────────

interface AvailabilitySlot {
  id: string
  teacher_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

interface OverrideSlot {
  id: string
  teacher_id: string
  specific_date: string
  start_time: string
  end_time: string
}

export interface AvailabilityEditorProps {
  initialSlots: AvailabilitySlot[]
  initialOverrides?: OverrideSlot[]
}

interface TimeRange {
  start_time: string // "HH:MM"
  end_time: string   // "HH:MM"
}

// ── Constants ──────────────────────────────────────────────────────────

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

// ── Helpers ────────────────────────────────────────────────────────────

/** Normalize "HH:MM:SS" or "HH:MM" to "HH:MM" */
function normalizeTime(t: string): string {
  return t.slice(0, 5)
}

/** Group initialSlots by day_of_week into a Map<number, TimeRange[]> */
function buildInitialState(
  slots: AvailabilitySlot[]
): Map<number, TimeRange[]> {
  const map = new Map<number, TimeRange[]>()
  for (let d = 0; d < 7; d++) map.set(d, [])
  for (const s of slots) {
    const ranges = map.get(s.day_of_week)!
    ranges.push({
      start_time: normalizeTime(s.start_time),
      end_time: normalizeTime(s.end_time),
    })
  }
  // Sort each day's windows by start_time for consistent display
  for (const ranges of map.values()) {
    ranges.sort((a, b) => a.start_time.localeCompare(b.start_time))
  }
  return map
}

/** Get hour number from "HH:MM" */
function hourOf(hhmm: string): number {
  return parseInt(hhmm.split(':')[0], 10)
}

/** Format YYYY-MM-DD to a local Date object (avoids timezone shift from new Date(string)) */
function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Format Date to YYYY-MM-DD */
function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Group override slots by specific_date into Map<dateString, TimeRange[]> */
function buildOverrideState(overrides: OverrideSlot[]): Map<string, TimeRange[]> {
  const map = new Map<string, TimeRange[]>()
  for (const o of overrides) {
    const dateKey = o.specific_date
    if (!map.has(dateKey)) map.set(dateKey, [])
    map.get(dateKey)!.push({
      start_time: normalizeTime(o.start_time),
      end_time: normalizeTime(o.end_time),
    })
  }
  // Sort each date's windows
  for (const ranges of map.values()) {
    ranges.sort((a, b) => a.start_time.localeCompare(b.start_time))
  }
  return map
}

// ── Grouped time options (memoized structure) ──────────────────────────

interface HourGroup {
  label: string // e.g. "8 AM", "12 PM"
  options: string[] // e.g. ["08:00", "08:05", ..., "08:55"]
}

function buildHourGroups(allOptions: string[]): HourGroup[] {
  const groups: HourGroup[] = []
  let currentHour = -1
  let currentGroup: HourGroup | null = null

  for (const opt of allOptions) {
    const h = hourOf(opt)
    if (h !== currentHour) {
      currentHour = h
      currentGroup = {
        label: formatTimeLabel(`${String(h).padStart(2, '0')}:00`).replace(
          ':00 ',
          ' '
        ),
        options: [],
      }
      groups.push(currentGroup)
    }
    currentGroup!.options.push(opt)
  }

  return groups
}

// ── Component ──────────────────────────────────────────────────────────

export function AvailabilityEditor({ initialSlots, initialOverrides = [] }: AvailabilityEditorProps) {
  const [schedule, setSchedule] = useState<Map<number, TimeRange[]>>(
    () => buildInitialState(initialSlots)
  )
  const [overrides, setOverrides] = useState<Map<string, TimeRange[]>>(
    () => buildOverrideState(initialOverrides)
  )
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const allTimeOptions = useMemo(() => generate5MinOptions(), [])
  const hourGroups = useMemo(() => buildHourGroups(allTimeOptions), [allTimeOptions])

  // Sorted list of override date strings for the sidebar
  const overrideDates = useMemo(
    () => Array.from(overrides.keys()).sort(),
    [overrides]
  )

  // ── State updaters ─────────────────────────────────────────────────

  const addWindow = useCallback((day: number) => {
    setSchedule((prev) => {
      const next = new Map(prev)
      const ranges = [...(next.get(day) ?? [])]
      ranges.push({ start_time: '09:00', end_time: '17:00' })
      next.set(day, ranges)
      return next
    })
  }, [])

  const removeWindow = useCallback((day: number, index: number) => {
    setSchedule((prev) => {
      const next = new Map(prev)
      const ranges = [...(next.get(day) ?? [])]
      ranges.splice(index, 1)
      next.set(day, ranges)
      return next
    })
  }, [])

  const updateWindowField = useCallback(
    (day: number, index: number, field: 'start_time' | 'end_time', value: string) => {
      setSchedule((prev) => {
        const next = new Map(prev)
        const ranges = [...(next.get(day) ?? [])]
        ranges[index] = { ...ranges[index], [field]: value }
        next.set(day, ranges)
        return next
      })
    },
    []
  )

  // ── Override state updaters ─────────────────────────────────────────

  const selectOrAddDate = useCallback((date: Date) => {
    const dateStr = toDateString(date)
    setSelectedDate(dateStr)
    // If this date doesn't exist yet in overrides, add it with a default window
    setOverrides((prev) => {
      if (prev.has(dateStr)) return prev
      const next = new Map(prev)
      next.set(dateStr, [{ start_time: '09:00', end_time: '17:00' }])
      return next
    })
    setCalendarOpen(false)
  }, [])

  const addOverrideWindow = useCallback((dateStr: string) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      const ranges = [...(next.get(dateStr) ?? [])]
      ranges.push({ start_time: '09:00', end_time: '17:00' })
      next.set(dateStr, ranges)
      return next
    })
  }, [])

  const removeOverrideWindow = useCallback((dateStr: string, index: number) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      const ranges = [...(next.get(dateStr) ?? [])]
      ranges.splice(index, 1)
      next.set(dateStr, ranges)
      return next
    })
  }, [])

  const updateOverrideField = useCallback(
    (dateStr: string, index: number, field: 'start_time' | 'end_time', value: string) => {
      setOverrides((prev) => {
        const next = new Map(prev)
        const ranges = [...(next.get(dateStr) ?? [])]
        ranges[index] = { ...ranges[index], [field]: value }
        next.set(dateStr, ranges)
        return next
      })
    },
    []
  )

  const handleSaveOverride = useCallback((dateStr: string) => {
    const windows: TimeWindow[] = overrides.get(dateStr) ?? []

    // Validate overlaps (empty is valid — means "unavailable")
    if (windows.length > 0) {
      const result = validateNoOverlap(windows)
      if (!result.valid) {
        toast.error(result.error!)
        return
      }
    }

    startTransition(async () => {
      const result = await saveOverrides(dateStr, windows)
      if (result.error) {
        toast.error(`Failed to save override: ${result.error}`)
      } else {
        const label = windows.length === 0
          ? 'Marked as unavailable'
          : `Saved ${windows.length} window${windows.length !== 1 ? 's' : ''}`
        toast.success(`${label} for ${format(parseDateString(dateStr), 'MMM d, yyyy')}`)
      }
    })
  }, [overrides, startTransition])

  const handleRevertToRecurring = useCallback((dateStr: string) => {
    startTransition(async () => {
      const result = await deleteOverridesForDate(dateStr)
      if (result.error) {
        toast.error(`Failed to revert: ${result.error}`)
      } else {
        setOverrides((prev) => {
          const next = new Map(prev)
          next.delete(dateStr)
          return next
        })
        if (selectedDate === dateStr) setSelectedDate(null)
        toast.success(`Reverted ${format(parseDateString(dateStr), 'MMM d, yyyy')} to recurring schedule`)
      }
    })
  }, [selectedDate, startTransition])

  const handleMarkUnavailable = useCallback((dateStr: string) => {
    // Set windows to empty array locally, then save
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(dateStr, [])
      return next
    })
    startTransition(async () => {
      const result = await saveOverrides(dateStr, [])
      if (result.error) {
        toast.error(`Failed to mark unavailable: ${result.error}`)
      } else {
        toast.success(`Marked ${format(parseDateString(dateStr), 'MMM d, yyyy')} as unavailable`)
      }
    })
  }, [startTransition])

  // ── Save handler ───────────────────────────────────────────────────

  function handleSave() {
    // Validate per-day overlaps
    for (let day = 0; day < 7; day++) {
      const windows: TimeWindow[] = schedule.get(day) ?? []
      if (windows.length === 0) continue
      const result = validateNoOverlap(windows)
      if (!result.valid) {
        toast.error(`${DAYS[day]}: ${result.error}`)
        return
      }
    }

    // Flat-map all windows into submission format
    const slots: Array<{ day_of_week: number; start_time: string; end_time: string }> = []
    for (let day = 0; day < 7; day++) {
      for (const range of schedule.get(day) ?? []) {
        slots.push({
          day_of_week: day,
          start_time: range.start_time,
          end_time: range.end_time,
        })
      }
    }

    startTransition(async () => {
      const result = await updateAvailability(slots)
      if (result.error) {
        toast.error(`Failed to save: ${result.error}`)
      } else {
        toast.success(
          `Availability saved — ${slots.length} window${slots.length !== 1 ? 's' : ''} across all days`
        )
      }
    })
  }

  // ── Total window count ─────────────────────────────────────────────

  const totalWindows = useMemo(() => {
    let count = 0
    for (const ranges of schedule.values()) count += ranges.length
    return count
  }, [schedule])

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold">Availability</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set your recurring weekly availability. Add multiple time windows per
          day with 5-minute precision.
        </p>
      </div>

      <Tabs.Root defaultValue="weekly">
        <Tabs.List className="flex border-b border-border">
          <Tabs.Trigger
            value="weekly"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition-colors"
          >
            Weekly Schedule
          </Tabs.Trigger>
          <Tabs.Trigger
            value="overrides"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground hover:text-foreground transition-colors"
          >
            Specific Dates
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="weekly" className="mt-6 space-y-6">
          {DAYS.map((dayName, dayIndex) => {
            const ranges = schedule.get(dayIndex) ?? []
            return (
              <DaySection
                key={dayIndex}
                dayName={dayName}
                dayShort={DAY_SHORT[dayIndex]}
                dayIndex={dayIndex}
                ranges={ranges}
                hourGroups={hourGroups}
                onAdd={addWindow}
                onRemove={removeWindow}
                onUpdate={updateWindowField}
              />
            )
          })}
        </Tabs.Content>

        <Tabs.Content value="overrides" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {/* Date picker */}
              <div className="space-y-3 min-w-[220px]">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal gap-2">
                      <CalendarIcon className="size-4" />
                      Pick a date
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate ? parseDateString(selectedDate) : undefined}
                      onSelect={(date) => date && selectOrAddDate(date)}
                      disabled={{ before: new Date() }}
                    />
                  </PopoverContent>
                </Popover>

                {/* List of override dates */}
                {overrideDates.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Override dates</p>
                    {overrideDates.map((dateStr) => {
                      const windows = overrides.get(dateStr) ?? []
                      const isSelected = selectedDate === dateStr
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <span className="font-medium">
                            {format(parseDateString(dateStr), 'MMM d, yyyy')}
                          </span>
                          <span className={`block text-xs ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {windows.length === 0
                              ? 'Unavailable'
                              : `${windows.length} window${windows.length !== 1 ? 's' : ''}`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Per-date editor */}
              <div className="flex-1 min-h-[200px]">
                {selectedDate ? (
                  <OverrideDateEditor
                    dateStr={selectedDate}
                    windows={overrides.get(selectedDate) ?? []}
                    hourGroups={hourGroups}
                    isPending={isPending}
                    onAddWindow={addOverrideWindow}
                    onRemoveWindow={removeOverrideWindow}
                    onUpdateField={updateOverrideField}
                    onSave={handleSaveOverride}
                    onRevert={handleRevertToRecurring}
                    onMarkUnavailable={handleMarkUnavailable}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                    Select a date to set custom availability
                  </div>
                )}
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {totalWindows} window{totalWindows !== 1 ? 's' : ''} total
        </p>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Availability'}
        </Button>
      </div>
    </div>
  )
}

// ── Override Date Editor sub-component ─────────────────────────────────

interface OverrideDateEditorProps {
  dateStr: string
  windows: TimeRange[]
  hourGroups: HourGroup[]
  isPending: boolean
  onAddWindow: (dateStr: string) => void
  onRemoveWindow: (dateStr: string, index: number) => void
  onUpdateField: (dateStr: string, index: number, field: 'start_time' | 'end_time', value: string) => void
  onSave: (dateStr: string) => void
  onRevert: (dateStr: string) => void
  onMarkUnavailable: (dateStr: string) => void
}

function OverrideDateEditor({
  dateStr,
  windows,
  hourGroups,
  isPending,
  onAddWindow,
  onRemoveWindow,
  onUpdateField,
  onSave,
  onRevert,
  onMarkUnavailable,
}: OverrideDateEditorProps) {
  return (
    <div className="space-y-4 border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {format(parseDateString(dateStr), 'EEEE, MMMM d, yyyy')}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRevert(dateStr)}
            disabled={isPending}
            className="text-xs gap-1 text-muted-foreground hover:text-destructive"
          >
            <Undo2 className="size-3.5" />
            Revert to recurring
          </Button>
        </div>
      </div>

      {windows.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-1">
          Marked as unavailable — no time windows for this date.
        </p>
      ) : (
        <div className="space-y-2">
          {windows.map((range, rangeIndex) => (
            <div key={`${dateStr}-${rangeIndex}`} className="flex items-center gap-2">
              <TimeSelect
                value={range.start_time}
                hourGroups={hourGroups}
                onValueChange={(v) => onUpdateField(dateStr, rangeIndex, 'start_time', v)}
                ariaLabel={`Override start time for window ${rangeIndex + 1}`}
              />
              <span className="text-sm text-muted-foreground">to</span>
              <TimeSelect
                value={range.end_time}
                hourGroups={hourGroups}
                onValueChange={(v) => onUpdateField(dateStr, rangeIndex, 'end_time', v)}
                ariaLabel={`Override end time for window ${rangeIndex + 1}`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveWindow(dateStr, rangeIndex)}
                className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                aria-label={`Remove override window ${rangeIndex + 1}`}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddWindow(dateStr)}
          className="text-xs gap-1"
        >
          <Plus className="size-3.5" />
          Add time window
        </Button>
        {windows.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkUnavailable(dateStr)}
            disabled={isPending}
            className="text-xs text-muted-foreground"
          >
            Mark as unavailable
          </Button>
        )}
      </div>

      <div className="flex justify-end border-t border-border pt-3">
        <Button
          size="sm"
          onClick={() => onSave(dateStr)}
          disabled={isPending}
        >
          {isPending ? 'Saving...' : 'Save Override'}
        </Button>
      </div>
    </div>
  )
}

// ── Day Section sub-component ──────────────────────────────────────────

interface DaySectionProps {
  dayName: string
  dayShort: string
  dayIndex: number
  ranges: TimeRange[]
  hourGroups: HourGroup[]
  onAdd: (day: number) => void
  onRemove: (day: number, index: number) => void
  onUpdate: (
    day: number,
    index: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => void
}

function DaySection({
  dayName,
  dayShort,
  dayIndex,
  ranges,
  hourGroups,
  onAdd,
  onRemove,
  onUpdate,
}: DaySectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{dayName}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAdd(dayIndex)}
          className="text-xs gap-1"
        >
          <Plus className="size-3.5" />
          Add time window
        </Button>
      </div>

      {ranges.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-1">Unavailable</p>
      ) : (
        <div className="space-y-2">
          {ranges.map((range, rangeIndex) => (
            <TimeRangeRow
              key={`${dayIndex}-${rangeIndex}`}
              dayIndex={dayIndex}
              rangeIndex={rangeIndex}
              startTime={range.start_time}
              endTime={range.end_time}
              hourGroups={hourGroups}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Time Range Row sub-component ───────────────────────────────────────

interface TimeRangeRowProps {
  dayIndex: number
  rangeIndex: number
  startTime: string
  endTime: string
  hourGroups: HourGroup[]
  onUpdate: (
    day: number,
    index: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => void
  onRemove: (day: number, index: number) => void
}

function TimeRangeRow({
  dayIndex,
  rangeIndex,
  startTime,
  endTime,
  hourGroups,
  onUpdate,
  onRemove,
}: TimeRangeRowProps) {
  return (
    <div className="flex items-center gap-2">
      <TimeSelect
        value={startTime}
        hourGroups={hourGroups}
        onValueChange={(v) => onUpdate(dayIndex, rangeIndex, 'start_time', v)}
        ariaLabel={`Start time for window ${rangeIndex + 1}`}
      />
      <span className="text-sm text-muted-foreground">to</span>
      <TimeSelect
        value={endTime}
        hourGroups={hourGroups}
        onValueChange={(v) => onUpdate(dayIndex, rangeIndex, 'end_time', v)}
        ariaLabel={`End time for window ${rangeIndex + 1}`}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(dayIndex, rangeIndex)}
        className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
        aria-label={`Remove window ${rangeIndex + 1}`}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

// ── Time Select sub-component ──────────────────────────────────────────

interface TimeSelectProps {
  value: string
  hourGroups: HourGroup[]
  onValueChange: (value: string) => void
  ariaLabel: string
}

function TimeSelect({
  value,
  hourGroups,
  onValueChange,
  ariaLabel,
}: TimeSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[130px]" aria-label={ariaLabel}>
        <SelectValue>{formatTimeLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {hourGroups.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {formatTimeLabel(opt)}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
