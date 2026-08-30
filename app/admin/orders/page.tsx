import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import OrderActions from "./OrderActions";
import OrdersAutoRefresh from "./OrdersAutoRefresh";
import NewOrderNotification from "./NewOrderNotification";
import SessionControls from "./SessionControls";
import { hasPlanFeature, getPlanLabel } from "../../../lib/plan";

export const dynamic = "force-dynamic";

type SearchParams = {
  search?: string;
  status?: string;
};

type Order = {
  id: number;
  restaurant_id: number;
  customer_name: string | null;
  table_number: string;
  note: string | null;
  total_amount: number;
  status: string;
  payment_method: string | null;
  payment_status: string | null;
  session_id: number | null;
  created_at: string;
};

type OrderItem = {
  id: number;
  order_id: number;
  product_name: string;
  price: number;
  quantity: number;
};

type DiningSession = {
  id: number;
  restaurant_id: number;
  table_id: number;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
};

function statusText(status: string) {
  switch (status) {
    case "pending":
      return "Yeni Sipariş";
    case "accepted":
      return "Kabul Edildi";
    case "preparing":
      return "Hazırlanıyor";
    case "ready":
      return "Hazır";
    case "delivered":
      return "Tamamlandı";
    default:
      return status;
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "pending":
      return "🔔";
    case "accepted":
      return "👍";
    case "preparing":
      return "👨‍🍳";
    case "ready":
      return "✅";
    case "delivered":
      return "✓";
    default:
      return "•";
  }
}

function statusColor(status: string) {
  switch (status) {
    case "pending":
      return "#f59e0b";
    case "accepted":
      return "#3b82f6";
    case "preparing":
      return "#8b5cf6";
    case "ready":
      return "#10b981";
    case "delivered":
      return "#22c55e";
    default:
      return "#777";
  }
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPrice(price: number) {
  return Number(price).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function paymentMethodText(method: string | null) {
  switch (method) {
    case "cash":
      return "💵 Nakit";
    case "card":
      return "💳 Kart / POS";
    case "online":
      return "🌐 Online";
    default:
      return "Belirtilmedi";
  }
}

function paymentStatusText(status: string | null) {
  switch (status) {
    case "paid":
      return "🟢 Ödendi";
    case "refunded":
      return "↩️ İade";
    case "unpaid":
      return "🔴 Ödenmedi";
    default:
      return "🔴 Ödenmedi";
  }
}


function sessionOrdersTableLabel(
  sessionId: number,
  orders: Order[]
) {
  const order = orders.find(
    (item) =>
      item.session_id === sessionId
  );

  return order?.table_number || "—";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(name, value, options);
              }
            );
          } catch {
            // Server Component içerisinde cookie yazılamayabilir.
          }
        },
      },
    }
  );

  const params = await searchParams;

  const search = params.search?.trim() || "";
  const selectedStatus = params.status || "all";
  // =====================================================
  // RESTORAN
  // =====================================================

  // =====================================================
// GİRİŞ YAPAN KULLANICI
// =====================================================

const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  return (
    <main className="orders-page">
      <div className="orders-error">
        <h1>Oturum bulunamadı.</h1>
        <p>Lütfen tekrar giriş yapın.</p>
      </div>
    </main>
  );
}

// =====================================================
// KULLANICININ RESTORAN BAĞLANTISI
// =====================================================

const { data: membership, error: membershipError } =
  await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

if (membershipError || !membership?.restaurant_id) {
  return (
    <main className="orders-page">
      <div className="orders-error">
        <h1>Restoran bağlantısı bulunamadı.</h1>
        <p>
          Bu kullanıcı herhangi bir restorana bağlı değil.
        </p>
      </div>
    </main>
  );
}

// =====================================================
// KULLANICIYA AİT RESTORAN
// =====================================================

const {
  data: restaurant,
  error: restaurantError,
} = await supabase
  .from("restaurants")
  .select("id, name, plan")
  .eq("id", membership.restaurant_id)
  .single();

