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

interface BookingConfirmationEmailProps {
  recipientFirstName: string
  studentName: string
  subject: string
  bookingDate: string // YYYY-MM-DD
  startTime: string // HH:MM or HH:MM:SS
  teacherName: string
  isTeacher: boolean
  accountUrl?: string // When provided, render a "View your sessions" link for parent recipients
}

export function BookingConfirmationEmail({
  recipientFirstName,
  studentName,
  subject,
  bookingDate,
  startTime,
  teacherName,
  isTeacher,
  accountUrl,
}: BookingConfirmationEmailProps) {
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
      <Preview>Your session is confirmed — see you soon!</Preview>
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
              Your session with <strong>{studentName}</strong> is confirmed and payment has been
              authorized. Here are the details:
            </Text>
          ) : (
            <Text style={{ fontSize: '16px', color: '#111827' }}>
              Your session for <strong>{studentName}</strong> with{' '}
              <strong>{teacherName}</strong> is confirmed. Here are the details:
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
            {!isTeacher && (
              <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
                <strong>Teacher:</strong> {teacherName}
              </Text>
            )}
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Date:</strong> {formattedDate}
            </Text>
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Time:</strong> {timeDisplay}
            </Text>
          </Section>

          {!isTeacher && (
            <Text style={{ fontSize: '15px', color: '#111827' }}>
              You&apos;ll get a reminder 24 hours before your session.
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
              ? "You're receiving this because a booking was confirmed through your Tutelo page."
              : "You're receiving this because you booked a tutoring session through Tutelo."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
