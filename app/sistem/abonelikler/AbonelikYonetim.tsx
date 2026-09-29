"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AdminIcon from "../../admin/AdminIcon";
import { ResultNote } from "../SystemUi";
import { SUBSCRIPTION_STATUS, formatDate, formatLira, subscriptionEnd } from "../format";
import type { SystemPlan, SystemSubscription } from "../data";
import { deleteSubscription, saveSubscription, type SubscriptionResult } from "./actions";

type Restaurant = {
  id: number;
  name: string;
  slug: string;
  menuOnly: boolean;
  isActive: boolean;
};

type Filter = "all" | "active" | "trial" | "expired" | "cancelled" | "none";

type Editing = {
  restaurant: Restaurant;
  subscription: SystemSubscription | null;
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "active", label: "Aktif" },
  { value: "trial", label: "Deneme" },
  { value: "expired", label: "Süresi doldu" },
  { value: "cancelled", label: "İptal" },
  { value: "none", label: "Aboneliksiz" },
];

export default function AbonelikYonetim({
  restaurants,
  plans,
  subscriptions,
  now,
}: {
  restaurants: Restaurant[];
  plans: SystemPlan[];
  subscriptions: SystemSubscription[];
  now: number;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [notice, setNotice] = useState("");

  // Her restoranın geçerli aboneliği: önce deneme / aktif, yoksa en yenisi.
  const current = useMemo(() => {
    const map = new Map<number, SystemSubscription>();
    subscriptions.forEach((item) => {
      const existing = map.get(item.restaurant_id);
      const isLive = item.status === "active" || item.status === "trial";
      const existingLive = existing && (existing.status === "active" || existing.status === "trial");
      if (!existing || (isLive && !existingLive)) map.set(item.restaurant_id, item);
    });
    return map;
  }, [subscriptions]);

  const statusOf = (restaurantId: number): Filter => current.get(restaurantId)?.status as Filter ?? "none";

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: restaurants.length, active: 0, trial: 0, expired: 0, cancelled: 0, none: 0 };
    restaurants.forEach((restaurant) => {
      const status = (current.get(restaurant.id)?.status ?? "none") as Filter;
      if (status in result) result[status] += 1;
    });
    return result;
  }, [restaurants, current]);

  const monthlyRevenue = useMemo(
    () =>
      Array.from(current.values())
        .filter((item) => item.status === "active")
        .reduce((sum, item) => {
          const plan = item.subscription_plans;
          if (!plan) return sum;
          return sum + (item.billing_interval === "yearly" ? Number(plan.yearly_price) / 12 : Number(plan.monthly_price));
        }, 0),
    [current]
  );

  const query = search.trim().toLocaleLowerCase("tr-TR");
  const visible = restaurants.filter(
    (restaurant) =>
      (filter === "all" || statusOf(restaurant.id) === filter) &&
      (!query || restaurant.name.toLocaleLowerCase("tr-TR").includes(query))
  );

  // Bildirim birkaç saniye sonra kaybolur.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Yönetim</span>
          <h1>Abonelikler</h1>
          <p>Restoranların paketleri, deneme süreleri ve yenileme tarihleri.</p>
        </div>
      </header>

      {notice && (
        <p className="adm-alert adm-alert-ok" role="status" style={{ margin: 0 }}>
          <AdminIcon name="check" size={16} />
          {notice}
        </p>
      )}

      <section className="adm-stats" aria-label="Abonelik özeti">
        <div className="adm-stat is-highlight">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Aylık gelir</span>
            <span className="adm-stat-icon"><AdminIcon name="lira" size={16} /></span>
          </div>
          <span className="adm-stat-value">{formatLira(monthlyRevenue)}</span>
          <span className="adm-stat-hint">Aktif aboneliklerden · yıllıklar 12&apos;ye bölünür</span>
        </div>
        <div className="adm-stat tone-ok">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Aktif</span>
            <span className="adm-stat-icon"><AdminIcon name="check" size={16} /></span>
          </div>
          <span className="adm-stat-value">{counts.active}</span>
          <span className="adm-stat-hint">{counts.trial} restoran denemede</span>
        </div>
        <div className={`adm-stat ${counts.expired > 0 ? "tone-danger" : ""}`}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Süresi doldu</span>
            <span className="adm-stat-icon"><AdminIcon name="clock" size={16} /></span>
          </div>
          <span className="adm-stat-value">{counts.expired}</span>
          <span className="adm-stat-hint">{counts.cancelled} iptal edildi</span>
        </div>
        <div className={`adm-stat ${counts.none > 0 ? "tone-new" : ""}`}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">Aboneliksiz</span>
            <span className="adm-stat-icon"><AdminIcon name="store" size={16} /></span>
          </div>
          <span className="adm-stat-value">{counts.none}</span>
          <span className="adm-stat-hint">Paket tanımlanmamış restoran</span>
        </div>
      </section>

      <div className="adm-toolbar-row">
        <nav className="adm-chips" aria-label="Abonelik durumuna göre filtrele">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`adm-chip ${filter === item.value ? "is-active" : ""}`}
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <b>{counts[item.value]}</b>
            </button>
          ))}
        </nav>
        <label className="adm-input-group sys-search">
          <AdminIcon name="search" size={16} />
          <input
            id="abonelik-ara"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Restoran ara"
            aria-label="Restoran ara"
            autoComplete="off"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="card" /></span>
          <strong>Gösterilecek restoran yok</strong>
          <p>Filtreyi ya da aramayı değiştirin.</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Restoran</th>
                <th>Paket</th>
                <th>Durum</th>
                <th>Dönem</th>
                <th>Bitiş</th>
                <th aria-label="İşlem" />
              </tr>
            </thead>
            <tbody>
              {visible.map((restaurant) => {
                const subscription = current.get(restaurant.id) ?? null;
                const status = subscription ? SUBSCRIPTION_STATUS[subscription.status] : null;
                const { end, daysLeft } = subscription
                  ? subscriptionEnd(subscription, now)
                  : { end: null, daysLeft: null };
                const live = subscription?.status === "active" || subscription?.status === "trial";

                return (
                  <tr key={restaurant.id}>
                    <td>
                      <Link href={`/sistem/restoran/${restaurant.id}`} className="sys-link">
                        <strong>{restaurant.name}</strong>
                      </Link>
                      <div className="adm-muted" style={{ fontSize: 12 }}>
                        {restaurant.menuOnly ? "Sadece menü" : "Premium"}
                        {!restaurant.isActive && " · kapalı"}
                      </div>
                    </td>
                    <td>{subscription?.subscription_plans?.name ?? <span className="adm-muted">—</span>}</td>
                    <td>
                      {status ? (
                        <span className={`adm-badge is-dot ${status.tone}`}>{status.label}</span>
                      ) : (
                        <span className="adm-badge">Abonelik yok</span>
                      )}
                    </td>
                    <td className="adm-muted">
                      {subscription ? (subscription.billing_interval === "yearly" ? "Yıllık" : "Aylık") : "—"}
                    </td>
                    <td>
                      {end ? (
                        <>
                          {formatDate(end)}
                          {live && daysLeft !== null && (
                            <span className={`sys-days ${daysLeft <= 7 ? "is-soon" : ""}`}>{daysLeft} gün</span>
                          )}
                        </>
                      ) : (
                        <span className="adm-muted">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className={`adm-btn adm-btn-sm ${subscription ? "" : "adm-btn-primary"}`}
                        onClick={() => setEditing({ restaurant, subscription })}
                        disabled={plans.length === 0}
                      >
                        <AdminIcon name={subscription ? "edit" : "plus"} size={14} />
                        {subscription ? "Düzenle" : "Abonelik başlat"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {plans.length === 0 && (
        <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
          <AdminIcon name="info" size={16} />
          Veritabanında paket (subscription_plans) tanımlı değil; abonelik oluşturmak için önce paket ekleyin.
        </p>
      )}

      {editing && (
        <SubscriptionDialog
          key={`${editing.restaurant.id}-${editing.subscription?.id ?? "yeni"}`}
          editing={editing}
          plans={plans}
          onClose={() => setEditing(null)}
          onDone={(message) => {
            setEditing(null);
            setNotice(message);
          }}
        />
      )}
    </main>
  );
}

function SubscriptionDialog({
  editing,
  plans,
  onClose,
  onDone,
}: {
  editing: Editing;
  plans: SystemPlan[];
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { restaurant, subscription } = editing;
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [saveResult, saveAction, saving] = useActionState(
    async (prev: SubscriptionResult, formData: FormData) => {
      const result = await saveSubscription(prev, formData);
      if (result?.ok) onDone(result.message);
      return result;
    },
    null
  );

  const [deleteResult, deleteAction, deleting] = useActionState(
    async (prev: SubscriptionResult, formData: FormData) => {
      const result = await deleteSubscription(prev, formData);
      if (result?.ok) onDone(result.message);
      return result;
    },
    null
  );

  // Kapatma işlevi her çizimde yeniden oluşur; odak yalnızca açılışta alınsın.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    panelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="adm-modal-root" role="dialog" aria-modal="true" aria-labelledby="abonelik-pencere">
      <button type="button" className="adm-modal-backdrop" aria-label="Kapat" tabIndex={-1} onClick={onClose} />
      <div className="adm-modal" ref={panelRef} tabIndex={-1}>
        <div className="adm-card-head">
          <div>
            <span className="adm-eyebrow">{subscription ? "Aboneliği düzenle" : "Yeni abonelik"}</span>
            <h2 id="abonelik-pencere">{restaurant.name}</h2>
          </div>
          <button type="button" className="adm-btn adm-btn-icon adm-btn-ghost" onClick={onClose} aria-label="Kapat">
            <AdminIcon name="close" />
          </button>
        </div>

        {subscription && (
          <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
            <AdminIcon name="info" size={16} />
            Aktif ya da deneme olarak kaydettiğinizde dönem bugünden yeniden başlar.
          </p>
        )}

        <form action={saveAction} className="adm-form">
          <input type="hidden" name="restaurant_id" value={restaurant.id} />
          {subscription && <input type="hidden" name="subscription_id" value={subscription.id} />}

          <div className="adm-field">
            <label className="adm-label" htmlFor="abonelik-paket">Paket</label>
            <select
              id="abonelik-paket"
              name="plan_id"
              className="adm-select"
              defaultValue={subscription?.plan_id ?? plans[0]?.id}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {formatLira(plan.monthly_price)}/ay · {formatLira(plan.yearly_price)}/yıl
                </option>
              ))}
            </select>
          </div>

          <div className="adm-form-grid">
            <div className="adm-field">
              <label className="adm-label" htmlFor="abonelik-durum">Durum</label>
              <select
                id="abonelik-durum"
                name="status"
                className="adm-select"
                defaultValue={subscription?.status ?? "trial"}
              >
                <option value="trial">Deneme (14 gün)</option>
                <option value="active">Aktif</option>
                <option value="cancelled">İptal</option>
                <option value="expired">Süresi doldu</option>
              </select>
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="abonelik-donem">Ödeme dönemi</label>
              <select
                id="abonelik-donem"
                name="billing_interval"
                className="adm-select"
                defaultValue={subscription?.billing_interval ?? "monthly"}
              >
                <option value="monthly">Aylık</option>
                <option value="yearly">Yıllık</option>
              </select>
            </div>
          </div>

          <ResultNote result={saveResult?.ok ? null : saveResult} />

          <button type="submit" className="adm-btn adm-btn-primary adm-btn-lg adm-btn-block" disabled={saving}>
            <AdminIcon name="save" size={16} />
            {saving ? "Kaydediliyor…" : subscription ? "Değişiklikleri kaydet" : "Aboneliği başlat"}
          </button>
        </form>

        {subscription && (
          <>
            <div className="adm-divider" />
            {!confirmDelete ? (
              <button
                type="button"
                className="adm-btn adm-btn-ghost adm-text-danger adm-btn-block"
                onClick={() => setConfirmDelete(true)}
              >
                <AdminIcon name="trash" size={15} />
                Abonelik kaydını sil
              </button>
            ) : (
              <form action={deleteAction} className="sys-delete">
                <input type="hidden" name="subscription_id" value={subscription.id} />
                <p>
                  Kayıt kalıcı olarak silinir. Ödeme kaydı olan abonelikler silinemez; onları
                  &ldquo;İptal&rdquo; durumuna alın.
                </p>
                <div className="sys-inline">
                  <button type="button" className="adm-btn" onClick={() => setConfirmDelete(false)}>
                    Vazgeç
                  </button>
                  <button type="submit" className="adm-btn adm-btn-danger" disabled={deleting}>
                    {deleting ? "Siliniyor…" : "Kalıcı olarak sil"}
                  </button>
                </div>
                <ResultNote result={deleteResult?.ok ? null : deleteResult} />
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
