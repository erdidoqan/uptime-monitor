import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.uptimetr.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/monitors/",
          "/cron-jobs/",
          "/incidents/"
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

