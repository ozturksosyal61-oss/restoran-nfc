"use client";

import type { FormEvent } from "react";
import AuroraIcon from "../AuroraIcon";
import { formatLira } from "../aurora-utils";
import styles from "../AuroraFlow.module.css";

// Sipariş onayı — Aurora görünümü. Tüm sipariş mantığı (masa doğrulama,
// create_table_order) siparis/page.tsx içinde kalır; burası yalnızca ekrandır.

type CheckoutItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export default function AuroraCheckout({
  slug,
  loadingRestaurant,
  tableNumber,
  tableToken,
  items,
  total,
  customerName,
  onCustomerNameChange,
  note,
  onNoteChange,
  error,
  submitting,
  onSubmit,
}: {
  slug: string;
  loadingRestaurant: boolean;
  tableNumber: string;
  tableToken: string;
  items: CheckoutItem[];
  total: number;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  error: string;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const tableQuery = tableToken ? `?masa=${encodeURIComponent(tableToken)}` : "";
  const menuHref = `/restoran/${encodeURIComponent(slug)}/menu${tableQuery}`;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasTable = Boolean(tableNumber);

  if (loadingRestaurant) {
    return (
      <div className={styles.page}>
        <div className={styles.state} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <strong>Masa bilgisi kontrol ediliyor</strong>
        </div>
      </div>
    );
  }

  // Sipariş gönderilirken sepet boşaltılır; o anda boş sepet ekranı gösterilmez.
  if (items.length === 0 && !submitting) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <span className={styles.stateIcon}>
            <AuroraIcon name="bag" size={24} />
          </span>
          <strong>Sepetiniz boş</strong>
          <span>Sipariş vermek için menüden ürün ekleyin.</span>
          <a className={styles.ctaInline} href={menuHref}>
            Menüye dön
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <form className={`${styles.column} ${styles.columnWithFooter}`} onSubmit={onSubmit} noValidate>
        <header className={styles.top}>
          <a className={styles.round} href={menuHref} aria-label="Menüye dön">
            <AuroraIcon name="back" />
          </a>
          <h1>Siparişi onayla</h1>
        </header>

        {hasTable ? (
          <div className={styles.tableOk}>
            <span className={styles.tableIcon}>
              <AuroraIcon name="qr" />
            </span>
            <span>
              <strong>Masa {tableNumber}</strong>
              <small>QR kod ile doğrulandı</small>
            </span>
          </div>
        ) : (
          <div className={styles.tableMissing} role="alert">
            <span className={styles.tableIcon}>
              <AuroraIcon name="qr" />
            </span>
            <span>
              <strong>Masa doğrulanmadı</strong>
              <small>
                Sipariş vermek için masanızdaki QR kodu okutun ya da NFC etiketine
                telefonunuzu yaklaştırın.
              </small>
            </span>
          </div>
        )}

        <section className={styles.block} aria-labelledby="ozet-baslik">
          <div className={styles.blockHead}>
            <span id="ozet-baslik" className={styles.kicker}>
              Sipariş özeti
            </span>
            <a href={menuHref} className={styles.textLink}>
              Düzenle
            </a>
          </div>
          <ul className={styles.summary}>
            {items.map((item) => (
              <li key={item.id}>
                <span>
                  <b>{item.quantity}×</b>
                  {item.name}
                </span>
                <span className={styles.num}>{formatLira(Number(item.price) * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.block}>
          <div className={styles.field}>
            <label htmlFor="siparis-ad">
              Adınız <em>· isteğe bağlı</em>
            </label>
            <input
              id="siparis-ad"
              type="text"
              value={customerName}
              onChange={(event) => onCustomerNameChange(event.target.value)}
              placeholder="Garsonunuz sizi bu adla bulur"
              maxLength={80}
              autoComplete="given-name"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="siparis-not">
              Sipariş notu <em>· isteğe bağlı</em>
            </label>
            <textarea
              id="siparis-not"
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Örn. köfte az pişmiş olsun, soğansız"
              maxLength={500}
              rows={3}
            />
          </div>
        </section>

        <div className={`${styles.block} ${styles.pay}`}>
          <span className={styles.tile}>
            <AuroraIcon name="cash" />
          </span>
          <span>
            <strong>Ödeme masada</strong>
            Hesabı istediğinizde garsonunuza ödersiniz.
          </span>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            <AuroraIcon name="alert" size={16} />
            {error}
          </p>
        )}

        <div className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerSum}>
              <span>Toplam · {itemCount} ürün</span>
              <strong>{formatLira(total)}</strong>
            </div>
            <button
              type="submit"
              className={styles.cta}
              disabled={submitting || !hasTable || items.length === 0}
            >
              {submitting ? "Sipariş gönderiliyor…" : "Siparişi gönder"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
