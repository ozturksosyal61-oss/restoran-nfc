import type { MetadataRoute } from "next";
import { supabase } from "../lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://oztmenu.com";
  const staticRoutes = ["", "/gizlilik", "/kvkk", "/kullanim-sartlari", "/cerez-politikasi"].map(path => ({
    url: `${base}${path}`, lastModified: new Date(),
    changeFrequency: "monthly" as const, priority: path === "" ? 1 : .4,
  }));
  const { data: restaurants } = await supabase.from("restaurants").select("slug").eq("is_active", true);
  const restaurantRoutes = (restaurants ?? []).map(r => ({
    url: `${base}/restoran/${r.slug}`, lastModified: new Date(),
    changeFrequency: "daily" as const, priority: .8,
  }));
  return [...staticRoutes, ...restaurantRoutes];
}
