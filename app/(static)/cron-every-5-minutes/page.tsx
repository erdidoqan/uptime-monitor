import { Metadata } from "next";
import { CronIntervalPage, getIntervalBySlug } from "@/components/seo";
import { notFound } from "next/navigation";

const data = getIntervalBySlug("cron-every-5-minutes");

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

export default function CronEvery5MinutesPage() {
  return <CronIntervalPage data={data!} />;
}

