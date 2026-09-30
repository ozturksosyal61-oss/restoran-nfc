import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import QRCode from "qrcode";
import TrackedLink from "../TrackedLink";
import home from "../page.module.css";
import styles from "./demo.module.css";

export const metadata: Metadata = {
  title: "Canlı Demo",
  description:
    "OZT Digital Menu'yü gerçek bir restoranda deneyin: QR menü, çok dilli menü, masadan sipariş, garson çağırma ve sipariş takibi.",
};

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

// Demo restoranın 2 numaralı masası (gerçek sistem, gerçek masa kodu).
const DEMO_PATH = "/restoran/mira-kitchen?masa=2a8149f1-624c-4d3e-ad8c-dd50f72e13b0";

const DEMO_EVENT = {
  event: "ViewContent",
  eventParams: { content_name: "Mira Kitchen Canlı Demo", content_category: "Demo" },
};

const iconPaths = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  // Temassız (NFC) dalgaları
  nfc: "M7 9a4.2 4.2 0 0 1 0 6M10.5 6.5a8 8 0 0 1 0 11M14 4a11.8 11.8 0 0 1 0 16",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 21h4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  eye: "M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  globe:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9h17M3.5 15h17M12 3c2.3 2.5 3.5 5.5 3.5 9s-1.2 6.5-3.5 9c-2.3-2.5-3.5-5.5-3.5-9s1.2-6.5 3.5-9z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  flame: "M12 21c-3.9 0-7-2.8-7-6.6 0-3.1 2-5 3.6-6.8.4 1.6 1.4 2.7 2.4 3.1C11 7.2 12.6 4.6 15 3c-.3 2.8 1 4.6 2.4 6.3 1 1.3 1.6 2.9 1.6 4.9 0 3.9-3.1 6.8-7 6.8z",
} as const;

function Icon({ name, className }: { name: keyof typeof iconPaths; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

const tryList = [
  {
    title: "Menüde gezinin",
    text: "Kategoriler arasında dolaşın, bir ürüne dokunup içindekileri, alerjenleri ve yaklaşık kalorisini görün.",
  },
  {
    title: "Dili değiştirin",
    text: "Sağ üstteki dil düğmesiyle menüyü İngilizce okuyun. Yabancı misafir menüyü kendi dilinde görür.",
  },
  {
    title: "Sipariş verin",
    text: "Birkaç ürünü sepete ekleyip siparişi gönderin. Sipariş numaranızı ve hazırlanma durumunu canlı izleyin.",
  },
  {
    title: "Garson çağırın",
    text: "Zil düğmesine dokunup garson çağırın ya da hesap isteyin. Talep aynı anda işletme paneline düşer.",
  },
  {
    title: "Bizi değerlendirin",
    text: "Memnun kalan misafir Google yorumuna davet edilir, şikâyeti olan önce işletmeye yazar.",
  },
];

const panelFeatures: { icon: keyof typeof iconPaths; title: string; text: string }[] = [
  {
    icon: "bell",
    title: "Anlık sipariş ve çağrılar",
    text: "Yeni sipariş, garson çağrısı ve hesap isteği sesli bildirimle, masa numarasıyla gelir.",
  },
  {
    icon: "chart",
    title: "Ciro ve hesap raporları",
    text: "Günlük, haftalık, aylık ciro; en çok satan ürünler ve yoğun saatler. Excel'e tek tıkla aktarılır.",
  },
  {
    icon: "eye",
    title: "Menü istatistikleri",
    text: "Menünüz kaç kez açıldı, hangi ürüne en çok bakıldı, hangisine hiç dokunulmadı.",
  },
  {
    icon: "globe",
    title: "Otomatik çeviri",
    text: "Menü yapay zekâyla İngilizce, Almanca, Rusça, Arapça ve Fransızcaya çevrilir; isterseniz düzeltirsiniz.",
  },
  {
    icon: "camera",
    title: "Fotoğraftan menü aktarma",
    text: "Basılı menünüzün fotoğrafını yükleyin; ürünler ve fiyatlar dakikalar içinde sisteme girilir.",
  },
  {
    icon: "flame",
    title: "Kalori bilgisi",
    text: "Her ürünün yaklaşık kalorisi otomatik hesaplanır ve menüde fiyatın yanında görünür.",
  },
];

async function demoQrSvg() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "www.oztdigital.com.tr";
  const protocol = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";

  return QRCode.toString(`${protocol}://${host}${DEMO_PATH}`, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0f0e0cff", light: "#00000000" },
  });
}

