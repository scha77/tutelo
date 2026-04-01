import { z } from 'zod'

export const BookingRequestSchema = z.object({
  teacherId: z.string().uuid(),
  studentName: z.string().min(1, 'Student name required').max(100),
  subject: z.string().min(1, 'Subject required'),
  email: z.string().email('Valid email required'),
  notes: z.string().max(1000).optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  parent_phone: z.string().optional(),
  parent_sms_opt_in: z.boolean().optional().default(false),
  session_type_id: z.string().uuid().optional(),
  child_id: z.string().uuid().optional(),
})

export type BookingRequestData = z.infer<typeof BookingRequestSchema>

export const RecurringBookingSchema = z.object({
  teacherId: z.string().uuid(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  studentName: z.string().min(1, 'Student name required').max(100),
  subject: z.string().min(1, 'Subject required'),
  notes: z.string().max(1000).optional(),
  parentPhone: z.string().optional(),
  parentSmsOptIn: z.boolean().optional().default(false),
  sessionTypeId: z.string().uuid().optional(),
  frequency: z.enum(['weekly', 'biweekly']),
  totalSessions: z.number().int().min(2).max(26),
  childId: z.string().uuid().optional(),
})

export type RecurringBookingData = z.infer<typeof RecurringBookingSchema>
