"use client";

import {
  useMemo,
  useState,
} from "react";

type Restaurant = {
  id: number;
  name: string;
  slug: string;
};

type Plan = {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  yearly_price: number;
};

type Subscription = {
  id: string;
  restaurant_id: number;
  plan_id: string;
  status: string;
  billing_interval: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  subscription_plans?: {
    id: string;
    name: string;
    slug: string;
    monthly_price: number;
    yearly_price: number;
  } | null;
};

type Props = {
  restaurants: Restaurant[];
  plans: Plan[];
  subscriptions: Subscription[];
  updateSubscription: (
    formData: FormData
  ) => Promise<void>;
  createSubscription: (
    formData: FormData
  ) => Promise<void>;
  deleteSubscription: (
    formData: FormData
  ) => Promise<void>;
};

const statusLabels: Record<
  string,
  string
> = {
  trial: "Ücretsiz Deneme",
  active: "Aktif",
  cancelled: "İptal Edildi",
  expired: "Süresi Doldu",
};

const statusClass: Record<
  string,
  string
> = {
  trial: "trial",
  active: "active",
  cancelled: "cancelled",
  expired: "expired",
};

function formatDate(
  value: string | null
) {
  if (!value) return "—";

  return new Date(
    value
  ).toLocaleDateString(
    "tr-TR"
  );
}

function getEndDate(
  subscription: Subscription
) {
  if (
    subscription.status ===
    "trial"
  ) {
    return subscription.trial_ends_at;
  }

  return subscription.current_period_end;
}

function getRemainingDays(
  subscription: Subscription
) {
  const end =
    getEndDate(subscription);

  if (!end) return null;

  const diff =
    new Date(end).getTime() -
    Date.now();

  return Math.max(
    0,
    Math.ceil(
      diff /
        (1000 * 60 * 60 * 24)
    )
  );
}

