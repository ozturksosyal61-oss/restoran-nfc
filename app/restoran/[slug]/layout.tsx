import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { supabase } from "../../../lib/supabase";
import { getAuroraPalette, normalizeRestaurantTheme } from "../../../lib/themes";
import { auroraFontVariables } from "./aurora-fonts";
import palette from "./aurora-palette.module.css";
import { CartProvider } from "./menu/CartContext";
import NovaThemeStyles from "./NovaThemeStyles";
import { RestaurantThemeProvider } from "./RestaurantThemeContext";

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, theme")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!restaurant) {
    notFound();
  }

  const theme = normalizeRestaurantTheme(restaurant.theme);

  // Aurora temalarında renkler ve yazı tipleri kabuk üzerinden tüm
  // müşteri ekranlarına (ana sayfa, menü, sipariş, takip) aktarılır.
  const auroraPalette = getAuroraPalette(theme);
  const shellClass = auroraPalette
    ? `restaurant-shell ${palette.shell} ${auroraFontVariables}`
    : "restaurant-shell";

  return (
    <CartProvider>
      <RestaurantThemeProvider
        value={{ restaurantId: Number(restaurant.id), auroraPalette }}
      >
        <div
          className={shellClass}
          data-theme={theme}
          data-palette={auroraPalette ?? undefined}
        >
          <NovaThemeStyles />
          {children}
        </div>
      </RestaurantThemeProvider>
    </CartProvider>
  );
}