if (restaurantError || !restaurant) {
  return (
    <main className="orders-page">
      <div className="orders-error">
        <h1>Restoran bulunamadı.</h1>
      </div>
    </main>
  );
}

  // =====================================================
  // PAKET KONTROLÜ
  // =====================================================

  // Sipariş yönetimi yalnızca PRO ve PREMIUM paketlerinde açıktır.
  // Bu kontrol server tarafında çalıştığı için kullanıcı
  // /admin/orders adresini doğrudan açsa bile STARTER erişemez.
  const restaurantPlan = restaurant.plan;
  const canUseOrders = hasPlanFeature(
    restaurantPlan,
    "orders"
  );

  if (!canUseOrders) {
    return (
      <main className="orders-page">
        <section
          className="orders-empty"
          style={{
            maxWidth: "720px",
            margin: "80px auto",
            background: "#fff",
            borderRadius: "22px",
            padding: "50px 28px",
            textAlign: "center",
            boxShadow: "0 12px 35px rgba(0,0,0,0.06)",
            border: "1px solid #eee",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              margin: "0 auto 18px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff5dc",
              fontSize: "34px",
            }}
          >
            🔒
          </div>

          <div
            style={{
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#b27b00",
              marginBottom: "8px",
            }}
          >
            {getPlanLabel(restaurantPlan)} PAKET
          </div>

          <h1
            style={{
              margin: "0 0 10px",
              fontSize: "28px",
            }}
          >
            Sipariş Yönetimi Kilitli
          </h1>

          <p
            style={{
              maxWidth: "520px",
              margin: "0 auto",
              color: "#666",
              lineHeight: 1.7,
              fontSize: "14px",
            }}
          >
            Sipariş alma ve sipariş yönetimi özelliği PRO ve
            PREMIUM paketlerinde kullanılabilir.
          </p>

          <div
            style={{
              marginTop: "24px",
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/admin"
              style={{
                display: "inline-block",
                padding: "12px 20px",
                borderRadius: "10px",
                background: "#1b1b1b",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              ← Yönetim Paneline Dön
            </a>
          </div>
        </section>
      </main>
    );
  }

  // =====================================================
  // SİPARİŞLER
  // =====================================================

  const {
    data: orders,
    error: ordersError,
  } = await supabase
    .from("orders")
    .select(
      `
        id,
        restaurant_id,
        customer_name,
        table_number,
        note,
        total_amount,
        status,
        payment_method,
        payment_status,
        session_id,
        created_at
      `
    )
    .eq("restaurant_id", restaurant.id)
    .order("created_at", {
      ascending: false,
    });

  if (ordersError) {
    return (
      <main className="orders-page">
        <div className="orders-error">
          <h1>Siparişler</h1>

          <p>
            Siparişler yüklenirken hata oluştu:
            <br />
            {ordersError.message}
          </p>
        </div>
      </main>
    );
  }

  // =====================================================
  // AÇIK MASA OTURUMLARI
  // =====================================================

  const {
    data: openSessions,
    error: openSessionsError,
  } = await supabase
    .from("dining_sessions")
    .select(
      "id, restaurant_id, table_id, status, opened_at, closed_at"
    )
    .eq("restaurant_id", restaurant.id)
    .eq("status", "open")
    .order("opened_at", {
      ascending: true,
    });

  if (openSessionsError) {
    console.error(
      "Açık masa oturumları yüklenemedi:",
      openSessionsError
    );
  }

  const safeOpenSessions: DiningSession[] =
    (openSessions || []) as DiningSession[];

  const sessionStats = safeOpenSessions.map(
    (session) => {
      const sessionOrders =
        (orders || []).filter(
          (order) =>
            order.session_id ===
            session.id
        );

      const total =
        sessionOrders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.total_amount || 0
            ),
          0
        );

      const unpaidTotal =
        sessionOrders
          .filter(
            (order) =>
              order.payment_status !==
              "paid" &&
              order.payment_status !==
              "refunded"
          )
          .reduce(
            (sum, order) =>
              sum +
              Number(
                order.total_amount || 0
              ),
            0
          );

      return {
        session,
        orders: sessionOrders,
        orderCount: sessionOrders.length,
        total,
        unpaidTotal,
      };
    }
  );

  // =====================================================
  // SİPARİŞ ÜRÜNLERİ
  // =====================================================

  const orderIds = (orders ?? []).map(
    (order) => order.id
  );

  let orderItems: OrderItem[] = [];

  if (orderIds.length > 0) {
    const {
      data: items,
      error: itemsError,
    } = await supabase
      .from("order_items")
      .select(
        `
          id,
          order_id,
          product_name,
          price,
          quantity
        `
      )
      .in("order_id", orderIds)
      .order("id");

    if (itemsError) {
      return (
        <main className="orders-page">
          <div className="orders-error">
            <h1>Siparişler</h1>

            <p>
              Sipariş ürünleri yüklenemedi:
              <br />
              {itemsError.message}
            </p>
          </div>
        </main>
      );
    }

    orderItems = items ?? [];
  }

  // =====================================================
  // TÜM DURUMLAR
  // =====================================================

  const pendingOrders =
    orders?.filter(
      (order) => order.status === "pending"
    ) ?? [];

  const acceptedOrders =
    orders?.filter(
      (order) => order.status === "accepted"
    ) ?? [];

  const preparingOrders =
    orders?.filter(
      (order) => order.status === "preparing"
    ) ?? [];

  const readyOrders =
    orders?.filter(
      (order) => order.status === "ready"
    ) ?? [];

  const completedOrders =
    orders?.filter(
      (order) => order.status === "delivered"
    ) ?? [];

  const activeOrders =
    pendingOrders.length +
    acceptedOrders.length +
    preparingOrders.length +
    readyOrders.length;

  // =====================================================
  // TOPLAM CİRO
  // =====================================================

  const totalRevenue =
    orders?.reduce(
      (sum, order) =>
        order.payment_status === "refunded"
          ? sum
          : sum + Number(order.total_amount || 0),
      0
    ) ?? 0;

  // =====================================================
  // ARAMA + FİLTRELEME
  // =====================================================

  const filteredOrders =
    orders?.filter((order) => {
      const matchesStatus =
        selectedStatus === "all" ||
        order.status === selectedStatus;

      if (!matchesStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchLower =
        search.toLocaleLowerCase("tr-TR");

      const customerName =
        order.customer_name
          ?.toLocaleLowerCase("tr-TR") || "";

      const tableNumber =
        String(order.table_number || "")
          .toLocaleLowerCase("tr-TR");

      const orderId =
        String(order.id);

      return (
        customerName.includes(searchLower) ||
        tableNumber.includes(searchLower) ||
        orderId.includes(searchLower)
      );
    }) ?? [];

  // =====================================================
  // AKTİF / TAMAMLANMIŞ FİLTRE
  // =====================================================

  const visibleActiveOrders =
    filteredOrders.filter(
      (order) =>
        order.status !== "delivered"
    );

  const visibleCompletedOrders =
    filteredOrders.filter(
      (order) =>
        order.status === "delivered"
    );

  // =====================================================
  // FİLTRE URL
  // =====================================================

  function filterUrl(
    status: string
  ) {
    const query =
      new URLSearchParams();

    if (search) {
      query.set("search", search);
    }

    if (status !== "all") {
      query.set("status", status);
    }

    const queryString =
      query.toString();

    return `/admin/orders${
      queryString
        ? `?${queryString}`
        : ""
    }`;
  }

  // =====================================================
  // SAYFA
  // =====================================================

  return (
    <main className="orders-page">
        <NewOrderNotification
  restaurantId={restaurant.id}
/>

      <OrdersAutoRefresh
        restaurantId={restaurant.id}
      />

      {/* =================================================
          HEADER
      ================================================== */}

      <section className="orders-header">

        <div className="orders-header-left">

          <a
            href="/admin"
            className="orders-back"
          >
            ← Yönetim Paneli
          </a>

          <div className="orders-kicker">
            SİPARİŞ YÖNETİMİ
          </div>

          <h1>
            Gelen Siparişler
          </h1>

          <p>
            {restaurant.name} müşterilerinden gelen
            siparişleri buradan yönetin.
          </p>

        </div>

        <div className="orders-live">
          <span className="orders-live-dot" />
          CANLI
        </div>

      </section>

      {/* =================================================
          İSTATİSTİKLER
      ================================================== */}

      <section
        className="orders-stats"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(170px, 1fr))",
        }}
      >

        <div className="orders-stat">

          <div className="orders-stat-icon">
            🔔
          </div>

          <div>
            <span>Yeni Sipariş</span>

            <strong>
              {pendingOrders.length}
            </strong>

            <small>
              Onay bekliyor
            </small>
          </div>

        </div>

        <div className="orders-stat">

          <div className="orders-stat-icon">
            👨‍🍳
          </div>

          <div>
            <span>Hazırlanıyor</span>

            <strong>
              {acceptedOrders.length +
                preparingOrders.length}
            </strong>

            <small>
              Mutfakta
            </small>
          </div>

        </div>

        <div className="orders-stat">

          <div className="orders-stat-icon">
            ✅
          </div>

          <div>
            <span>Hazır</span>

            <strong>
              {readyOrders.length}
            </strong>

            <small>
              Teslim bekliyor
            </small>
          </div>

        </div>

        <div className="orders-stat">

          <div className="orders-stat-icon">
            ⚡
          </div>

          <div>
            <span>Aktif</span>

            <strong>
              {activeOrders}
            </strong>

            <small>
              İşlem bekleyen
            </small>
          </div>

        </div>

        <div className="orders-stat">

          <div className="orders-stat-icon">
            📦
          </div>

          <div>
            <span>Toplam</span>

            <strong>
              {orders?.length ?? 0}
            </strong>

            <small>
              Tüm siparişler
            </small>
          </div>

        </div>

        <div className="orders-stat">

          <div className="orders-stat-icon">
            💰
          </div>

          <div>
            <span>Toplam Ciro</span>

            <strong>
              {formatPrice(totalRevenue)} TL
            </strong>

            <small>
              İade edilenler hariç
            </small>
          </div>

        </div>

        <div className="orders-stat">

          <div className="orders-stat-icon">
            💳
          </div>

          <div>
            <span>Ödenen</span>

            <strong>
              {orders?.filter(
                (order) => order.payment_status === "paid"
              ).length ?? 0}
            </strong>

            <small>
              Başarılı ödeme
            </small>
          </div>

        </div>

      </section>

      {/* =================================================
          ARAMA VE FİLTRE
      ================================================== */}

      <section
        style={{
          background: "#fff",
          borderRadius: "18px",
          padding: "18px",
          marginBottom: "24px",
          boxShadow:
            "0 8px 25px rgba(0,0,0,0.05)",
        }}
      >

        <form
          action="/admin/orders"
          method="GET"
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >

          <div
            style={{
              flex: "1 1 280px",
              position: "relative",
            }}
          >

            <span
              style={{
                position: "absolute",
                left: "13px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                fontSize: "16px",
              }}
            >
              🔎
            </span>

            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Sipariş no, müşteri veya masa ara..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: "44px",
                border:
                  "1px solid #e2e2e2",
                borderRadius: "11px",
                padding:
                  "0 14px 0 40px",
                outline: "none",
                fontSize: "13px",
                background: "#fafafa",
              }}
            />

          </div>

          {selectedStatus !==
            "all" && (
            <input
              type="hidden"
              name="status"
              value={selectedStatus}
            />
          )}

          <button
            type="submit"
            style={{
              height: "44px",
              border: "none",
              borderRadius: "11px",
              padding:
                "0 20px",
              background: "#c8941d",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Ara
          </button>

        </form>

        {/* DURUM FİLTRELERİ */}

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginTop: "13px",
          }}
        >

          <a
            href={filterUrl("all")}
            style={{
              textDecoration: "none",
              padding:
                "9px 13px",
              borderRadius: "9px",
              fontSize: "11px",
              fontWeight: 800,
              background:
                selectedStatus === "all"
                  ? "#1b1b1b"
                  : "#f3f3f3",
              color:
                selectedStatus === "all"
                  ? "#fff"
                  : "#555",
            }}
          >
            Tümü ({orders?.length ?? 0})
          </a>

          <a
            href={filterUrl("pending")}
            style={{
              textDecoration: "none",
              padding:
                "9px 13px",
              borderRadius: "9px",
              fontSize: "11px",
              fontWeight: 800,
              background:
                selectedStatus === "pending"
                  ? "#fff3d6"
                  : "#f3f3f3",
              color:
                selectedStatus === "pending"
                  ? "#a66d00"
                  : "#555",
            }}
          >
            🔔 Yeni ({pendingOrders.length})
          </a>

          <a
            href={filterUrl("accepted")}
            style={{
              textDecoration: "none",
              padding:
                "9px 13px",
              borderRadius: "9px",
              fontSize: "11px",
              fontWeight: 800,
              background:
                selectedStatus === "accepted"
                  ? "#eaf2ff"
                  : "#f3f3f3",
              color:
                selectedStatus === "accepted"
                  ? "#2563eb"
                  : "#555",
            }}
          >
            👍 Kabul ({acceptedOrders.length})
          </a>

          <a
            href={filterUrl("preparing")}
            style={{
              textDecoration: "none",
              padding:
                "9px 13px",
              borderRadius: "9px",
              fontSize: "11px",
              fontWeight: 800,
              background:
                selectedStatus === "preparing"
                  ? "#f2edff"
                  : "#f3f3f3",
              color:
                selectedStatus === "preparing"
                  ? "#7c3aed"
                  : "#555",
            }}
          >
            👨‍🍳 Hazırlanıyor ({preparingOrders.length})
          </a>

          <a
            href={filterUrl("ready")}
            style={{
              textDecoration: "none",
              padding:
                "9px 13px",
              borderRadius: "9px",
              fontSize: "11px",
              fontWeight: 800,
              background:
                selectedStatus === "ready"
                  ? "#e9fff5"
                  : "#f3f3f3",
              color:
                selectedStatus === "ready"
                  ? "#059669"
                  : "#555",
            }}
          >
            ✅ Hazır ({readyOrders.length})
          </a>

          <a
            href={filterUrl("delivered")}
            style={{
              textDecoration: "none",
              padding:
                "9px 13px",
              borderRadius: "9px",
              fontSize: "11px",
              fontWeight: 800,
              background:
                selectedStatus === "delivered"
                  ? "#eaffef"
                  : "#f3f3f3",
              color:
                selectedStatus === "delivered"
                  ? "#15803d"
                  : "#555",
            }}
          >
            ✓ Tamamlanan ({completedOrders.length})
          </a>

        </div>

      </section>

      {/* =================================================
          SİPARİŞ YOK
      ================================================== */}

      {filteredOrders.length === 0 ? (

        <section
          className="orders-empty"
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "55px 20px",
            textAlign: "center",
          }}
        >

          <div className="orders-empty-icon">
            {search ||
            selectedStatus !== "all"
              ? "🔎"
              : "🛒"}
          </div>

          <h2>
            {search ||
            selectedStatus !== "all"
              ? "Sipariş bulunamadı"
              : "Henüz sipariş yok"}
          </h2>

          <p>
            {search ||
            selectedStatus !== "all"
              ? "Arama veya filtre kriterlerini değiştirmeyi deneyin."
              : "Müşteriler sipariş verdiğinde siparişler burada görünecek."}
          </p>

          {(search ||
            selectedStatus !== "all") && (
            <a
              href="/admin/orders"
              style={{
                display: "inline-block",
                marginTop: "12px",
                padding:
                  "10px 16px",
                borderRadius: "9px",
                background: "#c8941d",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: "12px",
              }}
            >
              Filtreleri Temizle
            </a>
          )}

        </section>

      ) : (

        <>

          {/* =============================================
              AÇIK MASA HESAPLARI
          ============================================== */}

          {sessionStats.length > 0 && (
            <section
              className="orders-section"
              style={{
                marginBottom: "25px",
              }}
            >
              <div className="orders-section-heading">
                <div>
                  <span className="orders-kicker">
                    MASA HESAPLARI
                  </span>
                  <h2>Açık Masa Oturumları</h2>
                </div>

                <div className="orders-count">
                  {sessionStats.length} açık hesap
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "14px",
                }}
              >
                {sessionStats.map(
                  ({
                    session,
                    orderCount,
                    total,
                    unpaidTotal,
                  }) => (
                    <article
                      key={session.id}
                      style={{
                        background: "#fff",
                        border: "1px solid #e7e0d5",
                        borderRadius: "18px",
                        padding: "18px",
                        boxShadow:
                          "0 8px 24px rgba(60,50,30,.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "15px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: 900,
                              letterSpacing: "0.12em",
                              color: "#c8941d",
                            }}
                          >
                            AÇIK HESAP
                          </div>

                          <h3
                            style={{
                              margin: "5px 0",
                              fontSize: "20px",
                            }}
                          >
                            🪑 Masa{" "}
                            {sessionOrdersTableLabel(
                              session.id,
                              orders
                            )}
                          </h3>

                          <div
                            style={{
                              color: "#888",
                              fontSize: "11px",
                            }}
                          >
                            Oturum #{session.id} •{" "}
                            {orderCount} sipariş • Açılış{" "}
                            {formatDate(session.opened_at)}
                          </div>
                        </div>

                        <div
                          style={{
                            textAlign: "right",
                          }}
                        >
                          <div
                            style={{
                              color: "#999",
                              fontSize: "9px",
                              fontWeight: 900,
                              letterSpacing: "0.08em",
                            }}
                          >
                            HESAP TOPLAMI
                          </div>

                          <div
                            style={{
                              marginTop: "3px",
                              fontSize: "22px",
                              fontWeight: 950,
                            }}
                          >
                            {formatPrice(total)} TL
                          </div>

                          <div
                            style={{
                              marginTop: "3px",
                              color:
                                unpaidTotal > 0
                                  ? "#b42318"
                                  : "#15803d",
                              fontSize: "10px",
                              fontWeight: 800,
                            }}
                          >
                            {unpaidTotal > 0
                              ? `Açık: ${formatPrice(
                                  unpaidTotal
                                )} TL`
                              : "Ödemeler tamamlandı"}
                          </div>
                        </div>

                        <SessionControls
                          sessionId={session.id}
                        />
                      </div>
                    </article>
                  )
                )}
              </div>
            </section>
          )}

          {/* =============================================
              AKTİF SİPARİŞLER
          ============================================== */}

          {visibleActiveOrders.length >
            0 && (

            <section className="orders-section">

              <div className="orders-section-heading">

                <div>
                  <span className="orders-kicker">
                    AKTİF SİPARİŞLER
                  </span>

                  <h2>
                    Mutfak Siparişleri
                  </h2>
                </div>

                <div className="orders-count">
                  {visibleActiveOrders.length} aktif
                </div>

              </div>

              <div className="orders-list">

                {visibleActiveOrders.map(
                  (order) => {

                    const items =
                      orderItems.filter(
                        (item) =>
                          item.order_id ===
                          order.id
                      );

                    const color =
                      statusColor(
                        order.status
                      );

                    return (
                      <article
                        key={order.id}
                        className={`order-card status-${order.status}`}
                        style={{
                          borderLeft:
                            `4px solid ${color}`,
                        }}
                      >

                        {/* KART BAŞLIK */}

                        <div className="order-card-header">

                          <div>

                            <div className="order-number">
                              Sipariş #{order.id}
                            </div>

                            <div className="order-table">
                              🪑 Masa{" "}
                              <strong>
                                {order.table_number}
                              </strong>
                            </div>

                            {order.session_id && (
                              <div
                                style={{
                                  marginTop: "5px",
                                  color: "#9a6b00",
                                  fontSize: "10px",
                                  fontWeight: 800,
                                }}
                              >
                                Hesap Oturumu #{order.session_id}
                              </div>
                            )}

                          </div>

                          <div className="order-header-right">

                            <span
                              className={`order-status status-${order.status}`}
                            >
                              <span>
                                {statusIcon(
                                  order.status
                                )}
                              </span>

                              {statusText(
                                order.status
                              )}
                            </span>

                            <span className="order-time">
                              {formatTime(
                                order.created_at
                              )}
                            </span>

                          </div>

                        </div>

                        {/* ÖDEME */}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "10px",
                            flexWrap: "wrap",
                            padding: "11px 13px",
                            marginBottom: "14px",
                            background: "#fafafa",
                            border: "1px solid #ece8df",
                            borderRadius: "12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 800,
                            }}
                          >
                            💳 {paymentMethodText(order.payment_method)}
                          </div>

                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "6px 9px",
                              borderRadius: "999px",
                              background:
                                order.payment_status === "paid"
                                  ? "#e9f8ed"
                                  : "#fff0f0",
                              color:
                                order.payment_status === "paid"
                                  ? "#23753a"
                                  : "#a32929",
                            }}
                          >
                            {paymentStatusText(order.payment_status)}
                          </div>
                        </div>

                        {/* MÜŞTERİ */}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "10px",
                            flexWrap: "wrap",
                            padding: "11px 13px",
                            marginBottom: "14px",
                            background: "#fafafa",
                            border: "1px solid #ece8df",
                            borderRadius: "12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 800,
                            }}
                          >
                            💳 {paymentMethodText(order.payment_method)}
                          </div>

                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "6px 9px",
                              borderRadius: "999px",
                              background:
                                order.payment_status === "paid"
                                  ? "#e9f8ed"
                                  : "#fff0f0",
                              color:
                                order.payment_status === "paid"
                                  ? "#23753a"
                                  : "#a32929",
                            }}
                          >
                            {paymentStatusText(order.payment_status)}
                          </div>
                        </div>

                        <div className="order-customer">

                          <div className="order-customer-icon">
                            👤
                          </div>

                          <div>

                            <span>
                              MÜŞTERİ
                            </span>

                            <strong>
                              {order.customer_name ||
                                "İsimsiz müşteri"}
                            </strong>

                          </div>

                        </div>

                        {/* ÜRÜNLER */}

                        <div className="order-products">

                          <div className="order-products-title">
                            SİPARİŞ İÇERİĞİ
                          </div>

                          {items.length === 0 ? (

                            <p className="order-no-items">
                              Ürün bulunamadı.
                            </p>

                          ) : (

                            items.map(
                              (item) => (

                                <div
                                  key={item.id}
                                  className="order-product"
                                >

                                  <div className="order-product-name">

                                    <strong>
                                      {item.product_name}
                                    </strong>

                                    <span>
                                      ×{" "}
                                      {item.quantity}
                                    </span>

                                  </div>

                                  <strong>
                                    {formatPrice(
                                      Number(
                                        item.price
                                      ) *
                                        Number(
                                          item.quantity
                                        )
                                    )}{" "}
                                    TL
                                  </strong>

                                </div>

                              )
                            )

                          )}

                        </div>

                        {/* NOT */}

                        {order.note && (

                          <div className="order-note">

                            <div className="order-note-icon">
                              📝
                            </div>

                            <div>

                              <strong>
                                Müşteri Notu
                              </strong>

                              <p>
                                {order.note}
                              </p>

                            </div>

                          </div>

                        )}

                        {/* ALT */}

                        <div className="order-card-footer">

                          <div className="order-total">

                            <span>
                              Toplam
                            </span>

                            <strong>
                              {formatPrice(
                                Number(
                                  order.total_amount
                                )
                              )}{" "}
                              TL
                            </strong>

                          </div>

                          <OrderActions
                            orderId={order.id}
                            currentStatus={
                              order.status
                            }
                          />

                        </div>

                      </article>
                    );
                  }
                )}

              </div>

            </section>
          )}

          {/* =============================================
              TAMAMLANAN
          ============================================== */}

          {visibleCompletedOrders.length >
            0 && (

            <section
              className="orders-section completed-section"
              style={{
                marginTop: "25px",
              }}
            >

              <div className="orders-section-heading">

                <div>

                  <span className="orders-kicker">
                    GEÇMİŞ
                  </span>

                  <h2>
                    Tamamlanan Siparişler
                  </h2>

                </div>

                <span className="orders-count">
                  {visibleCompletedOrders.length} sipariş
                </span>

              </div>

              <div className="orders-list">

                {visibleCompletedOrders.map(
                  (order) => {

                    const items =
                      orderItems.filter(
                        (item) =>
                          item.order_id ===
                          order.id
                      );

                    return (

                      <article
                        key={order.id}
                        className="order-card order-completed"
                        style={{
                          borderLeft:
                            "4px solid #22c55e",
                        }}
                      >

                        <div className="order-card-header">

                          <div>

                            <div className="order-number">
                              Sipariş #{order.id}
                            </div>

                            <div className="order-table">
                              🪑 Masa{" "}
                              <strong>
                                {order.table_number}
                              </strong>
                            </div>

                            {order.session_id && (
                              <div
                                style={{
                                  marginTop: "5px",
                                  color: "#9a6b00",
                                  fontSize: "10px",
                                  fontWeight: 800,
                                }}
                              >
                                Hesap Oturumu #{order.session_id}
                              </div>
                            )}

                          </div>

                          <div className="order-header-right">

                            <span className="order-status status-delivered">
                              ✓ Tamamlandı
                            </span>

                            <span className="order-time">
                              {formatTime(
                                order.created_at
                              )}
                            </span>

                          </div>

                        </div>

                        <div className="order-customer">

                          <div className="order-customer-icon">
                            👤
                          </div>

                          <div>

                            <span>
                              MÜŞTERİ
                            </span>

                            <strong>
                              {order.customer_name ||
                                "İsimsiz müşteri"}
                            </strong>

                          </div>

                        </div>

                        <div className="order-products">

                          <div className="order-products-title">
                            SİPARİŞ İÇERİĞİ
                          </div>

                          {items.map(
                            (item) => (

                              <div
                                key={item.id}
                                className="order-product"
                              >

                                <div className="order-product-name">

                                  <strong>
                                    {item.product_name}
                                  </strong>

                                  <span>
                                    ×{" "}
                                    {item.quantity}
                                  </span>

                                </div>

                                <strong>
                                  {formatPrice(
                                    Number(
                                      item.price
                                    ) *
                                      Number(
                                        item.quantity
                                      )
                                  )}{" "}
                                  TL
                                </strong>

                              </div>

                            )
                          )}

                        </div>

                        {order.note && (

                          <div className="order-note">

                            <div className="order-note-icon">
                              📝
                            </div>

                            <div>

                              <strong>
                                Müşteri Notu
                              </strong>

                              <p>
                                {order.note}
                              </p>

                            </div>

                          </div>

                        )}

                        <div className="order-card-footer">

                          <div className="order-total">

                            <span>
                              Toplam
                            </span>

                            <strong>
                              {formatPrice(
                                Number(
                                  order.total_amount
                                )
                              )}{" "}
                              TL
                            </strong>

                          </div>

                          <div
                            style={{
                              textAlign:
                                "right",
                            }}
                          >

                            <div
                              style={{
                                color:
                                  "#15803d",
                                fontWeight:
                                  800,
                                fontSize:
                                  "12px",
                              }}
                            >
                              ✓ Sipariş tamamlandı
                            </div>

                            <div
                              style={{
                                color:
                                  "#999",
                                fontSize:
                                  "10px",
                                marginTop:
                                  "3px",
                              }}
                            >
                              {formatDate(
                                order.created_at
                              )}
                            </div>

                          </div>

                        </div>

                      </article>

                    );
                  }
                )}

              </div>

            </section>
          )}

        </>

      )}

      {/* =================================================
          ALT BİLGİ
      ================================================== */}

      <footer
        style={{
          textAlign: "center",
          padding:
            "35px 0 10px",
          color: "#999",
          fontSize: "11px",
        }}
      >
        OZT Digital Menu • Sipariş & Ödeme Yönetim Sistemi
      </footer>

    </main>
  );
}