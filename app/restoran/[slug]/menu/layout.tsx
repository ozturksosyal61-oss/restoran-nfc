import { getMenuDesign, isAuroraTheme } from "../../../../lib/themes";
import { loadMenuData } from "../../../../lib/menu-data";
import OztNovaPremiumMenu from "./OztNovaPremiumMenu";
import AuroraMenu from "./AuroraMenu";
import ZestMenu from "./ZestMenu";
import LinenMenu from "./LinenMenu";
import LunaMenu from "./LunaMenu";
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

  // Aurora ailesinde menü tasarıma göre seçilir (Aurora, Zest, Linen, Luna).
  const design = getMenuDesign(restaurant?.theme);
  const Menu =
    design === "zest" ? ZestMenu : design === "linen" ? LinenMenu : design === "luna" ? LunaMenu : AuroraMenu;

  // Sadece menü restoranları her zaman Aurora ailesinden bir menü kullanır
  // (Aurora dışı tema seçiliyse Aurora); sepet ve garson çağırma kapatılır.
  if (menu?.menuOnly) {
    return <Menu slug={slug} menuOnly initialData={menu} />;
  }

  if (isAuroraTheme(restaurant?.theme)) {
    return <Menu slug={slug} initialData={menu} />;
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
