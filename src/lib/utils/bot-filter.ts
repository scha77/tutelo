/**
 * Bot detection for page view tracking.
 *
 * Returns true if the user agent looks like a known crawler, bot, or
 * automated tool. Conservative list — prefer to let edge cases through
 * rather than accidentally blocking real users.
 */

const BOT_PATTERNS = [
  'googlebot',
  'bingbot',
  'slurp',         // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'facebot',
  'ia_archiver',   // Wayback Machine
  'semrushbot',
  'ahrefsbot',
  'dotbot',
  'petalbot',
  'applebot',
  'crawler',
  'spider',
  'headlesschrome',
  'python-requests',
  'curl/',
] as const

/**
 * Returns true if the user-agent string matches a known bot pattern.
 * Also returns true for null/empty user-agents (no UA = likely automated).
 */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true
  const ua = userAgent.toLowerCase()
  return BOT_PATTERNS.some((pattern) => ua.includes(pattern))
}
