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

interface RecurringPaymentFailedEmailProps {
  recipientFirstName: string
  studentName: string
  bookingDate: string // YYYY-MM-DD
  startTime: string // HH:MM or HH:MM:SS
  teacherName: string
  isTeacher: boolean
  accountUrl?: string // parent-only — link to update payment method
  appUrl: string
}

export function RecurringPaymentFailedEmail({
  recipientFirstName,
  studentName,
  bookingDate,
  startTime,
  teacherName,
  isTeacher,
  accountUrl,
  appUrl,
}: RecurringPaymentFailedEmailProps) {
  // Adding T12:00:00 prevents timezone-shift on date parsing (same as CancellationEmail)
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
      <Preview>
        {isTeacher
          ? `Payment failed for ${studentName}'s session on ${formattedDate}`
          : `Your payment for ${studentName}'s session on ${formattedDate} failed`}
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
              The automatic payment for {studentName}&apos;s session on {formattedDate} at{' '}
              {timeDisplay} failed. We&apos;ll notify you if it&apos;s resolved.
            </Text>
          ) : (
            <Text style={{ fontSize: '16px', color: '#111827' }}>
              Your payment for {studentName}&apos;s session with {teacherName} on {formattedDate}{' '}
              at {timeDisplay} failed. Please update your payment method to keep this session.
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
              <strong>Date:</strong> {formattedDate}
            </Text>
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Time:</strong> {timeDisplay}
            </Text>
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Teacher:</strong> {teacherName}
            </Text>
          </Section>

          {!isTeacher && accountUrl && (
            <Section style={{ textAlign: 'center', margin: '20px 0' }}>
              <Link
                href={accountUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Update Payment Method
              </Link>
            </Section>
          )}

          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Tutelo &middot;{' '}
            <a href={appUrl} style={{ color: '#9ca3af' }}>
              tutelo.app
            </a>{' '}
            &middot;{' '}
            {isTeacher
              ? "You're receiving this because an automatic payment for a recurring session through your Tutelo page failed."
              : "You're receiving this because an automatic payment for a recurring tutoring session you booked through Tutelo failed."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
