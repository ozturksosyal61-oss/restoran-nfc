import type { MetadataRoute } from "next";
import { supabase } from "../lib/supabase";
import { HIDDEN_RESTAURANT_SLUGS, SITE_URL } from "../lib/site";

// Yeni restoranlar 6 saat içinde site haritasına girer.
export const revalidate = 21600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/urunler", priority: 0.9, changeFrequency: "monthly" },
    { path: "/tasarimlar", priority: 0.8, changeFrequency: "monthly" },
    { path: "/demo", priority: 0.9, changeFrequency: "monthly" },
    { path: "/qr-menu", priority: 0.8, changeFrequency: "monthly" },
    { path: "/nfc-menu", priority: 0.8, changeFrequency: "monthly" },
    { path: "/dijital-menu", priority: 0.8, changeFrequency: "monthly" },
    { path: "/kvkk", priority: 0.3, changeFrequency: "yearly" },
    { path: "/gizlilik", priority: 0.3, changeFrequency: "yearly" },
    { path: "/cerez-politikasi", priority: 0.3, changeFrequency: "yearly" },
    { path: "/kullanim-sartlari", priority: 0.3, changeFrequency: "yearly" },
    { path: "/mesafeli-satis-sozlesmesi", priority: 0.3, changeFrequency: "yearly" },
    { path: "/iptal-iade", priority: 0.3, changeFrequency: "yearly" },
    { path: "/veri-isleme-sozlesmesi", priority: 0.3, changeFrequency: "yearly" },
  ];
  const staticRoutes = pages.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // Süreli müşteri demoları (demo_expires_at dolu) arama motorlarına verilmez.
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("slug")
    .eq("is_active", true)
    .is("demo_expires_at", null);
  const restaurantRoutes = (restaurants ?? [])
    .filter((restaurant) => !HIDDEN_RESTAURANT_SLUGS.has(String(restaurant.slug)))
    .map((restaurant) => ({
    url: `${SITE_URL}/restoran/${restaurant.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...restaurantRoutes];
}
