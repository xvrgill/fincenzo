import type { MetadataRoute } from "next";
import { getAllDocs } from "@/lib/docs";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...getAllDocs().map((doc) => ({
      url: `${siteUrl}${doc.href}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
