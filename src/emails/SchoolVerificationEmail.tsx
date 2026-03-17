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

interface SchoolVerificationEmailProps {
  verificationUrl: string
}

export function SchoolVerificationEmail({
  verificationUrl,
}: SchoolVerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your school email on Tutelo</Preview>
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
          <Text style={{ fontSize: '18px', color: '#111827', fontWeight: 600, marginBottom: '8px' }}>
            Verify your school email
          </Text>

          <Text style={{ fontSize: '16px', color: '#111827' }}>
            Click the button below to verify your school email address on Tutelo.
            This link expires in 24 hours.
          </Text>

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button
              href={verificationUrl}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 600,
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Verify Email
            </Button>
          </Section>

          <Text style={{ fontSize: '14px', color: '#6b7280' }}>
            If you didn&apos;t request this, you can safely ignore this email.
          </Text>

          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Tutelo &middot; tutelo.app &middot; You&apos;re receiving this because someone
            requested to verify a school email on Tutelo.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
