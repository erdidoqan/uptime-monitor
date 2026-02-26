import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const GTM_ID = "GTM-52RZ45VJ";

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
    default: "UptimeTR - Zamanlanmış Görevler ve Uptime İzleme",
    template: "%s | UptimeTR",
  },
  description: "Cron job'larınızı planlayın ve API endpoint'lerinizi kolayca izleyin. Gerçek zamanlı HTTP izleme, esnek zamanlama ve anlık hata bildirimleri. Ücretsiz başlayın.",
  keywords: [
    "cron job",
    "uptime izleme",
    "api izleme",
    "http izleme",
    "zamanlanmış görevler",
    "sağlık kontrolü",
    "endpoint izleme",
    "sunucu izleme",
  ],
  authors: [{ name: "UptimeTR" }],
  creator: "UptimeTR",
  publisher: "UptimeTR",
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
    locale: "tr_TR",
    url: "https://www.uptimetr.com",
    siteName: "UptimeTR",
    title: "UptimeTR - Zamanlanmış Görevler ve Uptime İzleme",
    description: "Cron job'larınızı planlayın ve API endpoint'lerinizi kolayca izleyin. Gerçek zamanlı HTTP izleme, esnek zamanlama ve anlık hata bildirimleri.",
    images: [
      {
        url: "https://www.uptimetr.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "UptimeTR - Zamanlanmış Görevler ve Uptime İzleme",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UptimeTR - Zamanlanmış Görevler ve Uptime İzleme",
    description: "Cron job'larınızı planlayın ve API endpoint'lerinizi kolayca izleyin. Gerçek zamanlı HTTP izleme, esnek zamanlama ve anlık hata bildirimleri.",
    images: ["https://www.uptimetr.com/og-image.jpg"],
    creator: "@uptimetr",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    types: {
      'application/rss+xml': 'https://www.uptimetr.com/status-pages.xml',
    },
  },
};

// Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "UptimeTR",
  description: "Cron job'larınızı planlayın ve API endpoint'lerinizi kolayca izleyin.",
  url: "https://www.uptimetr.com",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TRY",
  },
  creator: {
    "@type": "Organization",
    name: "UptimeTR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
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
