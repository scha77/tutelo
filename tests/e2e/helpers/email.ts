/**
 * E2E email verification helper.
 *
 * Polls the Resend API to check for emails matching criteria.
 * Returns null on timeout or API errors — never throws (email
 * verification is a soft assertion in E2E tests).
 */

interface WaitForEmailOpts {
  /** Substring to match in the email subject */
  subject?: string
  /** Substring the email body should contain */
  toContain?: string
  /** Recipient email address to filter by */
  to?: string
  /** Max time to poll (ms). Default 30s */
  timeoutMs?: number
}

interface ResendEmail {
  id: string
  from: string
  to: string[]
  subject: string
  created_at: string
  html?: string
  text?: string
}

const POLL_INTERVAL_MS = 3_000

/**
 * Polls Resend's API for an email matching the given criteria.
 * Returns the first match or null if timeout is reached.
 */
export async function waitForEmail(
  opts: WaitForEmailOpts
): Promise<ResendEmail | null> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[e2e/email] RESEND_API_KEY not set — skipping email check')
    return null
  }

  const timeoutMs = opts.timeoutMs ?? 30_000
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!res.ok) {
        console.warn(
          `[e2e/email] Resend API returned ${res.status}: ${res.statusText}`
        )
        await sleep(POLL_INTERVAL_MS)
        continue
      }

      const body = await res.json()
      const emails: ResendEmail[] = body?.data ?? []

      const match = emails.find((email) => {
        if (opts.subject && !email.subject?.includes(opts.subject)) return false
        if (opts.to && !email.to?.some((addr) => addr.includes(opts.to!)))
          return false
        if (opts.toContain) {
          const content = (email.html ?? '') + (email.text ?? '')
          if (!content.includes(opts.toContain)) return false
        }
        return true
      })

      if (match) return match
    } catch (err) {
      console.warn(`[e2e/email] Resend API error: ${err}`)
    }

    await sleep(POLL_INTERVAL_MS)
  }

  console.warn(
    `[e2e/email] Timed out after ${timeoutMs}ms waiting for email matching: ${JSON.stringify(opts)}`
  )
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
