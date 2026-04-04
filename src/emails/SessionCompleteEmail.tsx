import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface SessionCompleteEmailProps {
  parentFirstName: string
  studentName: string
  teacherName: string
  reviewUrl: string
  appUrl: string
}

export function SessionCompleteEmail({
  parentFirstName,
  studentName,
  teacherName,
  reviewUrl,
  appUrl,
}: SessionCompleteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        How was {studentName}&apos;s session with {teacherName}?
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
            Hi {parentFirstName},
          </Text>

          <Text style={{ fontSize: '16px', color: '#111827' }}>
            Hope {studentName}&apos;s session with <strong>{teacherName}</strong> went well! Your
            teacher has marked the session as complete.
          </Text>

          <Text style={{ fontSize: '15px', color: '#111827' }}>
            If you have a moment, leaving a review helps other families find great tutors — and
            means a lot to teachers like {teacherName}.
          </Text>

          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button
              href={reviewUrl}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '12px 28px',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Leave a Review
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Tutelo &middot;{' '}
            <a href={appUrl} style={{ color: '#9ca3af' }}>
              tutelo.app
            </a>{' '}
            &middot; You&apos;re receiving this because your tutoring session through Tutelo has
            been completed.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
