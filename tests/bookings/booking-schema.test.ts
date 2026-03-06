import { describe, it, expect } from 'vitest'
import { BookingRequestSchema } from '@/lib/schemas/booking'

describe('BookingRequestSchema', () => {
  const validPayload = {
    teacherId: '550e8400-e29b-41d4-a716-446655440000',
    studentName: 'Alex Johnson',
    subject: 'Math',
    email: 'parent@example.com',
    notes: 'Struggling with fractions',
    bookingDate: '2026-04-15',
    startTime: '14:00',
    endTime: '15:00',
  }

  it('accepts a valid payload', () => {
    const result = BookingRequestSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('fails when studentName is missing', () => {
    const result = BookingRequestSchema.safeParse({
      ...validPayload,
      studentName: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message)
      expect(msgs).toContain('Student name required')
    }
  })

  it('fails when email is invalid', () => {
    const result = BookingRequestSchema.safeParse({
      ...validPayload,
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('fails when bookingDate does not match YYYY-MM-DD', () => {
    const result = BookingRequestSchema.safeParse({
      ...validPayload,
      bookingDate: '04/15/2026',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message)
      expect(msgs).toContain('Date must be YYYY-MM-DD')
    }
  })

  it('fails when startTime does not match HH:MM', () => {
    const result = BookingRequestSchema.safeParse({
      ...validPayload,
      startTime: '2:00 PM',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message)
      expect(msgs).toContain('Time must be HH:MM')
    }
  })

  it('accepts when notes is undefined (optional)', () => {
    const { notes: _notes, ...payloadWithoutNotes } = validPayload
    const result = BookingRequestSchema.safeParse(payloadWithoutNotes)
    expect(result.success).toBe(true)
  })
})
