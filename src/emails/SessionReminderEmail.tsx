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

interface SessionReminderEmailProps {
  recipientFirstName: string
  studentName: string
  subject: string
  bookingDate: string // YYYY-MM-DD
  startTime: string // HH:MM
  teacherName: string
  isTeacher: boolean
}

export function SessionReminderEmail({
  recipientFirstName,
  studentName,
  subject,
  bookingDate,
  startTime,
  teacherName,
  isTeacher,
}: SessionReminderEmailProps) {
  // Adding T12:00:00 prevents timezone-shift on date parsing
  const formattedDate = new Date(bookingDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Html>
      <Head />
      <Preview>Reminder: your tutoring session is tomorrow</Preview>
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
              Just a reminder that you have a tutoring session tomorrow.
            </Text>
          ) : (
            <Text style={{ fontSize: '16px', color: '#111827' }}>
              Just a reminder that {studentName} has a session with {teacherName} tomorrow.
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
              <strong>Date:</strong> {formattedDate}
            </Text>
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Time:</strong> {startTime}
            </Text>
            {!isTeacher && (
              <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
                <strong>Teacher:</strong> {teacherName}
              </Text>
            )}
          </Section>

          {isTeacher ? (
            <Text style={{ fontSize: '15px', color: '#111827' }}>
              Meet at your usual location or video link. See you tomorrow!
            </Text>
          ) : (
            <Text style={{ fontSize: '15px', color: '#111827' }}>
              See you tomorrow!
            </Text>
          )}

          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Tutelo &middot; tutelo.app &middot;{' '}
            {isTeacher
              ? "You're receiving this because you have an upcoming session through Tutelo."
              : "You're receiving this because you have an upcoming tutoring session booked through Tutelo."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
