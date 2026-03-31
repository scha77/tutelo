import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface RecurringBookingConfirmationEmailProps {
  recipientFirstName: string
  teacherName: string
  studentName: string
  subject: string
  frequency: 'weekly' | 'biweekly'
  sessionDates: string[] // YYYY-MM-DD
  skippedDates: { date: string; reason: string }[]
  startTime: string // HH:MM
  isTeacher: boolean
  accountUrl?: string
}

function formatSessionDate(dateStr: string, time: string): string {
  // T12:00:00 prevents timezone-shift on date parsing
  const date = new Date(dateStr + 'T12:00:00')
  const dayPart = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  // Convert HH:MM to 12-hour format
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  const timePart = `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`
  return `${dayPart} at ${timePart}`
}

function formatSkippedDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function RecurringBookingConfirmationEmail({
  recipientFirstName,
  teacherName,
  studentName,
  subject,
  frequency,
  sessionDates,
  skippedDates,
  startTime,
  isTeacher,
  accountUrl,
}: RecurringBookingConfirmationEmailProps) {
  const count = sessionDates.length
  const firstDateFormatted =
    sessionDates.length > 0 ? formatSessionDate(sessionDates[0], startTime) : ''
  const frequencyLabel = frequency === 'biweekly' ? 'biweekly' : 'weekly'

  return (
    <Html>
      <Head />
      <Preview>
        {`Your recurring tutoring schedule is confirmed — ${count} sessions starting ${sessionDates[0] ?? ''}`}
      </Preview>
      <Body
        style={{
          fontFamily: 'sans-serif',
          backgroundColor: '#f9fafb',
          margin: 0,
          padding: '40px 0',
        }}
      >
        <Container
          style={{
            maxWidth: '520px',
            margin: '0 auto',
            padding: '32px 24px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        >
          <Text style={{ fontSize: '16px', color: '#111827', marginBottom: '8px' }}>
            Hi {recipientFirstName},
          </Text>

          {isTeacher ? (
            <Text style={{ fontSize: '16px', color: '#111827' }}>
              A recurring {frequencyLabel} tutoring series with{' '}
              <strong>{studentName}</strong> has been booked — {count} sessions in{' '}
              <strong>{subject}</strong>. Payment for the first session has been authorized.
            </Text>
          ) : (
            <Text style={{ fontSize: '16px', color: '#111827' }}>
              You&apos;ve booked {count} {frequencyLabel} tutoring sessions for{' '}
              <strong>{studentName}</strong> with <strong>{teacherName}</strong> in{' '}
              <strong>{subject}</strong>.
            </Text>
          )}

          {/* Session dates list */}
          <Section
            style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              padding: '16px',
              margin: '20px 0',
            }}
          >
            <Text
              style={{
                margin: '0 0 8px 0',
                color: '#111827',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Session Schedule
            </Text>
            {sessionDates.map((date, i) => (
              <Text
                key={date}
                style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}
              >
                {i + 1}. {formatSessionDate(date, startTime)}
              </Text>
            ))}
          </Section>

          {/* Skipped dates section — only render if there are skipped dates */}
          {skippedDates.length > 0 && (
            <Section
              style={{
                backgroundColor: '#fef3c7',
                borderRadius: '6px',
                padding: '16px',
                margin: '20px 0',
              }}
            >
              <Text
                style={{
                  margin: '0 0 8px 0',
                  color: '#92400e',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Dates Skipped
              </Text>
              {skippedDates.map((s) => (
                <Text
                  key={s.date}
                  style={{ margin: '4px 0', color: '#92400e', fontSize: '14px' }}
                >
                  {formatSkippedDate(s.date)} — {s.reason}
                </Text>
              ))}
            </Section>
          )}

          {!isTeacher && (
            <Text style={{ fontSize: '15px', color: '#111827' }}>
              Payment for your first session will be captured when the teacher confirms.
              Future sessions in this series will be charged automatically to your saved card.
            </Text>
          )}

          {accountUrl && (
            <Section style={{ margin: '16px 0' }}>
              <Text style={{ fontSize: '15px', color: '#111827', marginBottom: '4px' }}>
                You can view and manage your upcoming sessions at any time:
              </Text>
              <Text style={{ fontSize: '15px', color: '#111827', margin: 0 }}>
                <Link href={accountUrl} style={{ color: '#2563eb' }}>
                  View my sessions
                </Link>
              </Text>
            </Section>
          )}

          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Tutelo &middot; tutelo.app &middot;{' '}
            {isTeacher
              ? "You're receiving this because a recurring booking was created through your Tutelo page."
              : "You're receiving this because you booked a recurring tutoring series through Tutelo."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
