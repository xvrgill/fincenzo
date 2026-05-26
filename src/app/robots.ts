import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Logged-in surfaces aren't useful to crawlers — middleware redirects
        // anonymous traffic to /sign-in anyway, but blocking saves the round
        // trip and keeps these out of search results outright.
        disallow: [
          "/dashboard",
          "/accounts",
          "/transactions",
          "/cash-flow",
          "/budget",
          "/investments",
          "/net-worth",
          "/goals",
          "/subscriptions",
          "/household",
          "/admin",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
