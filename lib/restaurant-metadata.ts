import type { Metadata } from "next";
import { supabase } from "./supabase";
import { HIDDEN_RESTAURANT_SLUGS, SITE_NAME, pageMetadata } from "./site";

// Restoran ana sayfası ve menüsü için başlık, açıklama ve canonical.
// Süreli müşteri demoları arama motorlarına kapalıdır.
export async function restaurantMetadata(slug: string, page: "home" | "menu"): Promise<Metadata> {
  const { data } = await supabase
    .from("restaurants")
    .select("name, demo_expires_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data?.name) return { robots: { index: false, follow: false } };

  const name = String(data.name);
  const base = `/restoran/${encodeURIComponent(slug)}`;

  return pageMetadata({
    path: page === "menu" ? `${base}/menu` : base,
    title: page === "menu" ? `${name} Menü` : name,
    description:
      page === "menu"
        ? `${name} dijital menüsü: ürünler, fiyatlar ve kampanyalar. QR menü altyapısı ${SITE_NAME}.`
        : `${name} QR menüsü ve masadan sipariş. Menüyü inceleyin, garson çağırın, siparişinizi takip edin.`,
    index: !data.demo_expires_at && !HIDDEN_RESTAURANT_SLUGS.has(slug),
  });
}
