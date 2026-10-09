import type { ComponentProps } from "react";
import { formatHours, untilLabel } from "../../../lib/restaurant-hours";
import { ActiveOrderCard, ActiveOrderProvider, OrderTabLink } from "./AuroraActiveOrder";
import type AuroraRestaurantHome from "./AuroraRestaurantHome";
import TableGamesCard from "./TableGamesCard";
import styles from "./ZestRestaurantHome.module.css";

// Zest tasarımının restoran ana sayfası (fast food ve kafe). Aurora ana
// sayfasıyla aynı veriyi alır; renkler Zest paletinden gelir.

type Props = ComponentProps<typeof AuroraRestaurantHome>;

const iconPaths = {
  table: "M4 9h16M6 9v10M18 9v10M8 5h8l2 4H6l2-4z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 21h4",
  receipt: "M6.5 3.8h11v16.4l-2.2-1.4-2.2 1.4-2.2-1.4-2.2 1.4V3.8ZM9 8h6M9 11.5h6M9 15h4",
  card: "M3.5 6.5h17v11h-17zM3.5 10h17M7 14.5h4",
  star: "M12 3.8l2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 16.82l-5.1 2.68.97-5.68L3.75 9.8l5.7-.83L12 3.8z",
  pin: "M12 21s-7-6.1-7-11.5a7 7 0 1 1 14 0C19 14.9 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  phone: "M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  home: "M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5M10 20v-5h4v5",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 10.5v6M12 7.5v.01",
  check: "M5 12.5l4.5 4.5L19 7.5",
  wifi: "M3 9.5a13 13 0 0 1 18 0M6 13a8.5 8.5 0 0 1 12 0M9 16.5a4 4 0 0 1 6 0M12 20h.01",
  close: "M6 6l12 12M18 6L6 18",
} as const;

function Icon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={iconPaths[name]} />
    </svg>
  );
}

function ServiceCard({
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
      <div className={`${styles.serviceCard} ${styles.serviceDisabled}`} aria-disabled="true">
        <span className={styles.serviceTile}><Icon name={icon} /></span>
        <strong>{title}</strong>
        <small>Masadaki QR kodu gerekli</small>
      </div>
    );
  }

  return (
    <form action={action} className={styles.serviceForm}>
      <input type="hidden" name="slug" value={restaurantSlug} />
      <input type="hidden" name="masa" value={tableToken} />
      <button type="submit" className={`${styles.serviceCard} ${done ? styles.serviceDone : ""}`}>
        <span className={styles.serviceTile}><Icon name={done ? "check" : icon} /></span>
        <strong>{done ? doneTitle : title}</strong>
        <small>{done ? "Talebiniz iletildi" : subtitle}</small>
      </button>
    </form>
  );
}

