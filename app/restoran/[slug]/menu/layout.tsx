import { isAuroraTheme } from "../../../../lib/themes";
import { loadMenuData } from "../../../../lib/menu-data";
import OztNovaPremiumMenu from "./OztNovaPremiumMenu";
import AuroraMenu from "./AuroraMenu";
import MenuViewTracker from "./MenuViewTracker";

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

  // Restoran ve menünün tamamı tek sorguda sunucuda hazırlanır.
  const menu = await loadMenuData(slug);
  const restaurant = menu ? { id: menu.restaurant.id, theme: menu.theme } : null;

  // Sadece menü restoranları tema ne olursa olsun Aurora menüsünü kullanır;
  // sepet ve garson çağırma bu menüde kapatılır.
  if (menu?.menuOnly) {
    return <AuroraMenu slug={slug} menuOnly initialData={menu} />;
  }

  // Tüm Aurora renk temaları aynı menüyü kullanır.
  if (isAuroraTheme(restaurant?.theme)) {
    return <AuroraMenu slug={slug} initialData={menu} />;
  }

  // Aurora menüsü açılışı kendisi sayar; diğer temalarda burada sayılır.
  const tracker = restaurant ? <MenuViewTracker restaurantId={Number(restaurant.id)} /> : null;

  if (restaurant?.theme === "ozt-nova-premium") {
    return (
      <>
        {tracker}
        <OztNovaPremiumMenu slug={slug} />
      </>
    );
  }

  return (
    <>
      {tracker}
      {children}
    </>
  );
}
