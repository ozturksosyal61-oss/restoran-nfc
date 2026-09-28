import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { supabase } from "../../../lib/supabase";
import { readMenuOnly, restaurantMenuPath } from "../../../lib/restaurant-type";
import { getAuroraPalette, normalizeRestaurantTheme } from "../../../lib/themes";
import { auroraFontVariables } from "./aurora-fonts";
import palette from "./aurora-palette.module.css";
import { CartProvider } from "./menu/CartContext";
import MenuOnlyGate from "./MenuOnlyGate";
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
  const menuOnly = await readMenuOnly(supabase, Number(restaurant.id));

  // Aurora temalarında renkler ve yazı tipleri kabuk üzerinden tüm
  // müşteri ekranlarına (ana sayfa, menü, sipariş, takip) aktarılır.
  // Sadece menü restoranları her zaman Aurora menüsünü kullanır; Aurora
  // dışı bir tema seçiliyse koyu renk teması uygulanır.
  const forcedAurora = menuOnly && !getAuroraPalette(theme);
  const shellTheme = forcedAurora ? "aurora" : theme;
  const auroraPalette = getAuroraPalette(shellTheme);
  const shellClass = auroraPalette
    ? `restaurant-shell ${palette.shell} ${auroraFontVariables}`
    : "restaurant-shell";

  return (
    <CartProvider>
      <RestaurantThemeProvider
        value={{ restaurantId: Number(restaurant.id), auroraPalette, menuOnly }}
      >
        <div
          className={shellClass}
          data-theme={shellTheme}
          data-palette={auroraPalette ?? undefined}
        >
          <NovaThemeStyles />
          {menuOnly ? (
            <MenuOnlyGate menuPath={restaurantMenuPath(slug)}>{children}</MenuOnlyGate>
          ) : (
            children
          )}
        </div>
      </RestaurantThemeProvider>
    </CartProvider>
  );
}
