import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import LogoutButton from "./LogoutButton";
import DashboardCharts from "./DashboardCharts";
import ServiceRequests from "./ServiceRequests";
import { hasPlanFeature, normalizePlan } from "../../lib/plan";

type Order = {
  id: number;
  total_amount: number | null;
  status: string;
  created_at: string;
};

type Review = {
  id: number;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
};

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  // =====================================================
  // KULLANICI
  // =====================================================

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

  // =====================================================
  // RESTORAN ÜYELİĞİ
  // =====================================================

  const { data: membership, error: membershipError } =
    await supabase
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .single();

  if (
    membershipError ||
    !membership?.restaurant_id
  ) {
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

  // =====================================================
  // RESTORAN
  // =====================================================

  const {
    data: restaurant,
    error: restaurantError,
  } = await supabase
    .from("restaurants")
    .select("id, name, slug, plan")
    .eq("id", membership.restaurant_id)
    .single();

  if (restaurantError || !restaurant) {
    return (
      <main className="admin-page">
        <section className="admin-header">
          <h1>İşletme bulunamadı</h1>
          <p>
            Hesabınıza bağlı restoran bulunamadı.
          </p>
        </section>
      </main>
    );
  }

  // =====================================================
  // PAKET
  // =====================================================

  const plan = normalizePlan(restaurant.plan);
  const planLabel =
    plan === "premium"
      ? "PREMIUM"
      : plan === "pro"
      ? "PRO"
      : "STARTER";

  const canUseOrders = hasPlanFeature(
    plan,
    "orders"
  );

  const canUseAnalytics = hasPlanFeature(
    plan,
    "analytics"
  );

  const canUseMultiUser = hasPlanFeature(
    plan,
    "multi_user"
  );

  // =====================================================
  // TÜRKİYE SAATİNE GÖRE BUGÜN
  // =====================================================

  const now = new Date();

  const turkeyOffset = 3 * 60;

  const turkeyNow = new Date(
    now.getTime() +
      (turkeyOffset - now.getTimezoneOffset()) *
        60000
  );

  turkeyNow.setHours(0, 0, 0, 0);

  const todayStart = new Date(
    turkeyNow.getTime() -
      (turkeyOffset - now.getTimezoneOffset()) *
        60000
  );

  const tomorrowTurkey = new Date(
    turkeyNow.getTime() +
      24 * 60 * 60 * 1000
  );

  const tomorrowStart = new Date(
    tomorrowTurkey.getTime() -
      (turkeyOffset - now.getTimezoneOffset()) *
        60000
  );

  // =====================================================
  // BUGÜNKÜ SİPARİŞLER
  // =====================================================

  const {
    data: todayOrders,
    error: ordersError,
  } = canUseOrders
    ? await supabase
        .from("orders")
        .select(
          "id, total_amount, status, created_at"
        )
        .eq("restaurant_id", restaurant.id)
        .gte(
          "created_at",
          todayStart.toISOString()
        )
        .lt(
          "created_at",
          tomorrowStart.toISOString()
        )
        .order("created_at", {
          ascending: false,
        })
    : { data: [], error: null };

  if (ordersError) {
    console.error(
      "Dashboard siparişleri alınamadı:",
      ordersError
    );
  }

  const orders: Order[] =
    (todayOrders || []) as Order[];

  // =====================================================
  // SON 30 GÜNLÜK CİRO VERİSİ
  // =====================================================

  const chartStart = new Date(
    todayStart.getTime() -
      29 * 24 * 60 * 60 * 1000
  );

  const {
    data: chartOrdersData,
    error: chartOrdersError,
  } = canUseAnalytics
    ? await supabase
        .from("orders")
        .select("total_amount, created_at")
        .eq("restaurant_id", restaurant.id)
        .gte(
          "created_at",
          chartStart.toISOString()
        )
        .lt(
          "created_at",
          tomorrowStart.toISOString()
        )
    : { data: [], error: null };

  if (chartOrdersError) {
    console.error(
      "Dashboard ciro verileri alınamadı:",
      chartOrdersError
    );
  }

  const chartOrders: Pick<
    Order,
    "total_amount" | "created_at"
  >[] = (chartOrdersData || []) as Pick<
    Order,
    "total_amount" | "created_at"
  >[];

  function getTurkeyDateKey(dateString: string) {
    const date = new Date(dateString);

    const turkeyDate = new Date(
      date.getTime() + 3 * 60 * 60 * 1000
    );

    return turkeyDate.toISOString().slice(0, 10);
  }

  function formatChartLabel(
    date: Date,
    period: "week" | "month"
  ) {
    if (period === "week") {
      return new Intl.DateTimeFormat("tr-TR", {
        weekday: "short",
        day: "2-digit",
      }).format(date);
    }

    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  }

  function buildRevenueData(
    days: number,
    period: "week" | "month"
  ) {
    const revenueByDate = new Map<
      string,
      number
    >();

    for (const order of chartOrders) {
      const dateKey = getTurkeyDateKey(
        order.created_at
      );

      revenueByDate.set(
        dateKey,
        (revenueByDate.get(dateKey) || 0) +
          Number(order.total_amount || 0)
      );
    }

    return Array.from(
      { length: days },
      (_, index) => {
        const date = new Date(
          turkeyNow.getTime() -
            (days - 1 - index) *
              24 *
              60 *
              60 *
              1000
        );

        const dateKey = date
          .toISOString()
          .slice(0, 10);

        return {
          label: formatChartLabel(
            date,
            period
          ),
          revenue:
            revenueByDate.get(dateKey) || 0,
        };
      }
    );
  }

  const weeklyRevenue = buildRevenueData(
    7,
    "week"
  );

  const monthlyRevenue = buildRevenueData(
    30,
    "month"
  );

  // =====================================================
  // SİPARİŞ İSTATİSTİKLERİ
  // =====================================================

  const totalOrders = orders.length;

  const totalRevenue = orders.reduce(
    (sum, order) =>
      sum + Number(order.total_amount || 0),
    0
  );

  const pendingOrders = orders.filter(
    (order) => order.status === "pending"
  ).length;

  const preparingOrders = orders.filter(
    (order) =>
      order.status === "preparing" ||
      order.status === "accepted"
  ).length;

  const readyOrders = orders.filter(
    (order) => order.status === "ready"
  ).length;

  const deliveredOrders = orders.filter(
    (order) =>
      order.status === "delivered" ||
      order.status === "completed"
  ).length;

  const averageOrderValue =
    totalOrders > 0
      ? totalRevenue / totalOrders
      : 0;

  // =====================================================
  // DEĞERLENDİRMELER
  // =====================================================

  const {
    data: reviewsData,
    error: reviewsError,
  } = await supabase
    .from("reviews")
    .select(
      `
        id,
        customer_name,
        rating,
        comment,
        is_visible,
        created_at
      `
    )
    .eq("restaurant_id", restaurant.id)
    .order("created_at", {
      ascending: false,
    });

  if (reviewsError) {
    console.error(
      "Dashboard değerlendirmeleri alınamadı:",
      reviewsError
    );
  }

  const reviews: Review[] =
    (reviewsData || []) as Review[];

  const visibleReviews = reviews.filter(
    (review) => review.is_visible
  );

  const averageRating =
    visibleReviews.length > 0
      ? visibleReviews.reduce(
          (sum, review) =>
            sum + Number(review.rating),
          0
        ) / visibleReviews.length
      : 0;

  // =====================================================
  // SON SİPARİŞLER
  // =====================================================

  const latestOrders = orders.slice(0, 5);

  // =====================================================
  // SON DEĞERLENDİRMELER
  // =====================================================

  const latestReviews =
    visibleReviews.slice(0, 4);

  // =====================================================
  // DURUM METİNLERİ
  // =====================================================

  const statusLabels: Record<
    string,
    string
  > = {
    pending: "Yeni Sipariş",
    accepted: "Kabul Edildi",
    preparing: "Hazırlanıyor",
    ready: "Hazır",
    delivered: "Teslim Edildi",
    completed: "Tamamlandı",
  };

  const statusIcons: Record<
    string,
    string
  > = {
    pending: "🔔",
    accepted: "👍",
    preparing: "👨‍🍳",
    ready: "✅",
    delivered: "🎉",
    completed: "✓",
  };

  // =====================================================
  // TARİH
  // =====================================================

  const todayText =
    new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="admin-page">

      {/* =================================================
          ÜST BAR
      ================================================= */}

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

      {/* =================================================
          HERO
      ================================================= */}

      <section
        className="admin-dashboard-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "24px",
          flexWrap: "wrap",
        }}
      >

        <div>

          <span className="dashboard-eyebrow">
            YÖNETİM PANELİ
          </span>

          <h1>
            Hoş geldiniz 👋
          </h1>

          <h2>
            {restaurant.name}
          </h2>

          <p>
            İşletmenizin günlük durumunu ve
            yönetim işlemlerini buradan takip
            edebilirsiniz.
          </p>

        </div>

        <div
          className="dashboard-date"
          style={{
            minWidth: "180px",
          }}
        >
          <span>
            BUGÜN
          </span>

          <strong>
            {todayText}
          </strong>
        </div>

      </section>

      {/* =================================================
          İŞLETME DURUMU
      ================================================= */}

      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
          marginBottom: "20px",
          padding: "15px 18px",
          borderRadius: "16px",
          background: "#fff",
          border: "1px solid #e8e2d8",
          boxShadow:
            "0 8px 24px rgba(0,0,0,.035)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "11px",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#2e9d52",
              boxShadow:
                "0 0 0 5px rgba(46,157,82,.10)",
              flexShrink: 0,
            }}
          />

          <div>
            <strong
              style={{
                display: "block",
                fontSize: "13px",
                color: "#222",
              }}
            >
              {restaurant.name}
            </strong>

            <span
              style={{
                display: "block",
                marginTop: "3px",
                fontSize: "11px",
                color: "#777",
              }}
            >
              Yönetim paneliniz aktif
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                fontSize: "10px",
                color: "#999",
                fontWeight: 800,
                letterSpacing: ".5px",
              }}
            >
              PAKET
            </span>

            <strong
              style={{
                display: "block",
                marginTop: "3px",
                fontSize: "13px",
                color: plan === "premium"
                  ? "#9a6b00"
                  : plan === "pro"
                  ? "#8a6500"
                  : "#555",
              }}
            >
              {planLabel}
            </strong>
          </div>

          <div>
            <span
              style={{
                display: "block",
                fontSize: "10px",
                color: "#999",
                fontWeight: 800,
                letterSpacing: ".5px",
              }}
            >
              SİPARİŞ ORTALAMASI
            </span>

            <strong
              style={{
                display: "block",
                marginTop: "3px",
                fontSize: "13px",
              }}
            >
              {averageOrderValue.toLocaleString(
                "tr-TR",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}{" "}
              TL
            </strong>
          </div>

          <Link
            href={`/restoran/${restaurant.slug}/menu`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "38px",
              padding: "8px 13px",
              borderRadius: "9px",
              border: "1px solid #ded7ca",
              background: "#faf8f3",
              color: "#333",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            👁️ Müşteri Menüsünü Gör
          </Link>
        </div>
      </section>

      {/* =================================================
          ANA İSTATİSTİKLER
      ================================================= */}

      <section className="dashboard-stats">

        {/* Sipariş */}

        <div className="dashboard-stat-card">

          <div className="stat-icon">
            📦
          </div>

          <div className="stat-content">

            <span>
              Bugünkü Sipariş
            </span>

            <strong>
              {totalOrders}
            </strong>

            <small>
              Toplam sipariş
            </small>

          </div>

        </div>

        {/* Ciro */}

        <div className="dashboard-stat-card">

          <div className="stat-icon">
            ₺
          </div>

          <div className="stat-content">

            <span>
              Bugünkü Ciro
            </span>

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

        {/* Bekleyen */}

        <div className="dashboard-stat-card">

          <div className="stat-icon">
            🔔
          </div>

          <div className="stat-content">

            <span>
              Bekleyen
            </span>

            <strong>
              {pendingOrders}
            </strong>

            <small>
              Yeni sipariş
            </small>

          </div>

        </div>

        {/* Hazırlanan */}

        <div className="dashboard-stat-card">

          <div className="stat-icon">
            👨‍🍳
          </div>

          <div className="stat-content">

            <span>
              Hazırlanan
            </span>

            <strong>
              {preparingOrders}
            </strong>

            <small>
              Mutfakta işlemde
            </small>

          </div>

        </div>

        {/* Hazır */}

        <div className="dashboard-stat-card">

          <div className="stat-icon">
            ✅
          </div>

          <div className="stat-content">

            <span>
              Hazır
            </span>

            <strong>
              {readyOrders}
            </strong>

            <small>
              Teslim bekliyor
            </small>

          </div>

        </div>

        {/* Teslim */}

        <div className="dashboard-stat-card">

          <div className="stat-icon">
            🎉
          </div>

          <div className="stat-content">

            <span>
              Teslim Edilen
            </span>

            <strong>
              {deliveredOrders}
            </strong>

            <small>
              Bugün tamamlandı
            </small>

          </div>

        </div>

        {/* Puan */}

        <div className="dashboard-stat-card">

          <div className="stat-icon">
            ⭐
          </div>

          <div className="stat-content">

            <span>
              Ortalama Puan
            </span>

            <strong>
              {averageRating.toFixed(1)}
            </strong>

            <small>
              {visibleReviews.length} yayınlanmış yorum
            </small>

          </div>

        </div>

      </section>

      {/* =================================================
          CİRO ANALİZİ
      ================================================= */}

      <section
        className="dashboard-section"
        style={{
          marginBottom: "20px",
        }}
      >
        {canUseAnalytics ? (
          <DashboardCharts
            weeklyRevenue={weeklyRevenue}
            monthlyRevenue={monthlyRevenue}
          />
        ) : (
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "26px 22px",
              boxShadow:
                "0 10px 30px rgba(0,0,0,0.05)",
              border: "1px solid #eee6d8",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: ".8px",
                color: "#999",
              }}
            >
              CİRO ANALİZİ
            </span>

            <h2
              style={{
                margin: "6px 0 8px",
                fontSize: "20px",
              }}
            >
              Analitik PRO özelliğidir
            </h2>

            <p
              style={{
                margin: 0,
                color: "#777",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              Ciro grafikleri ve gelişmiş satış
              analizlerini kullanmak için PRO veya
              PREMIUM pakete geçmeniz gerekiyor.
            </p>
          </div>
        )}
      </section>

      {/* =================================================
          GARSON ÇAĞRILARI
      ================================================= */}

      <section
        className="dashboard-section"
        style={{
          marginBottom: "20px",
        }}
      >
        {hasPlanFeature(plan, "waiter_call") ? (
          <ServiceRequests
            restaurantId={restaurant.id}
          />
        ) : (
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "22px",
              boxShadow:
                "0 10px 30px rgba(0,0,0,0.05)",
              border: "1px solid #eee6d8",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: ".8px",
                color: "#999",
              }}
            >
              GARSON ÇAĞRILARI
            </span>

            <h2
              style={{
                margin: "6px 0 8px",
                fontSize: "20px",
              }}
            >
              Garson çağırma PRO özelliğidir
            </h2>

            <p
              style={{
                margin: 0,
                color: "#777",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              Müşterilerden gelen garson çağrılarını
              yönetmek için PRO veya PREMIUM paket
              gereklidir.
            </p>
          </div>
        )}
      </section>

      {/* =================================================
          SON SİPARİŞLER + YORUMLAR
      ================================================= */}

      <section
        className="dashboard-section"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "20px",
          alignItems: "start",
        }}
      >

        {/* =================================================
            SON SİPARİŞLER
        ================================================= */}

        <div
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "22px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.05)",
          }}
        >

          <div
            className="dashboard-section-heading"
            style={{
              marginBottom: "15px",
            }}
          >

            <div>

              <span>
                SON SİPARİŞLER
              </span>

              <h2>
                Bugünkü siparişler
              </h2>

            </div>

            <Link
              href="/admin/orders"
              style={{
                color: "#c8941d",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              Tümünü Gör →
            </Link>

          </div>

          {!canUseOrders ? (
            <div
              style={{
                padding: "30px 10px",
                textAlign: "center",
                color: "#888",
              }}
            >
              <div
                style={{
                  fontSize: "34px",
                  marginBottom: "8px",
                }}
              >
                🔒
              </div>

              <strong>
                Sipariş yönetimi PRO özelliğidir.
              </strong>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  fontSize: "13px",
                }}
              >
                Siparişleri görüntülemek ve
                yönetmek için PRO veya PREMIUM
                pakete geçmeniz gerekiyor.
              </p>
            </div>
          ) : latestOrders.length === 0 ? (

            <div
              style={{
                padding: "30px 10px",
                textAlign: "center",
                color: "#888",
              }}
            >
              <div
                style={{
                  fontSize: "34px",
                  marginBottom: "8px",
                }}
              >
                📦
              </div>

              <strong>
                Bugün henüz sipariş yok.
              </strong>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  fontSize: "13px",
                }}
              >
                Yeni siparişler burada
                görünecek.
              </p>
            </div>

          ) : (

            <div
              style={{
                display: "grid",
                gap: "0",
              }}
            >

              {latestOrders.map(
                (order) => (

                  <div
                    key={order.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "space-between",
                      gap: "15px",
                      padding:
                        "15px 0",
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >

                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "12px",
                      }}
                    >

                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius:
                            "12px",
                          background:
                            "#f8f3e8",
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          fontSize: "18px",
                        }}
                      >
                        {statusIcons[
                          order.status
                        ] || "📦"}
                      </div>

                      <div>

                        <strong>
                          Sipariş #
                          {order.id}
                        </strong>

                        <div
                          style={{
                            marginTop:
                              "4px",
                            color: "#888",
                            fontSize:
                              "12px",
                          }}
                        >
                          {new Date(
                            order.created_at
                          ).toLocaleTimeString(
                            "tr-TR",
                            {
                              hour: "2-digit",
                              minute:
                                "2-digit",
                            }
                          )}

                          {" • "}

                          {
                            statusLabels[
                              order.status
                            ] ||
                            order.status
                          }
                        </div>

                      </div>

                    </div>

                    <strong>
                      {Number(
                        order.total_amount ||
                          0
                      ).toLocaleString(
                        "tr-TR"
                      )}{" "}
                      TL
                    </strong>

                  </div>

                )
              )}

            </div>

          )}

        </div>

        {/* =================================================
            SON YORUMLAR
        ================================================= */}

        <div
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "22px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.05)",
          }}
        >

          <div
            className="dashboard-section-heading"
            style={{
              marginBottom: "15px",
            }}
          >

            <div>

              <span>
                SON DEĞERLENDİRMELER
              </span>

              <h2>
                Müşteri yorumları
              </h2>

            </div>

            <Link
              href="/admin/degerlendirmeler"
              style={{
                color: "#c8941d",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              Tümünü Gör →
            </Link>

          </div>

          {latestReviews.length === 0 ? (

            <div
              style={{
                padding: "30px 10px",
                textAlign: "center",
                color: "#888",
              }}
            >

              <div
                style={{
                  fontSize: "34px",
                  marginBottom: "8px",
                }}
              >
                ⭐
              </div>

              <strong>
                Henüz değerlendirme yok.
              </strong>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  fontSize: "13px",
                }}
              >
                Müşteri yorumları
                burada görünecek.
              </p>

            </div>

          ) : (

            <div
              style={{
                display: "grid",
                gap: "14px",
              }}
            >

              {latestReviews.map(
                (review) => (

                  <div
                    key={review.id}
                    style={{
                      paddingBottom:
                        "14px",
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: "10px",
                      }}
                    >

                      <strong>
                        {review.customer_name ||
                          "Anonim Müşteri"}
                      </strong>

                      <span
                        style={{
                          color: "#c8941d",
                          letterSpacing:
                            "1px",
                        }}
                      >
                        {"★".repeat(
                          Math.max(
                            0,
                            Math.min(
                              5,
                              Number(
                                review.rating
                              )
                            )
                          )
                        )}
                      </span>

                    </div>

                    {review.comment && (

                      <p
                        style={{
                          margin:
                            "7px 0 0",
                          color: "#666",
                          fontSize:
                            "13px",
                          lineHeight: 1.5,
                        }}
                      >
                        {review.comment.length >
                        100
                          ? `${review.comment.slice(
                              0,
                              100
                            )}...`
                          : review.comment}
                      </p>

                    )}

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </section>

      {/* =================================================
          HIZLI İŞLEMLER
      ================================================= */}

      <section className="dashboard-section">

        <div
          className="dashboard-section-heading"
          style={{
            marginBottom: "16px",
          }}
        >

          <div>

            <span>
              HIZLI İŞLEMLER
            </span>

            <h2>
              Sık kullanılan işlemler
            </h2>

          </div>

        </div>

        <div
          className="quick-actions"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          }}
        >

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

            <b>
              →
            </b>

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

            <b>
              →
            </b>

          </Link>

          {hasPlanFeature(plan, "orders") ? (
            <Link
              href="/admin/orders"
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

              <b>
                →
              </b>

            </Link>
          ) : (
            <div
              className="quick-action"
              style={{
                opacity: 0.65,
                cursor: "not-allowed",
              }}
            >
              <div className="quick-action-icon">
                🔒
              </div>

              <div>
                <strong>
                  Siparişler
                </strong>

                <span>
                  PRO paketi gerektirir
                </span>
              </div>

              <b>
                🔒
              </b>
            </div>
          )}

          <Link
            href={`/restoran/${restaurant.slug}/menu`}
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

            <b>
              →
            </b>

          </Link>

        </div>

      </section>

      {/* =================================================
          YÖNETİM ALANLARI
      ================================================= */}

      <section className="dashboard-section">

        <div
          className="dashboard-section-heading"
          style={{
            marginBottom: "16px",
          }}
        >

          <div>

            <span>
              YÖNETİM
            </span>

            <h2>
              İşletmenizi yönetin
            </h2>

          </div>

        </div>

        <section
          className="admin-grid"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          }}
        >

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
  href="/admin/menu/promosyon"
  className="admin-card"
>
  <span className="admin-card-icon">
    🏷️
  </span>

  <h2>
    Kampanyalar
  </h2>

  <p>
    İndirim, kampanya ve popüler
    ürünleri yönetin.
  </p>

  <span className="admin-card-arrow">
    →
  </span>
</Link>

          {hasPlanFeature(plan, "orders") ? (
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
                Gelen siparişleri
                görüntüleyin ve yönetin.
              </p>

              <span className="admin-card-arrow">
                →
              </span>

            </Link>
          ) : (
            <div
              className="admin-card"
              style={{
                opacity: 0.65,
                cursor: "not-allowed",
              }}
            >
              <span className="admin-card-icon">
                🔒
              </span>

              <h2>
                Siparişler
              </h2>

              <p>
                PRO paketi gerektirir.
              </p>

              <span className="admin-card-arrow">
                🔒
              </span>
            </div>
          )}

          {canUseMultiUser ? (
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
          ) : (
            <div
              className="admin-card"
              style={{
                opacity: 0.65,
                cursor: "not-allowed",
              }}
            >
              <span className="admin-card-icon">
                🔒
              </span>

              <h2>
                Çalışanlar
              </h2>

              <p>
                PRO paketi gerektirir.
              </p>

              <span className="admin-card-arrow">
                🔒
              </span>
            </div>
          )}

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
            href="/admin/tables"
            className="admin-card"
          >

            <span className="admin-card-icon">
              🪑
            </span>

            <h2>
              Masalar
            </h2>

            <p>
              Masalarınızı ve masa QR kodlarını
              yönetin.
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
              Masalarınızın QR kodlarını
              ve NFC bağlantılarını yönetin.
            </p>

            <span className="admin-card-arrow">
              →
            </span>

          </Link>

        </section>

      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

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