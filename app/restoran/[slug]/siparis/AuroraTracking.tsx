"use client";

import { useState } from "react";
import AuroraIcon, { type AuroraIconName } from "../AuroraIcon";
import { formatLira, type TableRequestType } from "../aurora-utils";
import { serviceStatusText, useTableService } from "../TableService";
import { ORDER_FLOW, ORDER_STATUS, type OrderStatus } from "../../../../lib/order-status";
import styles from "../AuroraFlow.module.css";
import TableGamesCard from "../TableGamesCard";
import { orderNumber } from "../../../../lib/order-number";

// Sipariş takibi — Aurora görünümü. Siparişin yüklenmesi, 2 saniyelik
// yenileme ve değerlendirme gönderimi takip/[id]/page.tsx içinde kalır.

type TrackingOrder = {
  id: number;
  daily_number?: number | null;
  customer_name: string | null;
  table_number: string;
  note: string | null;
  total_amount: number;
  status: string;
  created_at: string;
};

type TrackingItem = {
  id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  image_url: string | null;
};

// Beş aşama paneldeki sipariş durumlarıyla eşleşir; adlar lib/order-status.ts.
const STEPS = ORDER_FLOW.map((key) => ({ key, title: ORDER_STATUS[key].label, detail: ORDER_STATUS[key].detail }));

const RATING_LABELS = ["", "Çok kötü", "Kötü", "Ortalama", "Çok iyi", "Mükemmel"];

