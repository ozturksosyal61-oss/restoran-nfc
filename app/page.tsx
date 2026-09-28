import Image from "next/image";
import Link from "next/link";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { supabase } from "../lib/supabase";
import TrackedLink from "./TrackedLink";
import styles from "./page.module.css";

// Restoran sayısı en fazla 5 dakikada bir güncellenir.
export const revalidate = 300;

// Sistem panelindeki "aktif" tanımıyla aynı: is_active false olmayanlar.
async function getRestaurantCount() {
  const { count, error } = await supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true })
    .not("is_active", "is", false);

  return error ? null : count;
}

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

const DEMO_EVENT = {
  event: "ViewContent",
  eventParams: { content_name: "Demo", content_category: "OZT Digital" },
};

const PRODUCTS_EVENT = {
  event: "ViewContent",
  eventParams: { content_name: "Ürünler", content_category: "OZT Digital" },
};

/* =========================================================
   İKONLAR
   ========================================================= */

const iconPaths = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  nfc: "M8.5 16.5a6 6 0 0 1 0-9M12 19a9.5 9.5 0 0 1 0-14M5 14a2.5 2.5 0 0 1 0-4",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  cart: "M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2M10 20h.01M17 20h.01",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 21h4",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  palette:
    "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-.9-.7-1.3-.7-2.1 0-.9.7-1.4 1.6-1.4H17a4 4 0 0 0 4-4c0-5-4-9-9-9zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  plus: "M12 5v14M5 12h14",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
} as const;

