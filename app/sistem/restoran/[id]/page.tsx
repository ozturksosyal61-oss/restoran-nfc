import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSystemAdmin } from "../../../../lib/system-admin";
import { getRestaurantThemeMeta } from "../../../../lib/themes";
import AdminIcon from "../../../admin/AdminIcon";
import {
  currentSubscription,
  loadManagers,
  loadPlans,
  loadRestaurants,
  loadSubscriptions,
  loadTableCounts,
} from "../../data";
import { SUBSCRIPTION_STATUS, formatDate, initialOf, subscriptionEnd } from "../../format";
import ManagerAccess from "./ManagerAccess";
import { DangerZone, RestaurantSettings } from "./RestaurantControls";

export const dynamic = "force-dynamic";

export default async function SystemRestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurantId = Number(id);
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) notFound();

  const { supabase } = await requireSystemAdmin();

  const [[restaurant], managers, plans, subscriptions, tableCounts] = await Promise.all([
    loadRestaurants(supabase, restaurantId),
    loadManagers(supabase, restaurantId),
    loadPlans(supabase),
    loadSubscriptions(supabase, restaurantId),
    loadTableCounts(supabase),
  ]);

  if (!restaurant) notFound();

  const subscription = currentSubscription(subscriptions, restaurant.id);
  const status = subscription ? SUBSCRIPTION_STATUS[subscription.status] : null;
  const { end, daysLeft } = subscription
    ? subscriptionEnd(subscription)
    : { end: null, daysLeft: null };
  const tables = tableCounts.get(restaurant.id) ?? { total: 0, active: 0 };
  const theme = getRestaurantThemeMeta(restaurant.theme);
  const publicPath = restaurant.menu_only
    ? `/restoran/${restaurant.slug}/menu`
    : `/restoran/${restaurant.slug}`;

  return (
    <main className="adm-page">
      <Link className="adm-back" href="/sistem">
        <AdminIcon name="arrowLeft" size={15} />
        Restoranlar
      </Link>

      <header className="adm-head">
        <div className="sys-title">
          <span className="sys-logo sys-logo-lg" aria-hidden="true">
            {restaurant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.logo_url} alt="" />
            ) : (
              initialOf(restaurant.name)
            )}
          </span>
          <div className="adm-head-text">
            <span className="adm-eyebrow">Restoran #{restaurant.id}</span>
            <h1>{restaurant.name}</h1>
            <div className="sys-badges">
              <span className={`adm-badge is-dot ${restaurant.is_active ? "s-ok" : "s-danger"}`}>
                {restaurant.is_active ? "Yayında" : "Devre dışı"}
              </span>
              <span className={`adm-badge ${restaurant.menu_only ? "s-accent" : ""}`}>
                {restaurant.menu_only ? "Sadece menü" : "Premium"}
              </span>
              {status && (
                <span className={`adm-badge ${status.tone}`}>
                  {subscription?.subscription_plans?.name ?? "Paket"} · {status.label}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="adm-head-actions">
          <a className="adm-btn" href={publicPath} target="_blank" rel="noopener noreferrer">
            <AdminIcon name="external" size={16} />
            {restaurant.menu_only ? "Menüyü aç" : "Müşteri sayfası"}
          </a>
        </div>
      </header>

      <div className="adm-split">
        <div className="sys-stack">
          <ManagerAccess
            restaurantId={restaurant.id}
            managers={managers.map((manager) => ({
              user_id: manager.user_id,
              email: manager.email,
              role: manager.role,
              last_sign_in_at: manager.last_sign_in_at,
              created_at: manager.created_at,
            }))}
          />

          <RestaurantSettings
            restaurantId={restaurant.id}
            menuOnly={restaurant.menu_only}
            theme={theme.value}
            plans={plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              monthly_price: plan.monthly_price,
            }))}
            subscription={
              subscription
                ? {
                    id: subscription.id,
                    plan_id: subscription.plan_id,
                    status: subscription.status,
                    billing_interval: subscription.billing_interval,
                  }
                : null
            }
          />
        </div>

        <div className="sys-stack adm-sticky-card">
          <section className="adm-card" aria-labelledby="ozet-baslik">
            <h2 id="ozet-baslik" className="sys-card-title">Özet</h2>
            <dl className="sys-facts">
              <div>
                <dt>Adres</dt>
                <dd>
                  <a href={publicPath} target="_blank" rel="noopener noreferrer" className="sys-link">
                    {publicPath}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Tema</dt>
                <dd>
                  <span
                    className="sys-dot"
                    style={{ background: theme.surface, borderColor: theme.accent }}
                    aria-hidden="true"
                  />
                  {theme.label}
                </dd>
              </div>
              <div>
                <dt>Masalar</dt>
                <dd>
                  {restaurant.menu_only
                    ? "Tek QR · masa yok"
                    : `${tables.active} aktif / ${tables.total}`}
                </dd>
              </div>
              <div>
                <dt>Abonelik</dt>
                <dd>
                  {subscription
                    ? `${status?.label ?? subscription.status} · ${
                        subscription.billing_interval === "yearly" ? "yıllık" : "aylık"
                      }`
                    : "Yok"}
                </dd>
              </div>
              {end && (
                <div>
                  <dt>Bitiş</dt>
                  <dd>
                    {formatDate(end)}
                    {daysLeft !== null && (
                      <span className={`sys-days ${daysLeft <= 7 ? "is-soon" : ""}`}>
                        {daysLeft} gün
                      </span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt>Yönetici</dt>
                <dd>{managers.length} hesap</dd>
              </div>
            </dl>
            <Link className="adm-btn adm-btn-sm adm-btn-block" href="/sistem/abonelikler">
              <AdminIcon name="card" size={15} />
              Abonelik ayrıntıları
            </Link>
          </section>

          <DangerZone
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            isActive={restaurant.is_active}
          />
        </div>
      </div>
    </main>
  );
}
