import Link from "next/link";
import { createServerSupabaseClient } from "../../lib/supabase-server";
import LogoutButton from "./LogoutButton";

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();

  // Giriş yapan kullanıcı
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="admin-page">
        <section className="admin-header">
          <h1>Oturum bulunamadı</h1>
          <p>Lütfen tekrar giriş yapın.</p>
        </section>
      </main>
    );
  }

  // Kullanıcının restoran bağlantısı
  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return (
      <main className="admin-page">
        <section className="admin-header">
          <h1>İşletme bağlantısı bulunamadı</h1>
          <p>
            Bu kullanıcıya bağlı bir restoran bulunamadı.
          </p>
        </section>
      </main>
    );
  }

  // Restoran
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("id", membership.restaurant_id)
    .single();
    if (!restaurant) {
  return (
    <main className="admin-page">
      <section className="admin-header">
        <h1>İşletme bulunamadı</h1>
        <p>Hesabınıza bağlı bir işletme bulunamadı.</p>
      </section>
    </main>
  );
}

  /*
   * TÜRKİYE SAATİNE GÖRE BUGÜN
   *
   * Türkiye UTC+3 olduğu için başlangıç ve bitiş
   * zamanını buna göre oluşturuyoruz.
   */
  const now = new Date();

  const turkeyOffset = 3 * 60;

  const turkeyNow = new Date(
    now.getTime() +
      (turkeyOffset - now.getTimezoneOffset()) * 60000
  );

  turkeyNow.setHours(0, 0, 0, 0);

  const todayStart = new Date(
    turkeyNow.getTime() -
      (turkeyOffset - now.getTimezoneOffset()) * 60000
  );

  const tomorrowTurkey = new Date(
    turkeyNow.getTime() + 24 * 60 * 60 * 1000
  );

  const tomorrowStart = new Date(
    tomorrowTurkey.getTime() -
      (turkeyOffset - now.getTimezoneOffset()) * 60000
  );

  // Bugünkü siparişleri getir
  const { data: todayOrders } = await supabase
    .from("orders")
    .select("id, total_amount, status, created_at")
    .eq("restaurant_id", restaurant.id)
    .gte("created_at", todayStart.toISOString())
    .lt("created_at", tomorrowStart.toISOString());

  const orders = todayOrders || [];

  // Bugünkü toplam sipariş
  const totalOrders = orders.length;

  // Bugünkü ciro
  const totalRevenue = orders.reduce(
    (sum, order) =>
      sum + Number(order.total_amount || 0),
    0
  );

  // Bekleyen siparişler
  const pendingOrders = orders.filter(
    (order) =>
      order.status === "pending"
  ).length;

  // Tamamlanan / teslim edilen siparişler
  const completedOrders = orders.filter(
    (order) =>
      order.status === "delivered" ||
      order.status === "completed"
  ).length;

  // =========================================================
  // DEĞERLENDİRME İSTATİSTİKLERİ
  // =========================================================

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, customer_name, rating, comment, is_visible, created_at")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false });

  const reviewList = reviews || [];

  const visibleReviews = reviewList.filter(
    (review) => review.is_visible
  );

  const averageRating =
    visibleReviews.length > 0
      ? visibleReviews.reduce(
          (sum, review) => sum + Number(review.rating),
          0
        ) / visibleReviews.length
      : 0;

  // Dashboard'da gösterilecek son siparişler
  const latestOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  // Dashboard'da gösterilecek son yayınlanmış değerlendirmeler
  const latestReviews = visibleReviews.slice(0, 3);

  const statusLabels: Record<string, string> = {
    pending: "Bekliyor",
    accepted: "Kabul Edildi",
    preparing: "Hazırlanıyor",
    ready: "Hazır",
    delivered: "Teslim Edildi",
    completed: "Tamamlandı",
  };

  return (
    <main className="admin-page">

      {/* ÜST BAR */}
      <div className="admin-topbar">
        <div>
          <span className="admin-panel-label">
            OZT DIGITAL MENU
          </span>

          <span className="admin-panel-dot">
            ●
          </span>

          <span className="admin-panel-status">
            İşletme Paneli
          </span>
        </div>

        <LogoutButton />
      </div>

      {/* HERO */}
      <section className="admin-dashboard-header">

        <div>
          <span className="dashboard-eyebrow">
            YÖNETİM PANELİ
          </span>

          <h1>
            Hoş geldiniz 👋
          </h1>

          <h2>
            {restaurant?.name ||
              "İşletme Yönetim Paneli"}
          </h2>

          <p>
            İşletmenizin günlük durumunu ve
            yönetim işlemlerini buradan takip
            edebilirsiniz.
          </p>
        </div>

        <div className="dashboard-date">
          <span>BUGÜN</span>

          <strong>
            {new Intl.DateTimeFormat(
              "tr-TR",
              {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }
            ).format(new Date())}
          </strong>
        </div>

      </section>

      {/* İSTATİSTİKLER */}
      <section className="dashboard-stats">

        <div className="dashboard-stat-card">
          <div className="stat-icon">
            📦
          </div>

          <div className="stat-content">
            <span>Bugünkü Sipariş</span>

            <strong>
              {totalOrders}
            </strong>

            <small>
              Toplam sipariş
            </small>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-icon">
            ₺
          </div>

          <div className="stat-content">
            <span>Bugünkü Ciro</span>

            <strong>
              {totalRevenue.toLocaleString(
                "tr-TR"
              )} TL
            </strong>

            <small>
              Günlük toplam
            </small>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-icon">
            ⏳
          </div>

          <div className="stat-content">
            <span>Bekleyen Sipariş</span>

            <strong>
              {pendingOrders}
            </strong>

            <small>
              İşlem bekliyor
            </small>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-icon">
            ✓
          </div>

          <div className="stat-content">
            <span>Tamamlanan</span>

            <strong>
              {completedOrders}
            </strong>

            <small>
              Bugün tamamlandı
            </small>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-icon">
            ⭐
          </div>

          <div className="stat-content">
            <span>Ortalama Puan</span>

            <strong>
              {averageRating.toFixed(1)}
            </strong>

            <small>
              {visibleReviews.length} yayınlanmış değerlendirme
            </small>
          </div>
        </div>

      </section>

      {/* SON SİPARİŞLER + DEĞERLENDİRMELER */}
      <section
        className="dashboard-section"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(300px, 1fr)",
          gap: "20px",
        }}
      >

        {/* SON SİPARİŞLER */}
        <div
          style={{
            background: "white",
            borderRadius: "18px",
            padding: "22px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          }}
        >
          <div
            className="dashboard-section-heading"
            style={{ marginBottom: "15px" }}
          >
            <div>
              <span>SON SİPARİŞLER</span>
              <h2>Bugünkü siparişler</h2>
            </div>

            <Link
              href="/admin/orders"
              style={{
                color: "#c8941d",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              Tümünü Gör →
            </Link>
          </div>

          {latestOrders.length === 0 ? (
            <p style={{ color: "#888", margin: 0 }}>
              Bugün henüz sipariş yok.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {latestOrders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "13px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div>
                    <strong>
                      #{order.id}
                    </strong>
                    <div
                      style={{
                        marginTop: "4px",
                        color: "#888",
                        fontSize: "12px",
                      }}
                    >
                      {new Date(order.created_at).toLocaleTimeString(
                        "tr-TR",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <strong>
                      {Number(order.total_amount || 0).toLocaleString(
                        "tr-TR"
                      )} TL
                    </strong>
                    <div
                      style={{
                        marginTop: "4px",
                        color: "#777",
                        fontSize: "12px",
                      }}
                    >
                      {statusLabels[order.status] || order.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SON DEĞERLENDİRMELER */}
        <div
          style={{
            background: "white",
            borderRadius: "18px",
            padding: "22px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          }}
        >
          <div
            className="dashboard-section-heading"
            style={{ marginBottom: "15px" }}
          >
            <div>
              <span>SON DEĞERLENDİRMELER</span>
              <h2>Müşteri yorumları</h2>
            </div>

            <Link
              href="/admin/degerlendirmeler"
              style={{
                color: "#c8941d",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              Tümünü Gör →
            </Link>
          </div>

          {latestReviews.length === 0 ? (
            <p style={{ color: "#888", margin: 0 }}>
              Henüz yayınlanmış değerlendirme yok.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {latestReviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    paddingBottom: "13px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <strong>
                      {review.customer_name || "Anonim Müşteri"}
                    </strong>

                    <span
                      style={{
                        color: "#c8941d",
                        fontSize: "14px",
                      }}
                    >
                      {"★".repeat(Number(review.rating))}
                    </span>
                  </div>

                  {review.comment && (
                    <p
                      style={{
                        margin: "7px 0 0",
                        color: "#666",
                        fontSize: "13px",
                        lineHeight: 1.5,
                      }}
                    >
                      {review.comment.length > 85
                        ? `${review.comment.slice(0, 85)}...`
                        : review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </section>

      {/* HIZLI İŞLEMLER */}
      <section className="dashboard-section">

        <div className="dashboard-section-heading">
          <div>
            <span>HIZLI İŞLEMLER</span>

            <h2>
              Sık kullanılan işlemler
            </h2>
          </div>
        </div>

        <div className="quick-actions">

          <Link
            href="/admin/menu/yeni"
            className="quick-action quick-action-gold"
          >
            <div className="quick-action-icon">
              ＋
            </div>

            <div>
              <strong>
                Yeni Ürün
              </strong>

              <span>
                Menüye ürün ekle
              </span>
            </div>

            <b>→</b>
          </Link>

          <Link
            href="/admin/menu/kategori/yeni"
            className="quick-action"
          >
            <div className="quick-action-icon">
              ☰
            </div>

            <div>
              <strong>
                Yeni Kategori
              </strong>

              <span>
                Menü kategorisi oluştur
              </span>
            </div>

            <b>→</b>
          </Link>

          <Link
            href="/admin/siparisler"
            className="quick-action"
          >
            <div className="quick-action-icon">
              🛒
            </div>

            <div>
              <strong>
                Siparişleri Gör
              </strong>

              <span>
                Gelen siparişleri yönet
              </span>
            </div>

            <b>→</b>
          </Link>

          <Link
            href={`/restoran/${restaurant?.slug}/menu`}
            className="quick-action"
          >
            <div className="quick-action-icon">
              ↗
            </div>

            <div>
              <strong>
                Menüyü Gör
              </strong>

              <span>
                Müşteri görünümünü aç
              </span>
            </div>

            <b>→</b>
          </Link>

        </div>

      </section>

      {/* YÖNETİM ALANLARI */}
      <section className="dashboard-section">

        <div className="dashboard-section-heading">
          <div>
            <span>YÖNETİM</span>

            <h2>
              İşletmenizi yönetin
            </h2>
          </div>
        </div>

        <section className="admin-grid">

          <Link
            href="/admin/menu"
            className="admin-card"
          >
            <span className="admin-card-icon">
              📋
            </span>

            <h2>
              Menü Yönetimi
            </h2>

            <p>
              Ürünleri, fiyatları ve
              kategorileri yönetin.
            </p>

            <span className="admin-card-arrow">
              →
            </span>
          </Link>

          <Link
            href="/admin/orders"
            className="admin-card"
          >
            <span className="admin-card-icon">
              🛒
            </span>

            <h2>
              Siparişler
            </h2>

            <p>
              Gelen siparişleri görüntüleyin
              ve yönetin.
            </p>

            <span className="admin-card-arrow">
              →
            </span>
          </Link>

          <Link
            href="/admin/calisanlar"
            className="admin-card"
          >
            <span className="admin-card-icon">
              👨‍🍳
            </span>

            <h2>
              Çalışanlar
            </h2>

            <p>
              Çalışanlarınızı ve
              yetkilerini yönetin.
            </p>

            <span className="admin-card-arrow">
              →
            </span>
          </Link>

          <Link
            href="/admin/degerlendirmeler"
            className="admin-card"
          >
            <span className="admin-card-icon">
              ⭐
            </span>

            <h2>
              Değerlendirmeler
            </h2>

            <p>
              Müşteri yorumlarını ve
              puanlarını görüntüleyin.
            </p>

            <span className="admin-card-arrow">
              →
            </span>
          </Link>

          <Link
            href="/admin/odemeler"
            className="admin-card"
          >
            <span className="admin-card-icon">
              💳
            </span>

            <h2>
              Ödemeler
            </h2>

            <p>
              Ödeme hareketlerini ve
              finansal işlemleri görün.
            </p>

            <span className="admin-card-arrow">
              →
            </span>
          </Link>

          <Link
            href="/admin/ayarlar"
            className="admin-card"
          >
            <span className="admin-card-icon">
              ⚙️
            </span>

            <h2>
              İşletme Ayarları
            </h2>

            <p>
              Restoran bilgilerinizi ve
              ayarlarınızı düzenleyin.
            </p>

            <span className="admin-card-arrow">
              →
            </span>
          </Link>

          <Link
            href="/admin/qr"
            className="admin-card"
          >
            <span className="admin-card-icon">
              📱
            </span>

            <h2>
              QR / NFC
            </h2>

            <p>
              Masalarınızın QR kodlarını ve
              NFC bağlantılarını yönetin.
            </p>

            <span className="admin-card-arrow">
              →
            </span>
          </Link>

        </section>

      </section>

      {/* ALT BİLGİ */}
      <footer className="admin-footer">
        <span>
          OZT Digital Menu
        </span>

        <span>
          Dijital restoran yönetim sistemi
        </span>
      </footer>

    </main>
  );
}