function Icon({
  name,
  className,
}: {
  name: keyof typeof iconPaths;
  className?: string;
}) {
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

/* =========================================================
   İÇERİK
   ========================================================= */

const features: {
  icon: keyof typeof iconPaths;
  title: string;
  text: string;
}[] = [
  {
    icon: "cart",
    title: "Masa Bazlı Sipariş",
    text: "Müşteri menüden seçer, siparişini verir. Sipariş hangi masadan geldiğiyle birlikte panelinize düşer.",
  },
  {
    icon: "bell",
    title: "Garson Çağırma",
    text: "Tek dokunuşla garson çağrısı. Ekibiniz gelen talepleri panelden anında görür.",
  },
  {
    icon: "clock",
    title: "Sipariş Takibi",
    text: "Müşteri siparişinin hazırlanma durumunu kendi telefonundan takip eder.",
  },
  {
    icon: "palette",
    title: "Markanıza Uygun Temalar",
    text: "8 hazır tema arasından işletmenizin tarzına en uygun olanı seçin.",
  },
  {
    icon: "star",
    title: "Müşteri Yorumları",
    text: "Müşteriler deneyimlerini puanlayıp yorum bırakır; siz de panelden takip edersiniz.",
  },
];

const steps = [
  {
    title: "Okutun ya da dokunun",
    text: "Masadaki QR kod veya NFC etiketi, müşteriyi doğrudan o masanın menüsüne götürür.",
  },
  {
    title: "Seçin ve sipariş verin",
    text: "Müşteri ürünleri inceler, sepete ekler ve siparişini masadan gönderir.",
  },
  {
    title: "Ekibiniz anında görür",
    text: "Sipariş, masa numarasıyla birlikte yönetim panelinize düşer.",
  },
  {
    title: "Müşteri takip eder",
    text: "Siparişin durumu müşterinin telefonunda güncellenir.",
  },
];

const products = [
  {
    title: "Premium NFC Menü Standı",
    image: "/products/menu-stand-black.png",
  },
  {
    title: "NFC Menü Kartı",
    image: "/products/nfc-card-black.png",
  },
  {
    title: "Gold Metal QR Menü Plağı",
    image: "/products/gold-metal-qr-menu-plaque.png",
  },
];

const plans = [
  {
    name: "Starter",
    text: "Dijital menü ve QR ile güçlü bir başlangıç.",
    items: ["Dijital menü", "QR menü", "Temel işletme yönetimi"],
  },
  {
    name: "Pro",
    text: "Sipariş ve müşteri deneyimini büyütmek isteyen işletmeler için.",
    items: [
      "Starter özellikleri",
      "NFC",
      "Online sipariş",
      "Garson çağırma",
      "Analitik",
      "Çoklu kullanıcı",
    ],
    featured: true,
  },
  {
    name: "Premium",
    text: "İleri seviye raporlama ve tam restoran deneyimi.",
    items: ["Pro özellikleri", "Gelişmiş raporlar"],
  },
];

const faqs = [
  {
    q: "Müşterilerin uygulama indirmesi gerekiyor mu?",
    a: "Hayır. Menü telefonun tarayıcısında açılır; QR kodu okutmak veya NFC etiketine dokunmak yeterlidir.",
  },
  {
    q: "NFC her telefonda çalışır mı?",
    a: "NFC destekli telefonlarda etikete yaklaştırmak yeterlidir. NFC'si olmayan telefonlar için aynı üründe QR kod da bulunur.",
  },
  {
    q: "Menüyü kendim güncelleyebilir miyim?",
    a: "Evet. Ürün, fiyat, kategori ve kampanyalarınızı yönetim panelinden dilediğiniz zaman düzenleyebilirsiniz.",
  },
  {
    q: "Siparişler nereye düşüyor?",
    a: "Masadan verilen siparişler, masa numarasıyla birlikte yönetim panelinizdeki siparişler ekranına düşer.",
  },
  {
    q: "Hangi paket bana uygun?",
    a: "Yalnızca dijital menü istiyorsanız Starter ile başlayabilirsiniz. Masadan sipariş, NFC ve garson çağırma için Pro; gelişmiş raporlar için Premium uygundur.",
  },
];

/* =========================================================
   SAYFA
   ========================================================= */

export default async function Home() {
  const restaurantCount = await getRestaurantCount();

  // Sayı alınamazsa bu kutu gizlenir; yanlış rakam göstermeyiz.
  const facts = [
    { value: "QR + NFC", label: "Tek dokunuşla menü" },
    { value: "8", label: "Hazır menü teması" },
    ...(restaurantCount != null
      ? [
          {
            value: restaurantCount.toLocaleString("tr-TR"),
            label: "Hizmet verilen restoran",
          },
        ]
      : []),
    { value: "Anlık", label: "Sipariş bildirimi" },
  ];

  return (
    <main
      className={`${styles.page} ${display.variable} ${sans.variable}`}
    >
      {/* NAV */}
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link
            href="/"
            className={styles.brand}
            aria-label="OZT Digital Menu ana sayfa"
          >
            <span className={styles.brandMark}>OZT</span>
            <span>Digital Menu</span>
          </Link>

          <nav className={styles.navLinks} aria-label="Sayfa bölümleri">
            <a href="#ozellikler">Özellikler</a>
            <a href="#nasil-calisir">Nasıl Çalışır</a>
            <TrackedLink href="/urunler" {...PRODUCTS_EVENT}>
              Ürünler
            </TrackedLink>
            <a href="#paketler">Paketler</a>
            <a href="#sss">SSS</a>
          </nav>

          <div className={styles.navActions}>
            <Link href="/admin/login" className={styles.navLogin}>
              İşletme Girişi
            </Link>
            <TrackedLink
              href="/demo"
              className={styles.navCta}
              {...DEMO_EVENT}
            >
              Demoyu İncele
              <Icon name="arrow" className={styles.btnIcon} />
            </TrackedLink>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.pill}>
              <span className={styles.pillDot} />
              Restoranlar için yeni nesil dijital deneyim
            </span>

            <h1 className={styles.heroTitle}>
              Menünüzü dijitalleştirin. <em>Siparişi</em> hızlandırın.
            </h1>

            <p className={styles.heroText}>
              QR ve NFC destekli dijital menü, masa bazlı sipariş, garson
              çağırma ve restoran yönetimini tek bir sistemde birleştirin.
            </p>

            <div className={styles.heroActions}>
              <TrackedLink
                href="/demo"
                className={styles.btnPrimary}
                {...DEMO_EVENT}
              >
                Demoyu İncele
                <Icon name="arrow" className={styles.btnIcon} />
              </TrackedLink>
              <TrackedLink
                href="/urunler"
                className={styles.btnSecondary}
                {...PRODUCTS_EVENT}
              >
                Ürünleri İncele
              </TrackedLink>
            </div>

            <ul className={styles.trust}>
              {[
                "Kurulumu kolay",
                "Mobil uyumlu",
                "Uygulama gerekmez",
              ].map((item) => (
                <li key={item}>
                  <Icon name="check" className={styles.trustIcon} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div
            className={styles.heroVisual}
            role="img"
            aria-label="Masadaki NFC menü standı ve telefonda açılan dijital menü önizlemesi"
          >
            <div className={styles.heroPhoto}>
              <Image
                src="/products/menu-stand-black.png"
                alt=""
                fill
                preload
                sizes="(max-width: 900px) 90vw, 520px"
              />
            </div>

            <div className={styles.phone}>
              <div className={styles.phoneScreen}>
                <div className={styles.phoneHeader}>
                  <div>
                    <small>Masa 12</small>
                    <strong>OZT Kafe</strong>
                  </div>
                  <span className={styles.openBadge}>Açık</span>
                </div>

                <div className={styles.chips}>
                  <span className={styles.chipActive}>Burgerler</span>
                  <span>Kahveler</span>
                  <span>Tatlılar</span>
                </div>

                {[
                  ["🍔", "OZT Burger", "Özel sos, cheddar", "₺320"],
                  ["☕", "Özel Kahve", "Taze çekilmiş espresso", "₺120"],
                  ["🍰", "San Sebastian", "Akışkan cheesecake", "₺180"],
                ].map(([emoji, name, desc, price]) => (
                  <div className={styles.menuItem} key={name}>
                    <span className={styles.menuThumb}>{emoji}</span>
                    <span className={styles.menuInfo}>
                      <strong>{name}</strong>
                      <small>{desc}</small>
                    </span>
                    <span className={styles.menuPrice}>
                      {price}
                      <span className={styles.menuAdd}>
                        <Icon name="plus" />
                      </span>
                    </span>
                  </div>
                ))}

                <div className={styles.cartBar}>
                  <span>2 ürün · ₺440</span>
                  <strong>Sepeti Gör</strong>
                </div>
              </div>
            </div>

            <div className={`${styles.floatCard} ${styles.floatTop}`}>
              <span className={styles.floatIcon}>
                <Icon name="bell" />
              </span>
              <span>
                <strong>Masa 7</strong>
                <small>Garson çağırıyor</small>
              </span>
            </div>

            <div className={`${styles.floatCard} ${styles.floatBottom}`}>
              <span className={`${styles.floatIcon} ${styles.floatIconOk}`}>
                <Icon name="check" />
              </span>
              <span>
                <strong>Yeni sipariş</strong>
                <small>Masa 12 · ₺640</small>
              </span>
            </div>
          </div>
        </div>

        <dl className={styles.facts}>
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ÖZELLİKLER */}
      <section id="ozellikler" className={styles.section}>
        <div className={`${styles.heading} ${styles.reveal}`}>
          <span className={styles.eyebrow}>Tek platform</span>
          <h2>
            Restoranınızın dijital operasyonu <em>tek yerde.</em>
          </h2>
          <p>
            Müşterinin masaya oturduğu andan siparişin tamamlanmasına kadar
            deneyimi sadeleştirin.
          </p>
        </div>

        <div className={styles.bento}>
          <article
            className={`${styles.card} ${styles.cardHero} ${styles.reveal}`}
          >
            <div className={styles.cardHeroCopy}>
              <span className={styles.cardIcon}>
                <Icon name="nfc" />
              </span>
              <h3>QR &amp; NFC Menü</h3>
              <p>
                Müşteriniz telefonunu masaya yaklaştırsın ya da QR kodu
                okutsun; menünüz saniyeler içinde açılsın. Her masa için
                ayrı bağlantı.
              </p>
            </div>
            <div className={styles.cardHeroImage}>
              <Image
                src="/products/nfc-card-black.png"
                alt="Masa numaralı siyah NFC ve QR menü kartı"
                fill
                sizes="(max-width: 900px) 90vw, 420px"
              />
            </div>
          </article>

          {features.map((feature) => (
            <article
              className={`${styles.card} ${styles.reveal}`}
              key={feature.title}
            >
              <span className={styles.cardIcon}>
                <Icon name={feature.icon} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}

          <article
            className={`${styles.card} ${styles.cardWide} ${styles.reveal}`}
          >
            <div>
              <span className={styles.cardIcon}>
                <Icon name="chart" />
              </span>
              <h3>Tek Panelde Yönetim</h3>
              <p>
                Menü, kategoriler, kampanyalar, masalar, siparişler ve
                çalışanlar tek ekranda. Satış analizleriyle neyin çalıştığını
                görün.
              </p>
            </div>
            <div className={styles.miniChart} aria-hidden="true">
              {[38, 56, 44, 72, 60, 88, 76].map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* NASIL ÇALIŞIR */}
      <section id="nasil-calisir" className={styles.dark}>
        <div className={styles.flow}>
          <div className={styles.reveal}>
            <div className={`${styles.heading} ${styles.headingDark}`}>
              <span className={styles.eyebrow}>Müşteri akışı</span>
              <h2>
                QR&apos;ı okutun. <em>Gerisini sistem halletsin.</em>
              </h2>
            </div>

            <ol className={styles.steps}>
              {steps.map((step, i) => (
                <li key={step.title}>
                  <span className={styles.stepNo}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div
            className={`${styles.trackPhone} ${styles.reveal}`}
            role="img"
            aria-label="Sipariş takip ekranı önizlemesi"
          >
            <div className={styles.phoneScreen}>
              <small className={styles.trackMeta}>OZT Kafe · Masa 12</small>
              <strong className={styles.trackTitle}>
                Siparişiniz hazırlanıyor
              </strong>

              <div className={styles.progress}>
                {["Alındı", "Onaylandı", "Hazırlanıyor"].map((label, i) => (
                  <div
                    key={label}
                    className={i === 2 ? styles.progressNow : styles.progressDone}
                  >
                    <span>{i < 2 ? <Icon name="check" /> : null}</span>
                    <small>{label}</small>
                  </div>
                ))}
              </div>

              <div className={styles.orderLines}>
                <div>
                  <span>OZT Burger × 2</span>
                  <b>₺640</b>
                </div>
                <div>
                  <span>Özel Kahve × 1</span>
                  <b>₺120</b>
                </div>
              </div>

              <div className={styles.orderTotal}>
                <span>Toplam</span>
                <strong>₺760</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ÜRÜNLER */}
      <section className={styles.section}>
        <div className={`${styles.headingRow} ${styles.reveal}`}>
          <div className={styles.heading}>
            <span className={styles.eyebrow}>Masanızdaki ürünler</span>
            <h2>
              Menünüze açılan kapı, <em>masanıza yakışsın.</em>
            </h2>
          </div>
          <TrackedLink
            href="/urunler"
            className={styles.textLink}
            {...PRODUCTS_EVENT}
          >
            Tüm ürünleri gör
            <Icon name="arrow" className={styles.btnIcon} />
          </TrackedLink>
        </div>

        <div className={styles.products}>
          {products.map((product) => (
            <TrackedLink
              href="/urunler"
              className={`${styles.product} ${styles.reveal}`}
              key={product.title}
              {...PRODUCTS_EVENT}
            >
              <span className={styles.productImage}>
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  sizes="(max-width: 760px) 90vw, 380px"
                />
              </span>
              <span className={styles.productName}>
                {product.title}
                <Icon name="arrow" className={styles.btnIcon} />
              </span>
            </TrackedLink>
          ))}
        </div>
      </section>

      {/* PAKETLER */}
      <section id="paketler" className={styles.section}>
        <div
          className={`${styles.heading} ${styles.headingCenter} ${styles.reveal}`}
        >
          <span className={styles.eyebrow}>Paketler</span>
          <h2>
            İşletmenize uygun <em>planı seçin.</em>
          </h2>
          <p>İhtiyacınız büyüdükçe OZT Digital Menu de sizinle büyür.</p>
        </div>

        <div className={styles.pricing}>
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`${styles.plan} ${plan.featured ? styles.planFeatured : ""} ${styles.reveal}`}
            >
              {plan.featured && (
                <span className={styles.planBadge}>En popüler</span>
              )}
              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planText}>{plan.text}</p>

              <ul className={styles.planList}>
                {plan.items.map((item) => (
                  <li key={item}>
                    <Icon name="check" className={styles.planCheck} />
                    {item}
                  </li>
                ))}
              </ul>

              <TrackedLink
                href="/demo"
                className={
                  plan.featured ? styles.btnGold : styles.btnSecondary
                }
                {...DEMO_EVENT}
              >
                Demoyu İncele
                <Icon name="arrow" className={styles.btnIcon} />
              </TrackedLink>
            </article>
          ))}
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className={`${styles.section} ${styles.faqSection}`}>
        <div className={`${styles.heading} ${styles.reveal}`}>
          <span className={styles.eyebrow}>Sıkça sorulanlar</span>
          <h2>
            Aklınızda <em>soru kalmasın.</em>
          </h2>
        </div>

        <div className={styles.faq}>
          {faqs.map((item) => (
            <details key={item.q} className={styles.faqItem}>
              <summary>
                {item.q}
                <Icon name="plus" className={styles.faqIcon} />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="iletisim" className={styles.ctaWrap}>
        <div className={`${styles.cta} ${styles.reveal}`}>
          <span className={styles.eyebrow}>Hazır mısınız?</span>
          <h2>
            Restoranınızı <em>dijitale taşıyın.</em>
          </h2>
          <p>
            Demoyu inceleyin veya işletme panelinize giriş yapın.
          </p>
          <div className={styles.ctaActions}>
            <TrackedLink
              href="/demo"
              className={styles.btnGold}
              {...DEMO_EVENT}
            >
              Demoyu İncele
              <Icon name="arrow" className={styles.btnIcon} />
            </TrackedLink>
            <Link href="/admin/login" className={styles.btnGhost}>
              İşletme Girişi
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.brand}>
              <span className={styles.brandMark}>OZT</span>
              <span>Digital Menu</span>
            </span>
            <p>Restoranlar için QR &amp; NFC dijital deneyim platformu.</p>
          </div>

          <nav className={styles.footerLinks} aria-label="Yasal">
            <Link href="/gizlilik">Gizlilik</Link>
            <Link href="/kvkk">KVKK</Link>
            <Link href="/kullanim-sartlari">Kullanım Şartları</Link>
            <Link href="/cerez-politikasi">Çerez Politikası</Link>
          </nav>
        </div>

        <small className={styles.copyright}>
          © {new Date().getFullYear()} OZT Digital Menu. Tüm hakları
          saklıdır.
        </small>
      </footer>

      {/* MOBİL SABİT CTA */}
      <div className={styles.mobileBar}>
        <TrackedLink
          href="/urunler"
          className={styles.mobileBarSecondary}
          {...PRODUCTS_EVENT}
        >
          Ürünler
        </TrackedLink>
        <TrackedLink
          href="/demo"
          className={styles.mobileBarPrimary}
          {...DEMO_EVENT}
        >
          Demoyu İncele
          <Icon name="arrow" className={styles.btnIcon} />
        </TrackedLink>
      </div>
    </main>
  );
}
