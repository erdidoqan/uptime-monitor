import type { MetadataRoute } from "next";
import { getD1Client } from "@/lib/d1-client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.uptimetr.com";
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
      url: `${baseUrl}/api-docs`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/karsilastirma/uptimerobot`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Fetch active public status pages from database
  let statusPageUrls: MetadataRoute.Sitemap = [];
  try {
    const db = getD1Client();
    const statusPages = await db.queryAll<{
      subdomain: string;
      custom_domain: string | null;
      updated_at: number | null;
      created_at: number;
    }>(
      `SELECT subdomain, custom_domain, updated_at, created_at
       FROM status_pages 
       WHERE is_active = 1`
    );

    statusPageUrls = (statusPages as any[]).map((page) => {
      const pageUrl = page.custom_domain
        ? `https://${page.custom_domain}`
        : `https://${page.subdomain}.uptimetr.com`;
      
      const lastModified = page.updated_at 
        ? new Date(page.updated_at) 
        : new Date(page.created_at);

      return {
        url: pageUrl,
        lastModified,
        changeFrequency: "hourly" as const,
        priority: 0.8,
      };
    });
  } catch (error) {
    console.error("Failed to fetch status pages for sitemap:", error);
    // Continue with static pages only if DB fetch fails
  }

  return [...staticPages, ...statusPageUrls];
}