export default function ZestRestaurantHome({
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
  const initial = restaurant.name.trim().charAt(0).toLocaleUpperCase("tr-TR");

  const notices = [
    garsonStatus === "hata" &&
      "Garson çağrısı gönderilemedi. Lütfen tekrar deneyin ya da bir görevliye seslenin.",
    hesapStatus === "hata" &&
      "Hesap isteği gönderilemedi. Lütfen tekrar deneyin ya da bir görevliye seslenin.",
  ].filter(Boolean) as string[];

  return (
    <ActiveOrderProvider slug={restaurant.slug} tableToken={tableToken}>
      <div className={styles.page}>
        <div className={styles.column}>
          <header className={styles.topbar}>
            <div className={styles.brandRow}>
              <span className={styles.logo}>
                {restaurant.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={restaurant.logo_url} alt={`${restaurant.name} logosu`} />
                ) : (
                  initial
                )}
              </span>
              <span className={styles.brandText}>
                <strong>{restaurant.name}</strong>
                <span className={styles.status}>
                  <span className={isOpen ? styles.dotOpen : styles.dotClosed} aria-hidden="true" />
                  {isOpen ? (until ? `Açık · ${until}` : "Şu an açık") : "Şu an sipariş alınmıyor"}
                </span>
              </span>
            </div>
            {table && (
              <span className={styles.tableChip}>
                <Icon name="table" />
                Masa {table.table_number}
              </span>
            )}
          </header>

          <section className={styles.hero} aria-label={restaurant.name}>
            {restaurant.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.heroImage} src={restaurant.cover_image_url} alt={`${restaurant.name} kapak fotoğrafı`} />
            ) : (
              <div className={styles.heroFallback} aria-hidden="true">{initial}</div>
            )}
            {totalReviews > 0 && (
              <span className={styles.heroBadge}>
                <Icon name="star" />
                {averageRating} · {totalReviews} değerlendirme
              </span>
            )}
          </section>

          <div className={styles.heading}>
            <h1 className={styles.name}>{restaurant.name}</h1>
            <p className={styles.tagline}>
              {tagline ||
                (table
                  ? "Menüden seçin, sepete ekleyin; siparişiniz masanıza gelsin."
                  : "Menümüze göz atın. Sipariş için masadaki QR kodu okutun.")}
            </p>
          </div>

          {notices.map((text) => (
            <p key={text} role="alert" className={styles.notice}>{text}</p>
          ))}

          <ActiveOrderCard />

          <a className={styles.menuCta} href={`${base}/menu${tableQuery}`}>
            <span className={styles.menuText}>
              <strong>Menüyü gör</strong>
              <small>Yemekler, içecekler ve tatlılar</small>
            </span>
            <span className={styles.menuArrow} aria-hidden="true"><Icon name="arrow" /></span>
          </a>

          <div className={styles.serviceGrid}>
            <ServiceCard
              action={callWaiter}
              restaurantSlug={restaurant.slug}
              tableToken={tableToken}
              icon="bell"
              title="Garson çağır"
              doneTitle="Garson çağrıldı"
              subtitle="Masanıza gelsin"
              done={garsonStatus === "ok"}
            />
            <ServiceCard
              action={requestBill}
              restaurantSlug={restaurant.slug}
              tableToken={tableToken}
              icon="receipt"
              title="Hesap iste"
              doneTitle="Hesap istendi"
              subtitle="Adisyon getirilsin"
              done={hesapStatus === "ok"}
            />
          </div>

          <TableGamesCard href={`${base}/oyunlar${tableQuery}`} />

          <div className={styles.quickGrid}>
            <a className={styles.quickItem} href={`${base}/odeme${tableQuery}`}>
              <Icon name="card" />
              Ödeme yap
            </a>
            <a className={styles.quickItem} href={`${base}/degerlendir${tableQuery}`}>
              <Icon name="star" />
              Değerlendir
            </a>
          </div>

          {wifiName && (
            <div className={styles.wifi}>
              <Icon name="wifi" />
              <span className={styles.wifiText}>
                <small>WiFi · {wifiName}</small>
                <strong>{wifiPassword ? `Şifre: ${wifiPassword}` : "Şifresiz"}</strong>
              </span>
            </div>
          )}

          {(hours || address || phone) && (
            <section className={styles.facts} aria-label="İletişim ve çalışma saatleri">
              {hours && (
                <div className={styles.fact}>
                  <Icon name="clock" />
                  <span className={styles.factText}>
                    <small>Çalışma saatleri</small>
                    <strong>{hours}</strong>
                  </span>
                </div>
              )}
              {address && (
                <div className={styles.fact}>
                  <Icon name="pin" />
                  <span className={styles.factText}>
                    <small>Adres</small>
                    <strong>{address}</strong>
                  </span>
                  <a className={styles.factLink} href={mapHref} target="_blank" rel="noopener noreferrer">
                    Harita
                  </a>
                </div>
              )}
              {phone && (
                <div className={styles.fact}>
                  <Icon name="phone" />
                  <span className={styles.factText}>
                    <small>Telefon</small>
                    <a href={phoneHref}>{phone}</a>
                  </span>
                  <a className={styles.factLink} href={phoneHref} aria-label={`Ara: ${phone}`}>
                    Ara
                  </a>
                </div>
              )}
            </section>
          )}

          <a className={styles.infoLink} href="#bilgi">Restoran hakkında</a>
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
            Bilgi
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

            <dl className={styles.dialogList}>
              {hours && (
                <div>
                  <dt><Icon name="clock" />Çalışma saatleri</dt>
                  <dd>{hours}<small>{isOpen ? "Şu an sipariş alıyor" : "Şu an sipariş alınmıyor"}</small></dd>
                </div>
              )}
              {address && (
                <div>
                  <dt><Icon name="pin" />Adres</dt>
                  <dd>
                    {address}
                    <a href={mapHref} target="_blank" rel="noopener noreferrer">Haritada aç</a>
                  </dd>
                </div>
              )}
              {phone && (
                <div>
                  <dt><Icon name="phone" />Telefon</dt>
                  <dd><a href={phoneHref}>{phone}</a></dd>
                </div>
              )}
              {wifiName && (
                <div>
                  <dt><Icon name="wifi" />WiFi</dt>
                  <dd>
                    {wifiName}
                    {wifiPassword && <small>Şifre: <b>{wifiPassword}</b></small>}
                  </dd>
                </div>
              )}
              {totalReviews > 0 && (
                <div>
                  <dt><Icon name="star" />Müşteri puanı</dt>
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
