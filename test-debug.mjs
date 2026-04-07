import { z } from 'zod';

const DirectBookingIntentSchema = z
  .object({
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
    childId: z.string().uuid().optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  });

const TEACHER_ID = '11111111-1111-1111-1111-111111111111';
const SESSION_TYPE_ID = '22222222-2222-2222-2222-222222222222';

const testData = {
    teacherId: TEACHER_ID,
    bookingDate: '2025-06-15',
    startTime: '14:00',
    endTime: '15:00',
    studentName: 'Test Student',
    subject: 'Math',
    notes: '',
    sessionTypeId: SESSION_TYPE_ID,
};

const parsed = DirectBookingIntentSchema.safeParse(testData);
console.log('parsed.success:', parsed.success);
if (!parsed.success) {
  console.log('errors:', JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
} else {
  console.log('data:', parsed.data);
}
