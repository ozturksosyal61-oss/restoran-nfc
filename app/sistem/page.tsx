import Link from "next/link";
import { requireSystemAdmin } from "../../lib/system-admin";
import { getRestaurantThemeMeta } from "../../lib/themes";
import AdminIcon from "../admin/AdminIcon";
import { createSupabaseAdminClient } from "../../lib/supabase-admin";
import { currentSubscription, loadManagers, loadRestaurants, loadSubscriptions } from "./data";
import { SUBSCRIPTION_STATUS, subscriptionEnd } from "./format";
import RestaurantDirectory, { type DirectoryRow } from "./RestaurantDirectory";

export const dynamic = "force-dynamic";

export default async function SystemOwnerPage({
  searchParams,
}: {
  searchParams: Promise<{ silindi?: string }>;
}) {
  const { supabase } = await requireSystemAdmin();
  const { silindi } = await searchParams;

  const [restaurants, subscriptions, managers] = await Promise.all([
    loadRestaurants(supabase),
    loadSubscriptions(supabase),
    loadManagers(supabase),
  ]);

  // Müşteri demoları kendi sayfasında listelenir (tablo yoksa hepsi gösterilir).
  const { data: demoRows } = await createSupabaseAdminClient().from("prospect_demos").select("restaurant_id");
  const demoIds = new Set((demoRows ?? []).map((row) => Number(row.restaurant_id)));

  const rows: DirectoryRow[] = restaurants.filter((restaurant) => !demoIds.has(Number(restaurant.id))).map((restaurant) => {
    const subscription = currentSubscription(subscriptions, restaurant.id);
    const status = subscription ? SUBSCRIPTION_STATUS[subscription.status] : null;
    const { end, daysLeft } =
      subscription && (subscription.status === "trial" || subscription.status === "active")
        ? subscriptionEnd(subscription)
        : { end: null, daysLeft: null };
    const theme = getRestaurantThemeMeta(restaurant.theme);

    return {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      logoUrl: restaurant.logo_url,
      isActive: restaurant.is_active,
      menuOnly: restaurant.menu_only,
      themeLabel: theme.label,
      themeSurface: theme.surface,
      themeAccent: theme.accent,
      planName: subscription?.subscription_plans?.name ?? null,
      statusLabel: status?.label ?? (subscription ? subscription.status : null),
      statusTone: status?.tone ?? null,
      endDate: end,
      daysLeft,
      managerEmails: managers
        .filter((manager) => manager.restaurant_id === restaurant.id)
        .map((manager) => manager.email ?? "E-posta okunamadı"),
    };
  });

  const liveCount = rows.filter((row) => row.isActive).length;
  const menuOnlyCount = rows.filter((row) => row.menuOnly).length;
  const paidCount = rows.filter((row) => row.statusLabel === "Aktif").length;
  const trialCount = rows.filter((row) => row.statusLabel === "Deneme").length;
  const soonCount = rows.filter((row) => row.daysLeft !== null && row.daysLeft <= 7).length;
  const noManagerCount = rows.filter((row) => row.managerEmails.length === 0).length;

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Sistem paneli</span>
          <h1>Restoranlar</h1>
          <p>Hizmet verdiğiniz tüm işletmeler, abonelikleri ve yönetici hesapları.</p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn" href="/sistem/demolar">
            <AdminIcon name="sparkle" size={16} />
            Müşteri demoları{demoIds.size > 0 ? ` (${demoIds.size})` : ""}
          </Link>
          <Link className="adm-btn" href="/sistem/abonelikler">
            <AdminIcon name="card" size={16} />
            Abonelikler
          </Link>
          <Link className="adm-btn adm-btn-primary" href="/sistem/yeni-restoran">
            <AdminIcon name="plus" size={16} />
            Yeni restoran
          </Link>
        </div>
      </header>

      {silindi === "1" && (
        <p className="adm-alert adm-alert-ok" role="status" style={{ margin: 0 }}>
          <AdminIcon name="check" size={16} />
          Restoran ve bağlı kayıtları kalıcı olarak silindi.
        </p>
      )}

      <section className="adm-stats" aria-label="Özet">
        <div className="adm-stat is-highlight">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Restoran</span>
            <span className="adm-stat-icon"><AdminIcon name="store" size={16} /></span>
          </div>
          <span className="adm-stat-value">{rows.length}</span>
          <span className="adm-stat-hint">{liveCount} yayında · {rows.length - liveCount} kapalı</span>
        </div>
        <div className="adm-stat tone-ok">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Ücretli abonelik</span>
            <span className="adm-stat-icon"><AdminIcon name="wallet" size={16} /></span>
          </div>
          <span className="adm-stat-value">{paidCount}</span>
          <span className="adm-stat-hint">{trialCount} restoran denemede</span>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Sadece menü</span>
            <span className="adm-stat-icon"><AdminIcon name="menu" size={16} /></span>
          </div>
          <span className="adm-stat-value">{menuOnlyCount}</span>
          <span className="adm-stat-hint">{rows.length - menuOnlyCount} premium restoran</span>
        </div>
        <div className={`adm-stat ${soonCount > 0 ? "tone-new" : ""}`}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Süresi yaklaşan</span>
            <span className="adm-stat-icon"><AdminIcon name="clock" size={16} /></span>
          </div>
          <span className="adm-stat-value">{soonCount}</span>
          <span className="adm-stat-hint">7 gün içinde bitecek</span>
        </div>
      </section>

      {noManagerCount > 0 && (
        <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
          <AdminIcon name="info" size={16} />
          {noManagerCount} restoranın yöneticisi yok; işletme paneline kimse giremiyor. Restoranı açıp
          &ldquo;Yönetici ekle&rdquo; ile hesap tanımlayabilirsiniz.
        </p>
      )}

      <RestaurantDirectory rows={rows} />
    </main>
  );
}