export default function AuroraTracking({
  slug,
  restaurantId,
  tableToken,
  loading,
  error,
  order,
  items,
  rating,
  onRatingChange,
  reviewComment,
  onReviewCommentChange,
  reviewLoading,
  reviewSubmitted,
  reviewError,
  onSubmitReview,
}: {
  slug: string;
  restaurantId: number | null;
  tableToken: string;
  loading: boolean;
  error: string;
  order: TrackingOrder | null;
  items: TrackingItem[];
  rating: number;
  onRatingChange: (value: number) => void;
  reviewComment: string;
  onReviewCommentChange: (value: string) => void;
  reviewLoading: boolean;
  reviewSubmitted: boolean;
  reviewError: string;
  onSubmitReview: () => void;
}) {
  // Garson / hesap durumu sunucudan; ana sayfa ve menüyle aynı.
  const service = useTableService(restaurantId ?? null, tableToken ?? null);
  const pending = service.sending;
  const [requestError, setRequestError] = useState("");

  const tableQuery = tableToken ? `?masa=${encodeURIComponent(tableToken)}` : "";
  const base = `/restoran/${encodeURIComponent(slug)}`;
  const homeHref = `${base}${tableQuery}`;
  const menuHref = `${base}/menu${tableQuery}`;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.state} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <strong>Siparişiniz yükleniyor</strong>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <div className={styles.state} role="alert">
          <span className={`${styles.stateIcon} ${styles.stateIconDanger}`}>
            <AuroraIcon name="alert" size={24} />
          </span>
          <strong>Sipariş bulunamadı</strong>
          <span>{error || "Sipariş bilgilerine ulaşılamadı."}</span>
          <a className={styles.ctaInline} href={menuHref}>
            Menüye dön
          </a>
        </div>
      </div>
    );
  }

  const cancelled = order.status === "cancelled";
  const hero = ORDER_STATUS[(order.status as OrderStatus)] ?? ORDER_STATUS.pending;
  const live = !cancelled && order.status !== "delivered";
  const stepIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.key === order.status)
  );
  const orderTime = new Date(order.created_at).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  async function request(type: TableRequestType) {
    setRequestError("");
    const result = await service.request(type);
    if (result === "failed") {
      setRequestError("Talep gönderilemedi. Tekrar deneyin ya da bir görevliye seslenin.");
    }
  }

  const canRequest = Boolean(restaurantId && tableToken);

  return (
    <div className={styles.page}>
      <div className={`${styles.column} ${canRequest ? styles.columnWithActions : ""}`}>
        <header className={styles.top}>
          <a className={styles.round} href={homeHref} aria-label="Ana sayfaya dön">
            <AuroraIcon name="back" />
          </a>
          <h1>Sipariş {orderNumber(order)}</h1>
          {live && <span className={styles.live}>Canlı</span>}
        </header>

        {/* Durum kartı */}
        <section className={cancelled ? styles.heroCancelled : styles.hero} aria-live="polite">
          <div>
            <h2>{hero.label}</h2>
            <p>{hero.text}</p>
          </div>

        </section>

        {/* Sipariş beklerken masa oyunları (işletme açtıysa) */}
        {live && !cancelled && <TableGamesCard href={`${base}/oyunlar${tableQuery}`} variant="tracking" />}

        {/* Zaman çizelgesi */}
        {!cancelled && (
          <ol className={styles.steps}>
            {STEPS.map((step, index) => {
              const state =
                index < stepIndex || order.status === "delivered"
                  ? "done"
                  : index === stepIndex
                  ? "now"
                  : "later";

              return (
                <li key={step.key} className={styles[`step_${state}`]}>
                  <span className={styles.dot} aria-hidden="true">
                    {state === "done" && <AuroraIcon name="check" size={13} strokeWidth={2.6} />}
                  </span>
                  <span className={styles.stepText}>
                    <strong>{step.title}</strong>
                    {state !== "later" && <small>{step.detail}</small>}
                  </span>
                  {state === "now" && <span className={styles.nowTag}>Şu an</span>}
                </li>
              );
            })}
          </ol>
        )}

        {/* Masa / saat / toplam */}
        <dl className={styles.facts}>
          <div>
            <dt>Masa</dt>
            <dd>{order.table_number}</dd>
          </div>
          <div>
            <dt>Saat</dt>
            <dd>{orderTime}</dd>
          </div>
          <div>
            <dt>Toplam</dt>
            <dd>{formatLira(order.total_amount)}</dd>
          </div>
        </dl>

        {/* Ürünler */}
        <section className={styles.block} aria-labelledby="takip-urunler">
          <div className={styles.blockHead}>
            <span id="takip-urunler" className={styles.kicker}>
              Siparişiniz
            </span>
            <a href={menuHref} className={styles.textLink}>
              Ürün ekle
            </a>
          </div>

          {items.length === 0 ? (
            <p className={styles.muted}>Ürünler yükleniyor…</p>
          ) : (
            <ul className={styles.items}>
              {items.map((item) => (
                <li key={item.id}>
                  <span className={styles.thumb}>
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.product_name} />
                    ) : (
                      <AuroraIcon name="plate" size={20} />
                    )}
                  </span>
                  <span className={styles.itemText}>
                    <strong>{item.product_name}</strong>
                    <small>
                      {item.quantity} × {formatLira(item.unit_price)}
                    </small>
                  </span>
                  <span className={styles.num}>{formatLira(item.total_price)}</span>
                </li>
              ))}
            </ul>
          )}

          {(order.customer_name || order.note) && (
            <dl className={styles.meta}>
              {order.customer_name && (
                <div>
                  <dt>Ad</dt>
                  <dd>{order.customer_name}</dd>
                </div>
              )}
              {order.note && (
                <div>
                  <dt>Not</dt>
                  <dd>{order.note}</dd>
                </div>
              )}
            </dl>
          )}
        </section>

        {/* Değerlendirme: yalnızca teslim edilen siparişte */}
        {order.status === "delivered" && (
          <section className={styles.block} aria-labelledby="degerlendirme-baslik">
            {reviewSubmitted ? (
              <div className={styles.reviewDone}>
                <span className={styles.stateIcon}>
                  <AuroraIcon name="star" size={22} />
                </span>
                <strong id="degerlendirme-baslik">Teşekkür ederiz</strong>
                <span>Değerlendirmeniz işletmeye iletildi.</span>
              </div>
            ) : (
              <>
                <div>
                  <span className={styles.kicker}>Deneyiminiz</span>
                  <h2 id="degerlendirme-baslik" className={styles.blockTitle}>
                    Siparişinizi nasıl buldunuz?
                  </h2>
                </div>

                <div className={styles.stars} role="radiogroup" aria-label="Puan">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={rating === star}
                      aria-label={`${star} yıldız`}
                      className={star <= rating ? styles.starOn : styles.star}
                      onClick={() => onRatingChange(star)}
                    >
                      <AuroraIcon name="star" size={28} strokeWidth={1.6} />
                    </button>
                  ))}
                  {rating > 0 && <span className={styles.ratingLabel}>{RATING_LABELS[rating]}</span>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="degerlendirme-yorum">
                    Yorumunuz <em>· isteğe bağlı</em>
                  </label>
                  <textarea
                    id="degerlendirme-yorum"
                    value={reviewComment}
                    onChange={(event) => onReviewCommentChange(event.target.value)}
                    placeholder="Lezzet, servis, sunum…"
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                {reviewError && (
                  <p className={styles.error} role="alert">
                    <AuroraIcon name="alert" size={16} />
                    {reviewError}
                  </p>
                )}

                <button
                  type="button"
                  className={styles.cta}
                  onClick={onSubmitReview}
                  disabled={reviewLoading || rating === 0}
                >
                  {reviewLoading ? "Gönderiliyor…" : "Değerlendirmeyi gönder"}
                </button>
              </>
            )}
          </section>
        )}

        <p className={styles.autoNote}>
          <AuroraIcon name="clock" size={14} />
          Durum kendiliğinden güncellenir.
        </p>

        {requestError && (
          <p className={styles.error} role="alert">
            <AuroraIcon name="alert" size={16} />
            {requestError}
          </p>
        )}
      </div>

      {/* Garson / hesap ve alt gezinme (ana sayfadaki alt çubuğun karşılığı) */}
      {canRequest && (
        <div className={styles.footer}>
          <nav className={styles.tabNav} aria-label="Restoran sayfaları">
            <a href={homeHref}>
              <AuroraIcon name="back" size={16} />
              Ana sayfa
            </a>
            <a href={menuHref}>
              <AuroraIcon name="plate" size={16} />
              Menü
            </a>
            <a href={`${base}/odeme${tableQuery}`}>
              <AuroraIcon name="receipt" size={16} />
              Hesap
            </a>
          </nav>
          <div className={`${styles.footerInner} ${styles.footerActions}`}>
            <RequestButton
              icon="bell"
              label="Garson çağır"
              doneLabel={serviceStatusText("garson", service.info("garson"))}
              pending={pending === "garson"}
              done={service.info("garson").active}
              blocked={!service.info("garson").canCall}
              onClick={() => request("garson")}
            />
            <RequestButton
              icon="receipt"
              label="Hesap iste"
              doneLabel={serviceStatusText("hesap", service.info("hesap"))}
              pending={pending === "hesap"}
              done={service.info("hesap").active}
              blocked={!service.info("hesap").canCall}
              onClick={() => request("hesap")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RequestButton({
  icon,
  label,
  doneLabel,
  pending,
  done,
  blocked,
  onClick,
}: {
  icon: AuroraIconName;
  label: string;
  doneLabel: string;
  pending: boolean;
  done: boolean;
  blocked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.ghost} ${done ? styles.ghostDone : ""}`}
      onClick={onClick}
      disabled={pending || blocked}
    >
      <AuroraIcon name={done ? "check" : icon} />
      {pending ? "Gönderiliyor…" : done ? doneLabel : label}
    </button>
  );
}
