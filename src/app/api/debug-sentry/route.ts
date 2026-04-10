import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

/**
 * Sentry smoke-test route. Triggers a test error that should appear in the
 * Sentry Issues feed within ~30 seconds of a GET request.
 *
 * Protected by the CRON_SECRET header so it cannot be triggered publicly.
 *
 * DELETE THIS ROUTE after verifying Sentry is receiving events.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Capture a message (arrives in Sentry as an "info" event)
  Sentry.captureMessage('Sentry smoke test: captureMessage from /api/debug-sentry', {
    level: 'info',
    tags: { smoke_test: 'true' },
  })

  // Force a thrown error (arrives in Sentry as an "error" event)
  try {
    throw new Error('Sentry smoke test: intentional error from /api/debug-sentry')
  } catch (err) {
    Sentry.captureException(err, {
      tags: { smoke_test: 'true' },
    })
  }

  // Flush the queue before returning so events ship before the lambda exits
  await Sentry.flush(2000)

  return NextResponse.json({
    ok: true,
    message: 'Two events sent to Sentry (1 message + 1 exception). Check your Sentry Issues feed.',
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
  })
}
