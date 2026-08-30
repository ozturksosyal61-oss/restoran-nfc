import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/sistem/", "/api/"] },
    sitemap: "https://oztmenu.com/sitemap.xml",
  };
}
