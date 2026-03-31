---
estimated_steps: 14
estimated_files: 2
skills_used: []
---

# T04: Create RecurringBookingConfirmationEmail and wire into create-recurring route

Build the React Email template for recurring booking confirmations that shows the full series schedule (all session dates, skipped dates with reasons, frequency, total sessions). Then wire it into the create-recurring API route so confirmation emails are sent on successful booking creation.

## Steps

1. Create `src/emails/RecurringBookingConfirmationEmail.tsx`:
   - Follow existing BookingConfirmationEmail.tsx pattern (React Email components: Html, Head, Preview, Body, Container, Section, Text, Hr, Link)
   - Props: recipientFirstName, teacherName, studentName, subject, frequency ('weekly'|'biweekly'), sessionDates (string[] — YYYY-MM-DD), skippedDates ({date: string, reason: string}[]), startTime (HH:MM), isTeacher (boolean), accountUrl (optional)
   - Preview text: 'Your recurring tutoring schedule is confirmed — N sessions starting [date]'
   - Body: greeting, summary line ('You've booked N [weekly/biweekly] tutoring sessions...'), numbered list of session dates formatted as 'Tuesday, April 7, 2026 at 4:00 PM', if skippedDates.length > 0: section titled 'Dates skipped' with each date and reason, note about automatic payment for future sessions, link to account/sessions if accountUrl provided
   - Export as named export

2. Wire email sending into `src/app/api/direct-booking/create-recurring/route.ts`:
   - Import Resend and the new email template
   - After successful PI creation, send confirmation email to parent with session details
   - Send notification email to teacher (reuse existing BookingNotificationEmail or create a brief notification — use the simpler approach of including recurring info in the existing notification pattern)
   - Email sending is fire-and-forget (don't fail the booking if email fails) — wrap in try/catch with console.error

3. Verify TypeScript compilation and build pass with the new email template.

## Inputs

- ``src/emails/BookingConfirmationEmail.tsx` — existing email template pattern to follow`
- ``src/app/api/direct-booking/create-recurring/route.ts` — route to wire email sending into`

## Expected Output

- ``src/emails/RecurringBookingConfirmationEmail.tsx` — recurring series confirmation email template`
- ``src/app/api/direct-booking/create-recurring/route.ts` — updated with email sending after successful booking`

## Verification

npx tsc --noEmit && npm run build
