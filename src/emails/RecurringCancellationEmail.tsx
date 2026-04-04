import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface RecurringCancellationEmailProps {
  recipientFirstName: string
  teacherName: string
  studentName: string
  subject: string
  cancelledDates: string[] // YYYY-MM-DD[]
  startTime: string // HH:MM or HH:MM:SS
  isTeacher: boolean
  appUrl: string
}

export function RecurringCancellationEmail({
  recipientFirstName,
  teacherName,
  studentName,
  subject,
  cancelledDates,
  startTime,
  isTeacher,
  appUrl,
}: RecurringCancellationEmailProps) {
  const timeDisplay = startTime.slice(0, 5)

  const formattedDates = cancelledDates.map((d) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  )

  const previewText = isTeacher
    ? `The recurring series with ${studentName} has been cancelled`
    : 'Your recurring series has been cancelled'

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
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
              The recurring {subject} series with {studentName} has been cancelled.
            </Text>
          ) : (
            <Text style={{ fontSize: '16px', color: '#111827' }}>
              Your recurring {subject} series with {teacherName} has been cancelled.
            </Text>
          )}

          <Section
            style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              padding: '16px',
              margin: '20px 0',
            }}
          >
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Student:</strong> {studentName}
            </Text>
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Subject:</strong> {subject}
            </Text>
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Time:</strong> {timeDisplay}
            </Text>
            <Text style={{ margin: '4px 0 8px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Cancelled sessions ({cancelledDates.length}):</strong>
            </Text>
            {formattedDates.map((date, i) => (
              <Text key={i} style={{ margin: '2px 0 2px 12px', color: '#374151', fontSize: '14px' }}>
                • {date}
              </Text>
            ))}
          </Section>

          {isTeacher ? (
            <Text style={{ fontSize: '15px', color: '#111827' }}>
              These sessions have been removed from your schedule. If you&apos;d like to rebook,
              please reach out to the family directly through your Tutelo dashboard.
            </Text>
          ) : (
            <Text style={{ fontSize: '15px', color: '#111827' }}>
              Any payment authorizations for these sessions have been released. You can find
              another tutor at{' '}
              <a
                href={appUrl}
                style={{ color: '#2563eb', textDecoration: 'underline' }}
              >
                tutelo.app
              </a>
              .
            </Text>
          )}

          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Tutelo &middot;{' '}
            <a href={appUrl} style={{ color: '#9ca3af' }}>
              tutelo.app
            </a>{' '}
            &middot;{' '}
            {isTeacher
              ? "You're receiving this because a recurring series through your Tutelo page was cancelled."
              : "You're receiving this because a recurring tutoring series you booked through Tutelo was cancelled."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
