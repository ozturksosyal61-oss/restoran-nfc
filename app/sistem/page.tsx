import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import LogoutButton from "./LogoutButton";
import { updateRestaurantPlan } from "./actions";
import { getRestaurantThemeMeta, normalizeRestaurantTheme, RESTAURANT_THEMES, type RestaurantTheme } from "../../lib/themes";

type Restaurant = {
  id: number;
  name: string;
  slug: string;
  is_active?: boolean | null;
  plan?: string | null;
  theme?: RestaurantTheme | string | null;
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
    .select("id, name, slug, is_active, plan, theme")
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

 <Link href="/sistem/yeni-restoran">
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
            <Link
  href="/sistem/abonelikler"
  className="system-secondary-button"
>
  💳 Abonelik Yönetimi
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

                      <div
                        className={`restaurant-theme-badge theme-${normalizeRestaurantTheme(restaurant.theme)}`}
                      >
                        🎨 {getRestaurantThemeMeta(restaurant.theme).label}
                      </div>

                    </div>

                    {/* PAKET YÖNETİMİ */}
                    <form
                      action={updateRestaurantPlan}
                      className="restaurant-plan-form"
                    >
                      <input
                        type="hidden"
                        name="restaurant_id"
                        value={restaurant.id}
                      />

                      <div className="restaurant-plan-label">
                        <span>📦 Paket</span>
                        <small>Sistem sahibi tarafından yönetilir</small>
                      </div>

                      <select
                        name="plan"
                        defaultValue={
                          restaurant.plan === "pro" ||
                          restaurant.plan === "premium"
                            ? restaurant.plan
                            : "starter"
                        }
                        className={
                          `restaurant-plan-select plan-${
                            restaurant.plan === "pro" ||
                            restaurant.plan === "premium"
                              ? restaurant.plan
                              : "starter"
                          }`
                        }
                        aria-label={`${restaurant.name} paketini seç`}
                      >
                        <option value="starter">🟢 STARTER</option>
                        <option value="pro">🔵 PRO</option>
                        <option value="premium">🟣 PREMIUM</option>
                      </select>

                      <label className="restaurant-theme-control">
                        <span>🎨 Tema</span>
                        <select
                          name="theme"
                          defaultValue={normalizeRestaurantTheme(restaurant.theme)}
                          className={
                            `restaurant-theme-select theme-${normalizeRestaurantTheme(restaurant.theme)}`
                          }
                          aria-label={`${restaurant.name} temasını seç`}
                        >
                          {RESTAURANT_THEMES.map((theme) => (
                            <option key={theme.value} value={theme.value}>
                              {theme.value === "classic" ? "⚪ " : theme.value === "dark-modern" ? "🔵 " : "🟡 "}
                              {theme.label}
                            </option>
                          ))}
                        </select>
                        <small>
                          {getRestaurantThemeMeta(restaurant.theme).description}
                        </small>
                      </label>

                      <button
                        type="submit"
                        className="restaurant-plan-save"
                      >
                        💾 Paket + Temayı Kaydet
                      </button>
                    </form>


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

        .restaurant-theme-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 6px 9px;
          border-radius: 999px;
          background: #f5f2ea;
          border: 1px solid #e7ddc8;
          color: #80631d;
          font-size: 10px;
          font-weight: 900;
        }

        .restaurant-theme-badge.theme-dark-modern {
          background: #e8f5ff;
          border-color: #b9ddf6;
          color: #0879ba;
        }

        .restaurant-theme-badge.theme-luxury-gold {
          background: #fff7df;
          border-color: #e6ca72;
          color: #8b6618;
        }

        .restaurant-theme-control {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #eee7dc;
        }

        .restaurant-theme-control > span {
          font-size: 12px;
          font-weight: 900;
          color: #26231f;
        }

        .restaurant-theme-control small {
          color: #8c867c;
          font-size: 9px;
          line-height: 1.4;
        }

        .restaurant-theme-select {
          width: 100%;
          min-height: 42px;
          padding: 0 12px;
          border: 1px solid #ddd4c4;
          border-radius: 11px;
          background: #fff;
          color: #191919;
          font-size: 12px;
          font-weight: 900;
          outline: none;
        }

        .restaurant-theme-select.theme-dark-modern {
          border-color: #a7d7f4;
          background: #f3fbff;
          color: #0c6b9f;
        }

        .restaurant-theme-select.theme-luxury-gold {
          border-color: #e4c776;
          background: #fffbef;
          color: #7f5d14;
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

        /* PLAN */

        .restaurant-plan-form {
          margin-top: 15px;
          padding: 14px;
          border: 1px solid #e9e3d8;
          border-radius: 14px;
          background: #faf9f6;
        }

        .restaurant-plan-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 900;
        }

        .restaurant-plan-label small {
          color: #999;
          font-size: 9px;
          font-weight: 600;
          text-align: right;
        }

        .restaurant-plan-select {
          width: 100%;
          min-height: 42px;
          padding: 0 12px;
          border: 1px solid #ddd7cc;
          border-radius: 10px;
          background: white;
          color: #171717;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          outline: none;
        }

        .restaurant-plan-select:focus {
          border-color: #c79500;
          box-shadow: 0 0 0 3px rgba(199,149,0,.12);
        }

        .restaurant-plan-save {
          width: 100%;
          min-height: 38px;
          margin-top: 8px;
          border: none;
          border-radius: 10px;
          background: #151515;
          color: white;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .restaurant-plan-save:hover {
          background: #292929;
        }

        .plan-starter { border-color: #b8dfc4; }
        .plan-pro { border-color: #b9d5f2; }
        .plan-premium { border-color: #d6b9ee; }

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

          .system-footer {
            flex-direction: column;
            gap: 8px;
          }

        }

      `}</style>

    </main>
  );
}