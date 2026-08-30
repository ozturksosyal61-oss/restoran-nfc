import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import RemoveManagerButton from "./RemoveManagerButton";

export default async function YoneticilerPage() {
  const supabase = await createSupabaseServerClient();

  // =====================================================
  // GİRİŞ YAPAN KULLANICI
  // =====================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sistem/login");
  }

  // =====================================================
  // SİSTEM SAHİBİ KONTROLÜ
  // =====================================================

  const { data: systemAdmin } = await supabase
    .from("system_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (!systemAdmin) {
    redirect("/admin");
  }

  // =====================================================
  // RESTORAN YÖNETİCİLERİ
  // =====================================================

  const { data: managers, error } = await supabase
    .from("restaurant_users")
    .select(`
      id,
      user_id,
      restaurant_id,
      role,
      created_at,
      restaurants (
        id,
        name,
        slug
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      "Yöneticiler yüklenemedi: " + error.message
    );
  }

  const managerList = managers ?? [];

  const connectedRestaurantCount = new Set(
    managerList.map((manager) => manager.restaurant_id)
  ).size;

  const activeManagerCount = managerList.filter(
    (manager) => manager.role === "manager"
  ).length;

  return (
    <main className="system-owner-page">

      {/* =================================================
          ÜST BAR
      ================================================= */}

      <div className="system-owner-topbar">

        <div>
          <span className="system-owner-brand">
            OZT DIGITAL MENU
          </span>

          <span className="system-owner-divider">
            /
          </span>

          <span className="system-owner-label">
            Sistem Sahibi
          </span>
        </div>

        <Link
          href="/sistem"
          className="system-view-button"
        >
          ← Sistem Paneli
        </Link>

      </div>


      {/* =================================================
          HERO
      ================================================= */}

      <section className="system-owner-hero">

        <div>

          <span className="system-owner-eyebrow">
            YÖNETİCİ YÖNETİMİ
          </span>

          <h1>
            Restoran Yöneticileri
          </h1>

          <h2>
            Yönetici hesaplarını yönetin
          </h2>

          <p>
            Sistemdeki restoran yöneticilerini görüntüleyin,
            yönetin ve gerektiğinde sistemden kaldırın.
          </p>

        </div>


        <div className="system-owner-user">

          <span>
            SİSTEM SAHİBİ
          </span>

          <strong>
            {user.email}
          </strong>

          <small>
            Yetkili hesap
          </small>

        </div>

      </section>


      {/* =================================================
          İSTATİSTİKLER
      ================================================= */}

      <section
        className="system-owner-stats"
        style={{
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
        }}
      >

        <div className="system-stat-card">

          <div className="system-stat-icon">
            👤
          </div>

          <span>
            Toplam Yönetici
          </span>

          <strong>
            {managerList.length}
          </strong>

          <small>
            Sistemde kayıtlı yönetici
          </small>

        </div>


        <div className="system-stat-card">

          <div className="system-stat-icon">
            🏪
          </div>

          <span>
            Bağlı Restoran
          </span>

          <strong>
            {connectedRestaurantCount}
          </strong>

          <small>
            Yönetici bağlantısı bulunan işletme
          </small>

        </div>


        <div className="system-stat-card">

          <div className="system-stat-icon">
            ✓
          </div>

          <span>
            Aktif Yönetici
          </span>

          <strong>
            {activeManagerCount}
          </strong>

          <small>
            Manager yetkisine sahip hesap
          </small>

        </div>

      </section>


      {/* =================================================
          YÖNETİCİLER
      ================================================= */}

      <section className="system-owner-section">

        <div className="system-owner-section-heading">

          <div>

            <span>
              YÖNETİCİ HESAPLARI
            </span>

            <h2>
              Restoran yöneticileri
            </h2>

          </div>

          <Link
            href="/sistem/yeni-restoran"
            className="system-add-button"
          >
            ＋ Yeni Yönetici
          </Link>

        </div>


        {/* =================================================
            YÖNETİCİ LİSTESİ
        ================================================= */}

        <div
          style={{
            display: "grid",
            gap: "12px",
          }}
        >

          {managerList.map((manager) => {

            const restaurant = Array.isArray(
              manager.restaurants
            )
              ? manager.restaurants[0]
              : manager.restaurants;

            return (
              <article
                key={manager.id}
                className="system-restaurant-card"
              >

                {/* =================================================
                    ÜST BİLGİ
                ================================================= */}

                <div className="system-restaurant-main">

                  <div className="system-restaurant-icon">
                    👤
                  </div>


                  <div>

                    <div className="system-restaurant-title">

                      <h3>
                        Restoran Yöneticisi
                      </h3>

                      <span className="system-status active">
                        AKTİF
                      </span>

                    </div>

                    <span className="system-restaurant-slug">
                      User ID: {manager.user_id}
                    </span>

                  </div>

                </div>


                {/* =================================================
                    DETAYLAR
                ================================================= */}

                <div className="system-restaurant-details">

                  <div>

                    <span>
                      RESTORAN
                    </span>

                    <strong>
                      {restaurant?.name ??
                        "Restoran bulunamadı"}
                    </strong>

                  </div>


                  <div>

                    <span>
                      ROL
                    </span>

                    <strong>
                      {manager.role ?? "manager"}
                    </strong>

                  </div>


                  <div>

                    <span>
                      RESTORAN URL
                    </span>

                    <strong>
                      {restaurant?.slug
                        ? `/restoran/${restaurant.slug}`
                        : "-"}
                    </strong>

                  </div>

                </div>


                {/* =================================================
                    YÖNETİCİ BİLGİSİ
                ================================================= */}

                <div className="system-managers">

                  <div className="system-managers-title">
                    Yönetici bilgisi
                  </div>

                  <div className="system-manager-list">

                    <span className="system-manager">
                      👤 Yönetici hesabı
                    </span>

                    <span className="system-manager">
                      🔐 {manager.role ?? "manager"}
                    </span>

                    <span className="system-manager">
                      ID: {manager.id}
                    </span>

                  </div>

                </div>


                {/* =================================================
                    AKSİYONLAR
                ================================================= */}

                <div className="system-restaurant-actions">

                  <Link
                    href={`/sistem/yoneticiler/${manager.id}`}
                    className="system-manage-button"
                  >
                    ⚙️ Yönet
                  </Link>

                  <Link
                    href={
                      restaurant?.slug
                        ? `/restoran/${restaurant.slug}`
                        : "/sistem"
                    }
                    className="system-view-button"
                  >
                    👁 Menüyü Gör
                  </Link>

                  <RemoveManagerButton
                    managerId={manager.id}
                  />

                </div>

              </article>
            );
          })}


          {/* =================================================
              BOŞ DURUM
          ================================================= */}

          {managerList.length === 0 && (

            <div className="system-restaurant-card">

              <div
                style={{
                  textAlign: "center",
                  padding: "35px 20px",
                }}
              >

                <div
                  style={{
                    fontSize: "40px",
                    marginBottom: "12px",
                  }}
                >
                  👤
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                  }}
                >
                  Henüz yönetici yok
                </h3>

                <p
                  style={{
                    margin:
                      "8px auto 18px",
                    maxWidth: "450px",
                    color: "#888",
                    fontSize: "13px",
                  }}
                >
                  Sisteme ilk restoran yöneticisini
                  ekleyerek başlayabilirsiniz.
                </p>

                <Link
                  href="/sistem/yeni-restoran"
                  className="system-add-button"
                >
                  ＋ İlk Yöneticiyi Ekle
                </Link>

              </div>

            </div>

          )}

        </div>

      </section>


      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="system-owner-footer">

        <span>
          OZT DIGITAL MENU
        </span>

        <span>
          Sistem Sahibi Paneli
        </span>

      </footer>

    </main>
  );
}