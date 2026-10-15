"use client";

import { useState } from "react";
import AuroraIcon from "../AuroraIcon";
import { formatLira } from "../aurora-utils";
import { serviceStatusText, useTableService } from "../TableService";
import { orderStatusLabel } from "../../../../lib/order-status";
import styles from "../AuroraFlow.module.css";
import { orderNumber } from "../../../../lib/order-number";
import type { OnlinePayment } from "./pay-utils";

// Masa hesabı — Aurora görünümü. Hesabın yüklenmesi ve 10 saniyelik
// yenileme odeme/page.tsx içinde kalır; burası yalnızca ekrandır.

type BillItem = { id: number; product_name: string; price: number; quantity: number };

type BillOrder = {
  id: number;
  daily_number?: number | null;
  created_at: string;
  customer_name: string;
  note: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
  items: BillItem[];
};

type Bill = {
  open: boolean;
  table_number: string;
  orders: BillOrder[];
  order_total: number;
  due_total: number;
  // İşletmenin henüz onaylamadığı siparişlerin toplamı (ödenemez).
  unconfirmed_total?: number;
};


function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export default function AuroraBill({
  slug,
  restaurantId,
  tableToken,
  bill,
  loading,
  refreshing,
  error,
  onRetry,
  online = null,
}: {
  slug: string;
  restaurantId: number | null;
  tableToken: string;
  bill: Bill | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  onRetry: () => void;
  online?: OnlinePayment;
}) {
  // Hesap isteği durumu sunucudan; diğer ekranlarla aynı.
  const service = useTableService(restaurantId, tableToken || null);
  const billRequest = service.info("hesap");
  const requesting = service.sending === "hesap";
  const requested = billRequest.active;
  const [requestError, setRequestError] = useState("");

  const tableQuery = tableToken ? `?masa=${encodeURIComponent(tableToken)}` : "";
  const base = `/restoran/${encodeURIComponent(slug)}`;
  const homeHref = `${base}${tableQuery}`;
  const menuHref = `${base}/menu${tableQuery}`;

  async function requestBill() {
    setRequestError("");
    const result = await service.request("hesap");
    if (result === "failed") {
      setRequestError("Hesap isteği gönderilemedi. Tekrar deneyin ya da bir görevliye seslenin.");
    }
  }

  const header = (
    <header className={styles.top}>
      <a className={styles.round} href={homeHref} aria-label="Ana sayfaya dön">
        <AuroraIcon name="back" />
      </a>
      <h1>Masa hesabı</h1>
      {bill?.open && !error && (
        <span className={styles.live}>{refreshing ? "Güncelleniyor" : "Canlı"}</span>
      )}
    </header>
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.column}>
          {header}
          <div className={styles.state} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            <strong>Hesabınız hazırlanıyor</strong>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.column}>
          {header}
          <div className={styles.state} role="alert">
            <span className={`${styles.stateIcon} ${styles.stateIconDanger}`}>
              <AuroraIcon name="alert" size={24} />
            </span>
            <strong>Hesap görüntülenemedi</strong>
            <span>{error}</span>
            <button type="button" className={styles.ctaInline} onClick={onRetry}>
              Tekrar dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reddedilen siparişler hesapta görünmez; onay bekleyenler ayrı ve ödenemez.
  const orders = (bill?.orders ?? []).filter((order) => order.status !== "cancelled");
  const confirmed = orders.filter((order) => order.status !== "pending");
  const awaiting = orders.filter((order) => order.status === "pending");

  if (!bill?.open || orders.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.column}>
          {header}
          <div className={styles.state}>
            <span className={styles.stateIcon}>
              <AuroraIcon name="receipt" size={24} />
            </span>
            <strong>Henüz açık hesabınız yok</strong>
            <span>Sipariş verdikçe hesabınız burada oluşur.</span>
            <a className={styles.ctaInline} href={menuHref}>
              Menüye git
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Kartla yapılan kısmi ödemeler henüz siparişe işlenmez; kalan tutardan düşülür.
  // Yalnızca onaylanmış siparişler ödenir (veritabanı eskiyse burada da süzülür).
  const onlinePaid = online?.paid ?? 0;
  const confirmedDue = confirmed
    .filter((order) => !["paid", "refunded"].includes(order.payment_status))
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const confirmedTotal = confirmed.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const awaitingTotal = awaiting.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const due = Math.min(bill.due_total, confirmedDue, online ? online.due : Infinity);
  const paid = Math.max(0, confirmedTotal - due);
  const canPayOnline = Boolean(online?.enabled && tableToken) && due > 0;
  const canRequest = Boolean(restaurantId && tableToken) && due > 0;
  const payHref = `${base}/odeme/kart${tableQuery}`;

  return (
    <div className={styles.page}>
      <div
        className={`${styles.column} ${canRequest ? styles.columnWithFooter : ""}`}
        style={canPayOnline ? { paddingBottom: 230 } : undefined}
      >
        {header}

        <section className={styles.due} aria-labelledby="odenecek-baslik">
          <span id="odenecek-baslik" className={styles.kicker}>
            Ödenecek tutar
          </span>
          <strong className={styles.dueAmount}>{formatLira(due)}</strong>
          <div className={styles.dueMeta}>
            <span>
              Masa <b>{bill.table_number}</b>
            </span>
            <span>
              <b>{confirmed.length}</b> sipariş
            </span>
            <span>
              Toplam <b>{formatLira(confirmedTotal)}</b>
            </span>
            {paid > 0 && (
              <span>
                Ödenen <b>{formatLira(paid)}</b>
              </span>
            )}
            {onlinePaid > 0 && (
              <span>
                Kartla <b>{formatLira(onlinePaid)}</b>
              </span>
            )}
          </div>
        </section>

        {[...confirmed, ...awaiting].map((order, index) => {
          const isPaid = order.payment_status === "paid";
          const isAwaiting = order.status === "pending";
          const firstAwaiting = isAwaiting && index === confirmed.length;

          return (
            <div key={order.id} style={{ display: "contents" }}>
            {firstAwaiting && (
              <div className={styles.awaitingHead}>
                <span className={styles.kicker}>Onay bekliyor · {formatLira(awaitingTotal)}</span>
                <small>Bu siparişler işletme onayladıktan sonra hesaba eklenir ve ödenebilir.</small>
              </div>
            )}
            <section
              className={`${styles.block} ${isAwaiting ? styles.blockAwaiting : ""}`}
              aria-label={`Sipariş ${orderNumber(order)}`}
            >
              <div className={styles.orderHead}>
                <span>
                  <strong>Sipariş {orderNumber(order)}</strong>
                  <small>
                    {formatTime(order.created_at)} · {order.customer_name || "Misafir"}
                  </small>
                </span>
                <span className={styles.orderSide}>
                  <span className={isPaid ? `${styles.chip} ${styles.chipOk}` : styles.chip}>
                    {isPaid ? "Ödendi" : orderStatusLabel(order.status)}
                  </span>
                  <span className={styles.num}>{formatLira(order.total_amount)}</span>
                </span>
              </div>

              <ul className={styles.lines}>
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      <b>{item.quantity}×</b>
                      {item.product_name}
                    </span>
                    <span>{formatLira(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              {order.note && <p className={styles.orderNote}>Not: {order.note}</p>}
            </section>
            </div>
          );
        })}

        <p className={styles.autoNote}>
          <AuroraIcon name="clock" size={14} />
          Hesap kendiliğinden güncellenir.
        </p>

        {requestError && (
          <p className={styles.error} role="alert">
            <AuroraIcon name="alert" size={16} />
            {requestError}
          </p>
        )}
      </div>

      {canRequest && (
        <div className={styles.footer}>
          <div className={styles.footerInner}>
            {canPayOnline && (
              <a className={styles.cta} href={payHref}>
                <AuroraIcon name="card" />
                Kartla öde
              </a>
            )}
            <button
              type="button"
              className={requested || canPayOnline ? `${styles.ghost} ${requested ? styles.ghostDone : ""}` : styles.cta}
              onClick={requestBill}
              disabled={requesting || (requested && !billRequest.canCall)}
            >
              <AuroraIcon name={requested ? "check" : "receipt"} />
              {requesting
                ? "Gönderiliyor…"
                : requested
                  ? serviceStatusText("hesap", billRequest)
                  : canPayOnline
                    ? "Garsona öde"
                    : "Hesabı iste"}
            </button>
            <p className={styles.footerNote}>
              {requested
                ? "Garsonunuz adisyonu masanıza getirecek."
                : canPayOnline
                  ? "Hesabı bölüşebilir, kendi yediğinizi ödeyebilir, bahşiş ekleyebilirsiniz."
                  : "Ödemeyi masanızda garsonunuza yapabilirsiniz."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
