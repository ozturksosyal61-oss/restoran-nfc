import type { ComponentProps } from "react";
import { formatHours, untilLabel } from "../../../lib/restaurant-hours";
import { ActiveOrderCard, ActiveOrderProvider, OrderTabLink } from "./AuroraActiveOrder";
import type AuroraRestaurantHome from "./AuroraRestaurantHome";
import TableGamesCard from "./TableGamesCard";
import styles from "./LinenRestaurantHome.module.css";

// Linen tasarımının restoran ana sayfası (fine dining ve bistro). Aurora
// ana sayfasıyla aynı veriyi alır; renkler Linen paletinden gelir.

type Props = ComponentProps<typeof AuroraRestaurantHome>;

const iconPaths = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 21h4",
  receipt: "M6.5 3.8h11v16.4l-2.2-1.4-2.2 1.4-2.2-1.4-2.2 1.4V3.8ZM9 8h6M9 11.5h6M9 15h4",
  card: "M3.5 6.5h17v11h-17zM3.5 10h17M7 14.5h4",
  star: "M12 3.8l2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 16.82l-5.1 2.68.97-5.68L3.75 9.8l5.7-.83L12 3.8z",
  home: "M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5M10 20v-5h4v5",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 10.5v6M12 7.5v.01",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6L6 18",
} as const;

function Icon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={iconPaths[name]} />
    </svg>
  );
}

function ServiceButton({
  action,
  restaurantSlug,
  tableToken,
  icon,
  title,
  doneTitle,
  subtitle,
  done,
}: {
  action: (formData: FormData) => Promise<void>;
  restaurantSlug: string;
  tableToken: string | null;
  icon: keyof typeof iconPaths;
  title: string;
  doneTitle: string;
  subtitle: string;
  done: boolean;
}) {
  // Masa kodu olmadan garson / hesap talebi gönderilemez.
  if (!tableToken) {
    return (
      <div className={`${styles.serviceButton} ${styles.serviceDisabled}`} aria-disabled="true">
        <strong><Icon name={icon} />{title}</strong>
        <small>Masadaki QR kodu gerekli</small>
      </div>
    );
  }

  return (
    <form action={action} className={styles.serviceForm}>
      <input type="hidden" name="slug" value={restaurantSlug} />
      <input type="hidden" name="masa" value={tableToken} />
      <button type="submit" className={`${styles.serviceButton} ${done ? styles.serviceDone : ""}`}>
        <strong><Icon name={done ? "check" : icon} />{done ? doneTitle : title}</strong>
        <small>{done ? "Talebiniz iletildi" : subtitle}</small>
      </button>
    </form>
  );
}

