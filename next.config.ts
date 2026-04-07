import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Quiet outside CI
  silent: !process.env.CI,

  // Proxy Sentry requests through the app to avoid ad-blockers
  tunnelRoute: "/monitoring",

  // Warn instead of failing the build when auth token is missing
  errorHandler: (err) => {
    console.warn("[sentry] Source map upload skipped:", err.message);
  },
});
