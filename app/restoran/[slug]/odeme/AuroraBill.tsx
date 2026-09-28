"use client";

import { useState } from "react";
import AuroraIcon from "../AuroraIcon";
import { formatLira, sendTableRequest } from "../aurora-utils";
import styles from "../AuroraFlow.module.css";

// Masa hesabı — Aurora görünümü. Hesabın yüklenmesi ve 10 saniyelik
// yenileme odeme/page.tsx içinde kalır; burası yalnızca ekrandır.

type BillItem = { id: number; product_name: string; price: number; quantity: number };

type BillOrder = {
  id: number;
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
};

const STATUS_TEXT: Record<string, string> = {
  pending: "Bekliyor",
  accepted: "Onaylandı",
  preparing: "Hazırlanıyor",
  ready: "Hazır",
  delivered: "Teslim edildi",
  cancelled: "İptal edildi",
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
}: {
  slug: string;
  restaurantId: number | null;
  tableToken: string;
  bill: Bill | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestError, setRequestError] = useState("");

  const tableQuery = tableToken ? `?masa=${encodeURIComponent(tableToken)}` : "";
  const base = `/restoran/${encodeURIComponent(slug)}`;
  const homeHref = `${base}${tableQuery}`;
  const menuHref = `${base}/menu${tableQuery}`;

  async function requestBill() {
    if (!restaurantId || !tableToken || requesting) return;

    setRequesting(true);
    setRequestError("");
    const ok = await sendTableRequest(restaurantId, tableToken, "hesap");
    setRequesting(false);

    if (ok) setRequested(true);
    else setRequestError("Hesap isteği gönderilemedi. Tekrar deneyin ya da bir görevliye seslenin.");
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

  if (!bill?.open || bill.orders.length === 0) {
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

  const paid = Math.max(0, bill.order_total - bill.due_total);
  const canRequest = Boolean(restaurantId && tableToken) && bill.due_total > 0;

  return (
    <div className={styles.page}>
      <div className={`${styles.column} ${canRequest ? styles.columnWithFooter : ""}`}>
        {header}

        <section className={styles.due} aria-labelledby="odenecek-baslik">
          <span id="odenecek-baslik" className={styles.kicker}>
            Ödenecek tutar
          </span>
          <strong className={styles.dueAmount}>{formatLira(bill.due_total)}</strong>
          <div className={styles.dueMeta}>
            <span>
              Masa <b>{bill.table_number}</b>
            </span>
            <span>
              <b>{bill.orders.length}</b> sipariş
            </span>
            <span>
              Toplam <b>{formatLira(bill.order_total)}</b>
            </span>
            {paid > 0 && (
              <span>
                Ödenen <b>{formatLira(paid)}</b>
              </span>
            )}
          </div>
        </section>

        {bill.orders.map((order) => {
          const isPaid = order.payment_status === "paid";

          return (
            <section key={order.id} className={styles.block} aria-label={`Sipariş ${order.id}`}>
              <div className={styles.orderHead}>
                <span>
                  <strong>Sipariş #{order.id}</strong>
                  <small>
                    {formatTime(order.created_at)} · {order.customer_name || "Misafir"}
                  </small>
                </span>
                <span className={styles.orderSide}>
                  <span className={isPaid ? `${styles.chip} ${styles.chipOk}` : styles.chip}>
                    {isPaid ? "Ödendi" : STATUS_TEXT[order.status] ?? "Sipariş"}
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
            <button
              type="button"
              className={requested ? `${styles.ghost} ${styles.ghostDone}` : styles.cta}
              onClick={requestBill}
              disabled={requesting}
            >
              <AuroraIcon name={requested ? "check" : "receipt"} />
              {requesting ? "Gönderiliyor…" : requested ? "Hesap istendi" : "Hesabı iste"}
            </button>
            <p className={styles.footerNote}>
              {requested
                ? "Garsonunuz adisyonu masanıza getirecek."
                : "Ödemeyi masanızda garsonunuza yapabilirsiniz."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
