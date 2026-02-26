import { Metadata } from "next";
import { PageHeader } from "@/components/static";
import { ApiDocumentationContent } from "./api-documentation-content";

export const metadata: Metadata = {
  title: "API Documentation - UptimeTR API Reference",
  description: "Complete API documentation for UptimeTR. Learn how to use API tokens to programmatically manage monitors, cron jobs, and incidents.",
  keywords: [
    "API documentation",
    "REST API",
    "API tokens",
    "API reference",
    "UptimeTR API",
    "programmatic access",
    "API integration"
  ].join(", "),
  alternates: {
    canonical: "https://www.uptimetr.com/api-docs",
  },
  openGraph: {
    title: "API Documentation - UptimeTR API Reference",
    description: "Complete API documentation for UptimeTR. Learn how to use API tokens to programmatically manage monitors, cron jobs, and incidents.",
    url: "https://www.uptimetr.com/api-docs",
    type: "website",
  },
};

// Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "APIReference",
  name: "UptimeTR API",
  description: "REST API for managing cron jobs, monitors, and incidents",
  url: "https://www.uptimetr.com/api-docs",
  provider: {
    "@type": "Organization",
    name: "UptimeTR",
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
        description="Integrate UptimeTR into your applications with our REST API. Manage monitors, cron jobs, and incidents programmatically."
      />
      
      <ApiDocumentationContent />
    </>
  );
}
