"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "delivered";

type PaymentStatus =
  | "unpaid"
  | "paid"
  | "refunded";

type PaymentMethod =
  | "cash"
  | "card"
  | "online"
  | null;

type Props = {
  orderId: number;
  currentStatus: string;
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "Yeni Sipariş",
  accepted: "Kabul Edildi",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  delivered: "Tamamlandı",
};

const statusIcons: Record<OrderStatus, string> = {
  pending: "🔔",
  accepted: "👍",
  preparing: "👨‍🍳",
  ready: "✅",
  delivered: "✓",
};

function getPaymentMethodLabel(method: PaymentMethod) {
  if (method === "cash") {
    return "💵 Nakit";
  }

  if (method === "card") {
    return "💳 Kart / POS";
  }

  if (method === "online") {
    return "🌐 Online Ödeme";
  }

  return "💳 Ödeme yöntemi belirtilmedi";
}

function getPaymentStatusLabel(paymentStatus: PaymentStatus) {
  if (paymentStatus === "paid") {
    return "🟢 Ödendi";
  }

  if (paymentStatus === "refunded") {
    return "↩️ İade Edildi";
  }

  return "🔴 Ödenmedi";
}

function isValidOrderStatus(
  value: string
): value is OrderStatus {
  return (
    value === "pending" ||
    value === "accepted" ||
    value === "preparing" ||
    value === "ready" ||
    value === "delivered"
  );
}

