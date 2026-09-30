import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import OrderActions from "./OrderActions";
import OrdersAutoRefresh from "./OrdersAutoRefresh";
import SessionControls from "./SessionControls";
import AdminIcon from "../AdminIcon";
import { hasPlanFeature, getPlanLabel } from "../../../lib/plan";
import { orderNumber } from "../../../lib/order-number";

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
  daily_number?: number | null;
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

function paymentStatusText(status: string | null) {
  switch (status) {
    case "paid":
      return "Ödendi";
    case "refunded":
      return "İade";
    case "unpaid":
      return "Ödenmedi";
    default:
      return "Ödenmedi";
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
    <main className="adm-page">
      <div className="adm-empty">
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
    <main className="adm-page">
      <div className="adm-empty">
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
    <main className="adm-page">
      <div className="adm-empty">
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
      <main className="adm-page">
        <div className="adm-lock">
          <span className="adm-badge s-accent">
            <AdminIcon name="lock" size={12} /> {getPlanLabel(restaurantPlan)} PAKET
          </span>
          <h2>Sipariş yönetimi kilitli</h2>
          <p>
            Masadaki QR ile sipariş alma ve mutfak panosu PRO ve PREMIUM
            paketlerinde kullanılabilir.
          </p>
          <a href="/admin" className="adm-btn">Panele dön</a>
        </div>
      </main>
    );
  }

  // =====================================================
  // SİPARİŞLER
  // =====================================================

  const orderColumns =
    "id, restaurant_id, customer_name, table_number, note, total_amount, status, payment_method, payment_status, session_id, created_at";

  const loadOrders = async (columns: string) => {
    const result = await supabase
      .from("orders")
      .select(columns)
      .eq("restaurant_id", restaurant.id)
      .order("created_at", {
        ascending: false,
      });
    return { data: result.data as unknown as Order[] | null, error: result.error };
  };

  // Günlük numara sütunu henüz yoksa (veritabanı güncellenmemişse) onsuz okunur.
  let { data: orders, error: ordersError } = await loadOrders(`${orderColumns}, daily_number`);
  if (ordersError && /daily_number/.test(ordersError.message)) {
    ({ data: orders, error: ordersError } = await loadOrders(orderColumns));
  }

  if (ordersError) {
    return (
      <main className="adm-page">
        <div className="adm-empty">
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
        <main className="adm-page">
          <div className="adm-empty">
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

  const hasFilter = Boolean(search) || selectedStatus !== "all";
  const paidCount = orders?.filter((order) => order.payment_status === "paid").length ?? 0;

  // Mutfak panosu: her durum bir sütun. Filtre seçiliyse yalnızca o sütun.
  const boardColumns = [
    { status: "pending", title: "Yeni", hint: "Onay bekliyor" },
    { status: "accepted", title: "Onaylandı", hint: "Sırada" },
    { status: "preparing", title: "Hazırlanıyor", hint: "Mutfakta" },
    { status: "ready", title: "Hazır", hint: "Servis bekliyor" },
  ].filter((column) => selectedStatus === "all" || selectedStatus === column.status);

  const filters = [
    { status: "all", label: "Tümü", count: orders?.length ?? 0 },
    { status: "pending", label: "Yeni", count: pendingOrders.length },
    { status: "accepted", label: "Onaylandı", count: acceptedOrders.length },
    { status: "preparing", label: "Hazırlanıyor", count: preparingOrders.length },
    { status: "ready", label: "Hazır", count: readyOrders.length },
    { status: "delivered", label: "Tamamlanan", count: completedOrders.length },
  ];

  const COMPLETED_LIMIT = 50;
  const completedRows = visibleCompletedOrders.slice(0, COMPLETED_LIMIT);

  return (
    <main className="adm-page">
      <OrdersAutoRefresh restaurantId={restaurant.id} />

      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Sipariş yönetimi</span>
          <h1>Siparişler</h1>
          <p>Masalardan gelen siparişler anlık düşer; durumu tek dokunuşla ilerletin.</p>
        </div>
        <span className="adm-live">CANLI</span>
      </header>

      <section className="adm-stats" aria-label="Sipariş özeti">
        <div className="adm-stat tone-new">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Yeni</span>
            <span className="adm-stat-icon"><AdminIcon name="bell" size={16} /></span>
          </div>
          <span className="adm-stat-value">{pendingOrders.length}</span>
          <span className="adm-stat-hint">Onay bekliyor</span>
        </div>
        <div className="adm-stat tone-preparing">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Mutfakta</span>
            <span className="adm-stat-icon"><AdminIcon name="chef" size={16} /></span>
          </div>
          <span className="adm-stat-value">{acceptedOrders.length + preparingOrders.length}</span>
          <span className="adm-stat-hint">Onaylı ve hazırlanan</span>
        </div>
        <div className="adm-stat tone-ready">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Hazır</span>
            <span className="adm-stat-icon"><AdminIcon name="check" size={16} /></span>
          </div>
          <span className="adm-stat-value">{readyOrders.length}</span>
          <span className="adm-stat-hint">Servis bekliyor</span>
        </div>
        <div className="adm-stat is-highlight">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Toplam ciro</span>
            <span className="adm-stat-icon"><AdminIcon name="lira" size={16} /></span>
          </div>
          <span className="adm-stat-value">{formatPrice(totalRevenue)} ₺</span>
          <span className="adm-stat-hint">İadeler hariç · {orders?.length ?? 0} sipariş</span>
        </div>
        <div className="adm-stat tone-ok">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Ödenen</span>
            <span className="adm-stat-icon"><AdminIcon name="wallet" size={16} /></span>
          </div>
          <span className="adm-stat-value">{paidCount}</span>
          <span className="adm-stat-hint">Ödemesi alınan sipariş</span>
        </div>
      </section>

      {/* ============ ARAMA VE FİLTRE ============ */}
      <section className="adm-card adm-card-flat adm-toolbar">
        <form action="/admin/orders" method="GET" className="adm-toolbar-search">
          <label className="adm-input-group">
            <AdminIcon name="search" size={17} />
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Sipariş no, müşteri adı veya masa ara"
              aria-label="Siparişlerde ara"
            />
          </label>
          {selectedStatus !== "all" && <input type="hidden" name="status" value={selectedStatus} />}
          <button type="submit" className="adm-btn adm-btn-primary">Ara</button>
        </form>

        <nav className="adm-chips" aria-label="Duruma göre filtrele">
          {filters.map((filter) => (
            <a
              key={filter.status}
              href={filterUrl(filter.status)}
              className={`adm-chip ${selectedStatus === filter.status ? "is-active" : ""}`}
              aria-current={selectedStatus === filter.status ? "page" : undefined}
            >
              {filter.label}
              <b>{filter.count}</b>
            </a>
          ))}
        </nav>
      </section>

      {filteredOrders.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon">
            <AdminIcon name={hasFilter ? "search" : "orders"} />
          </span>
          <strong>{hasFilter ? "Eşleşen sipariş yok" : "Henüz sipariş yok"}</strong>
          <p>
            {hasFilter
              ? "Arama veya filtreyi değiştirip tekrar deneyin."
              : "Müşteriler masadaki QR ile sipariş verdiğinde burada görünecek."}
          </p>
          {hasFilter && (
            <a href="/admin/orders" className="adm-btn">Filtreleri temizle</a>
          )}
        </div>
      ) : (
        <>
          {/* ============ AÇIK MASA HESAPLARI ============ */}
          {sessionStats.length > 0 && (
            <section className="adm-section" aria-labelledby="acik-hesaplar">
              <div className="adm-section-head">
                <div>
                  <h2 id="acik-hesaplar">Açık masa hesapları</h2>
                  <p>{sessionStats.length} masada hesap açık</p>
                </div>
              </div>

              <div className="adm-grid-3">
                {sessionStats.map(({ session, orderCount, total, unpaidTotal }) => (
                  <article key={session.id} className="adm-card adm-session">
                    <div className="adm-card-head">
                      <div>
                        <h3>Masa {sessionOrdersTableLabel(session.id, orders ?? [])}</h3>
                        <p>
                          {orderCount} sipariş · {formatTime(session.opened_at)} açıldı
                        </p>
                      </div>
                      <span className={`adm-badge is-dot ${unpaidTotal > 0 ? "s-pending" : "s-ok"}`}>
                        {unpaidTotal > 0 ? "Ödeme bekliyor" : "Ödendi"}
                      </span>
                    </div>
                    <div className="adm-session-sum">
                      <span>
                        <small>Hesap</small>
                        <strong>{formatPrice(total)} ₺</strong>
                      </span>
                      <span>
                        <small>Kalan</small>
                        <strong className={unpaidTotal > 0 ? "is-due" : ""}>
                          {formatPrice(unpaidTotal)} ₺
                        </strong>
                      </span>
                    </div>
                    <SessionControls sessionId={session.id} />
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ============ MUTFAK PANOSU ============ */}
          {selectedStatus !== "delivered" && (
            <section className="adm-section" aria-labelledby="aktif-siparisler">
              <div className="adm-section-head">
                <div>
                  <h2 id="aktif-siparisler">Aktif siparişler</h2>
                  <p>{visibleActiveOrders.length} sipariş işlem bekliyor</p>
                </div>
              </div>

              <div className="adm-board" data-columns={boardColumns.length}>
                {boardColumns.map((column) => {
                  const columnOrders = visibleActiveOrders.filter(
                    (order) => order.status === column.status
                  );

                  return (
                    <div key={column.status} className={`adm-board-col c-${column.status}`}>
                      <div className="adm-board-head">
                        <span className={`adm-badge is-dot s-${column.status}`}>{column.title}</span>
                        <small>{column.hint}</small>
                        <b>{columnOrders.length}</b>
                      </div>

                      {columnOrders.length === 0 ? (
                        <p className="adm-board-empty">Bu aşamada sipariş yok</p>
                      ) : (
                        columnOrders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            items={orderItems.filter((item) => item.order_id === order.id)}
                          />
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ============ TAMAMLANAN ============ */}
          {completedRows.length > 0 && (
            <section className="adm-section" aria-labelledby="tamamlanan">
              <div className="adm-section-head">
                <div>
                  <h2 id="tamamlanan">Tamamlanan siparişler</h2>
                  <p>
                    {visibleCompletedOrders.length > COMPLETED_LIMIT
                      ? `Son ${COMPLETED_LIMIT} sipariş gösteriliyor (toplam ${visibleCompletedOrders.length})`
                      : `${visibleCompletedOrders.length} sipariş`}
                  </p>
                </div>
              </div>

              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Sipariş</th>
                      <th>Masa</th>
                      <th>Müşteri</th>
                      <th>Ürünler</th>
                      <th>Ödeme</th>
                      <th style={{ textAlign: "right" }}>Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedRows.map((order) => {
                      const items = orderItems.filter((item) => item.order_id === order.id);
                      return (
                        <tr key={order.id}>
                          <td>
                            <strong>{orderNumber(order)}</strong>
                            <div className="adm-muted" style={{ fontSize: 12 }}>
                              {formatDate(order.created_at)} · {formatTime(order.created_at)}
                            </div>
                          </td>
                          <td>{order.table_number}</td>
                          <td>{order.customer_name || <span className="adm-muted">Misafir</span>}</td>
                          <td className="adm-muted" style={{ maxWidth: 320 }}>
                            {items.map((item) => `${item.quantity}× ${item.product_name}`).join(", ") || "—"}
                          </td>
                          <td>
                            <span className={`adm-badge ${order.payment_status === "paid" ? "s-ok" : order.payment_status === "refunded" ? "s-danger" : "s-pending"}`}>
                              {paymentStatusText(order.payment_status)}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }} className="adm-num">
                            {formatPrice(Number(order.total_amount))} ₺
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

// Mutfak panosundaki sipariş kartı.
function OrderCard({ order, items }: { order: Order; items: OrderItem[] }) {
  return (
    <article className={`adm-order c-${order.status}`}>
      <div className="adm-order-top">
        <span>
          <strong>Masa {order.table_number}</strong>
          <small>
            {orderNumber(order)} · {formatTime(order.created_at)}
            {order.customer_name ? ` · ${order.customer_name}` : ""}
          </small>
        </span>
        <span className="adm-num">{formatPrice(Number(order.total_amount))} ₺</span>
      </div>

      {items.length > 0 ? (
        <ul className="adm-order-items">
          {items.map((item) => (
            <li key={item.id}>
              <b>{item.quantity}×</b>
              <span>{item.product_name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-hint" style={{ margin: 0 }}>Ürün bilgisi bulunamadı.</p>
      )}

      {order.note && (
        <p className="adm-order-note">
          <AdminIcon name="info" size={15} />
          {order.note}
        </p>
      )}

      <OrderActions orderId={order.id} currentStatus={order.status} />
    </article>
  );
}
