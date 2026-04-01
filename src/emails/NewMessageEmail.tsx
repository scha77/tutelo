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

interface NewMessageEmailProps {
  recipientFirstName: string
  senderName: string
  messagePreview: string
  conversationUrl: string
}

export function NewMessageEmail({
  recipientFirstName,
  senderName,
  messagePreview,
  conversationUrl,
}: NewMessageEmailProps) {
  // Truncate preview to 120 chars for the email body
  const truncated =
    messagePreview.length > 120
      ? messagePreview.slice(0, 117) + '...'
      : messagePreview

  return (
    <Html>
      <Head />
      <Preview>New message from {senderName}</Preview>
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
            You have a new message from <strong>{senderName}</strong>.
          </Text>
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
                margin: 0,
                color: '#374151',
                fontSize: '14px',
                fontStyle: 'italic',
              }}
            >
              &ldquo;{truncated}&rdquo;
            </Text>
          </Section>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button
              href={conversationUrl}
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
              View Conversation →
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Tutelo · tutelo.app · You&apos;re receiving this because someone sent you a
            message on Tutelo.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
