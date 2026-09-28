"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import AdminIcon, { type AdminIconName } from "../AdminIcon";

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

function getPaymentMethodLabel(method: PaymentMethod) {
  if (method === "cash") {
    return "Nakit";
  }

  if (method === "card") {
    return "Kart / POS";
  }

  if (method === "online") {
    return "Online ödeme";
  }

  return "Belirtilmedi";
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

      let updateError: { message: string } | null = null;

      if (newPaymentStatus === "paid") {
        const { error } = await supabase.rpc(
          "mark_order_paid_and_maybe_close_session",
          {
            p_order_id: orderId,
          }
        );

        updateError = error
          ? { message: error.message }
          : null;
      } else {
        const { error } = await supabase
          .from("orders")
          .update({
            payment_status: newPaymentStatus,
          })
          .eq("id", orderId);

        updateError = error
          ? { message: error.message }
          : null;
      }

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
    const next: Record<
      Exclude<OrderStatus, "delivered">,
      { to: OrderStatus; label: string; icon: AdminIconName; tone: string }
    > = {
      pending: { to: "accepted", label: "Siparişi kabul et", icon: "check", tone: "adm-btn-primary" },
      accepted: { to: "preparing", label: "Hazırlamaya başla", icon: "chef", tone: "adm-btn-primary" },
      preparing: { to: "ready", label: "Hazır olarak işaretle", icon: "bell", tone: "adm-btn-primary" },
      ready: { to: "delivered", label: "Masaya teslim edildi", icon: "check", tone: "adm-btn-gold" },
    };

    if (status === "delivered") {
      return (
        <p className="adm-order-done">
          <AdminIcon name="check" size={16} />
          Sipariş tamamlandı
        </p>
      );
    }

    const action = next[status];

    return (
      <button
        type="button"
        className={`adm-btn adm-btn-lg adm-btn-block ${action.tone}`}
        onClick={() => updateStatus(action.to)}
        disabled={loading}
      >
        <AdminIcon name={action.icon} size={17} />
        {loading ? "Güncelleniyor…" : action.label}
      </button>
    );
  }

  /*
   * =====================================================
   * GÖRÜNÜM
   * =====================================================
   */

  const paymentBadge =
    paymentStatus === "paid"
      ? { className: "s-ok", label: "Ödendi" }
      : paymentStatus === "refunded"
      ? { className: "s-danger", label: "İade edildi" }
      : { className: "s-pending", label: "Ödenmedi" };

  return (
    <div className="adm-order-actions">
      <div className="adm-order-pay">
        <span className="adm-order-pay-text">
          <small>Ödeme</small>
          <strong>
            {paymentLoaded ? getPaymentMethodLabel(paymentMethod) : "Yükleniyor…"}
          </strong>
        </span>
        <span className={`adm-badge is-dot ${paymentBadge.className}`}>{paymentBadge.label}</span>

        {paymentStatus === "unpaid" && (
          <button
            type="button"
            className="adm-btn adm-btn-sm adm-btn-ok"
            disabled={paymentLoading || !paymentLoaded}
            onClick={() => updatePaymentStatus("paid")}
          >
            <AdminIcon name="wallet" size={15} />
            {paymentLoading ? "Kaydediliyor…" : "Ödeme alındı"}
          </button>
        )}

        {paymentStatus === "paid" && (
          <button
            type="button"
            className="adm-btn adm-btn-sm adm-btn-ghost"
            disabled={paymentLoading}
            onClick={() => updatePaymentStatus("unpaid")}
          >
            Geri al
          </button>
        )}

        {paymentStatus === "refunded" && (
          <button
            type="button"
            className="adm-btn adm-btn-sm"
            disabled={paymentLoading}
            onClick={() => updatePaymentStatus("paid")}
          >
            İadeyi geri al
          </button>
        )}
      </div>

      {renderNextAction()}

      {error && (
        <p className="adm-alert adm-alert-error" role="alert" style={{ margin: 0 }}>
          <AdminIcon name="alert" size={16} />
          {error}
        </p>
      )}
    </div>
  );
}
