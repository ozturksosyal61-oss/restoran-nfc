import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import LogoutButton from "./LogoutButton";
import ArchiveRestaurantButton from "./ArchiveRestaurantButton";
import { revalidatePath } from "next/cache";
import { updateSubscription, createSubscription } from "./abonelikler/actions";
import { RESTAURANT_THEMES, normalizeRestaurantTheme, type RestaurantTheme } from "../../lib/themes";

type Restaurant = {
  id: number;
  name: string;
  slug: string;
  theme?: string | null;
  is_active?: boolean | null;
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
  current_period_start: string | null;
  current_period_end: string | null;
  subscription_plans?: {
    id: string;
    name: string;
    slug: string;
    monthly_price: number;
    yearly_price: number;
  } | null;
};

type RestaurantTable = {
  id: number;
  restaurant_id: number;
  table_number: number;
  public_token: string;
  is_active: boolean;
};

export default async function SystemOwnerPage() {
  // ============================================================
  // GÜVENLİK / OTURUM KONTROLÜ
  // ============================================================

  const supabase = await createSupabaseServerClient();

  // Giriş yapan kullanıcı
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Giriş yapılmamışsa sistem sahibi giriş ekranına gönder
  if (!user) {
    redirect("/sistem/login");
  }

  // Kullanıcının sistem sahibi olup olmadığını kontrol et
  const {
    data: systemAdmin,
    error: systemAdminError,
  } = await supabase
    .from("system_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Sistem sahibi değilse işletme paneline gönder
  if (systemAdminError || !systemAdmin) {
    redirect("/admin");
  }

  // ============================================================
  // RESTORANLARI GETİR
  // ============================================================
  const {
    data: restaurants,
    error: restaurantsError,
  } = await supabase
    .from("restaurants")
    .select("id, name, slug, theme, is_active")
    .order("id", { ascending: true });

  /*
   * ============================================================
   * MASALARI GETİR
   * ============================================================
   */

  const {
    data: tables,
    error: tablesError,
  } = await supabase
    .from("restaurant_tables")
    .select(
      "id, restaurant_id, table_number, public_token, is_active"
    )
    .order("table_number", { ascending: true });

  /*
   * ============================================================
   * PAKETLER
   * ============================================================
   */

  const {
    data: plansData,
    error: plansError,
  } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, slug, monthly_price, yearly_price"
    )
    .order("monthly_price", {
      ascending: true,
    });

  if (plansError) {
    console.error(
      "Paketler yüklenemedi:",
      plansError
    );
  }

  const plans: Plan[] =
    (plansData ?? []) as Plan[];

  /*
   * ============================================================
   * ABONELİKLER
   * ============================================================
   */

  const {
    data: subscriptionsData,
    error: subscriptionsError,
  } = await supabase
    .from("subscriptions")
    .select(`
      id,
      restaurant_id,
      plan_id,
      status,
      billing_interval,
      current_period_start,
      current_period_end,
      subscription_plans (
        id,
        name,
        slug,
        monthly_price,
        yearly_price
      )
    `)
    .order("current_period_start", {
      ascending: false,
      nullsFirst: false,
    });

  if (subscriptionsError) {
    console.error(
      "Abonelikler yüklenemedi:",
      subscriptionsError
    );
  }

  const subscriptionList: Subscription[] =
    (subscriptionsData ?? []).map(
      (subscription: any) => ({
        ...subscription,
        subscription_plans:
          Array.isArray(
            subscription.subscription_plans
          )
            ? subscription.subscription_plans[0] ?? null
            : subscription.subscription_plans ?? null,
      })
    ) as Subscription[];

  /*
   * ============================================================
   * HIZLI ABONELİK BULUCU
   * ============================================================
   */

  function getRestaurantSubscription(
    restaurantId: number
  ) {
    return (
      subscriptionList.find(
        (subscription) =>
          subscription.restaurant_id ===
            restaurantId &&
          (subscription.status === "active" ||
            subscription.status === "trial")
      ) ??
      subscriptionList.find(
        (subscription) =>
          subscription.restaurant_id ===
          restaurantId
      ) ??
      null
    );
  }

  /*
   * ============================================================
   * TEMA DEĞİŞTİR
   * ============================================================
   */

  async function updateRestaurantTheme(
    formData: FormData
  ) {
    "use server";

    const restaurantId = Number(
      formData.get("restaurant_id")
    );

    const theme = String(
      formData.get("theme") || "classic"
    );

    if (
      !Number.isInteger(restaurantId) ||
      restaurantId <= 0
    ) {
      return;
    }

    const isAllowedTheme = RESTAURANT_THEMES.some(
      (item) => item.value === theme
    );

    if (!isAllowedTheme) {
      return;
    }

    const themeSupabase =
      await createSupabaseServerClient();

    const {
      data: { user: themeUser },
    } = await themeSupabase.auth.getUser();

    if (!themeUser) {
      redirect("/sistem/login");
    }

    const { data: themeAdmin } =
      await themeSupabase
        .from("system_admins")
        .select("user_id")
        .eq("user_id", themeUser.id)
        .maybeSingle();

    if (!themeAdmin) {
      redirect("/admin");
    }

    const { data: updatedTheme, error } =
      await themeSupabase.rpc(
        "set_system_restaurant_theme",
        {
          p_restaurant_id: restaurantId,
          p_theme: theme,
        }
      );

    if (error) {
      console.error(
        "TEMA RPC GÜNCELLEME HATASI:",
        error
      );
      return;
    }

    console.log(
      "Restoran teması güncellendi:",
      updatedTheme
    );

    revalidatePath("/sistem");
    revalidatePath("/restoran", "layout");
    revalidatePath("/admin/ayarlar");

    redirect("/sistem");
  }

  /*
   * ============================================================
   * PAKET DEĞİŞTİR
   * ============================================================
   */

  async function changeRestaurantPlan(
    formData: FormData
  ) {
    "use server";

    const restaurantId = Number(
      formData.get("restaurant_id")
    );

    const planId = String(
      formData.get("plan_id") || ""
    );

    const currentSubscriptionId = String(
      formData.get("subscription_id") || ""
    );

    const status = String(
      formData.get("status") || "active"
    );

    const billingInterval = String(
      formData.get("billing_interval") ||
        "monthly"
    );

    if (
      !Number.isInteger(restaurantId) ||
      restaurantId <= 0 ||
      !planId
    ) {
      return;
    }

    const nextFormData = new FormData();
    nextFormData.set(
      "restaurant_id",
      String(restaurantId)
    );
    nextFormData.set("plan_id", planId);
    nextFormData.set(
      "status",
      status
    );
    nextFormData.set(
      "billing_interval",
      billingInterval
    );

    if (currentSubscriptionId) {
      nextFormData.set(
        "subscription_id",
        currentSubscriptionId
      );
      await updateSubscription(
        nextFormData
      );
    } else {
      await createSubscription(
        nextFormData
      );
    }

    revalidatePath("/sistem");
    revalidatePath("/sistem/abonelikler");
    revalidatePath("/admin");
  }

  /*
   * ============================================================
   * HATA DURUMU
   * ============================================================
   */

  if (restaurantsError) {
    return (
      <main className="system-page">
        <div className="system-container">
          <div className="system-error">
            <h1>Bir hata oluştu</h1>

            <p>
              Restoranlar yüklenemedi.
            </p>

            <small>
              {restaurantsError.message}
            </small>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * VERİLER
   * ============================================================
   */

  const restaurantList: Restaurant[] =
    restaurants ?? [];

  const tableList: RestaurantTable[] =
    tables ?? [];

  const totalRestaurants =
    restaurantList.length;

  const activeRestaurants =
    restaurantList.filter(
      (restaurant) =>
        restaurant.is_active !== false
    ).length;

  const passiveRestaurants =
    restaurantList.filter(
      (restaurant) =>
        restaurant.is_active === false
    ).length;

  const totalTables =
    tableList.length;

  const activeTables =
    tableList.filter(
      (table) => table.is_active
    ).length;

  /*
   * ============================================================
   * RESTORAN KARTI İÇİN MASA BİLGİLERİ
   * ============================================================
   */

  function getRestaurantTables(
    restaurantId: number
  ) {
    return tableList.filter(
      (table) =>
        table.restaurant_id === restaurantId
    );
  }

  /*
   * ============================================================
   * QR DURUMU
   * ============================================================
   */

  function getQrStatus(
    restaurantId: number
  ) {
    const restaurantTables =
      getRestaurantTables(restaurantId);

    const activeTables =
      restaurantTables.filter(
        (table) => table.is_active
      );

    if (activeTables.length === 0) {
      return {
        text: "QR Pasif",
        className: "status-danger",
      };
    }

    return {
      text: "QR Aktif",
      className: "status-success",
    };
  }

  /*
   * ============================================================
   * SAYFA
   * ============================================================
   */

  return (
    <main className="system-page">

      <div className="system-container">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="system-header">

          <div>

            <div className="system-brand">
              OZT DIGITAL MENU
            </div>

            <div className="system-breadcrumb">
              Sistem Sahibi
            </div>

            <h1>
              Sistem Sahibi Paneli
            </h1>

            <p>
              Hizmet verdiğiniz restoran ve
              kafeleri buradan yönetin.
            </p>

          </div>

          <div className="system-header-actions">
            <Link
              href="/admin"
              className="system-secondary-button"
            >
              Yönetim Paneli
            </Link>

            <Link
              href="/sistem/abonelikler"
              className="system-subscription-button"
            >
              💳 Abonelikler
            </Link>

            <Link
              href="/sistem/yeni-restoran"
              className="system-primary-button"
            >
              + Yeni Restoran
            </Link>

            <LogoutButton />
          </div>

        </header>


        {/* =====================================================
            İSTATİSTİKLER
        ====================================================== */}

        <section className="system-stats">

          <div className="system-stat-card">

            <div className="system-stat-icon">
              🏪
            </div>

            <div>

              <span className="system-stat-label">
                Toplam Restoran
              </span>

              <strong>
                {totalRestaurants}
              </strong>

              <small>
                Sistemde kayıtlı işletme
              </small>

            </div>

          </div>


          <div className="system-stat-card">

            <div className="system-stat-icon success-icon">
              🟢
            </div>

            <div>

              <span className="system-stat-label">
                Aktif Restoran
              </span>

              <strong>
                {activeRestaurants}
              </strong>

              <small>
                Hizmet veren işletmeler
              </small>

            </div>

          </div>


          <div className="system-stat-card">

            <div className="system-stat-icon danger-icon">
              🔴
            </div>

            <div>

              <span className="system-stat-label">
                Pasif Restoran
              </span>

              <strong>
                {passiveRestaurants}
              </strong>

              <small>
                Şu anda pasif
              </small>

            </div>

          </div>

          <div className="system-stat-card">

            <div className="system-stat-icon">
              🪑
            </div>

            <div>

              <span className="system-stat-label">
                Aktif Masa
              </span>

              <strong>
                {activeTables}
              </strong>

              <small>
                {totalTables} toplam masa
              </small>

            </div>

          </div>

        </section>


        {/* =====================================================
            RESTORANLAR BAŞLIK
        ====================================================== */}

        <div className="system-section-header">

          <div>

            <span className="system-eyebrow">
              İŞLETMELER
            </span>

            <h2>
              Hizmet Verdiğin Restoranlar
            </h2>

            <p>
              Restoranlarınızın durumunu,
              QR/NFC bağlantılarını ve
              yönetim seçeneklerini takip edin.
            </p>

          </div>

          <div className="system-count">
            {totalRestaurants} restoran
          </div>

        </div>


        {/* =====================================================
            RESTORAN LİSTESİ
        ====================================================== */}

        {restaurantList.length === 0 ? (

          <div className="system-empty">

            <div className="system-empty-icon">
              🏪
            </div>

            <h3>
              Henüz restoran yok
            </h3>

            <p>
              Sisteme ilk restoranınızı
              ekleyerek başlayabilirsiniz.
            </p>

            <Link
              href="/sistem/yeni-restoran"
              className="system-primary-button"
            >
              ＋ Yeni Restoran Ekle
            </Link>

          </div>

        ) : (

          <section className="restaurant-grid">

            {restaurantList.map(
              (restaurant) => {

                const restaurantTables =
                  getRestaurantTables(
                    restaurant.id
                  );

                const activeTables =
                  restaurantTables.filter(
                    (table) =>
                      table.is_active
                  );

                const qrStatus =
                  getQrStatus(
                    restaurant.id
                  );

                const isActive =
                  restaurant.is_active !== false;

                return (

                  <article
                    key={restaurant.id}
                    className="restaurant-card"
                  >

                    {/* KART ÜST */}

                    <div className="restaurant-card-top">

                      <div className="restaurant-logo">
                        🏪
                      </div>

                      <div className="restaurant-status">

                        <span
                          className={
                            isActive
                              ? "status-dot active-dot"
                              : "status-dot passive-dot"
                          }
                        />

                        {isActive
                          ? "Aktif"
                          : "Pasif"}

                      </div>

                    </div>


                    {/* RESTORAN BİLGİLERİ */}

                    <div className="restaurant-info">

                      <h3>
                        {restaurant.name}
                      </h3>

                      <p className="restaurant-slug">
                        /restoran/{restaurant.slug}
                      </p>

                    </div>


                    {/* YÖNETİCİ */}

                    <div className="restaurant-manager">

                      <div className="manager-icon">
                        👥
                      </div>

                      <div>

                        <span>
                          Restoran Yöneticisi
                        </span>

                        <strong>
                          Yönetici bilgisi
                        </strong>

                      </div>

                    </div>


                    {/* DURUM BİLGİLERİ */}

                    <div className="restaurant-features">

                      <div className="feature-item">

                        <span>
                          📱
                        </span>

                        <div>

                          <small>
                            QR
                          </small>

                          <strong
                            className={
                              qrStatus.className
                            }
                          >
                            {qrStatus.text}
                          </strong>

                        </div>

                      </div>


                      <div className="feature-item">

                        <span>
                          📡
                        </span>

                        <div>

                          <small>
                            NFC
                          </small>

                          <strong className="status-success">
                            Hazır
                          </strong>

                        </div>

                      </div>


                      <div className="feature-item">

                        <span>
                          🪑
                        </span>

                        <div>

                          <small>
                            Masalar
                          </small>

                          <strong>
                            {activeTables.length}
                          </strong>

                        </div>

                      </div>

                    </div>


                    {/* =================================================
                        PAKET & TEMA
                    ================================================= */}

                    {(() => {
                      const currentSubscription =
                        getRestaurantSubscription(
                          restaurant.id
                        );

                      const currentPlan =
                        currentSubscription
                          ?.subscription_plans;

                      const currentTheme =
                        normalizeRestaurantTheme(
                          restaurant.theme
                        );

                      return (
                        <section className="restaurant-controls">
                          <div className="restaurant-control-header">
                            <div>
                              <span>
                                MÜŞTERİ DENEYİMİ
                              </span>
                              <strong>
                                Paket & Tema
                              </strong>
                            </div>

                            <span className="control-current-badge">
                              {currentPlan?.name ||
                                "Paket yok"}{" "}
                              ·{" "}
                              {RESTAURANT_THEMES.find(
                                (item) =>
                                  item.value ===
                                  currentTheme
                              )?.label || "Klasik"}
                            </span>
                          </div>

                          <div className="restaurant-control-grid">
                            <form
                              action={changeRestaurantPlan}
                              className="restaurant-control-card"
                            >
                              <input
                                type="hidden"
                                name="restaurant_id"
                                value={restaurant.id}
                              />

                              {currentSubscription?.id && (
                                <>
                                  <input
                                    type="hidden"
                                    name="subscription_id"
                                    value={
                                      currentSubscription.id
                                    }
                                  />
                                  <input
                                    type="hidden"
                                    name="status"
                                    value={
                                      currentSubscription.status ===
                                        "active" ||
                                      currentSubscription.status ===
                                        "trial"
                                        ? currentSubscription.status
                                        : "active"
                                    }
                                  />
                                  <input
                                    type="hidden"
                                    name="billing_interval"
                                    value={
                                      currentSubscription.billing_interval ||
                                      "monthly"
                                    }
                                  />
                                </>
                              )}

                              <label>
                                <span>Paket</span>
                                <select
                                  name="plan_id"
                                  defaultValue={
                                    currentSubscription?.plan_id ||
                                    plans[0]?.id ||
                                    ""
                                  }
                                >
                                  {plans.length ===
                                  0 ? (
                                    <option value="">
                                      Paket bulunamadı
                                    </option>
                                  ) : (
                                    plans.map(
                                      (plan) => (
                                        <option
                                          key={
                                            plan.id
                                          }
                                          value={
                                            plan.id
                                          }
                                        >
                                          {
                                            plan.name
                                          }
                                        </option>
                                      )
                                    )
                                  )}
                                </select>
                              </label>

                              <button
                                type="submit"
                                disabled={
                                  plans.length ===
                                  0
                                }
                                className="control-save-button"
                              >
                                💳 Paketi Uygula
                              </button>
                            </form>

                            <form
                              action={updateRestaurantTheme}
                              className="restaurant-control-card"
                            >
                              <input
                                type="hidden"
                                name="restaurant_id"
                                value={restaurant.id}
                              />

                              <label>
                                <span>Tema</span>
                                <select
                                  name="theme"
                                  defaultValue={
                                    currentTheme
                                  }
                                >
                                  {RESTAURANT_THEMES.map(
                                    (theme) => (
                                      <option
                                        key={
                                          theme.value
                                        }
                                        value={
                                          theme.value
                                        }
                                      >
                                        {
                                          theme.label
                                        }
                                      </option>
                                    )
                                  )}
                                </select>
                              </label>

                              <button
                                type="submit"
                                className="control-save-button theme-save-button"
                              >
                                🎨 Temayı Uygula
                              </button>
                            </form>
                          </div>
                        </section>
                      );
                    })()}

                    {/* BUTONLAR */}

                    <div className="restaurant-actions">

                      <Link
                        href={`/admin`}
                        className="manage-button"
                      >
                        ⚙️ Restoranı Yönet
                      </Link>

                      <Link
                        href={`/restoran/${restaurant.slug}`}
                        className="view-button"
                      >
                        Menüyü Gör →
                      </Link>

                      <ArchiveRestaurantButton
                        restaurantId={restaurant.id}
                        restaurantName={restaurant.name}
                      />

                    </div>

                  </article>

                );
              }
            )}

          </section>

        )}


        {/* =====================================================
            ALT BİLGİ
        ====================================================== */}

        <footer className="system-footer">

          <strong>
            OZT DIGITAL MENU
          </strong>

          <span>
            Sistem Sahibi Paneli
          </span>

        </footer>

      </div>


      {/* =======================================================
          CSS
      ======================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .system-page {
          min-height: 100vh;
          background: #f3f1ed;
          color: #171717;
          padding: 40px 20px 70px;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .system-container {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        /* HEADER */

        .system-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 30px;
        }

        .system-brand {
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #111;
          margin-bottom: 5px;
        }

        .system-breadcrumb {
          font-size: 12px;
          color: #a07a00;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .system-header h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .system-header p {
          margin: 10px 0 0;
          color: #777;
          font-size: 14px;
        }

        .system-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .system-primary-button,
        .system-secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 12px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          transition: .2s ease;
          white-space: nowrap;
        }

        .system-primary-button {
          background: #151515;
          color: white;
          border: 1px solid #151515;
          box-shadow: 0 8px 20px rgba(0,0,0,.12);
        }

        .system-primary-button:hover {
          transform: translateY(-1px);
          background: #252525;
        }

        .system-secondary-button {
          background: white;
          color: #171717;
          border: 1px solid #ddd8ce;
        }

        .system-secondary-button:hover {
          border-color: #c79500;
        }

        .system-subscription-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 44px;
          padding: 0 16px;
          border-radius: 12px;
          text-decoration: none;
          background: #fff7df;
          color: #8b6500;
          border: 1px solid #e2c76c;
          font-size: 12px;
          font-weight: 800;
          transition: .2s ease;
          white-space: nowrap;
        }

        .system-subscription-button:hover {
          transform: translateY(-1px);
          background: #fff1c2;
          border-color: #c79500;
        }

        /* STATS */

        .system-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 45px;
        }

        .system-stat-card {
          background: white;
          border: 1px solid #e5e0d7;
          border-radius: 18px;
          padding: 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 8px 25px rgba(0,0,0,.04);
        }

        .system-stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: #fff5d9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .success-icon {
          background: #eaf8ee;
        }

        .danger-icon {
          background: #fff0ef;
        }

        .system-stat-label {
          display: block;
          font-size: 12px;
          color: #777;
          margin-bottom: 4px;
        }

        .system-stat-card strong {
          display: block;
          font-size: 28px;
          line-height: 1;
          font-weight: 900;
        }

        .system-stat-card small {
          display: block;
          margin-top: 5px;
          color: #999;
          font-size: 11px;
        }

        /* SECTION */

        .system-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
        }

        .system-eyebrow {
          color: #bd8500;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .system-section-header h2 {
          margin: 5px 0 5px;
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -.5px;
        }

        .system-section-header p {
          margin: 0;
          font-size: 13px;
          color: #777;
        }

        .system-count {
          padding: 8px 13px;
          background: white;
          border: 1px solid #e4dfd6;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        /* GRID */

        .restaurant-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        /* RESTAURANT CARD */

        .restaurant-card {
          background: white;
          border: 1px solid #e3ded5;
          border-radius: 20px;
          padding: 22px;
          box-shadow:
            0 10px 30px rgba(0,0,0,.045);
          transition: .2s ease;
          overflow: hidden;
        }

        .restaurant-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 15px 35px rgba(0,0,0,.08);
          border-color: #d8c79d;
        }

        .restaurant-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .restaurant-logo {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #fff5d9;
          border: 1px solid #ebddba;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .restaurant-status {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 20px;
          background: #f4fbf6;
          color: #278147;
          font-size: 11px;
          font-weight: 800;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          display: inline-block;
        }

        .active-dot {
          background: #2cac5a;
        }

        .passive-dot {
          background: #d84b43;
        }

        .restaurant-info h3 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
        }

        .restaurant-slug {
          margin: 6px 0 0;
          font-size: 11px;
          color: #999;
        }

        /* MANAGER */

        .restaurant-manager {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 0;
          margin-top: 16px;
          border-top: 1px solid #eeeae3;
          border-bottom: 1px solid #eeeae3;
        }

        .manager-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #f5f4f1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .restaurant-manager span {
          display: block;
          color: #999;
          font-size: 10px;
          margin-bottom: 3px;
        }

        .restaurant-manager strong {
          display: block;
          font-size: 12px;
        }

        /* FEATURES */

        .restaurant-features {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 8px;
          margin-top: 15px;
        }

        .feature-item {
          background: #f8f7f4;
          border-radius: 12px;
          padding: 11px;
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .feature-item > span {
          font-size: 15px;
          flex-shrink: 0;
        }

        .feature-item small {
          display: block;
          color: #999;
          font-size: 9px;
          margin-bottom: 2px;
        }

        .feature-item strong {
          display: block;
          font-size: 10px;
          font-weight: 900;
        }

        .status-success {
          color: #218149;
        }

        .status-danger {
          color: #c54038;
        }

        /* =====================================================
           PAKET & TEMA KONTROLLERİ
        ====================================================== */

        .restaurant-controls {
          margin-top: 17px;
          padding: 14px;
          border-radius: 16px;
          background:
            linear-gradient(180deg, #fffdf7 0%, #faf7ef 100%);
          border: 1px solid #eadfc5;
        }

        .restaurant-control-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .restaurant-control-header > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .restaurant-control-header > div span {
          color: #a67a00;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .restaurant-control-header > div strong {
          font-size: 12px;
          font-weight: 900;
          color: #2a2925;
        }

        .control-current-badge {
          flex-shrink: 0;
          padding: 7px 9px;
          border-radius: 999px;
          background: #171717;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .restaurant-control-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .restaurant-control-card {
          padding: 11px;
          border-radius: 13px;
          background: #fff;
          border: 1px solid #e8e0cf;
        }

        .restaurant-control-card label {
          display: block;
        }

        .restaurant-control-card label > span {
          display: block;
          margin-bottom: 6px;
          color: #777;
          font-size: 9px;
          font-weight: 800;
        }

        .restaurant-control-card select {
          width: 100%;
          min-height: 38px;
          border: 1px solid #ddd5c5;
          border-radius: 9px;
          padding: 0 10px;
          background: #faf9f5;
          color: #25231f;
          font-size: 11px;
          font-weight: 800;
          outline: none;
        }

        .restaurant-control-card select:focus {
          border-color: #c79500;
          box-shadow: 0 0 0 3px rgba(199,149,0,.10);
        }

        .control-save-button {
          width: 100%;
          min-height: 38px;
          margin-top: 8px;
          border: 1px solid #191919;
          border-radius: 9px;
          background: #171717;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          transition: .2s ease;
        }

        .control-save-button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #2a2a2a;
        }

        .control-save-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .theme-save-button {
          border-color: #d8b866;
          background: #fff4d2;
          color: #7a5900;
        }

        .theme-save-button:hover:not(:disabled) {
          background: #ffe9ae;
        }

        /* ACTIONS */

        .restaurant-actions {
          display: flex;
          gap: 9px;
          margin-top: 17px;
        }

        .manage-button,
        .view-button {
          min-height: 42px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          transition: .2s ease;
        }

        .manage-button {
          flex: 1;
          background: #151515;
          color: white;
        }

        .manage-button:hover {
          background: #292929;
        }

        .view-button {
          padding: 0 15px;
          background: #fff8e7;
          color: #8e6500;
          border: 1px solid #ead7a5;
        }

        .view-button:hover {
          background: #fff2ce;
        }

        /* EMPTY */

        .system-empty {
          background: white;
          border: 1px solid #e4dfd6;
          border-radius: 20px;
          padding: 60px 20px;
          text-align: center;
        }

        .system-empty-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .system-empty h3 {
          margin: 0;
          font-size: 20px;
        }

        .system-empty p {
          color: #777;
          font-size: 13px;
          margin: 8px 0 20px;
        }

        /* ERROR */

        .system-error {
          max-width: 650px;
          margin: 100px auto;
          padding: 30px;
          background: white;
          border: 1px solid #e7d4d4;
          border-radius: 18px;
        }

        .system-error h1 {
          margin: 0 0 10px;
        }

        .system-error p {
          color: #777;
        }

        .system-error small {
          color: #c33;
          word-break: break-word;
        }

        /* FOOTER */

        .system-footer {
          margin-top: 55px;
          padding-top: 20px;
          border-top: 1px solid #ded9d0;
          display: flex;
          justify-content: space-between;
          color: #999;
          font-size: 10px;
        }

        .system-footer strong {
          color: #222;
          letter-spacing: 1px;
        }

        /* MOBILE */

        @media (max-width: 800px) {

          .system-page {
            padding: 25px 14px 50px;
          }

          .system-header {
            flex-direction: column;
            align-items: stretch;
          }

          .system-header h1 {
            font-size: 28px;
          }

          .system-stat-card {
            padding: 18px;
          }

          .system-stat-card strong {
            font-size: 25px;
          }

          .system-header-actions {
            width: 100%;
          }

          .system-header-actions a {
            flex: 1;
          }

          .system-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .system-section-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .restaurant-grid {
            grid-template-columns: 1fr;
          }

          .restaurant-control-grid {
            grid-template-columns: 1fr;
          }

        }

        @media (max-width: 480px) {

          .system-header-actions {
            flex-direction: column;
          }

          .system-header-actions a {
            width: 100%;
          }

          .system-stats {
            grid-template-columns: 1fr;
          }

          .restaurant-features {
            grid-template-columns: 1fr;
          }

          .restaurant-actions {
            flex-direction: column;
          }

          .view-button {
            min-height: 42px;
          }

        .restaurant-archive-button {
          min-height: 42px;
          padding: 0 13px;
          border: 1px solid #efc8c4;
          border-radius: 11px;
          background: #fff6f5;
          color: #a52d25;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          transition: .2s ease;
        }

        .restaurant-archive-button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #ffe9e6;
          border-color: #df9a92;
        }

        .restaurant-archive-button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .system-footer {
            flex-direction: column;
            gap: 8px;
          }

        }

      `}</style>

    </main>
  );
}