import { Resend } from 'resend'
import { SchoolVerificationEmail } from '@/emails/SchoolVerificationEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Generate a cryptographically random verification token (UUID v4).
 */
export function generateVerificationToken(): string {
  return crypto.randomUUID()
}

/**
 * Check whether a verification token has expired.
 * Returns true if the expiry date is in the past.
 */
export function isTokenExpired(expiresAt: string | Date): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return expiry.getTime() < Date.now()
}

/**
 * Send a school email verification email via Resend.
 * The email contains a link the teacher clicks to verify their school email.
 */
export async function sendVerificationEmail(
  toEmail: string,
  token: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutelo.app'
  const verificationUrl = `${appUrl}/api/verify-email?token=${token}`

  await resend.emails.send({
    from: 'Tutelo <noreply@tutelo.app>',
    to: toEmail,
    subject: 'Verify your school email on Tutelo',
    react: SchoolVerificationEmail({ verificationUrl }),
  })
}
