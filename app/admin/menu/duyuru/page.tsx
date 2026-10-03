import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { normalizePopup, safeUrl } from "../../../../lib/menu-popup";
import AdminIcon from "../../AdminIcon";
import PopupEditor from "./PopupEditor";

// Müşteri menüyü açtığında çıkan duyuru penceresinin ayarları.
export default async function MenuPopupPage() {
  const admin = await getAdminRestaurant();
  if (!admin) redirect("/admin/login");
  const { supabase, restaurantId } = admin;

  const [{ data: restaurant, error }, { data: categories }] = await Promise.all([
    supabase.from("restaurants").select("menu_popup, instagram_url, slug").eq("id", restaurantId).maybeSingle(),
    supabase
      .from("categories")
      .select("id, name, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true }),
  ]);

  // Sütun yoksa (veritabanı güncellenmemişse) temel bilgiler ayrı okunur.
  const { data: basics } = error
    ? await supabase.from("restaurants").select("instagram_url, slug").eq("id", restaurantId).maybeSingle()
    : { data: restaurant };

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>Açılış duyurusu</h1>
          <p>
            Müşteri menünüzü açtığında küçük bir pencere çıkar: kampanya, yeni ürün ya da “Bizi Instagram&apos;da takip
            edin” gibi. Düğmeyle bir kategoriye, Instagram&apos;a ya da bir web adresine yönlendirebilirsiniz.
          </p>
        </div>
        {basics?.slug && (
          <div className="adm-head-actions">
            <Link className="adm-btn" href={`/restoran/${basics.slug}/menu`} target="_blank">
              <AdminIcon name="external" size={16} />
              Menüde gör
            </Link>
          </div>
        )}
      </header>

      {error && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          Duyuru için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin.
        </p>
      )}

      <PopupEditor
        restaurantId={restaurantId}
        initial={normalizePopup(restaurant?.menu_popup)}
        categories={(categories ?? []).map((category) => ({ id: Number(category.id), name: String(category.name) }))}
        instagramUrl={safeUrl(basics?.instagram_url)}
      />
    </main>
  );
}