export default function AbonelikYonetim({
  restaurants,
  plans,
  subscriptions,
  updateSubscription,
  createSubscription,
  deleteSubscription,
}: Props) {
  const [
    selectedSubscription,
    setSelectedSubscription,
  ] =
    useState<Subscription | null>(
      null
    );

  const [
    showCreate,
    setShowCreate,
  ] = useState(false);
  const [
  search,
  setSearch,
] = useState("");

const [
  filter,
  setFilter,
] =
  useState("all");

  const activeCount =
    subscriptions.filter(
      (item) =>
        item.status ===
        "active"
    ).length;

  const trialCount =
    subscriptions.filter(
      (item) =>
        item.status ===
        "trial"
    ).length;

  const expiredCount =
    subscriptions.filter(
      (item) =>
        item.status ===
        "expired"
    ).length;

  const cancelledCount =
    subscriptions.filter(
      (item) =>
        item.status ===
        "cancelled"
    ).length;

  const currentRestaurantIds =
    new Set(
      subscriptions.map(
        (item) =>
          item.restaurant_id
      )
    );
    const filteredRestaurants =
  useMemo(() => {
    const query =
      search
        .trim()
        .toLocaleLowerCase(
          "tr-TR"
        );

    return restaurants.filter(
      (restaurant) => {
        const subscription =
          subscriptions.find(
            (item) =>
              item.restaurant_id ===
              restaurant.id
          );

        const matchesSearch =
          !query ||
          restaurant.name
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(query);

        let matchesFilter =
          true;

        if (
          filter !== "all"
        ) {
          if (
            filter ===
            "none"
          ) {
            matchesFilter =
              !subscription;
          } else {
            matchesFilter =
              subscription?.status ===
              filter;
          }
        }

        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );
  }, [
    restaurants,
    subscriptions,
    search,
    filter,
  ]);

  return (
    <main className="subscription-admin">
      <div className="subscription-container">

        {/* HEADER */}

        <header className="subscription-header">
          <div>
            <div className="eyebrow">
              OZT DIGITAL MENU
            </div>

            <h1>
              Abonelik Yönetimi
            </h1>

            <p>
              Tüm restoranların
              aboneliklerini merkezi
              olarak yönetin.
            </p>
          </div>

          <button
            type="button"
            className="create-button"
            onClick={() =>
              setShowCreate(
                true
              )
            }
          >
            ＋ Yeni Abonelik
          </button>
        </header>

        {/* STATS */}

        <section className="stats">

          <div className="stat">
            <span>TOPLAM</span>
            <strong>
              {
                subscriptions.length
              }
            </strong>
            <small>
              abonelik kaydı
            </small>
          </div>

          <div className="stat active-stat">
            <span>AKTİF</span>
            <strong>
              {activeCount}
            </strong>
            <small>
              ücretli abonelik
            </small>
          </div>

          <div className="stat trial-stat">
            <span>TRIAL</span>
            <strong>
              {trialCount}
            </strong>
            <small>
              ücretsiz deneme
            </small>
          </div>

          <div className="stat danger-stat">
            <span>SÜRESİ DOLAN</span>
            <strong>
              {expiredCount}
            </strong>
            <small>
              abonelik
            </small>
          </div>

          <div className="stat">
            <span>İPTAL</span>
            <strong>
              {cancelledCount}
            </strong>
            <small>
              abonelik
            </small>
          </div>

        </section>

        {/* RESTAURANT LIST */}

        <section className="list-section">

          <div className="section-title">
            <div className="filters">
  <input
    value={search}
    onChange={(event) =>
      setSearch(
        event.target.value
      )
    }
    placeholder="Restoran ara..."
  />

  <select
    value={filter}
    onChange={(event) =>
      setFilter(
        event.target.value
      )
    }
  >
    <option value="all">
      Tümü
    </option>

    <option value="trial">
      Ücretsiz Deneme
    </option>

    <option value="active">
      Aktif
    </option>

    <option value="expired">
      Süresi Doldu
    </option>

    <option value="cancelled">
      İptal Edildi
    </option>

    <option value="none">
      Aboneliksiz
    </option>
  </select>
</div>
            <div>
              <span>
                RESTORANLAR
              </span>

              <h2>
                Abonelikler
              </h2>
            </div>

            <div className="count">
              {
                restaurants.length
              } restoran
            </div>
          </div>

          <div className="subscription-list">

            {filteredRestaurants.map(
              (restaurant) => {

                const restaurantSubscriptions =
                  subscriptions.filter(
                    (item) =>
                      item.restaurant_id ===
                      restaurant.id
                  );

                const subscription =
                  restaurantSubscriptions[0];

                return (
                  <article
                    key={
                      restaurant.id
                    }
                    className="subscription-card"
                  >

                    <div className="restaurant-info">

                      <div className="restaurant-icon">
                        🏪
                      </div>

                      <div>
                        <h3>
                          {
                            restaurant.name
                          }
                        </h3>

                        <p>
                          /restoran/
                          {
                            restaurant.slug
                          }
                        </p>
                      </div>

                    </div>

                    {!subscription ? (

                      <div className="no-subscription">
                        <span>
                          ⚪
                        </span>

                        <div>
                          <strong>
                            Abonelik yok
                          </strong>

                          <small>
                            Bu restoranın
                            henüz aktif
                            aboneliği
                            bulunmuyor.
                          </small>
                        </div>
                      </div>

                    ) : (

                      <>
                        <div className="subscription-status">

                          <span
                            className={`status-badge ${
                              statusClass[
                                subscription.status
                              ] || ""
                            }`}
                          >
                            ●{" "}
                            {
                              statusLabels[
                                subscription.status
                              ] ||
                              subscription.status
                            }
                          </span>

                          <strong>
                            {
                              subscription
                                .subscription_plans
                                ?.name ||
                              "Paket"
                            }
                          </strong>

                        </div>

                        <div className="subscription-details">

                          <div>
                            <span>
                              PERİYOT
                            </span>

                            <strong>
                              {subscription.billing_interval ===
                              "yearly"
                                ? "Yıllık"
                                : "Aylık"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              BİTİŞ
                            </span>

                            <strong>
                              {formatDate(
                                getEndDate(
                                  subscription
                                )
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              KALAN
                            </span>

                            <strong>
                              {getRemainingDays(
                                subscription
                              ) !==
                              null
                                ? `${getRemainingDays(
                                    subscription
                                  )} gün`
                                : "—"}
                            </strong>
                          </div>

                        </div>

                        <div className="card-actions">

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSubscription(
                                subscription
                              )
                            }
                            className="manage-button"
                          >
                            ⚙️ Yönet
                          </button>

                        </div>
                      </>
                    )}

                  </article>
                );
              }
            )}

          </div>
        </section>

        {/* CREATE MODAL */}

        {showCreate && (
          <div className="modal-backdrop">

            <div className="modal">

              <div className="modal-header">

                <div>
                  <span>
                    YENİ KAYIT
                  </span>

                  <h2>
                    Abonelik Oluştur
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(
                      false
                    )
                  }
                  className="close-button"
                >
                  ×
                </button>

              </div>

              <form
                action={
                  createSubscription
                }
                className="form"
              >

                <label>
                  Restoran

                  <select
                    name="restaurant_id"
                    required
                  >
                    <option value="">
                      Restoran seçin
                    </option>

                    {restaurants.map(
                      (restaurant) => (
                        <option
                          key={
                            restaurant.id
                          }
                          value={
                            restaurant.id
                          }
                        >
                          {
                            restaurant.name
                          }
                          {
                            currentRestaurantIds.has(
                              restaurant.id
                            )
                              ? " — mevcut abonelik var"
                              : ""
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Paket

                  <select
                    name="plan_id"
                    required
                    defaultValue={
                      plans[0]?.id
                    }
                  >
                    {plans.map(
                      (plan) => (
                        <option
                          key={plan.id}
                          value={plan.id}
                        >
                          {
                            plan.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Durum

                  <select
                    name="status"
                    defaultValue="trial"
                  >
                    <option value="trial">
                      Ücretsiz Deneme
                    </option>

                    <option value="active">
                      Aktif
                    </option>

                    <option value="cancelled">
                      İptal Edildi
                    </option>

                    <option value="expired">
                      Süresi Doldu
                    </option>
                  </select>
                </label>

                <label>
                  Ödeme Periyodu

                  <select
                    name="billing_interval"
                    defaultValue="monthly"
                  >
                    <option value="monthly">
                      Aylık
                    </option>

                    <option value="yearly">
                      Yıllık
                    </option>
                  </select>
                </label>

                <button
                  type="submit"
                  className="save-button"
                >
                  Aboneliği Oluştur
                </button>

              </form>

            </div>
          </div>
        )}

        {/* EDIT MODAL */}

        {selectedSubscription && (
          <div className="modal-backdrop">

            <div className="modal">

              <div className="modal-header">

                <div>
                  <span>
                    ABONELİK YÖNETİMİ
                  </span>

                  <h2>
                    {
                      restaurants.find(
                        (r) =>
                          r.id ===
                          selectedSubscription.restaurant_id
                      )?.name
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedSubscription(
                      null
                    )
                  }
                  className="close-button"
                >
                  ×
                </button>

              </div>

              <div className="current-box">

                <span>
                  MEVCUT DURUM
                </span>

                <strong>
                  {
                    statusLabels[
                      selectedSubscription
                        .status
                    ]
                  }
                </strong>

                <small>
                  {
                    selectedSubscription
                      .subscription_plans
                      ?.name
                  }
                </small>

              </div>

              <form
                action={
                  updateSubscription
                }
                className="form"
              >

                <input
                  type="hidden"
                  name="subscription_id"
                  value={
                    selectedSubscription.id
                  }
                />

                <input
                  type="hidden"
                  name="restaurant_id"
                  value={
                    selectedSubscription.restaurant_id
                  }
                />

                <label>
                  Paket

                  <select
                    name="plan_id"
                    defaultValue={
                      selectedSubscription.plan_id
                    }
                  >
                    {plans.map(
                      (plan) => (
                        <option
                          key={plan.id}
                          value={plan.id}
                        >
                          {
                            plan.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Durum

                  <select
                    name="status"
                    defaultValue={
                      selectedSubscription.status
                    }
                  >
                    <option value="trial">
                      Ücretsiz Deneme
                    </option>

                    <option value="active">
                      Aktif
                    </option>

                    <option value="cancelled">
                      İptal Edildi
                    </option>

                    <option value="expired">
                      Süresi Doldu
                    </option>
                  </select>
                </label>

                <label>
                  Ödeme Periyodu

                  <select
                    name="billing_interval"
                    defaultValue={
                      selectedSubscription.billing_interval
                    }
                  >
                    <option value="monthly">
                      Aylık
                    </option>

                    <option value="yearly">
                      Yıllık
                    </option>
                  </select>
                </label>

                <button
                  type="submit"
                  className="save-button"
                >
                  Değişiklikleri Kaydet
                </button>

              </form>

              <form
                action={
                  deleteSubscription
                }
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      "Bu abonelik kaydı kalıcı olarak silinsin mi?"
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input
                  type="hidden"
                  name="subscription_id"
                  value={
                    selectedSubscription.id
                  }
                />

                <button
                  type="submit"
                  className="delete-button"
                >
                  🗑 Abonelik Kaydını Sil
                </button>
              </form>

            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .subscription-admin {
          min-height: 100vh;
          background: #f4f2ed;
          color: #171717;
          padding: 40px 20px 80px;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .subscription-container {
          width: min(1200px, 100%);
          margin: auto;
        }

        .subscription-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 30px;
        }

        .eyebrow {
          color: #ad7b12;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }

        .subscription-header h1 {
          margin: 0;
          font-size: 34px;
          letter-spacing: -1px;
        }

        .subscription-header p {
          margin: 10px 0 0;
          color: #777;
          font-size: 14px;
        }

        button {
          font-family: inherit;
        }

        .create-button {
          border: 0;
          border-radius: 12px;
          padding: 13px 18px;
          background: #171717;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .stats {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 40px;
        }

        .stat {
          background: white;
          border: 1px solid #e5dfd5;
          border-radius: 18px;
          padding: 20px;
        }

        .stat span {
          display: block;
          color: #888;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .stat strong {
          display: block;
          font-size: 28px;
          margin-top: 7px;
        }

        .stat small {
          display: block;
          margin-top: 4px;
          color: #999;
        }

        .active-stat {
          background: #f1faf3;
        }

        .trial-stat {
          background: #fff8e6;
        }

        .danger-stat {
          background: #fff1ef;
        }

        .section-title {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 18px;
        }

        .section-title span {
          color: #ad7b12;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.8px;
        }

        .section-title h2 {
          margin: 5px 0 0;
          font-size: 25px;
        }

        .count {
          background: white;
          border: 1px solid #e4ded5;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .subscription-list {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .subscription-card {
          background: white;
          border: 1px solid #e3ddd4;
          border-radius: 20px;
          padding: 20px;
          box-shadow:
            0 10px 30px
              rgba(0, 0, 0, 0.04);
        }

        .restaurant-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .restaurant-icon {
          width: 46px;
          height: 46px;
          border-radius: 13px;
          background: #fff5d9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .restaurant-info h3 {
          margin: 0;
          font-size: 19px;
        }

        .restaurant-info p {
          margin: 4px 0 0;
          color: #999;
          font-size: 11px;
        }

        .subscription-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #eee9e1;
        }

        .subscription-status strong {
          font-size: 15px;
        }

        .status-badge {
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 900;
        }

        .status-badge.active {
          background: #e9f8ed;
          color: #23753a;
        }

        .status-badge.trial {
          background: #fff4d5;
          color: #956c00;
        }

        .status-badge.cancelled {
          background: #f1eeee;
          color: #777;
        }

        .status-badge.expired {
          background: #ffeceb;
          color: #a52e27;
        }

        .subscription-details {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 10px;
          margin-top: 15px;
        }

        .subscription-details div {
          background: #f8f6f2;
          border-radius: 11px;
          padding: 11px;
        }

        .subscription-details span {
          display: block;
          color: #999;
          font-size: 9px;
          font-weight: 800;
        }

        .subscription-details strong {
          display: block;
          margin-top: 5px;
          font-size: 12px;
        }

        .card-actions {
          margin-top: 14px;
        }

        .manage-button {
          width: 100%;
          border: 0;
          border-radius: 11px;
          padding: 12px;
          background: #171717;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .no-subscription {
          display: flex;
          gap: 10px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #eee9e1;
        }

        .no-subscription strong {
          display: block;
        }

        .no-subscription small {
          display: block;
          margin-top: 4px;
          color: #999;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background:
            rgba(20, 18, 14, 0.55);
        }

        .modal {
          width: min(520px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 22px;
          padding: 25px;
          box-shadow:
            0 30px 80px
              rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .modal-header span {
          color: #ad7b12;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .modal-header h2 {
          margin: 6px 0 0;
          font-size: 23px;
        }

        .close-button {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 10px;
          background: #f2f0ec;
          font-size: 23px;
          cursor: pointer;
        }

        .current-box {
          background: #f7f4ed;
          border-radius: 14px;
          padding: 15px;
          margin-bottom: 18px;
        }

        .current-box span {
          display: block;
          color: #999;
          font-size: 9px;
          font-weight: 900;
        }

        .current-box strong {
          display: block;
          margin-top: 5px;
        }

        .current-box small {
          display: block;
          margin-top: 3px;
          color: #888;
        }

        .form {
          display: grid;
          gap: 15px;
        }

        .form label {
          display: grid;
          gap: 7px;
          color: #555;
          font-size: 11px;
          font-weight: 800;
        }

        .form select {
          width: 100%;
          padding: 13px;
          border: 1px solid #ddd7ce;
          border-radius: 11px;
          background: white;
          font-size: 14px;
        }

        .save-button {
          border: 0;
          border-radius: 12px;
          padding: 14px;
          background: #171717;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .delete-button {
          width: 100%;
          margin-top: 12px;
          border: 1px solid #efc4c1;
          border-radius: 12px;
          padding: 13px;
          background: #fff4f3;
          color: #a52e27;
          font-weight: 900;
          cursor: pointer;
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .subscription-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .subscription-admin {
            padding: 20px 14px 50px;
          }

          .subscription-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .create-button {
            width: 100%;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .subscription-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}