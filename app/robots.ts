import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.cronuptime.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/monitors/",
          "/cron-jobs/",
          "/incidents/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

