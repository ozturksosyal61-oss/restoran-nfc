"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

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
    default:
      return "🔴 Ödenmedi";
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

  return (
    <main className="payments-page">
      <div className="payments-container">
        <header className="payments-header">
          <div>
            <a
              href="/admin"
              className="payments-back"
            >
              ← Yönetim Paneli
            </a>

            <span className="payments-kicker">
              ÖDEME MERKEZİ
            </span>

            <h1>Ödemeler</h1>

            <p>
              {restaurantName} için ödeme
              hareketlerini ve açık hesapları
              yönetin.
            </p>
          </div>

          <div className="payments-header-badge">
            <span>TOPLAM SİPARİŞ</span>
            <strong>
              {statistics.totalOrders}
            </strong>
          </div>
        </header>

        {message && (
          <div className="payments-message">
            {message}
          </div>
        )}

        {error && (
          <div className="payments-error">
            {error}
          </div>
        )}

        <section className="payments-stats">
          <article className="payment-stat">
            <span className="payment-stat-icon">
              💰
            </span>

            <div>
              <small>TOPLAM CİRO</small>
              <strong>
                {formatPrice(
                  statistics.totalAmount
                )}{" "}
                TL
              </strong>
            </div>
          </article>

          <article className="payment-stat">
            <span className="payment-stat-icon">
              🟢
            </span>

            <div>
              <small>TAHSİL EDİLEN</small>
              <strong>
                {formatPrice(
                  statistics.paidAmount
                )}{" "}
                TL
              </strong>
              <em>
                {statistics.paidCount} sipariş
              </em>
            </div>
          </article>

          <article className="payment-stat">
            <span className="payment-stat-icon">
              ⏳
            </span>

            <div>
              <small>BEKLEYEN ÖDEME</small>
              <strong>
                {formatPrice(
                  statistics.unpaidAmount
                )}{" "}
                TL
              </strong>
              <em>
                {statistics.unpaidCount} sipariş
              </em>
            </div>
          </article>

          <article className="payment-stat">
            <span className="payment-stat-icon">
              ↩️
            </span>

            <div>
              <small>İADE</small>
              <strong>
                {statistics.refundedCount}
              </strong>
              <em>sipariş</em>
            </div>
          </article>
        </section>

        <section className="payments-toolbar">
          <div className="payment-filters">
            <button
              type="button"
              className={
                filter === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("all")
              }
            >
              Tümü
            </button>

            <button
              type="button"
              className={
                filter === "unpaid"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("unpaid")
              }
            >
              🔴 Ödenmedi
            </button>

            <button
              type="button"
              className={
                filter === "paid"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("paid")
              }
            >
              🟢 Ödendi
            </button>

            <button
              type="button"
              className={
                filter === "refunded"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("refunded")
              }
            >
              ↩️ İade
            </button>
          </div>

          <input
            className="payment-search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Sipariş, masa veya müşteri ara..."
          />
        </section>

        <section className="payments-list-card">
          <div className="payments-list-header">
            <div>
              <span>ÖDEME HAREKETLERİ</span>
              <h2>
                Sipariş ödemeleri
              </h2>
            </div>

            <strong>
              {filteredOrders.length} kayıt
            </strong>
          </div>

          {loading ? (
            <div className="payments-empty">
              <div className="payment-loader">
                ⏳
              </div>

              <strong>
                Ödemeler yükleniyor...
              </strong>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="payments-empty">
              <div className="payment-empty-icon">
                💳
              </div>

              <strong>
                Gösterilecek ödeme bulunamadı.
              </strong>

              <span>
                Seçtiğiniz filtreye uygun
                sipariş bulunmuyor.
              </span>
            </div>
          ) : (
            <div className="payments-table">
              {filteredOrders.map(
                (order) => {
                  const isPaid =
                    order.payment_status ===
                    "paid";

                  const isRefunded =
                    order.payment_status ===
                    "refunded";

                  const updating =
                    updatingId === order.id;

                  return (
                    <article
                      className="payment-row"
                      key={order.id}
                    >
                      <div className="payment-order">
                        <div className="payment-order-icon">
                          💳
                        </div>

                        <div>
                          <strong>
                            Sipariş #
                            {order.id}
                          </strong>

                          <span>
                            {formatDate(
                              order.created_at
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="payment-table-info">
                        <small>
                          MASA
                        </small>

                        <strong>
                          {order.table_number
                            ? `Masa ${order.table_number}`
                            : "—"}
                        </strong>
                      </div>

                      <div className="payment-customer">
                        <small>
                          MÜŞTERİ
                        </small>

                        <strong>
                          {order.customer_name ||
                            "Misafir"}
                        </strong>
                      </div>

                      <div className="payment-method">
                        <small>
                          YÖNTEM
                        </small>

                        <strong>
                          {paymentMethodText(
                            order.payment_method
                          )}
                        </strong>
                      </div>

                      <div className="payment-status">
                        <span
                          className={
                            isPaid
                              ? "status paid"
                              : isRefunded
                              ? "status refunded"
                              : "status unpaid"
                          }
                        >
                          {paymentStatusText(
                            order.payment_status
                          )}
                        </span>
                      </div>

                      <div className="payment-amount">
                        <strong>
                          {formatPrice(
                            Number(
                              order.total_amount ||
                                0
                            )
                          )}{" "}
                          TL
                        </strong>

                        {!isPaid &&
                          !isRefunded && (
                            <button
                              type="button"
                              disabled={
                                updating
                              }
                              onClick={() =>
                                updatePaymentStatus(
                                  order.id,
                                  "paid"
                                )
                              }
                            >
                              {updating
                                ? "Güncelleniyor..."
                                : "Ödendi"}
                            </button>
                          )}

                        {isPaid && (
                          <button
                            type="button"
                            className="refund-button"
                            disabled={
                              updating
                            }
                            onClick={() =>
                              updatePaymentStatus(
                                order.id,
                                "refunded"
                              )
                            }
                          >
                            {updating
                              ? "Güncelleniyor..."
                              : "İade Et"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        <section className="account-note">
          <div className="account-note-icon">
            ✓
          </div>

          <div>
            <strong>
              Hesap kapatma altyapısı hazır
            </strong>

            <p>
              Ödeme durumu sipariş üzerinden
              tutuluyor. İşletme ödeme
              alındığında siparişi güvenli
              şekilde “Ödendi” olarak
              kapatabiliyor. Gerçek online
              tahsilat entegrasyonu sonraki
              aşamada ödeme sağlayıcısına
              bağlanabilir.
            </p>
          </div>
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .payments-page {
          min-height: 100vh;
          background: #f3f1ed;
          color: #171717;
          padding: 32px 20px 70px;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .payments-container {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .payments-header {
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          padding: 38px;
          margin-bottom: 20px;
          border-radius: 25px;
          overflow: hidden;
          color: white;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(212, 161, 42, 0.2),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #11110f,
              #242015
            );
          box-shadow:
            0 20px 50px
              rgba(0, 0, 0, 0.12);
        }

        .payments-header::after {
          content: "";
          position: absolute;
          width: 230px;
          height: 230px;
          right: -120px;
          top: -150px;
          border: 1px solid
            rgba(220, 165, 43, 0.35);
          border-radius: 50%;
        }

        .payments-back {
          display: inline-block;
          margin-bottom: 20px;
          color: #dca52b;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .payments-kicker {
          display: block;
          color: #dca52b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .payments-header h1 {
          margin: 8px 0 0;
          font-size: clamp(
            30px,
            4vw,
            44px
          );
          letter-spacing: -0.04em;
        }

        .payments-header p {
          margin: 10px 0 0;
          max-width: 600px;
          color: rgba(
            255,
            255,
            255,
            0.66
          );
          font-size: 13px;
        }

        .payments-header-badge {
          position: relative;
          z-index: 2;
          min-width: 150px;
          padding: 18px;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          border-radius: 15px;
          background: rgba(
            255,
            255,
            255,
            0.05
          );
          text-align: center;
        }

        .payments-header-badge span {
          display: block;
          margin-bottom: 7px;
          color: #aaa;
          font-size: 9px;
          font-weight: 800;
        }

        .payments-header-badge strong {
          font-size: 27px;
        }

        .payments-message,
        .payments-error {
          margin-bottom: 16px;
          padding: 14px 17px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
        }

        .payments-message {
          border: 1px solid #b9e5c5;
          background: #eefbf1;
          color: #19733a;
        }

        .payments-error {
          border: 1px solid #f1c5c5;
          background: #fff3f3;
          color: #a32727;
        }

        .payments-stats {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 14px;
          margin-bottom: 20px;
        }

        .payment-stat {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
          padding: 19px;
          border: 1px solid #e6e0d6;
          border-radius: 17px;
          background: white;
          box-shadow:
            0 8px 25px
              rgba(60, 50, 30, 0.05);
        }

        .payment-stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 42px;
          width: 42px;
          height: 42px;
          border: 1px solid #e8ddc8;
          border-radius: 12px;
          background: #faf6ec;
          font-size: 19px;
        }

        .payment-stat small,
        .payment-stat em {
          display: block;
          color: #999;
          font-size: 9px;
          font-style: normal;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .payment-stat strong {
          display: block;
          margin: 4px 0;
          font-size: 19px;
        }

        .payments-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
          padding: 14px;
          border: 1px solid #e4ded4;
          border-radius: 15px;
          background: white;
        }

        .payment-filters {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .payment-filters button {
          border: 0;
          border-radius: 9px;
          padding: 9px 12px;
          background: #f1efeb;
          color: #555;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .payment-filters button.active {
          background: #171717;
          color: white;
        }

        .payment-search {
          width: 280px;
          max-width: 100%;
          padding: 10px 13px;
          border: 1px solid #ddd6ca;
          border-radius: 9px;
          outline: none;
          background: #faf9f6;
          font-size: 12px;
        }

        .payment-search:focus {
          border-color: #c89a32;
        }

        .payments-list-card {
          overflow: hidden;
          border: 1px solid #e4ded4;
          border-radius: 20px;
          background: white;
          box-shadow:
            0 10px 30px
              rgba(60, 50, 30, 0.05);
        }

        .payments-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 24px;
          border-bottom: 1px solid #eee9e1;
        }

        .payments-list-header span {
          color: #c8941d;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.15em;
        }

        .payments-list-header h2 {
          margin: 5px 0 0;
          font-size: 20px;
        }

        .payments-list-header > strong {
          color: #888;
          font-size: 11px;
        }

        .payments-table {
          width: 100%;
        }

        .payment-row {
          display: grid;
          grid-template-columns:
            minmax(180px, 1.4fr)
            minmax(80px, 0.6fr)
            minmax(110px, 0.8fr)
            minmax(130px, 0.9fr)
            minmax(100px, 0.7fr)
            minmax(130px, 0.9fr);
          gap: 15px;
          align-items: center;
          padding: 17px 24px;
          border-bottom: 1px solid #eee9e1;
        }

        .payment-row:last-child {
          border-bottom: 0;
        }

        .payment-order {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .payment-order-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 38px;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #f4f0e7;
          font-size: 16px;
        }

        .payment-order strong,
        .payment-order span,
        .payment-table-info strong,
        .payment-customer strong,
        .payment-method strong {
          display: block;
        }

        .payment-order strong {
          font-size: 12px;
        }

        .payment-order span {
          margin-top: 4px;
          color: #999;
          font-size: 9px;
        }

        .payment-table-info small,
        .payment-customer small,
        .payment-method small {
          display: block;
          margin-bottom: 4px;
          color: #aaa;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .payment-table-info strong,
        .payment-customer strong,
        .payment-method strong {
          font-size: 11px;
        }

        .status {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 6px 9px;
          border-radius: 8px;
          font-size: 9px;
          font-weight: 800;
        }

        .status.paid {
          background: #eaf8ee;
          color: #218145;
        }

        .status.unpaid {
          background: #fff0f0;
          color: #bd3333;
        }

        .status.refunded {
          background: #f1eef8;
          color: #6952a4;
        }

        .payment-amount {
          text-align: right;
        }

        .payment-amount > strong {
          display: block;
          margin-bottom: 7px;
          font-size: 13px;
        }

        .payment-amount button {
          border: 0;
          border-radius: 7px;
          padding: 6px 9px;
          background: #171717;
          color: white;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .payment-amount button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .payment-amount .refund-button {
          background: #f0eee9;
          color: #555;
        }

        .payments-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 7px;
          min-height: 260px;
          padding: 30px;
          text-align: center;
        }

        .payment-empty-icon,
        .payment-loader {
          margin-bottom: 6px;
          font-size: 32px;
        }

        .payments-empty strong {
          font-size: 14px;
        }

        .payments-empty span {
          color: #999;
          font-size: 11px;
        }

        .account-note {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-top: 16px;
          padding: 18px 20px;
          border: 1px solid #dfd5c2;
          border-radius: 16px;
          background: #fbf8f1;
        }

        .account-note-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #171717;
          color: white;
          font-size: 13px;
          font-weight: 900;
        }

        .account-note strong {
          font-size: 12px;
        }

        .account-note p {
          margin: 5px 0 0;
          color: #777;
          font-size: 11px;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .payments-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .payment-row {
            grid-template-columns:
              1.4fr
              0.7fr
              0.8fr
              0.8fr;
          }

          .payment-method,
          .payment-status {
            display: none;
          }
        }

        @media (max-width: 650px) {
          .payments-page {
            padding: 18px 12px 50px;
          }

          .payments-header {
            align-items: flex-start;
            flex-direction: column;
            padding: 26px 22px;
          }

          .payments-header-badge {
            width: 100%;
          }

          .payments-stats {
            grid-template-columns: 1fr;
          }

          .payments-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .payment-search {
            width: 100%;
          }

          .payment-row {
            grid-template-columns: 1fr auto;
            gap: 12px;
            padding: 17px;
          }

          .payment-table-info,
          .payment-customer {
            display: none;
          }

          .payment-amount {
            text-align: right;
          }

          .payments-list-header {
            padding: 18px;
          }

          .account-note {
            padding: 15px;
          }
        }
      `}</style>
    </main>
  );
}