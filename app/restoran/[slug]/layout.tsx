import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { readMenuOnly, restaurantMenuPath } from "../../../lib/restaurant-type";
import { getAuroraPalette, normalizeRestaurantTheme } from "../../../lib/themes";
import { auroraFontVariables } from "./aurora-fonts";
import palette from "./aurora-palette.module.css";
import { CartProvider } from "./menu/CartContext";
import MenuOnlyGate from "./MenuOnlyGate";
import MenuPopup from "./MenuPopup";
import NovaThemeStyles from "./NovaThemeStyles";
import { RestaurantThemeProvider } from "./RestaurantThemeContext";
import { visibleTableGames } from "../../../lib/table-games";

// Menünün kapalı olduğu durumlarda (süresi dolan demo, ödenmeyen abonelik).
function ServiceClosed({ title, text }: { title: string; text: string }) {
  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        padding: "24px 16px",
        background: "#12100d",
        color: "#f3ece0",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
        <strong style={{ fontSize: 24 }}>{title}</strong>
        <span style={{ color: "#a99e8f", lineHeight: 1.5 }}>{text}</span>
        <Link href="/" style={{ color: "#e0c07c", fontWeight: 700, marginTop: 6 }}>
          oztdigital.com.tr
        </Link>
      </div>
    </main>
  );
}

type ShellRestaurant = {
  id: number;
  theme: string | null;
  menu_only?: boolean | null;
  demo_expires_at?: string | null;
  menu_popup?: unknown;
  instagram_url?: string | null;
  plan?: string | null;
  table_games?: unknown;
};

const SHELL_COLUMNS = "id, theme, menu_only, demo_expires_at, menu_popup, instagram_url";

async function loadShellRestaurant(slug: string): Promise<{ restaurant: ShellRestaurant } | null> {
  const read = (columns: string) =>
    supabase.from("restaurants").select(columns).eq("slug", slug).eq("is_active", true).maybeSingle();

  // Masa oyunları sütunu (20261020) henüz yoksa oyunlarsız okunur.
  let full = await read(`${SHELL_COLUMNS}, plan, table_games`);
  if (full.error) full = await read(SHELL_COLUMNS);

  if (!full.error) return full.data ? { restaurant: full.data as unknown as ShellRestaurant } : null;

  // Yedek: eski şema. Menü türü ayrı (hataya dayanıklı) okunur.
  const basic = await supabase
    .from("restaurants")
    .select("id, theme, instagram_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!basic.data) return null;
  const menuOnly = await readMenuOnly(supabase, Number(basic.data.id));
  return { restaurant: { ...(basic.data as ShellRestaurant), menu_only: menuOnly } };
}

function isPast(value: string) {
  return new Date(value).getTime() < Date.now();
}

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Kabuğun ihtiyacı olan her şey tek sorguda okunur (demo süresi, menü
  // türü, açılış duyurusu). Yeni sütunlardan biri henüz yoksa (veritabanı
  // güncellenmemişse) temel bilgilerle devam edilir; hiçbir restoran kapanmaz.
  const shell = await loadShellRestaurant(slug);
  if (!shell) {
    notFound();
  }
  const { restaurant } = shell;

  if (restaurant.demo_expires_at && isPast(restaurant.demo_expires_at)) {
    return (
      <ServiceClosed
        title="Bu demonun süresi doldu"
        text="Dijital menünüzü yeniden görmek ya da kullanmaya başlamak için OZT Digital ile iletişime geçin."
      />
    );
  }

  // Otomatik abonelikte ödeme ek süresi dolduysa menü kapanır. Fonksiyon
  // yoksa (veritabanı güncellenmemişse) hiçbir restoran etkilenmez.
  const { data: billingState, error: billingError } = await supabase.rpc("billing_access", {
    p_restaurant_id: restaurant.id,
  });
  if (!billingError && billingState === "blocked") {
    return (
      <ServiceClosed
        title="Dijital menü şu anda kullanılamıyor"
        text="Menüyü görmek için lütfen işletme personeline başvurun."
      />
    );
  }

  const popup = restaurant.menu_popup ?? null;
  const theme = normalizeRestaurantTheme(restaurant.theme);
  const menuOnly = restaurant.menu_only === true;

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
        value={{
          restaurantId: Number(restaurant.id),
          auroraPalette,
          menuOnly,
          tableGames: visibleTableGames(restaurant.table_games, restaurant.plan, menuOnly),
        }}
      >
        <div
          className={shellClass}
          data-theme={shellTheme}
          data-palette={auroraPalette ?? undefined}
        >
          <NovaThemeStyles />
          {menuOnly ? (
            <MenuOnlyGate
              menuPath={restaurantMenuPath(slug)}
              allowedPaths={[`/restoran/${encodeURIComponent(slug)}/degerlendir`]}
            >
              {children}
            </MenuOnlyGate>
          ) : (
            children
          )}
          {popup && (
            <MenuPopup
              restaurantId={Number(restaurant.id)}
              popup={popup}
              instagramUrl={restaurant.instagram_url ?? null}
            />
          )}
        </div>
      </RestaurantThemeProvider>
    </CartProvider>
  );
}
