import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import AdminIcon from "./AdminIcon";
import { orderNumber } from "../../lib/order-number";
import DashboardCharts from "./DashboardCharts";
import ServiceRequests from "./ServiceRequests";
import { hasPlanFeature, normalizePlan } from "../../lib/plan";

type Order = {
  id: number;
  total_amount: number | null;
  status: string;
  created_at: string;
  daily_number?: number | null;
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
      <main className="adm-page">
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="alert" /></span>
          <strong>Oturum bulunamadı</strong>
          <p>Lütfen tekrar giriş yapın.</p>
        </div>
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
      <main className="adm-page">
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="alert" /></span>
          <strong>İşletme bağlantısı bulunamadı</strong>
          <p>Bu kullanıcıya bağlı bir restoran bulunamadı.</p>
        </div>
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
      <main className="adm-page">
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="alert" /></span>
          <strong>İşletme bulunamadı</strong>
          <p>Hesabınıza bağlı restoran bulunamadı.</p>
        </div>
      </main>
    );
  }

  // =====================================================
  // PAKET
  // =====================================================

  const plan = normalizePlan(restaurant.plan);
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
        // "*": günlük numara sütunu varsa o da gelir.
        .select("*")
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
  // GÖRÜNÜM
  // =====================================================

  const statusLabels: Record<string, string> = {
    pending: "Yeni",
    accepted: "Kabul edildi",
    preparing: "Hazırlanıyor",
    ready: "Hazır",
    delivered: "Teslim edildi",
    completed: "Tamamlandı",
  };

  const todayText = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const money = (value: number) =>
    `${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">{todayText}</span>
          <h1>Hoş geldiniz</h1>
          <p>{restaurant.name} için bugünün özeti ve son hareketler.</p>
        </div>
        <div className="adm-head-actions">
          <a
            className="adm-btn"
            href={`/restoran/${restaurant.slug}/menu`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <AdminIcon name="external" size={16} />
            Müşteri menüsü
          </a>
          <Link className="adm-btn adm-btn-primary" href="/admin/menu/yeni">
            <AdminIcon name="plus" size={16} />
            Yeni ürün
          </Link>
        </div>
      </header>

      {/* ============ BUGÜN ============ */}
      <section className="adm-stats" aria-label="Bugünün özeti">
        <div className="adm-stat is-highlight">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Bugünkü ciro</span>
            <span className="adm-stat-icon"><AdminIcon name="lira" size={16} /></span>
          </div>
          <span className="adm-stat-value">{money(totalRevenue)}</span>
          <span className="adm-stat-hint">
            Ortalama sepet {money(averageOrderValue)}
          </span>
        </div>

        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Bugünkü sipariş</span>
            <span className="adm-stat-icon"><AdminIcon name="orders" size={16} /></span>
          </div>
          <span className="adm-stat-value">{totalOrders}</span>
          <span className="adm-stat-hint">{deliveredOrders} teslim edildi</span>
        </div>

        <div className="adm-stat tone-new">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Bekleyen</span>
            <span className="adm-stat-icon"><AdminIcon name="bell" size={16} /></span>
          </div>
          <span className="adm-stat-value">{pendingOrders}</span>
          <span className="adm-stat-hint">Onay bekliyor</span>
        </div>

        <div className="adm-stat tone-preparing">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Mutfakta</span>
            <span className="adm-stat-icon"><AdminIcon name="chef" size={16} /></span>
          </div>
          <span className="adm-stat-value">{preparingOrders}</span>
          <span className="adm-stat-hint">Hazırlanıyor</span>
        </div>

        <div className="adm-stat tone-ready">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Hazır</span>
            <span className="adm-stat-icon"><AdminIcon name="check" size={16} /></span>
          </div>
          <span className="adm-stat-value">{readyOrders}</span>
          <span className="adm-stat-hint">Servis bekliyor</span>
        </div>

        <div className="adm-stat tone-accent">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Ortalama puan</span>
            <span className="adm-stat-icon"><AdminIcon name="star" size={16} /></span>
          </div>
          <span className="adm-stat-value">
            {visibleReviews.length > 0 ? averageRating.toFixed(1) : "—"}
          </span>
          <span className="adm-stat-hint">{visibleReviews.length} yayında yorum</span>
        </div>
      </section>

      {/* ============ CİRO ============ */}
      {canUseAnalytics ? (
        <DashboardCharts weeklyRevenue={weeklyRevenue} monthlyRevenue={monthlyRevenue} />
      ) : (
        <div className="adm-lock">
          <span className="adm-badge s-accent">
            <AdminIcon name="lock" size={12} /> PRO
          </span>
          <h2>Ciro grafikleri</h2>
          <p>
            Haftalık ve aylık ciro grafikleri ile satış analizleri PRO ve PREMIUM
            paketlerde açılır.
          </p>
        </div>
      )}

      {/* ============ GARSON ÇAĞRILARI ============ */}
      {hasPlanFeature(plan, "waiter_call") ? (
        <ServiceRequests restaurantId={restaurant.id} />
      ) : (
        <div className="adm-lock">
          <span className="adm-badge s-accent">
            <AdminIcon name="lock" size={12} /> PRO
          </span>
          <h2>Garson çağrıları</h2>
          <p>
            Masalardan gelen garson ve hesap isteklerini buradan anlık görmek için
            PRO veya PREMIUM paket gerekir.
          </p>
        </div>
      )}

      {/* ============ SON SİPARİŞLER + YORUMLAR ============ */}
      <div className="adm-grid-2">
        <section className="adm-card" aria-labelledby="son-siparisler">
          <div className="adm-card-head">
            <div>
              <h2 id="son-siparisler">Bugünkü siparişler</h2>
              <p>En son gelen 5 sipariş</p>
            </div>
            {canUseOrders && (
              <Link className="adm-card-link" href="/admin/orders">
                Tümü
              </Link>
            )}
          </div>

          {!canUseOrders ? (
            <div className="adm-empty">
              <span className="adm-empty-icon"><AdminIcon name="lock" /></span>
              <strong>Sipariş yönetimi PRO özelliğidir</strong>
              <p>QR menüden sipariş almak için PRO veya PREMIUM pakete geçin.</p>
            </div>
          ) : latestOrders.length === 0 ? (
            <div className="adm-empty">
              <span className="adm-empty-icon"><AdminIcon name="orders" /></span>
              <strong>Bugün henüz sipariş yok</strong>
              <p>Masalardan gelen siparişler burada görünecek.</p>
            </div>
          ) : (
            <div className="adm-list">
              {latestOrders.map((order) => (
                <Link key={order.id} className="adm-row" href="/admin/orders">
                  <span className="adm-row-icon"><AdminIcon name="orders" size={17} /></span>
                  <span className="adm-row-main">
                    <strong>Sipariş {orderNumber(order)}</strong>
                    <small>
                      {new Date(order.created_at).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </span>
                  <span className="adm-row-end">
                    <span className="adm-num">{money(Number(order.total_amount || 0))}</span>
                    <span className={`adm-badge s-${order.status}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="adm-card" aria-labelledby="son-yorumlar">
          <div className="adm-card-head">
            <div>
              <h2 id="son-yorumlar">Müşteri yorumları</h2>
              <p>Yayındaki son değerlendirmeler</p>
            </div>
            <Link className="adm-card-link" href="/admin/degerlendirmeler">
              Tümü
            </Link>
          </div>

          {latestReviews.length === 0 ? (
            <div className="adm-empty">
              <span className="adm-empty-icon"><AdminIcon name="star" /></span>
              <strong>Henüz yorum yok</strong>
              <p>Müşteriler sipariş sonrası değerlendirme yaptığında burada görünür.</p>
            </div>
          ) : (
            <div className="adm-list">
              {latestReviews.map((review) => {
                const stars = Math.max(0, Math.min(5, Number(review.rating)));
                return (
                  <div key={review.id} className="adm-row" style={{ alignItems: "flex-start" }}>
                    <span className="adm-row-icon"><AdminIcon name="user" size={17} /></span>
                    <span className="adm-row-main">
                      <strong>{review.customer_name || "Misafir"}</strong>
                      {review.comment && (
                        <small style={{ whiteSpace: "normal" }}>
                          {review.comment.length > 110
                            ? `${review.comment.slice(0, 110)}…`
                            : review.comment}
                        </small>
                      )}
                    </span>
                    <span className="adm-badge s-accent" aria-label={`${stars} yıldız`}>
                      <AdminIcon name="star" size={12} /> {stars}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ============ HIZLI İŞLEMLER ============ */}
      <section className="adm-section" aria-labelledby="hizli-islemler">
        <div className="adm-section-head">
          <h2 id="hizli-islemler">Hızlı işlemler</h2>
        </div>
        <div className="adm-tiles">
          <Link className="adm-tile" href="/admin/menu/yeni">
            <span className="adm-tile-icon"><AdminIcon name="plus" /></span>
            <span className="adm-tile-text">
              <strong>Yeni ürün</strong>
              <small>Menüye ürün ekleyin</small>
            </span>
          </Link>
          <Link className="adm-tile" href="/admin/menu/kategori/yeni">
            <span className="adm-tile-icon"><AdminIcon name="category" /></span>
            <span className="adm-tile-text">
              <strong>Yeni kategori</strong>
              <small>Menüyü bölümlere ayırın</small>
            </span>
          </Link>
          <Link className="adm-tile" href="/admin/tables">
            <span className="adm-tile-icon"><AdminIcon name="table" /></span>
            <span className="adm-tile-text">
              <strong>Masalar ve QR</strong>
              <small>Masa ekleyin, kod yazdırın</small>
            </span>
          </Link>
          <Link className="adm-tile" href="/admin/ayarlar">
            <span className="adm-tile-icon"><AdminIcon name="settings" /></span>
            <span className="adm-tile-text">
              <strong>İşletme ayarları</strong>
              <small>Saatler, iletişim, WiFi</small>
            </span>
          </Link>
          {canUseMultiUser && (
            <Link className="adm-tile" href="/admin/calisanlar">
              <span className="adm-tile-icon"><AdminIcon name="staff" /></span>
              <span className="adm-tile-text">
                <strong>Çalışanlar</strong>
                <small>Ekibinizi yönetin</small>
              </span>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
