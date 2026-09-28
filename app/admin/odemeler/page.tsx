"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import AdminIcon from "../AdminIcon";

type Order = {
  id: number;
  restaurant_id: number;
  customer_name: string | null;
  table_number: number | null;
  total_amount: number | null;
  status: string | null;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
};

type PaymentFilter =
  | "all"
  | "unpaid"
  | "paid"
  | "refunded";

function formatPrice(value: number) {
  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentMethodText(method: string | null) {
  switch (method) {
    case "cash":
      return "Nakit";
    case "card":
      return "Kart / POS";
    case "online":
      return "Online";
    default:
      return "Belirtilmedi";
  }
}

function paymentStatusText(status: string | null) {
  switch (status) {
    case "paid":
      return "Ödendi";
    case "refunded":
      return "İade";
    default:
      return "Ödenmedi";
  }
}

export default function PaymentsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantName, setRestaurantName] =
    useState("Restoran");

  const [filter, setFilter] =
    useState<PaymentFilter>("all");

  const [search, setSearch] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [updatingId, setUpdatingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function loadPayments() {
    setLoading(true);
    setError("");

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          "Oturum bulunamadı. Lütfen tekrar giriş yapın."
        );
        return;
      }

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("restaurant_users")
        .select("restaurant_id")
        .eq("user_id", user.id)
        .single();

      if (
        membershipError ||
        !membership?.restaurant_id
      ) {
        setError(
          "Restoran bağlantısı bulunamadı."
        );
        return;
      }

      const {
        data: restaurant,
        error: restaurantError,
      } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq(
          "id",
          membership.restaurant_id
        )
        .single();

      if (
        restaurantError ||
        !restaurant
      ) {
        setError(
          "Restoran bilgileri alınamadı."
        );
        return;
      }

      setRestaurantName(
        restaurant.name || "Restoran"
      );

      const {
        data,
        error: ordersError,
      } = await supabase
        .from("orders")
        .select(
          `
            id,
            restaurant_id,
            customer_name,
            table_number,
            total_amount,
            status,
            payment_method,
            payment_status,
            created_at
          `
        )
        .eq(
          "restaurant_id",
          restaurant.id
        )
        .order("created_at", {
          ascending: false,
        });

      if (ordersError) {
        setError(
          "Ödeme kayıtları alınamadı: " +
            ordersError.message
        );
        return;
      }

      setOrders(
        (data || []) as Order[]
      );
    } catch (err) {
      console.error(err);

      setError(
        "Ödeme bilgileri yüklenirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  async function updatePaymentStatus(
    orderId: number,
    newStatus: "paid" | "refunded"
  ) {
    if (updatingId !== null) {
      return;
    }

    setUpdatingId(orderId);
    setError("");
    setMessage("");

    try {
      const {
        data,
        error: updateError,
      } = await supabase
        .from("orders")
        .update({
          payment_status: newStatus,
        })
        .eq("id", orderId)
        .select(
          "id, payment_status"
        )
        .single();

      if (updateError) {
        console.error(
          "Ödeme güncelleme hatası:",
          updateError
        );

        setError(
          "Ödeme durumu güncellenemedi: " +
            updateError.message
        );

        return;
      }

      if (!data) {
        setError(
          "Ödeme güncellendi ancak doğrulanamadı."
        );

        return;
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                payment_status:
                  data.payment_status,
              }
            : order
        )
      );

      setMessage(
        newStatus === "paid"
          ? `Sipariş #${orderId} ödendi olarak işaretlendi.`
          : `Sipariş #${orderId} iade edildi olarak işaretlendi.`
      );
    } catch (err) {
      console.error(err);

      setError(
        "Ödeme durumu güncellenirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const statistics = useMemo(() => {
    const totalOrders = orders.length;

    const paidOrders = orders.filter(
      (order) =>
        order.payment_status === "paid"
    );

    const unpaidOrders = orders.filter(
      (order) =>
        order.payment_status !== "paid" &&
        order.payment_status !== "refunded"
    );

    const refundedOrders = orders.filter(
      (order) =>
        order.payment_status === "refunded"
    );

    const totalAmount = orders
      .filter(
        (order) =>
          order.payment_status !==
          "refunded"
      )
      .reduce(
        (sum, order) =>
          sum +
          Number(order.total_amount || 0),
        0
      );

    const paidAmount =
      paidOrders.reduce(
        (sum, order) =>
          sum +
          Number(order.total_amount || 0),
        0
      );

    const unpaidAmount =
      unpaidOrders.reduce(
        (sum, order) =>
          sum +
          Number(order.total_amount || 0),
        0
      );

    return {
      totalOrders,
      paidCount: paidOrders.length,
      unpaidCount:
        unpaidOrders.length,
      refundedCount:
        refundedOrders.length,
      totalAmount,
      paidAmount,
      unpaidAmount,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "paid" &&
          order.payment_status ===
            "paid") ||
        (filter === "refunded" &&
          order.payment_status ===
            "refunded") ||
        (filter === "unpaid" &&
          order.payment_status !==
            "paid" &&
          order.payment_status !==
            "refunded");

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const orderText = [
        order.id,
        order.customer_name || "",
        order.table_number || "",
        paymentMethodText(
          order.payment_method
        ),
      ]
        .join(" ")
        .toLowerCase();

      return orderText.includes(
        normalizedSearch
      );
    });
  }, [
    orders,
    filter,
    search,
  ]);

  const filters: { value: PaymentFilter; label: string; count: number }[] = [
    { value: "all", label: "Tümü", count: statistics.totalOrders },
    { value: "unpaid", label: "Ödenmedi", count: statistics.unpaidCount },
    { value: "paid", label: "Ödendi", count: statistics.paidCount },
    { value: "refunded", label: "İade", count: statistics.refundedCount },
  ];

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">İşletme</span>
          <h1>Ödemeler</h1>
          <p>{restaurantName} siparişlerinin tahsilat durumu. Masada alınan ödemeyi buradan işaretleyin.</p>
        </div>
      </header>

      {message && (
        <p className="adm-alert adm-alert-ok" role="status">
          <AdminIcon name="check" size={16} />
          {message.replace(/^[✓✅]\s*/, "")}
        </p>
      )}

      {error && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          {error}
        </p>
      )}

      <section className="adm-stats" aria-label="Ödeme özeti">
        <div className="adm-stat is-highlight">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Toplam ciro</span>
            <span className="adm-stat-icon"><AdminIcon name="lira" size={16} /></span>
          </div>
          <span className="adm-stat-value">{formatPrice(statistics.totalAmount)} ₺</span>
          <span className="adm-stat-hint">İadeler hariç · {statistics.totalOrders} sipariş</span>
        </div>
        <div className="adm-stat tone-ok">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Tahsil edilen</span>
            <span className="adm-stat-icon"><AdminIcon name="wallet" size={16} /></span>
          </div>
          <span className="adm-stat-value">{formatPrice(statistics.paidAmount)} ₺</span>
          <span className="adm-stat-hint">{statistics.paidCount} sipariş</span>
        </div>
        <div className="adm-stat tone-new">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Bekleyen</span>
            <span className="adm-stat-icon"><AdminIcon name="clock" size={16} /></span>
          </div>
          <span className="adm-stat-value">{formatPrice(statistics.unpaidAmount)} ₺</span>
          <span className="adm-stat-hint">{statistics.unpaidCount} sipariş</span>
        </div>
        <div className="adm-stat tone-danger">
          <div className="adm-stat-top">
            <span className="adm-stat-label">İade</span>
            <span className="adm-stat-icon"><AdminIcon name="refresh" size={16} /></span>
          </div>
          <span className="adm-stat-value">{statistics.refundedCount}</span>
          <span className="adm-stat-hint">sipariş</span>
        </div>
      </section>

      <section className="adm-card adm-card-flat adm-toolbar">
        <div className="adm-toolbar-row">
          <nav className="adm-chips" aria-label="Ödeme durumuna göre filtrele">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`adm-chip ${filter === item.value ? "is-active" : ""}`}
                onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
              >
                {item.label}
                <b>{item.count}</b>
              </button>
            ))}
          </nav>
          <label className="adm-input-group" style={{ width: "min(320px, 100%)" }}>
            <AdminIcon name="search" size={16} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Sipariş no, masa veya müşteri"
              aria-label="Ödemelerde ara"
            />
          </label>
        </div>
      </section>

      {loading ? (
        <p className="adm-hint">Ödemeler yükleniyor…</p>
      ) : filteredOrders.length === 0 ? (
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="card" /></span>
          <strong>Gösterilecek ödeme yok</strong>
          <p>Seçtiğiniz filtreye ya da aramaya uyan sipariş bulunmuyor.</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Sipariş</th>
                <th>Masa</th>
                <th>Müşteri</th>
                <th>Yöntem</th>
                <th>Durum</th>
                <th style={{ textAlign: "right" }}>Tutar</th>
                <th aria-label="İşlem" />
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const isPaid = order.payment_status === "paid";
                const isRefunded = order.payment_status === "refunded";
                const updating = updatingId === order.id;

                return (
                  <tr key={order.id}>
                    <td>
                      <strong>#{order.id}</strong>
                      <div className="adm-muted" style={{ fontSize: 12 }}>{formatDate(order.created_at)}</div>
                    </td>
                    <td>{order.table_number ? `Masa ${order.table_number}` : "—"}</td>
                    <td>{order.customer_name || <span className="adm-muted">Misafir</span>}</td>
                    <td className="adm-muted">{paymentMethodText(order.payment_method)}</td>
                    <td>
                      <span className={`adm-badge is-dot ${isPaid ? "s-ok" : isRefunded ? "s-danger" : "s-pending"}`}>
                        {paymentStatusText(order.payment_status)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }} className="adm-num">
                      {formatPrice(Number(order.total_amount || 0))} ₺
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {!isPaid && !isRefunded && (
                        <button
                          type="button"
                          className="adm-btn adm-btn-sm adm-btn-ok"
                          disabled={updating}
                          onClick={() => updatePaymentStatus(order.id, "paid")}
                        >
                          <AdminIcon name="check" size={15} />
                          {updating ? "Kaydediliyor…" : "Ödendi"}
                        </button>
                      )}
                      {isPaid && (
                        <button
                          type="button"
                          className="adm-btn adm-btn-sm adm-btn-ghost adm-text-danger"
                          disabled={updating}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Sipariş #${order.id} iade olarak işaretlensin mi? Bu işlem para iadesi yapmaz, yalnızca kaydı günceller.`
                              )
                            ) {
                              void updatePaymentStatus(order.id, "refunded");
                            }
                          }}
                        >
                          {updating ? "Kaydediliyor…" : "İade et"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
        <AdminIcon name="info" size={16} />
        Online ödeme henüz bağlı değil; ödemeler masada alınır ve buradan işaretlenir.
      </p>
    </main>
  );
}
