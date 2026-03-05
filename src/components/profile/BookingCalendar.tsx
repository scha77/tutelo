'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Globe } from 'lucide-react'
import { formatInTimeZone, toDate } from 'date-fns-tz'
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  startOfToday,
  format,
} from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface AvailabilitySlot {
  id: string
  teacher_id: string
  day_of_week: number
  start_time: string // DB returns "HH:MM:SS"
  end_time: string
}

interface TimeSlot {
  slotId: string
  startDisplay: string
  endDisplay: string
  startRaw: string // "HH:MM" for sorting
}

interface BookingCalendarProps {
  slots: AvailabilitySlot[]
  teacherTimezone: string
  teacherName: string
  accentColor: string
}

const DAY_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function getSlotsForDate(
  date: Date,
  slots: AvailabilitySlot[],
  teacherTimezone: string,
  visitorTimezone: string
): TimeSlot[] {
  const dayOfWeek = date.getDay()
  const matching = slots.filter((s) => s.day_of_week === dayOfWeek)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return matching
    .map((slot) => {
      const startRaw = slot.start_time.slice(0, 5)
      const endRaw = slot.end_time.slice(0, 5)
      const startDate = toDate(`${year}-${month}-${day}T${startRaw}:00`, { timeZone: teacherTimezone })
      const endDate = toDate(`${year}-${month}-${day}T${endRaw}:00`, { timeZone: teacherTimezone })
      return {
        slotId: slot.id,
        startDisplay: formatInTimeZone(startDate, visitorTimezone, 'h:mm a'),
        endDisplay: formatInTimeZone(endDate, visitorTimezone, 'h:mm a'),
        startRaw,
      }
    })
    .sort((a, b) => a.startRaw.localeCompare(b.startRaw))
}

export function BookingCalendar({
  slots,
  teacherTimezone,
  teacherName,
  accentColor,
}: BookingCalendarProps) {
  const today = startOfToday()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [step, setStep] = useState<'calendar' | 'form'>('calendar')
  const [form, setForm] = useState({ name: '', email: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const visitorTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return teacherTimezone
    }
  }, [teacherTimezone])

  const availableDays = useMemo(
    () => new Set(slots.map((s) => s.day_of_week)),
    [slots]
  )

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    })
  }, [currentMonth])

  const timeSlotsForDay = useMemo(() => {
    if (!selectedDate) return []
    return getSlotsForDate(selectedDate, slots, teacherTimezone, visitorTimezone)
  }, [selectedDate, slots, teacherTimezone, visitorTimezone])

  function isAvailable(date: Date) {
    return !isBefore(date, today) && availableDays.has(date.getDay())
  }

  function handleDateClick(date: Date) {
    if (!isAvailable(date)) return
    setSelectedDate(date)
    setSelectedSlot(null)
    setStep('calendar')
  }

  function handleSlotClick(slot: TimeSlot) {
    setSelectedSlot(slot)
    setStep('form')
  }

  function handleBack() {
    setStep('calendar')
    setSelectedSlot(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    // Phase 2 will wire this to the booking request API
    await new Promise((r) => setTimeout(r, 600))
    setSubmitting(false)
    toast.success("Request sent! You'll hear back shortly.", {
      description: `${teacherName} will confirm your session soon.`,
    })
    setStep('calendar')
    setSelectedDate(null)
    setSelectedSlot(null)
    setForm({ name: '', email: '', notes: '' })
  }

  const firstName = teacherName.split(' ')[0]
  const timezoneLabel = visitorTimezone.replace(/_/g, ' ')

  if (slots.length === 0) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="text-2xl font-semibold mb-2">Book a Session</h2>
        <p className="text-muted-foreground">
          {firstName} hasn&apos;t set availability yet. Check back soon.
        </p>
      </section>
    )
  }

  return (
    <section id="booking" className="mx-auto max-w-4xl px-4 py-8">
      <h2 className="text-2xl font-semibold mb-1">Book a Session</h2>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Globe className="h-4 w-4 shrink-0" />
        <span>
          Time zone:{' '}
          <span className="font-medium text-foreground">{timezoneLabel}</span>
        </span>
      </div>

      <div className="border rounded-xl overflow-hidden shadow-sm">
        {step === 'calendar' ? (
          <div className="flex flex-col md:flex-row">
            {/* ── Calendar ── */}
            <div className={`flex-1 p-6 ${selectedDate ? 'md:border-r' : ''}`}>
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="font-semibold text-base">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_HEADERS.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-medium text-muted-foreground py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Date grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((date) => {
                  const inMonth = date.getMonth() === currentMonth.getMonth()
                  const available = isAvailable(date)
                  const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
                  const isToday = isSameDay(date, today)

                  return (
                    <div
                      key={date.toISOString()}
                      className="flex items-center justify-center p-0.5"
                    >
                      <button
                        onClick={() => handleDateClick(date)}
                        disabled={!available}
                        className={[
                          'h-9 w-9 rounded-full text-sm transition-all select-none',
                          !inMonth && 'opacity-30',
                          isSelected
                            ? 'font-bold text-white shadow'
                            : available
                            ? 'font-semibold hover:bg-muted'
                            : 'text-muted-foreground cursor-default',
                          isToday && !isSelected
                            ? 'ring-1 ring-inset ring-current'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={isSelected ? { backgroundColor: accentColor } : undefined}
                      >
                        {format(date, 'd')}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Time slots panel ── */}
            {selectedDate && (
              <div className="w-full md:w-64 border-t md:border-t-0 p-6 bg-muted/20">
                <h3 className="font-semibold mb-4 text-sm">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </h3>
                {timeSlotsForDay.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No times available for this day.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {timeSlotsForDay.map((slot) => (
                      <TimeSlotButton
                        key={slot.slotId}
                        slot={slot}
                        accentColor={accentColor}
                        onClick={() => handleSlotClick(slot)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── Booking form ── */
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-6 py-4">
              <button
                onClick={handleBack}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                aria-label="Back to calendar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm text-muted-foreground leading-tight">
                <span className="font-medium text-foreground">
                  {selectedDate && format(selectedDate, 'EEEE, MMMM d')}
                </span>
                {selectedSlot && (
                  <span>
                    {' '}
                    &middot; {selectedSlot.startDisplay} – {selectedSlot.endDisplay}
                  </span>
                )}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Jane Smith"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="jane@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">
                  Notes for {firstName}{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="What would you like to work on? Any subjects, grade level, or goals to share…"
                  className="min-h-[100px]"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="w-full font-semibold"
                style={{ backgroundColor: accentColor, color: 'white' }}
              >
                {submitting ? 'Sending…' : 'Request Session'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </section>
  )
}

// Separate component to cleanly handle hover state
function TimeSlotButton({
  slot,
  accentColor,
  onClick,
}: {
  slot: TimeSlot
  accentColor: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full rounded-lg border-2 py-2.5 px-4 text-center text-sm font-semibold transition-colors"
      style={{
        borderColor: accentColor,
        backgroundColor: hovered ? accentColor : 'transparent',
        color: hovered ? 'white' : accentColor,
      }}
    >
      {slot.startDisplay}
    </button>
  )
}
