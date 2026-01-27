import { Metadata } from "next";
import { PlatformPage, getPlatformBySlug } from "@/components/seo";
import { notFound } from "next/navigation";

const data = getPlatformBySlug("n8n-cron-schedule");

if (!data) {
  notFound();
}

export const metadata: Metadata = {
  title: data.metaTitle,
  description: data.metaDescription,
  keywords: data.keywords,
  alternates: {
    canonical: `https://www.cronuptime.com/${data.slug}`,
  },
  openGraph: {
    title: data.metaTitle,
    description: data.metaDescription,
    url: `https://www.cronuptime.com/${data.slug}`,
  },
};

export default function N8nCronSchedulePage() {
  return <PlatformPage data={data!} />;
}
