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

interface CancellationEmailProps {
  recipientFirstName: string
  studentName: string
  bookingDate: string // YYYY-MM-DD
  startTime: string // HH:MM or HH:MM:SS
  isTeacher: boolean
  appUrl: string
}

export function CancellationEmail({
  recipientFirstName,
  studentName,
  bookingDate,
  startTime,
  isTeacher,
  appUrl,
}: CancellationEmailProps) {
  // Adding T12:00:00 prevents timezone-shift on date parsing
  const formattedDate = new Date(bookingDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const timeDisplay = startTime.slice(0, 5)

  return (
    <Html>
      <Head />
      <Preview>Your booking has been cancelled</Preview>
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

          <Text style={{ fontSize: '16px', color: '#111827' }}>
            Unfortunately, this booking has been cancelled.
          </Text>

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
              <strong>Date:</strong> {formattedDate}
            </Text>
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Time:</strong> {timeDisplay}
            </Text>
          </Section>

          {isTeacher ? (
            <Text style={{ fontSize: '15px', color: '#111827' }}>
              This booking expired before payment was collected. If you&apos;d like to reconnect
              with this family, you can reach out to them directly through your Tutelo dashboard.
            </Text>
          ) : (
            <Text style={{ fontSize: '15px', color: '#111827' }}>
              We&apos;re sorry this session didn&apos;t work out. You can find another tutor at{' '}
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
              ? "You're receiving this because a booking through your Tutelo page was cancelled."
              : "You're receiving this because a tutoring session you booked through Tutelo was cancelled."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
