import type { Metadata } from "next";
import { CartProvider } from "./menu/CartContext";
import { supabase } from "../../../lib/supabase";
import { normalizeRestaurantTheme } from "../../../lib/themes";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, description, logo_url, theme")
    .eq("slug", slug).eq("is_active", true).maybeSingle();

  if (!restaurant) return { title: "Restoran bulunamadı", robots: { index: false, follow: false } };

  const description = restaurant.description || `${restaurant.name} dijital menüsü. QR ve NFC ile menü, sipariş ve müşteri deneyimi.`;
  return {
    title: restaurant.name, description, robots: { index: true, follow: true },
    openGraph: { type: "website", title: `${restaurant.name} | Dijital Menü`, description,
      images: restaurant.logo_url ? [{ url: restaurant.logo_url, alt: `${restaurant.name} logosu` }] : undefined },
  };
}

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("theme")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  const theme = normalizeRestaurantTheme(restaurant?.theme);

  return (
    <CartProvider>
      <div
        className="restaurant-shell"
        data-theme={theme}
      >
        {children}
      </div>
    </CartProvider>
  );
}
