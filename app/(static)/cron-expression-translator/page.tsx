import { Metadata } from "next";
import { PageHeader } from "@/components/static";
import { CronExpressionTranslator } from "./cron-expression-translator";

export const metadata: Metadata = {
  title: "Cron Expression Translator - Convert Cron to Human Readable Format | CronUptime",
  description: "Free online cron expression translator. Convert any cron expression to human-readable format instantly. Understand when your cron jobs will run with our easy-to-use translator tool.",
  keywords: [
    "cron expression translator",
    "cron to human readable",
    "cron expression parser",
    "cron schedule translator",
    "crontab translator",
    "cron expression converter",
    "cron syntax translator",
    "cron expression meaning",
    "cron expression explained",
    "cron job translator"
  ].join(", "),
  alternates: {
    canonical: "https://www.cronuptime.com/cron-expression-translator",
  },
  openGraph: {
    title: "Cron Expression Translator - Convert Cron to Human Readable Format",
    description: "Free online cron expression translator. Convert any cron expression to human-readable format instantly. Understand when your cron jobs will run.",
    url: "https://www.cronuptime.com/cron-expression-translator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cron Expression Translator - Convert Cron to Human Readable Format",
    description: "Free online cron expression translator. Convert any cron expression to human-readable format instantly.",
  },
};

// Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Cron Expression Translator",
  description: "Free online tool to translate cron expressions to human-readable format",
  url: "https://www.cronuptime.com/cron-expression-translator",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Convert cron expressions to human-readable format",
    "Validate cron expression syntax",
    "Show next run times",
    "Display cron expression breakdown",
    "Support all standard cron syntax"
  ],
  creator: {
    "@type": "Organization",
    name: "CronUptime",
  },
};

export default function CronExpressionTranslatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PageHeader
        title="Cron Expression Translator"
        description="Convert any cron expression to human-readable format instantly. Understand when your scheduled tasks will run with our free online translator tool."
      />
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12 lg:py-16">
        <CronExpressionTranslator />
      </div>
    </>
  );
}


