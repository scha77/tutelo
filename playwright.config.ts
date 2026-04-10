import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local so E2E tests have Supabase/Stripe/Resend keys
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 60_000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
