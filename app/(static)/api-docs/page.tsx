import { Metadata } from "next";
import { PageHeader } from "@/components/static";
import { ApiDocumentationContent } from "./api-documentation-content";

export const metadata: Metadata = {
  title: "API Documentation - CronUptime API Reference",
  description: "Complete API documentation for CronUptime. Learn how to use API tokens to programmatically manage monitors, cron jobs, and incidents.",
  keywords: [
    "API documentation",
    "REST API",
    "API tokens",
    "API reference",
    "CronUptime API",
    "programmatic access",
    "API integration"
  ].join(", "),
  alternates: {
    canonical: "https://www.cronuptime.com/api-docs",
  },
  openGraph: {
    title: "API Documentation - CronUptime API Reference",
    description: "Complete API documentation for CronUptime. Learn how to use API tokens to programmatically manage monitors, cron jobs, and incidents.",
    url: "https://www.cronuptime.com/api-docs",
    type: "website",
  },
};

// Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "APIReference",
  name: "CronUptime API",
  description: "REST API for managing cron jobs, monitors, and incidents",
  url: "https://www.cronuptime.com/api-docs",
  provider: {
    "@type": "Organization",
    name: "CronUptime",
  },
};

export default function ApiDocsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PageHeader
        title="API Documentation"
        description="Integrate CronUptime into your applications with our REST API. Manage monitors, cron jobs, and incidents programmatically."
      />
      
      <ApiDocumentationContent />
    </>
  );
}