// Demo panele giriş bağlantısı. Next Link kullanılmaz: önceden yükleme
// (prefetch) giriş yapmasın diye düz <a>.
const PANEL_PATH = "/demo/panel";

const PANEL_ERRORS: Record<string, string> = {
  kapali: "Demo paneli şu an hazırlanıyor. Lütfen biraz sonra tekrar deneyin.",
  hata: "Demo paneli açılamadı. Lütfen tekrar deneyin.",
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string }>;
}) {
  const qrSvg = await demoQrSvg();
  const panelError = PANEL_ERRORS[(await searchParams).panel ?? ""];

  return (
    <main className={`${home.page} ${display.variable} ${sans.variable}`}>
      {/* NAV */}
      <header className={home.nav}>
        <div className={home.navInner}>
          <Link href="/" className={home.brand} aria-label="OZT Digital Menu ana sayfa">
            <span className={home.brandMark}>OZT</span>
            <span>Digital Menu</span>
          </Link>

          <nav className={home.navLinks} aria-label="Demo bölümleri">
            <a href="#deneyin">Neler denenir</a>
            <a href="#panel">Demo panel</a>
            <Link href="/urunler">Ürünler</Link>
            <Link href="/#paketler">Paketler</Link>
          </nav>

          <div className={home.navActions}>
            <Link href="/admin/login" className={home.navLogin}>
              İşletme Girişi
            </Link>
            <TrackedLink href={DEMO_PATH} className={home.navCta} {...DEMO_EVENT}>
              Demoyu Aç
              <Icon name="arrow" className={home.btnIcon} />
            </TrackedLink>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={home.pill}>
            <span className={home.pillDot} />
            Canlı demo · Mira Kitchen
          </span>

          <h1 className={styles.heroTitle}>
            Müşterinizin masada göreceği menüyü <em>şimdi deneyin.</em>
          </h1>

          <p className={styles.heroText}>
            Mira Kitchen, OZT Digital ile çalışan örnek restoranımız. Bu bir tanıtım videosu değil, sistemin
            kendisi: menüye bakabilir, sipariş verebilir, garson çağırabilir, menüyü başka dilde okuyabilirsiniz.
          </p>

          <div className={styles.heroActions}>
            <TrackedLink href={DEMO_PATH} className={home.btnPrimary} {...DEMO_EVENT}>
              Demoyu bu cihazda aç
              <Icon name="arrow" className={home.btnIcon} />
            </TrackedLink>
            <a href={PANEL_PATH} className={home.btnSecondary} rel="nofollow">
              Yönetim panelini gör
            </a>
          </div>

          {panelError && (
            <p className={styles.panelError} role="alert">
              {panelError}
            </p>
          )}

          <p className={styles.heroNote}>
            <Icon name="check" className={styles.noteIcon} />
            Ödeme alınmaz; demo siparişleri yalnızca deneme panelimize düşer.
          </p>
        </div>

        {/* Masadaki QR / NFC standı */}
        <figure className={styles.stand} aria-labelledby="stand-caption">
          <div className={styles.standCard}>
            <div className={styles.standTop}>
              <span className={styles.standLogo} aria-hidden="true">M</span>
              <span>
                <strong>Mira Kitchen</strong>
                <small>Dijital menü</small>
              </span>
              <span className={styles.standTable}>Masa 2</span>
            </div>

            <div className={styles.qr} role="img" aria-label="Demo menüye giden QR kod">
              <span dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </div>

            <div className={styles.standFoot}>
              <Icon name="nfc" className={styles.standNfc} />
              <span>
                <strong>Okutun ya da dokunun</strong>
                <small>Kamerayı QR&apos;a tutun veya telefonu NFC etikete yaklaştırın</small>
              </span>
            </div>
          </div>
          <figcaption id="stand-caption" className={styles.standCaption}>
            Bilgisayardaysanız telefonunuzun kamerasıyla okutun; menü, masadaki müşterinin gördüğü gibi açılır.
          </figcaption>
        </figure>
      </section>

      {/* NELER DENENİR */}
      <section id="deneyin" className={home.section}>
        <div className={home.heading}>
          <span className={home.eyebrow}>Demoda deneyin</span>
          <h2>
            Beş adımda <em>müşteri gözünden.</em>
          </h2>
          <p>Demoyu açtıktan sonra sırayla şunları yapın; her biri gerçek sistemde çalışır.</p>
        </div>

        <ol className={styles.steps}>
          {tryList.map((item, index) => (
            <li key={item.title} className={styles.step}>
              <span className={styles.stepNo}>{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>

        <div className={styles.menuOnlyNote}>
          <span className={styles.menuOnlyTag}>Sadece menü paketi</span>
          <p>
            Sipariş ve garson çağırma istemeyen işletmeler için: tek QR kodla açılan, çok dilli ve kalorili dijital
            menü. Kurulumu en hızlı paketimiz.
          </p>
        </div>
      </section>

      {/* İŞLETME PANELİ */}
      <section id="panel" className={styles.panelBand}>
        <div className={styles.panelInner}>
          <div className={`${home.heading} ${styles.panelHeading}`}>
            <span className={home.eyebrow}>İşletme paneli</span>
            <h2>
              Siz de arka planda <em>her şeyi görürsünüz.</em>
            </h2>
            <p>
              Demoda verdiğiniz sipariş, restoranın panelinde bu ekranlara düşer. Demo paneline girip hepsini
              kendiniz gezebilirsiniz; inceleme modunda olduğu için hiçbir şey değişmez.
            </p>
            <div className={styles.panelActions}>
              <a href={PANEL_PATH} className={home.btnGold} rel="nofollow">
                Demo paneline girin
                <Icon name="arrow" className={home.btnIcon} />
              </a>
              <span className={styles.panelHint}>Şifre gerekmez · salt okunur</span>
            </div>
          </div>

          <ul className={styles.features}>
            {panelFeatures.map((feature) => (
              <li key={feature.title} className={styles.feature}>
                <span className={styles.featureIcon}>
                  <Icon name={feature.icon} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className={`${home.ctaWrap} ${styles.ctaSpace}`}>
        <div className={home.cta}>
          <span className={home.eyebrow}>Restoranınız için</span>
          <h2>
            Kurulumu <em>biz yapıyoruz.</em>
          </h2>
          <p>
            Menünüzü aktarıyor, temanızı seçiyor, QR ve NFC ürünlerinizi hazırlıyoruz. Siz sadece masaya
            koyuyorsunuz.
          </p>
          <div className={home.ctaActions}>
            <Link href="/#paketler" className={home.btnGold}>
              Paketleri inceleyin
              <Icon name="arrow" className={home.btnIcon} />
            </Link>
            <Link href="/urunler" className={home.btnGhost}>
              QR ve NFC ürünleri
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={home.footer}>
        <div className={home.footerInner}>
          <div className={home.footerBrand}>
            <span className={home.brand}>
              <span className={home.brandMark}>OZT</span>
              <span>Digital Menu</span>
            </span>
            <p>Restoranlar için QR &amp; NFC dijital deneyim platformu.</p>
          </div>

          <nav className={home.footerLinks} aria-label="Yasal">
            <Link href="/gizlilik">Gizlilik</Link>
            <Link href="/kvkk">KVKK</Link>
            <Link href="/kullanim-sartlari">Kullanım Şartları</Link>
            <Link href="/cerez-politikasi">Çerez Politikası</Link>
          </nav>
        </div>

        <small className={home.copyright}>
          © {new Date().getFullYear()} OZT Digital Menu. Tüm hakları saklıdır.
        </small>
      </footer>

      {/* MOBİL SABİT CTA */}
      <div className={home.mobileBar}>
        <Link href="/#paketler" className={home.mobileBarSecondary}>
          Paketler
        </Link>
        <TrackedLink href={DEMO_PATH} className={home.mobileBarPrimary} {...DEMO_EVENT}>
          Demoyu Aç
          <Icon name="arrow" className={home.btnIcon} />
        </TrackedLink>
      </div>
    </main>
  );
}
