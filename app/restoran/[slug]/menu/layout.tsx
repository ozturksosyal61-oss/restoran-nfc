import { supabase } from "../../../../lib/supabase";
import { readMenuOnly } from "../../../../lib/restaurant-type";
import { isAuroraTheme } from "../../../../lib/themes";
import OztNovaPremiumMenu from "./OztNovaPremiumMenu";
import AuroraMenu from "./AuroraMenu";

export default async function RestaurantMenuRouteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, theme")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  // Sadece menü restoranları tema ne olursa olsun Aurora menüsünü kullanır;
  // sepet ve garson çağırma bu menüde kapatılır.
  if (restaurant && (await readMenuOnly(supabase, Number(restaurant.id)))) {
    return <AuroraMenu slug={slug} menuOnly />;
  }

  // Tüm Aurora renk temaları aynı menüyü kullanır.
  if (isAuroraTheme(restaurant?.theme)) {
    return <AuroraMenu slug={slug} />;
  }

  if (restaurant?.theme === "ozt-nova-premium") {
    return <OztNovaPremiumMenu slug={slug} />;
  }

  return <>{children}</>;
}
