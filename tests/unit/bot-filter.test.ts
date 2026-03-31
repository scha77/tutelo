import { describe, it, expect } from 'vitest'
import { isBot } from '@/lib/utils/bot-filter'

describe('isBot', () => {
  // Null / empty → treat as bot (no UA = likely automated)
  it('returns true for null user agent', () => {
    expect(isBot(null)).toBe(true)
  })

  it('returns true for empty string user agent', () => {
    expect(isBot('')).toBe(true)
  })

  // Known crawlers
  it('returns true for Googlebot', () => {
    expect(isBot('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true)
  })

  it('returns true for Bingbot', () => {
    expect(isBot('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true)
  })

  it('returns true for python-requests', () => {
    expect(isBot('python-requests/2.31.0')).toBe(true)
  })

  it('returns true for curl', () => {
    expect(isBot('curl/7.88.0')).toBe(true)
  })

  // Real browsers — should NOT be flagged as bots
  it('returns false for a real mobile browser (iPhone Safari)', () => {
    expect(
      isBot(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(false)
  })

  it('returns false for a real desktop browser (Chrome on Windows)', () => {
    expect(
      isBot(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    ).toBe(false)
  })
})
