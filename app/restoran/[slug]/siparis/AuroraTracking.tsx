"use client";

import { useState } from "react";
import AuroraIcon, { type AuroraIconName } from "../AuroraIcon";
import { formatLira, sendTableRequest, type TableRequestType } from "../aurora-utils";
import styles from "../AuroraFlow.module.css";
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

// Beş aşama paneldeki sipariş durumlarıyla eşleşir.
const STEPS = [
  { key: "pending", title: "Sipariş alındı", detail: "İşletmeye iletildi" },
  { key: "accepted", title: "Onaylandı", detail: "İşletme siparişi kabul etti" },
  { key: "preparing", title: "Hazırlanıyor", detail: "Mutfakta" },
  { key: "ready", title: "Hazır", detail: "Masanıza getiriliyor" },
  { key: "delivered", title: "Masanızda", detail: "Afiyet olsun" },
];

// Üstteki büyük kart: başlık, açıklama ve ana sayfadaki üçlü çubuğun doluluğu.
const HERO: Record<string, { title: string; text: string; fill: number[]; step: number }> = {
  pending: {
    title: "Sipariş alındı",
    text: "Siparişiniz işletmeye iletildi, onay bekleniyor.",
    fill: [0.5, 0, 0],
    step: 0,
  },
  accepted: {
    title: "Onaylandı",
    text: "İşletme siparişinizi kabul etti, birazdan hazırlanmaya başlayacak.",
    fill: [1, 0.15, 0],
    step: 1,
  },
  preparing: {
    title: "Hazırlanıyor",
    text: "Siparişiniz mutfakta, hazır olunca masanıza gelecek.",
    fill: [1, 0.55, 0],
    step: 1,
  },
  ready: {
    title: "Hazır",
    text: "Siparişiniz hazır, masanıza getiriliyor.",
    fill: [1, 1, 0.35],
    step: 2,
  },
  delivered: {
    title: "Masanızda",
    text: "Siparişiniz teslim edildi. Afiyet olsun!",
    fill: [1, 1, 1],
    step: 2,
  },
};

const BAR_LABELS = ["Alındı", "Hazırlanıyor", "Masanızda"];

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
  const [pending, setPending] = useState<TableRequestType | null>(null);
  const [sent, setSent] = useState<TableRequestType[]>([]);
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
  const hero = HERO[order.status] ?? HERO.pending;
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
    if (!restaurantId || !tableToken || pending) return;

    setPending(type);
    setRequestError("");
    const ok = await sendTableRequest(restaurantId, tableToken, type);
    setPending(null);

    if (ok) {
      setSent((current) => (current.includes(type) ? current : [...current, type]));
    } else {
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
            <h2>{cancelled ? "İptal edildi" : hero.title}</h2>
            <p>
              {cancelled
                ? "Bu sipariş işletme tarafından iptal edildi. Sorunuz varsa garsonunuza danışın."
                : hero.text}
            </p>
          </div>

          {!cancelled && (
            <div className={styles.bars}>
              {BAR_LABELS.map((label, i) => (
                <div key={label}>
                  <span className={styles.bar}>
                    <span
                      className={live && i === hero.step ? styles.barFillLive : styles.barFill}
                      style={{ width: `${hero.fill[i] * 100}%` }}
                    />
                  </span>
                  <span className={i === hero.step ? styles.barLabelOn : styles.barLabel}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

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
                      <img src={item.image_url} alt="" />
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

      {/* Garson / hesap */}
      {canRequest && (
        <div className={styles.footer}>
          <div className={`${styles.footerInner} ${styles.footerActions}`}>
            <RequestButton
              icon="bell"
              label="Garson çağır"
              doneLabel="Garson çağrıldı"
              pending={pending === "garson"}
              done={sent.includes("garson")}
              onClick={() => request("garson")}
            />
            <RequestButton
              icon="receipt"
              label="Hesap iste"
              doneLabel="Hesap istendi"
              pending={pending === "hesap"}
              done={sent.includes("hesap")}
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
  onClick,
}: {
  icon: AuroraIconName;
  label: string;
  doneLabel: string;
  pending: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.ghost} ${done ? styles.ghostDone : ""}`}
      onClick={onClick}
      disabled={pending}
    >
      <AuroraIcon name={done ? "check" : icon} />
      {pending ? "Gönderiliyor…" : done ? doneLabel : label}
    </button>
  );
}
