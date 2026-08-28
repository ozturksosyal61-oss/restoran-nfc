import { supabase } from "../../../lib/supabase";
import OrderActions from "./OrderActions";
import OrdersAutoRefresh from "./OrdersAutoRefresh";
import NewOrderNotification from "./NewOrderNotification";

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
  created_at: string;
};

type OrderItem = {
  id: number;
  order_id: number;
  product_name: string;
  price: number;
  quantity: number;
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

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const search = params.search?.trim() || "";
  const selectedStatus = params.status || "all";

  // =====================================================
  // RESTORAN
  // =====================================================

  const {
    data: restaurant,
    error: restaurantError,
  } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("slug", "ozt-kafe")
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
        sum + Number(order.total_amount || 0),
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
              Tüm siparişler
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

                        {/* MÜŞTERİ */}

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
        OZT Digital Menu • Sipariş Yönetim Sistemi
      </footer>

    </main>
  );
}