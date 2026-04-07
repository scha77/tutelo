import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Full tracing in dev, 10% sample in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Replay disabled — enable later if needed
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Never send student/parent PII to Sentry
  sendDefaultPii: false,
});
