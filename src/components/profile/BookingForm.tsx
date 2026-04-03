'use client'

import { ChevronLeft, Phone } from 'lucide-react'
import { format } from 'date-fns'
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
import type { TimeSlot } from '@/lib/utils/slots'

interface BookingFormProps {
  form: {
    name: string
    subject: string
    email: string
    notes: string
    phone: string
    smsOptIn: boolean
    childId: string | null
  }
  setForm: React.Dispatch<React.SetStateAction<BookingFormProps['form']>>
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
  creatingIntent: boolean
  firstName: string
  subjects: string[]
  hasSessionTypes: boolean
  children: { id: string; name: string; grade: string | null }[]
  childrenLoaded: boolean
  selectedDate: Date | null
  selectedSlot: TimeSlot | null
  selectedSessionType: { id: string; label: string; price: number; duration_minutes: number | null; sort_order: number } | null
  stripeConnected: boolean
  accentColor: string
  onBack: () => void
}

export function BookingForm({
  form,
  setForm,
  onSubmit,
  submitting,
  creatingIntent,
  firstName,
  subjects,
  hasSessionTypes,
  children,
  childrenLoaded,
  selectedDate,
  selectedSlot,
  selectedSessionType,
  stripeConnected,
  accentColor,
  onBack,
}: BookingFormProps) {
  return (
    <div>
      {/* Header with back button + date/time/session breadcrumb */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Back to calendar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm text-muted-foreground leading-tight flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">
            {selectedDate && format(selectedDate, 'EEEE, MMMM d')}
          </span>
          {selectedSlot && (
            <span>
              &middot; {selectedSlot.startDisplay} – {selectedSlot.endDisplay}
            </span>
          )}
          {selectedSessionType && (
            <>
              <span>&middot; ${Number(selectedSessionType.price).toFixed(0)}</span>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                  color: 'var(--accent)',
                }}
              >
                {selectedSessionType.label}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Form body — subtle bg treatment */}
      <form onSubmit={onSubmit} className="p-6 space-y-5 max-w-md bg-muted/5">
        {/* Student's name — child selector for logged-in parents with children */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Student&apos;s name</Label>
          {childrenLoaded && children.length > 0 ? (
            <>
              <Select
                value={form.childId ?? '__other__'}
                onValueChange={(value) => {
                  if (value === '__other__') {
                    setForm((f) => ({ ...f, childId: null, name: '' }))
                  } else {
                    const child = children.find((c) => c.id === value)
                    if (child) {
                      setForm((f) => ({ ...f, childId: child.id, name: child.name }))
                    }
                  }
                }}
              >
                <SelectTrigger id="child-select">
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}{child.grade ? ` (${child.grade})` : ''}
                    </SelectItem>
                  ))}
                  <SelectItem value="__other__">Someone else (type name)</SelectItem>
                </SelectContent>
              </Select>
              {/* Show text input when "Someone else" is selected */}
              {!form.childId && (
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Alex Johnson"
                  className="mt-1.5"
                />
              )}
            </>
          ) : (
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Alex Johnson"
            />
          )}
        </div>

        {/* Subject — shown only when teacher has multiple subjects AND no session types */}
        {subjects.length > 1 && !hasSessionTypes && (
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
          disabled={submitting || creatingIntent || (subjects.length > 1 && !hasSessionTypes && !form.subject)}
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
  )
}
