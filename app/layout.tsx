import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const GTM_ID = "GTM-TJTT59DW";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CronUptime - Cron Job Scheduling & Uptime Monitoring",
    template: "%s | CronUptime",
  },
  description: "Schedule cron jobs and monitor your API endpoints with ease. Real-time HTTP monitoring, flexible scheduling, and instant failure notifications. Free to get started.",
  keywords: [
    "cron job",
    "uptime monitoring",
    "api monitoring",
    "http monitoring",
    "scheduled tasks",
    "health check",
    "endpoint monitoring",
    "server monitoring",
  ],
  authors: [{ name: "CronUptime" }],
  creator: "CronUptime",
  publisher: "CronUptime",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.cronuptime.com",
    siteName: "CronUptime",
    title: "CronUptime - Cron Job Scheduling & Uptime Monitoring",
    description: "Schedule cron jobs and monitor your API endpoints with ease. Real-time HTTP monitoring, flexible scheduling, and instant failure notifications.",
    images: [
      {
        url: "https://www.cronuptime.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "CronUptime - Cron Job Scheduling & Uptime Monitoring",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CronUptime - Cron Job Scheduling & Uptime Monitoring",
    description: "Schedule cron jobs and monitor your API endpoints with ease. Real-time HTTP monitoring, flexible scheduling, and instant failure notifications.",
    images: ["https://www.cronuptime.com/og-image.jpg"],
    creator: "@cronuptime",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

// Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "CronUptime",
  description: "Schedule cron jobs and monitor your API endpoints with ease.",
  url: "https://www.cronuptime.com",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  creator: {
    "@type": "Organization",
    name: "CronUptime",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
