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

interface UrgentFollowUpEmailProps {
  teacherFirstName: string
  studentName: string
  parentEmail: string
  bookingDate: string // YYYY-MM-DD
  cancelDeadline: string // human-readable deadline string
  connectStripeUrl: string
}

export function UrgentFollowUpEmail({
  teacherFirstName,
  studentName,
  parentEmail,
  bookingDate,
  cancelDeadline,
  connectStripeUrl,
}: UrgentFollowUpEmailProps) {
  // Adding T12:00:00 prevents timezone-shift on date parsing
  const formattedDate = new Date(bookingDate + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Html>
      <Head />
      <Preview>Last chance — this booking cancels at {cancelDeadline}</Preview>
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
            Hi {teacherFirstName},
          </Text>
          <Text style={{ fontSize: '16px', color: '#dc2626', fontWeight: '600' }}>
            This booking will be cancelled if you don&apos;t connect Stripe before {cancelDeadline}.
            Don&apos;t lose this parent.
          </Text>
          <Section
            style={{
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
              padding: '16px',
              margin: '20px 0',
              border: '1px solid #fecaca',
            }}
          >
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Student:</strong> {studentName}
            </Text>
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Session date:</strong> {formattedDate}
            </Text>
            <Text style={{ margin: '4px 0', color: '#374151', fontSize: '14px' }}>
              <strong>Parent email:</strong> {parentEmail}
            </Text>
            <Text style={{ margin: '4px 0', color: '#dc2626', fontSize: '14px', fontWeight: '600' }}>
              <strong>Auto-cancels at:</strong> {cancelDeadline}
            </Text>
          </Section>
          <Text style={{ fontSize: '15px', color: '#374151' }}>
            Connect Stripe now to lock in payment and confirm the session. Takes 2–3 minutes.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button
              href={connectStripeUrl}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '12px 28px',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Connect Stripe Now
            </Button>
          </Section>
          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
            Tutelo &middot; tutelo.app &middot; You&apos;re receiving this because a parent is
            waiting to confirm a booking through your Tutelo page.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
