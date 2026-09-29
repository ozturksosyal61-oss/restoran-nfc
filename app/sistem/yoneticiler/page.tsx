import Link from "next/link";
import { requireSystemAdmin } from "../../../lib/system-admin";
import AdminIcon from "../../admin/AdminIcon";
import { loadManagers, loadRestaurants } from "../data";
import { formatDateTime } from "../format";
import ManagerSearch from "./ManagerSearch";

export const dynamic = "force-dynamic";

// Tüm restoran yöneticileri ve giriş e-postaları. Şifre değiştirme, e-posta
// güncelleme ve erişim kaldırma restoranın kendi sayfasında yapılır.
export default async function YoneticilerPage() {
  const { supabase } = await requireSystemAdmin();

  const [managers, restaurants] = await Promise.all([
    loadManagers(supabase),
    loadRestaurants(supabase),
  ]);

  const restaurantById = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant]));
  const neverLoggedIn = managers.filter((manager) => !manager.last_sign_in_at).length;
  const withoutManager = restaurants.filter(
    (restaurant) => !managers.some((manager) => manager.restaurant_id === restaurant.id)
  );

  const rows = managers.map((manager) => {
    const restaurant = restaurantById.get(manager.restaurant_id);
    return {
      key: `${manager.restaurant_id}-${manager.user_id}`,
      email: manager.email ?? "E-posta okunamadı",
      restaurantId: manager.restaurant_id,
      restaurantName: restaurant?.name ?? "Silinmiş restoran",
      restaurantActive: restaurant?.is_active ?? false,
      lastLogin: formatDateTime(manager.last_sign_in_at),
      linkedAt: formatDateTime(manager.created_at),
    };
  });

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Yönetim</span>
          <h1>Yönetici hesapları</h1>
          <p>
            Restoranların işletme paneline giriş yapan hesaplar. Şifreler okunamaz; yeni şifreyi
            restoranın sayfasından belirlersiniz.
          </p>
        </div>
      </header>

      <section className="adm-stats" aria-label="Özet">
        <div className="adm-stat is-highlight">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Yönetici hesabı</span>
            <span className="adm-stat-icon"><AdminIcon name="user" size={16} /></span>
          </div>
          <span className="adm-stat-value">{managers.length}</span>
          <span className="adm-stat-hint">{restaurants.length - withoutManager.length} restorana bağlı</span>
        </div>
        <div className={`adm-stat ${neverLoggedIn > 0 ? "tone-new" : ""}`}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Hiç giriş yapmadı</span>
            <span className="adm-stat-icon"><AdminIcon name="clock" size={16} /></span>
          </div>
          <span className="adm-stat-value">{neverLoggedIn}</span>
          <span className="adm-stat-hint">Giriş bilgisi iletilmemiş olabilir</span>
        </div>
        <div className={`adm-stat ${withoutManager.length > 0 ? "tone-danger" : ""}`}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Yöneticisiz restoran</span>
            <span className="adm-stat-icon"><AdminIcon name="store" size={16} /></span>
          </div>
          <span className="adm-stat-value">{withoutManager.length}</span>
          <span className="adm-stat-hint">Paneline kimse giremiyor</span>
        </div>
      </section>

      {withoutManager.length > 0 && (
        <div className="adm-alert adm-alert-info sys-missing">
          <AdminIcon name="info" size={16} />
          <span>
            Yöneticisi olmayan restoranlar:{" "}
            {withoutManager.map((restaurant, index) => (
              <span key={restaurant.id}>
                {index > 0 && ", "}
                <Link href={`/sistem/restoran/${restaurant.id}`} className="sys-link">
                  {restaurant.name}
                </Link>
              </span>
            ))}
          </span>
        </div>
      )}

      <ManagerSearch rows={rows} />
    </main>
  );
}