export default function OrderActions({
  orderId,
  currentStatus,
}: Props) {
  const router = useRouter();

  /*
   * ÖNEMLİ:
   *
   * Artık lib/supabase içindeki normal createClient yerine
   * @supabase/ssr browser client kullanıyoruz.
   *
   * Böylece giriş yapmış admin kullanıcısının Supabase
   * oturumu / JWT bilgisi isteklere taşınır ve RLS
   * auth.uid() değerini doğru şekilde görebilir.
   */
  const supabase = createClient();

  const initialStatus: OrderStatus =
    isValidOrderStatus(currentStatus)
      ? currentStatus
      : "pending";

  const [status, setStatus] =
    useState<OrderStatus>(initialStatus);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(null);

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("unpaid");

  const [loading, setLoading] =
    useState(false);

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  const [paymentLoaded, setPaymentLoaded] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * =====================================================
   * PROPS DEĞİŞİRSE DURUMU GÜNCELLE
   * =====================================================
   */

  useEffect(() => {
    if (isValidOrderStatus(currentStatus)) {
      setStatus(currentStatus);
    }
  }, [currentStatus]);

  /*
   * =====================================================
   * ÖDEME BİLGİLERİNİ GETİR
   * =====================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadPayment() {
      try {
        const {
          data,
          error: paymentError,
        } = await supabase
          .from("orders")
          .select("payment_method, payment_status")
          .eq("id", orderId)
          .maybeSingle();

        if (paymentError) {
          console.warn(
            "Ödeme bilgisi okunamadı:",
            paymentError.message
          );

          if (mounted) {
            setPaymentMethod(null);
            setPaymentStatus("unpaid");
          }

          return;
        }

        if (!mounted) {
          return;
        }

        const method = data?.payment_method;

        const nextMethod: PaymentMethod =
          method === "cash" ||
          method === "card" ||
          method === "online"
            ? method
            : null;

        const nextStatus =
          data?.payment_status;

        const validStatus: PaymentStatus =
          nextStatus === "paid" ||
          nextStatus === "refunded" ||
          nextStatus === "unpaid"
            ? nextStatus
            : "unpaid";

        setPaymentMethod(nextMethod);
        setPaymentStatus(validStatus);
      } catch (err) {
        console.warn(
          "Ödeme bilgisi yüklenirken beklenmeyen hata:",
          err
        );

        if (mounted) {
          setPaymentMethod(null);
          setPaymentStatus("unpaid");
        }
      } finally {
        if (mounted) {
          setPaymentLoaded(true);
        }
      }
    }

    loadPayment();

    return () => {
      mounted = false;
    };
  }, [orderId]);

  /*
   * =====================================================
   * SİPARİŞ DURUMUNU GÜNCELLE
   * =====================================================
   */

  async function updateStatus(
    newStatus: OrderStatus
  ) {
    if (loading) {
      return;
    }

    if (newStatus === status) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * Önce siparişin gerçekten mevcut olduğunu kontrol et.
       */
      const {
        data: existingOrder,
        error: existingOrderError,
      } = await supabase
        .from("orders")
        .select("id, restaurant_id, status")
        .eq("id", orderId)
        .maybeSingle();

      if (existingOrderError) {
        console.error(
          "Sipariş okunamadı:",
          existingOrderError
        );

        setError(
          `Sipariş okunamadı: ${existingOrderError.message}`
        );

        return;
      }

      if (!existingOrder) {
        setError(
          `#${orderId} numaralı sipariş bulunamadı.`
        );

        return;
      }

      console.log(
        "Sipariş güncelleme başlıyor:",
        {
          orderId,
          restaurantId: existingOrder.restaurant_id,
          oldStatus: existingOrder.status,
          newStatus,
        }
      );

      /*
       * =================================================
       * UPDATE
       * =================================================
       *
       * Browser Supabase client kullanıldığı için
       * giriş yapan kullanıcının auth.uid() bilgisi
       * RLS tarafına taşınır.
       */

      const {
        error: updateError,
      } = await supabase
        .from("orders")
        .update({
          status: newStatus,
        })
        .eq("id", orderId);

      if (updateError) {
        console.error(
          "Sipariş durumu güncelleme hatası:",
          updateError
        );

        setError(
          `Sipariş güncellenemedi: ${updateError.message}`
        );

        return;
      }

      /*
       * UPDATE başarılı.
       *
       * Burada .select() kullanmıyoruz.
       * Böylece RLS nedeniyle RETURNING sonucu boş
       * dönmesi gibi ikinci bir problem oluşmuyor.
       */

      console.log(
        `Sipariş #${orderId} durumu güncellendi:`,
        newStatus
      );

      setStatus(newStatus);

      /*
       * =================================================
       * DİĞER BİLEŞENLERE BİLDİR
       * =================================================
       */

      window.dispatchEvent(
        new CustomEvent("order-status-changed", {
          detail: {
            orderId,
            status: newStatus,
          },
        })
      );

      if (newStatus === "accepted") {
        window.dispatchEvent(
          new CustomEvent("order-accepted", {
            detail: {
              orderId,
            },
          })
        );
      }

      if (newStatus === "preparing") {
        window.dispatchEvent(
          new CustomEvent("order-preparing", {
            detail: {
              orderId,
            },
          })
        );
      }

      if (newStatus === "ready") {
        window.dispatchEvent(
          new CustomEvent("order-ready", {
            detail: {
              orderId,
            },
          })
        );
      }

      if (newStatus === "delivered") {
        window.dispatchEvent(
          new CustomEvent("order-delivered", {
            detail: {
              orderId,
            },
          })
        );
      }

      /*
       * Server Component tarafını yenile.
       */
      router.refresh();
    } catch (err) {
      console.error(
        "Beklenmeyen sipariş durumu hatası:",
        err
      );

      setError(
        "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * ÖDEME DURUMUNU GÜNCELLE
   * =====================================================
   */

  async function updatePaymentStatus(
    newPaymentStatus: PaymentStatus
  ) {
    if (paymentLoading) {
      return;
    }

    if (newPaymentStatus === paymentStatus) {
      return;
    }

    setPaymentLoading(true);
    setError("");

    try {
      /*
       * Önce siparişin mevcut olduğunu kontrol et.
       */

      const {
        data: existingOrder,
        error: existingOrderError,
      } = await supabase
        .from("orders")
        .select("id, restaurant_id, payment_status")
        .eq("id", orderId)
        .maybeSingle();

      if (existingOrderError) {
        console.error(
          "Ödeme için sipariş okunamadı:",
          existingOrderError
        );

        setError(
          `Sipariş okunamadı: ${existingOrderError.message}`
        );

        return;
      }

      if (!existingOrder) {
        setError(
          `#${orderId} numaralı sipariş bulunamadı.`
        );

        return;
      }

      /*
       * =================================================
       * PAYMENT UPDATE
       * =================================================
       */

      const {
        error: updateError,
      } = await supabase
        .from("orders")
        .update({
          payment_status: newPaymentStatus,
        })
        .eq("id", orderId);

      if (updateError) {
        console.error(
          "Ödeme durumu güncelleme hatası:",
          updateError
        );

        setError(
          `Ödeme güncellenemedi: ${updateError.message}`
        );

        return;
      }

      console.log(
        `Sipariş #${orderId} ödeme durumu güncellendi:`,
        newPaymentStatus
      );

      setPaymentStatus(newPaymentStatus);

      window.dispatchEvent(
        new CustomEvent("order-payment-changed", {
          detail: {
            orderId,
            paymentStatus: newPaymentStatus,
          },
        })
      );

      router.refresh();
    } catch (err) {
      console.error(
        "Beklenmeyen ödeme hatası:",
        err
      );

      setError(
        "Ödeme durumu güncellenirken hata oluştu."
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  /*
   * =====================================================
   * SONRAKİ SİPARİŞ BUTONU
   * =====================================================
   */

  function renderNextAction() {
    if (loading) {
      return (
        <button
          type="button"
          disabled
          className="order-action-button order-action-loading"
        >
          <span>⏳</span>
          <span>Güncelleniyor...</span>
        </button>
      );
    }

    if (status === "pending") {
      return (
        <button
          type="button"
          className="order-action-button order-action-accept"
          onClick={() =>
            updateStatus("accepted")
          }
        >
          <span>👍</span>
          <span>Siparişi Kabul Et</span>
          <span className="order-action-arrow">
            →
          </span>
        </button>
      );
    }

    if (status === "accepted") {
      return (
        <button
          type="button"
          className="order-action-button order-action-prepare"
          onClick={() =>
            updateStatus("preparing")
          }
        >
          <span>👨‍🍳</span>
          <span>Hazırlamaya Başla</span>
          <span className="order-action-arrow">
            →
          </span>
        </button>
      );
    }

    if (status === "preparing") {
      return (
        <button
          type="button"
          className="order-action-button order-action-ready"
          onClick={() =>
            updateStatus("ready")
          }
        >
          <span>✅</span>
          <span>Siparişi Hazırla</span>
          <span className="order-action-arrow">
            →
          </span>
        </button>
      );
    }

    if (status === "ready") {
      return (
        <button
          type="button"
          className="order-action-button order-action-deliver"
          onClick={() =>
            updateStatus("delivered")
          }
        >
          <span>🛎️</span>
          <span>Teslim Edildi</span>
          <span className="order-action-arrow">
            →
          </span>
        </button>
      );
    }

    if (status === "delivered") {
      return (
        <div className="order-action-completed">
          <span className="completed-icon">
            ✓
          </span>

          <span>
            Sipariş Tamamlandı
          </span>
        </div>
      );
    }

    return null;
  }

  /*
   * =====================================================
   * EKRAN
   * =====================================================
   */

  return (
    <div className="order-actions">

      {/* =================================================
          SİPARİŞ DURUMU
      ================================================= */}

      <div className="order-action-status">
        <span>SİPARİŞ DURUMU</span>

        <strong>
          <span
            className={`order-action-status-dot status-dot-${status}`}
          />

          <span>
            {statusIcons[status]}
          </span>

          <span>
            {statusLabels[status]}
          </span>
        </strong>
      </div>

      {/* =================================================
          ÖDEME DURUMU
      ================================================= */}

      <div
        style={{
          marginTop: "12px",
          padding: "13px",
          borderRadius: "12px",
          background:
            paymentStatus === "paid"
              ? "#edf8ef"
              : "#fff8e7",
          border:
            paymentStatus === "paid"
              ? "1px solid #b9dfc0"
              : "1px solid #f0d48a",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                color: "#777",
                marginBottom: "4px",
              }}
            >
              ÖDEME
            </div>

            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "#222",
              }}
            >
              {paymentLoaded
                ? getPaymentMethodLabel(
                    paymentMethod
                  )
                : "⏳ Ödeme bilgisi yükleniyor..."}
            </div>
          </div>

          <div
            style={{
              fontSize: "12px",
              fontWeight: 900,
            }}
          >
            {getPaymentStatusLabel(
              paymentStatus
            )}
          </div>
        </div>

        {/* =================================================
            ÖDEME BUTONLARI
        ================================================= */}

        {paymentStatus === "unpaid" && (
          <button
            type="button"
            disabled={
              paymentLoading ||
              !paymentLoaded
            }
            onClick={() =>
              updatePaymentStatus("paid")
            }
            style={{
              width: "100%",
              marginTop: "11px",
              border: "none",
              borderRadius: "10px",
              padding: "11px 13px",
              background: "#111",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 900,
              cursor:
                paymentLoading ||
                !paymentLoaded
                  ? "not-allowed"
                  : "pointer",
              opacity:
                paymentLoading ||
                !paymentLoaded
                  ? 0.55
                  : 1,
            }}
          >
            {paymentLoading
              ? "⏳ Güncelleniyor..."
              : "💰 Ödemeyi Al / Ödendi Yap"}
          </button>
        )}

        {paymentStatus === "paid" && (
          <button
            type="button"
            disabled={paymentLoading}
            onClick={() =>
              updatePaymentStatus("unpaid")
            }
            style={{
              width: "100%",
              marginTop: "11px",
              border:
                "1px solid #d7d2c8",
              borderRadius: "10px",
              padding: "10px 13px",
              background: "#fff",
              color: "#555",
              fontSize: "11px",
              fontWeight: 800,
              cursor:
                paymentLoading
                  ? "not-allowed"
                  : "pointer",
              opacity:
                paymentLoading
                  ? 0.55
                  : 1,
            }}
          >
            ↩️ Ödemeyi Tekrar Ödenmedi Yap
          </button>
        )}

        {paymentStatus === "refunded" && (
          <button
            type="button"
            disabled={paymentLoading}
            onClick={() =>
              updatePaymentStatus("paid")
            }
            style={{
              width: "100%",
              marginTop: "11px",
              border: "none",
              borderRadius: "10px",
              padding: "10px 13px",
              background: "#111",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 800,
              cursor:
                paymentLoading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            ↩️ İadeyi Geri Al / Ödendi Yap
          </button>
        )}
      </div>

      {/* =================================================
          SONRAKİ İŞLEM
      ================================================= */}

      <div className="order-action-next">
        {renderNextAction()}
      </div>

      {/* =================================================
          HATA
      ================================================= */}

      {error && (
        <div
          style={{
            marginTop: "10px",
            padding: "9px 12px",
            borderRadius: "8px",
            background: "#fff0f0",
            color: "#b42318",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}