import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { supabase } from "../../../lib/supabase";
import { normalizeRestaurantTheme } from "../../../lib/themes";
import { CartProvider } from "./menu/CartContext";
import NovaThemeStyles from "./NovaThemeStyles";

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
    .select("theme")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!restaurant) {
    notFound();
  }

  const theme = normalizeRestaurantTheme(restaurant.theme);

  return (
    <CartProvider>
      <div
        className="restaurant-shell"
        data-theme={theme}
      >
        <NovaThemeStyles />
        {children}
      </div>
    </CartProvider>
  );
}
