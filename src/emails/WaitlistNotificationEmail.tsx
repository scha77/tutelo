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

interface WaitlistNotificationEmailProps {
  teacherName: string
  bookingLink: string
  appUrl: string
}

export function WaitlistNotificationEmail({
  teacherName,
  bookingLink,
  appUrl,
}: WaitlistNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        A spot just opened up — book with {teacherName}
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
            Great news!
          </Text>

          <Text style={{ fontSize: '16px', color: '#111827' }}>
            A spot just opened up with <strong>{teacherName}</strong>. Book now before it fills up
            again!
          </Text>

          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button
              href={bookingLink}
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
              Book a Session
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Tutelo &middot;{' '}
            <a href={appUrl} style={{ color: '#9ca3af' }}>
              tutelo.app
            </a>{' '}
            &middot; You&apos;re receiving this because you joined the waitlist for {teacherName}.{' '}
            <a href={`${appUrl}/account`} style={{ color: '#9ca3af' }}>
              Manage preferences
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
