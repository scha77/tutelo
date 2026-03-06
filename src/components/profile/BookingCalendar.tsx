'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Globe, CheckCircle2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BookingResult } from '@/actions/bookings'

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
  startRaw: string // "HH:MM" — teacher-timezone time for DB storage
  endRaw: string   // "HH:MM" — teacher-timezone time for DB storage
}

interface BookingCalendarProps {
  slots: AvailabilitySlot[]
  teacherTimezone: string
  teacherName: string
  accentColor: string
  subjects: string[]
  teacherId: string
  submitAction: (data: unknown) => Promise<BookingResult>
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
  const now = new Date()

  return matching
    .flatMap((slot) => {
      const startRaw = slot.start_time.slice(0, 5)
      const endRaw = slot.end_time.slice(0, 5)
      const startDate = toDate(`${year}-${month}-${day}T${startRaw}:00`, { timeZone: teacherTimezone })
      if (startDate <= now) return [] // filter out past slots
      const endDate = toDate(`${year}-${month}-${day}T${endRaw}:00`, { timeZone: teacherTimezone })
      return [{
        slotId: slot.id,
        startDisplay: formatInTimeZone(startDate, visitorTimezone, 'h:mm a'),
        endDisplay: formatInTimeZone(endDate, visitorTimezone, 'h:mm a'),
        startRaw,
        endRaw,
      }]
    })
    .sort((a, b) => a.startRaw.localeCompare(b.startRaw))
}

export function BookingCalendar({
  slots,
  teacherTimezone,
  teacherName,
  accentColor,
  subjects,
  teacherId,
  submitAction,
}: BookingCalendarProps) {
  const today = startOfToday()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [step, setStep] = useState<'calendar' | 'form' | 'success' | 'error'>('calendar')
  const [form, setForm] = useState({
    name: '',
    subject: subjects.length === 1 ? subjects[0] : '',
    email: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [bookingConfirmation, setBookingConfirmation] = useState<{
    date: string
    time: string
    subject: string
    email: string
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  function handleBookAnother() {
    setStep('calendar')
    setSelectedDate(null)
    setSelectedSlot(null)
    setForm({
      name: '',
      subject: subjects.length === 1 ? subjects[0] : '',
      email: '',
      notes: '',
    })
    setBookingConfirmation(null)
    setErrorMessage(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await submitAction({
      teacherId,
      studentName: form.name,
      subject: form.subject,
      email: form.email,
      notes: form.notes || undefined,
      bookingDate: format(selectedDate!, 'yyyy-MM-dd'), // local calendar date, no UTC shift
      startTime: selectedSlot!.startRaw,   // teacher-timezone raw time, NOT display time
      endTime: selectedSlot!.endRaw,
    })
    setSubmitting(false)
    if (result.success) {
      setBookingConfirmation({
        date: format(selectedDate!, 'EEEE, MMMM d'),
        time: selectedSlot!.startDisplay,
        subject: form.subject,
        email: form.email,
      })
      setStep('success')
    } else if (result.error === 'slot_taken') {
      setErrorMessage('This time slot was just booked. Please choose another.')
      setStep('error')
    } else {
      setErrorMessage('Something went wrong. Please try again.')
      setStep('error')
    }
  }

  const firstName = teacherName.split(' ')[0]
  const timezoneLabel = useMemo(() => {
    try {
      const region = visitorTimezone.split('/')[0]
      const abbr = new Intl.DateTimeFormat('en', {
        timeZone: visitorTimezone,
        timeZoneName: 'short',
      })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value ?? visitorTimezone
      return `${region} - ${abbr}`
    } catch {
      return visitorTimezone.replace(/_/g, ' ')
    }
  }, [visitorTimezone])

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
    <section id="booking" className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="text-2xl font-semibold mb-1">Book a Session</h2>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Globe className="h-4 w-4 shrink-0" />
        <span>
          Time zone:{' '}
          <span className="font-medium text-foreground">{timezoneLabel}</span>
        </span>
      </div>

      <div className="border rounded-xl overflow-hidden shadow-sm">
        {step === 'success' && bookingConfirmation ? (
          /* ── Success state ── */
          <div className="p-8 flex flex-col items-center text-center space-y-4 max-w-md mx-auto">
            <CheckCircle2
              className="h-12 w-12"
              style={{ color: accentColor }}
            />
            <h3 className="text-xl font-semibold">Session requested!</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {bookingConfirmation.date} at {bookingConfirmation.time}
              </p>
              <p>{bookingConfirmation.subject}</p>
              <p className="mt-2">
                We&apos;ll email{' '}
                <span className="font-medium text-foreground">
                  {bookingConfirmation.email}
                </span>{' '}
                when confirmed.
              </p>
            </div>
            <button
              onClick={handleBookAnother}
              className="mt-2 text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Book another time
            </button>
          </div>
        ) : step === 'error' ? (
          /* ── Error state ── */
          <div className="p-8 flex flex-col items-center text-center space-y-4 max-w-md mx-auto">
            <p className="text-sm text-destructive font-medium">{errorMessage}</p>
            <Button
              variant="outline"
              onClick={() => {
                setErrorMessage(null)
                setStep('calendar')
              }}
            >
              ← Back to calendar
            </Button>
          </div>
        ) : step === 'calendar' ? (
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

            {/* Form — field order: Student's name → Subject (if visible) → Email → Notes */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-w-md">
              {/* Student's name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Student&apos;s name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Alex Johnson"
                />
              </div>

              {/* Subject — shown only when teacher has multiple subjects */}
              {subjects.length > 1 && (
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={form.subject}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, subject: value }))
                    }
                    required
                  >
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Email */}
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

              {/* Notes — optional */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">
                  Notes for {firstName}{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder={`Let ${firstName} know what grade level, what they're struggling with, and what you'd most like to focus on in the first session.`}
                  className="min-h-[100px]"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={submitting || (subjects.length > 1 && !form.subject)}
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
