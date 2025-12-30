import type { MetadataRoute } from "next";
import { getAllIntervalSlugs, getAllPlatformSlugs } from "@/components/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.cronuptime.com";
  const currentDate = new Date();

  // Static pages with their priorities and change frequencies
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/status`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cron-expression-translator`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/api-docs`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];

  // SEO pages for cron intervals
  const cronIntervalPages: MetadataRoute.Sitemap = getAllIntervalSlugs().map(
    (slug) => ({
      url: `${baseUrl}/${slug}`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })
  );

  // SEO pages for platforms
  const platformPages: MetadataRoute.Sitemap = getAllPlatformSlugs().map(
    (slug) => ({
      url: `${baseUrl}/${slug}`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })
  );

  return [...staticPages, ...cronIntervalPages, ...platformPages];
}