export default function LinenRestaurantHome({
  restaurant,
  table,
  tableQuery,
  reviews,
  averageRating,
  garsonStatus,
  hesapStatus,
  callWaiter,
  requestBill,
}: Props) {
  const base = `/restoran/${restaurant.slug}`;
  const tableToken = table?.public_token ?? null;

  // Yalnızca işletme ayarlarında girilen bilgiler gösterilir.
  const hours = formatHours(restaurant.opening_time, restaurant.closing_time);
  const until = untilLabel(restaurant.closing_time);
  const isOpen = restaurant.is_open !== false;
  const address = restaurant.address?.trim() || "";
  const phone = restaurant.phone?.trim() || "";
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";
  const mapHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";
  const tagline = restaurant.tagline?.trim() || "";
  const wifiName = restaurant.wifi_name?.trim() || "";
  const wifiPassword = restaurant.wifi_password?.trim() || "";
  const totalReviews = reviews.length;

  const notices = [
    garsonStatus === "hata" &&
      "Garson çağrısı gönderilemedi. Lütfen tekrar deneyin ya da bir görevliye seslenin.",
    hesapStatus === "hata" &&
      "Hesap isteği gönderilemedi. Lütfen tekrar deneyin ya da bir görevliye seslenin.",
  ].filter(Boolean) as string[];

  const facts = (
    <>
      {hours && (
        <div>
          <dt>Saatler</dt>
          <dd>{hours}<small>{isOpen ? "Şu an sipariş alıyor" : "Şu an sipariş alınmıyor"}</small></dd>
        </div>
      )}
      {address && (
        <div>
          <dt>Adres</dt>
          <dd>
            {address}
            <a href={mapHref} target="_blank" rel="noopener noreferrer">Haritada aç</a>
          </dd>
        </div>
      )}
      {phone && (
        <div>
          <dt>Telefon</dt>
          <dd><a href={phoneHref}>{phone}</a></dd>
        </div>
      )}
      {wifiName && (
        <div>
          <dt>WiFi</dt>
          <dd>
            {wifiName}
            {wifiPassword && <small>Şifre: <b>{wifiPassword}</b></small>}
          </dd>
        </div>
      )}
    </>
  );

  return (
    <ActiveOrderProvider slug={restaurant.slug} tableToken={tableToken}>
      <div className={styles.page}>
        <div className={styles.column}>
          <div className={styles.topline}>
            <span>{table ? `Masa ${table.table_number}` : "Hoş geldiniz"}</span>
            <span className={styles.status}>
              <span className={isOpen ? styles.dotOpen : styles.dotClosed} aria-hidden="true" />
              {isOpen ? (until ? `Açık · ${until}` : "Açık") : "Sipariş alınmıyor"}
            </span>
          </div>

          <header className={styles.identity}>
            {restaurant.logo_url && (
              <span className={styles.logo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={restaurant.logo_url} alt={`${restaurant.name} logosu`} />
              </span>
            )}
            <h1 className={styles.name}>{restaurant.name}</h1>
            {tagline && <p className={styles.tagline}>{tagline}</p>}
            {totalReviews > 0 && (
              <p className={styles.rating}>
                ★ {averageRating} · {totalReviews} değerlendirme
              </p>
            )}
          </header>

          {restaurant.cover_image_url && (
            <figure className={styles.cover}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={restaurant.cover_image_url} alt={`${restaurant.name} kapak fotoğrafı`} />
            </figure>
          )}

          <p className={styles.welcome}>
            {table
              ? "Menümüzden seçiminizi yapabilir, garsonunuzu çağırabilir ya da hesabı isteyebilirsiniz."
              : "Menümüze göz atabilirsiniz. Sipariş için masanızdaki QR kodu okutun."}
          </p>

          {notices.map((text) => (
            <p key={text} role="alert" className={styles.notice}>{text}</p>
          ))}

          <ActiveOrderCard />

          <a className={styles.menuButton} href={`${base}/menu${tableQuery}`}>
            Menüyü inceleyin
            <Icon name="arrow" />
          </a>

          <div className={styles.serviceGrid}>
            <ServiceButton
              action={callWaiter}
              restaurantSlug={restaurant.slug}
              tableToken={tableToken}
              icon="bell"
              title="Garson çağır"
              doneTitle="Garson çağrıldı"
              subtitle="masanıza gelsin"
              done={garsonStatus === "ok"}
            />
            <ServiceButton
              action={requestBill}
              restaurantSlug={restaurant.slug}
              tableToken={tableToken}
              icon="receipt"
              title="Hesap iste"
              doneTitle="Hesap istendi"
              subtitle="adisyon getirilsin"
              done={hesapStatus === "ok"}
            />
          </div>

          <TableGamesCard href={`${base}/oyunlar${tableQuery}`} />

          <nav className={styles.links} aria-label="Diğer işlemler">
            <a className={styles.linkRow} href={`${base}/odeme${tableQuery}`}>
              <Icon name="card" />
              <span>Ödeme yap</span>
              <Icon name="arrow" />
            </a>
            <a className={styles.linkRow} href={`${base}/degerlendir${tableQuery}`}>
              <Icon name="star" />
              <span>Bizi değerlendirin</span>
              <Icon name="arrow" />
            </a>
          </nav>

          {(hours || address || phone || wifiName) && (
            <section aria-labelledby="linen-bilgi">
              <h2 id="linen-bilgi" className={styles.infoTitle}>Bilgi</h2>
              <hr className={styles.rule} style={{ margin: "14px 0 16px" }} />
              <dl className={styles.facts}>{facts}</dl>
            </section>
          )}
        </div>

        <nav className={styles.bottomBar} aria-label="Restoran sayfaları">
          <a className={`${styles.bottomItem} ${styles.bottomItemOn}`} href={`${base}${tableQuery}`} aria-current="page">
            <Icon name="home" />
            Ana sayfa
          </a>
          <OrderTabLink
            fallbackHref={`${base}/siparis${tableQuery}`}
            className={styles.bottomItem}
            badgeClassName={styles.bottomBadge}
          >
            <Icon name="clock" />
            Siparişim
          </OrderTabLink>
          <a className={styles.bottomItem} href="#bilgi">
            <Icon name="info" />
            Hakkında
          </a>
        </nav>

        <div id="bilgi" className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="bilgi-baslik">
          <a href="#" className={styles.dialogBackdrop} aria-label="Kapat" tabIndex={-1} />
          <div className={styles.dialogCard}>
            <div className={styles.dialogHead}>
              <h3 id="bilgi-baslik">{restaurant.name}</h3>
              <a href="#" className={styles.dialogClose} aria-label="Kapat">
                <Icon name="close" />
              </a>
            </div>

            {restaurant.description?.trim() && (
              <p className={styles.dialogLead}>{restaurant.description}</p>
            )}

            <dl className={styles.facts}>
              {facts}
              {totalReviews > 0 && (
                <div>
                  <dt>Puan</dt>
                  <dd>{averageRating} / 5<small>{totalReviews} değerlendirme</small></dd>
                </div>
              )}
            </dl>

            {(restaurant.instagram_url || restaurant.google_review_url) && (
              <div className={styles.dialogLinks}>
                {restaurant.instagram_url && (
                  <a href={restaurant.instagram_url} target="_blank" rel="noopener noreferrer">Instagram</a>
                )}
                {restaurant.google_review_url && (
                  <a href={restaurant.google_review_url} target="_blank" rel="noopener noreferrer">Google yorumları</a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ActiveOrderProvider>
  );
}
