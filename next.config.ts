import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No need to expose these env vars - they're only used server-side
  // Next.js automatically loads .env.local for server-side usage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.cronuptime.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**',
      },
    ],
  },
  outputFileTracingIncludes: {
    // Include Chromium binary for screenshot API
    "/api/incidents/*/screenshot": [
      "./node_modules/@sparticuz/chromium/**/*",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
};

export default nextConfig;
