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

interface FollowUpEmailProps {
  teacherFirstName: string
  studentName: string
  parentEmail: string
  bookingDate: string // YYYY-MM-DD
  connectStripeUrl: string
}

export function FollowUpEmail({
  teacherFirstName,
  studentName,
  parentEmail,
  bookingDate,
  connectStripeUrl,
}: FollowUpEmailProps) {
  // Adding T12:00:00 prevents timezone-shift on date parsing
  const formattedDate = new Date(bookingDate + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Html>
      <Head />
      <Preview>Reminder: {parentEmail} is still waiting on you</Preview>
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
          <Text style={{ fontSize: '16px', color: '#111827' }}>
            Just a reminder — <strong>{parentEmail}</strong> is still waiting on you. Connect Stripe
            to lock in the {formattedDate} session with {studentName} and get paid.
          </Text>
          <Text style={{ fontSize: '15px', color: '#374151' }}>
            It only takes 2–3 minutes. Don&apos;t leave this parent hanging.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button
              href={connectStripeUrl}
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
