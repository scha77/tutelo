'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Globe, CheckCircle2, Phone } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InlineAuthForm } from '@/components/auth/InlineAuthForm'
import { PaymentStep } from '@/components/profile/PaymentStep'
import { createClient } from '@/lib/supabase/client'
import { getSlotsForDate } from '@/lib/utils/slots'
import type { AvailabilitySlot, TimeSlot } from '@/lib/utils/slots'
import type { BookingResult } from '@/actions/bookings'

interface BookingCalendarProps {
  slots: AvailabilitySlot[]
  overrides: Array<{ specific_date: string; start_time: string; end_time: string }>
  teacherTimezone: string
  teacherName: string
  accentColor: string
  subjects: string[]
  teacherId: string
  submitAction: (data: unknown) => Promise<BookingResult>
  // Direct booking path (Phase 4):
  stripeConnected: boolean        // true = direct booking path; false = deferred (no change)
  teacherStripeAccountId?: string // passed through to create-intent fetch
}

const DAY_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export function BookingCalendar({
  slots,
  overrides,
  teacherTimezone,
  teacherName,
  accentColor,
  subjects,
  teacherId,
  submitAction,
  stripeConnected,
  teacherStripeAccountId,
}: BookingCalendarProps) {
  const searchParams = useSearchParams()
  const today = startOfToday()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [step, setStep] = useState<'calendar' | 'form' | 'success' | 'error' | 'auth' | 'payment'>('calendar')
  const [form, setForm] = useState({
    name: '',
    subject: subjects.length === 1 ? subjects[0] : (searchParams.get('subject') ?? ''),
    email: '',
    notes: '',
    phone: '',
    smsOptIn: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [bookingConfirmation, setBookingConfirmation] = useState<{
    date: string
    time: string
    subject: string
    email: string
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Direct booking payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [creatingIntent, setCreatingIntent] = useState(false)

  const supabase = createClient()

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

  // Set of YYYY-MM-DD strings that have override rows — used to make
  // those dates selectable even if no recurring slot exists for that day-of-week
  const overrideDatesSet = useMemo(
    () => new Set(overrides.map((o) => o.specific_date)),
    [overrides]
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
    return getSlotsForDate(selectedDate, slots, teacherTimezone, visitorTimezone, overrides)
  }, [selectedDate, slots, teacherTimezone, visitorTimezone, overrides])

  function isAvailable(date: Date) {
    if (isBefore(date, today)) return false
    if (availableDays.has(date.getDay())) return true
    // Also selectable if an override exists for this specific date
    return overrideDatesSet.has(format(date, 'yyyy-MM-dd'))
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
      phone: '',
      smsOptIn: false,
    })
    setBookingConfirmation(null)
    setErrorMessage(null)
    setClientSecret(null)
    setPaymentError(null)
  }

  async function createPaymentIntent() {
    setCreatingIntent(true)
    const res = await fetch('/api/direct-booking/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId,
        bookingDate: format(selectedDate!, 'yyyy-MM-dd'),
        startTime: selectedSlot!.startRaw,
        endTime: selectedSlot!.endRaw,
        studentName: form.name,
        subject: form.subject,
        notes: form.notes || undefined,
        parentPhone: form.phone.trim() || undefined,
        parentSmsOptIn: form.phone.trim() ? form.smsOptIn : false,
      }),
    })
    setCreatingIntent(false)
    if (!res.ok) {
      if (res.status === 409) {
        setErrorMessage('This time slot was just booked. Please choose another.')
      } else if (res.status === 400) {
        const text = await res.text()
        setErrorMessage(text === 'Invalid session amount'
          ? 'This teacher hasn\'t set their rate yet. Please try again later.'
          : 'Could not initialize payment. Please try again.')
      } else {
        setErrorMessage('Could not initialize payment. Please try again.')
      }
      setStep('error')
      return
    }
    const { clientSecret: secret } = await res.json()
    setClientSecret(secret)
    setStep('payment')
  }

  async function handleAuthSuccess() {
    await createPaymentIntent()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!stripeConnected) {
      // Deferred path (Phase 3) — unchanged behavior
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
        parent_phone: form.phone.trim() || undefined,
        parent_sms_opt_in: form.phone.trim() ? form.smsOptIn : false,
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
      return
    }

    // Direct booking path (stripeConnected = true)
    // Check if user is already authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Not authenticated — show inline auth step
      setStep('auth')
    } else {
      // Already authenticated — go straight to payment
      await createPaymentIntent()
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
            <h3 className="text-xl font-semibold">
              {stripeConnected ? 'Session confirmed!' : 'Session requested!'}
            </h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {bookingConfirmation.date} at {bookingConfirmation.time}
              </p>
              <p>{bookingConfirmation.subject}</p>
              {!stripeConnected && (
                <p className="mt-2">
                  We&apos;ll email{' '}
                  <span className="font-medium text-foreground">
                    {bookingConfirmation.email}
                  </span>{' '}
                  when confirmed.
                </p>
              )}
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
        ) : step === 'auth' ? (
          /* ── Auth step (direct booking only) ── */
          <div>
            <div className="flex items-center gap-3 border-b px-6 py-4">
              <button
                onClick={() => setStep('form')}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                aria-label="Back to form"
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
            <InlineAuthForm onAuthSuccess={handleAuthSuccess} accentColor={accentColor} />
          </div>
        ) : step === 'payment' && clientSecret ? (
          /* ── Payment step (direct booking only) ── */
          <div>
            <div className="flex items-center gap-3 border-b px-6 py-4">
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
            {paymentError && (
              <p className="px-6 pt-4 text-sm text-destructive font-medium">{paymentError}</p>
            )}
            {creatingIntent && (
              <p className="px-6 pt-4 text-sm text-muted-foreground">Preparing payment…</p>
            )}
            <PaymentStep
              clientSecret={clientSecret}
              accentColor={accentColor}
              onBookAnother={handleBookAnother}
              onSuccess={() => {
                setBookingConfirmation({
                  date: format(selectedDate!, 'EEEE, MMMM d'),
                  time: selectedSlot!.startDisplay,
                  subject: form.subject,
                  email: form.email,
                })
                setStep('success')
              }}
              onError={(msg) => setPaymentError(msg)}
            />
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

              {/* Phone — optional */}
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  US phone number{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="(555) 555-1234"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* SMS consent — only shown when phone has content */}
              {form.phone.trim().length > 0 && (
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="sms-consent"
                    checked={form.smsOptIn}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, smsOptIn: checked === true }))
                    }
                  />
                  <label
                    htmlFor="sms-consent"
                    className="text-sm leading-tight cursor-pointer text-muted-foreground"
                  >
                    Send me text message reminders about this session. Msg &amp; data rates may apply. Reply STOP to opt out.
                  </label>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={submitting || creatingIntent || (subjects.length > 1 && !form.subject)}
                className="w-full font-semibold"
                style={{ backgroundColor: accentColor, color: 'white' }}
              >
                {submitting || creatingIntent
                  ? 'Please wait…'
                  : stripeConnected
                  ? 'Continue to Payment'
                  : 'Request Session'}
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
