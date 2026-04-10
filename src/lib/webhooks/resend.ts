import { Webhook } from 'svix'

export type ResendEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.bounced'
  | 'email.complained'
  | 'email.opened'
  | 'email.clicked'

export interface ResendWebhookPayload {
  type: ResendEventType
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    [key: string]: unknown
  }
}

/**
 * Verify a Resend webhook payload using Svix signature verification.
 * Returns the parsed event on success; throws on invalid signature.
 */
export function verifyResendWebhook(
  body: string,
  headers: {
    'svix-id': string
    'svix-timestamp': string
    'svix-signature': string
  },
  secret: string
): ResendWebhookPayload {
  const wh = new Webhook(secret)
  return wh.verify(body, headers) as ResendWebhookPayload
}
