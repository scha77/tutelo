---
estimated_steps: 21
estimated_files: 2
skills_used: []
---

# T02: Bot filter utility + tests

Create src/lib/utils/bot-filter.ts with isBot(userAgent: string | null): boolean.

Bot detection logic — check for known crawler UA substrings (case-insensitive):
```ts
const BOT_PATTERNS = [
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'sogou', 'exabot', 'facebot', 'ia_archiver',
  'semrushbot', 'ahrefsbot', 'dotbot', 'petalbot', 'applebot',
  'crawler', 'spider', 'headlesschrome', 'python-requests', 'curl/',
]
```

Return true if any pattern matches (or if userAgent is null/empty).

Also create src/lib/utils/bot-filter.test.ts (Vitest) with:
- isBot(null) returns true
- isBot('') returns true
- isBot('Googlebot/2.1 (+http://www.google.com/bot.html)') returns true
- isBot('Bingbot/2.0') returns true
- isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0...) AppleWebKit/605.1.15') returns false (real mobile browser)
- isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120') returns false (real desktop browser)
- isBot('python-requests/2.31.0') returns true
- isBot('curl/7.88.0') returns true
Total: 8 tests.

## Inputs

- None specified.

## Expected Output

- `src/lib/utils/bot-filter.ts`
- `tests/unit/bot-filter.test.ts`

## Verification

npx vitest run tests/unit/bot-filter.test.ts passes (8 tests).
