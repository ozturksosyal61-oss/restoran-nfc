import Link from "next/link";

type Feature = {
  icon: string;
  title: string;
  text: string;
};

type Plan = {
  name: string;
  text: string;
  items: string[];
};

const features: Feature[] = [
  {
    icon: "📱",
    title: "QR & NFC Menü",
    text: "Müşteriniz tek dokunuşla menünüze ulaşsın. Masa bazlı QR ve NFC bağlantılarıyla hızlı erişim.",
  },
  {
    icon: "🛒",
    title: "Masa Bazlı Sipariş",
    text: "Müşteri menüden seçsin, siparişini versin. Sipariş doğrudan restoran panelinize düşsün.",
  },
  {
    icon: "🔔",
    title: "Garson Çağırma",
    text: "Müşteri masadan garson çağırabilsin. Ekip gelen talepleri panelden anında görsün.",
  },
  {
    icon: "📊",
    title: "Yönetim Paneli",
    text: "Menü, masalar, siparişler, çalışanlar, yorumlar ve işletme ayarları tek panelde.",
  },
];

const plans: Plan[] = [
  {
    name: "STARTER",
    text: "Dijital menü ve QR ile güçlü bir başlangıç.",
    items: [
      "Dijital menü",
      "QR menü",
      "Temel işletme yönetimi",
    ],
  },
  {
    name: "PRO",
    text: "Sipariş ve müşteri deneyimini büyütmek isteyen işletmeler için.",
    items: [
      "STARTER özellikleri",
      "NFC",
      "Online sipariş",
      "Garson çağırma",
      "Analitik",
      "Çoklu kullanıcı",
    ],
  },
  {
    name: "PREMIUM",
    text: "İleri seviye raporlama ve tam restoran deneyimi.",
    items: [
      "PRO özellikleri",
      "Gelişmiş raporlar",
    ],
  },
];

export default function Home() {
  return (
    <main className="landing-page">
      {/* =====================================================
          NAVIGATION
      ====================================================== */}
      <header className="landing-nav">
        <Link
          href="/"
          className="brand-mark"
          aria-label="OZT Digital Menu ana sayfa"
        >
          <span className="brand-mark-box">
            OZT
          </span>

          <span>
            OZT DIGITAL MENU
          </span>
        </Link>

        <div className="landing-nav-actions">
          <Link
            href="/admin/login"
            className="nav-login"
          >
            İşletme Girişi
          </Link>

          <a
            href="#iletisim"
            className="nav-cta"
          >
            Demo İste
          </a>
        </div>
      </header>

      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="eyebrow">
            RESTORANLAR İÇİN YENİ NESİL DİJİTAL DENEYİM
          </div>

          <h1>
            Menünüzü{" "}
            <span>dijitalleştirin.</span>
            <br />
            Siparişi hızlandırın.
          </h1>

          <p>
            QR ve NFC destekli dijital menü, masa bazlı
            sipariş, garson çağırma ve restoran yönetimini
            tek bir sistemde birleştirin.
          </p>

          <div className="landing-hero-actions">
            <a
              href="#ozellikler"
              className="landing-primary"
            >
              Sistemi Keşfet <span>→</span>
            </a>

            <Link
              href="/admin/login"
              className="landing-secondary"
            >
              Yönetim Paneli
            </Link>
          </div>

          <div className="landing-trust">
            <span>✓ Kurulumu kolay</span>
            <span>✓ Mobil uyumlu</span>
            <span>✓ QR + NFC</span>
          </div>
        </div>

        {/* =====================================================
            PRODUCT PREVIEW
        ====================================================== */}
        <div
          className="hero-product-card"
          aria-label="OZT Digital Menu ürün önizlemesi"
        >
          <div className="hero-product-top">
            <div>
              <small>MASA 12</small>
              <strong>OZT KAFE</strong>
            </div>

            <span className="status-pill">
              ● AÇIK
            </span>
          </div>

          <div className="hero-product-menu">
            <small>DİJİTAL MENÜ</small>

            <h2>Lezzetli seçimler.</h2>

            <div className="mock-product">
              <div className="mock-image">
                🍔
              </div>

              <div>
                <strong>OZT Burger</strong>

                <span>
                  Özel sos, cheddar, patates
                </span>
              </div>

              <b>₺320</b>
            </div>

            <div className="mock-product">
              <div className="mock-image">
                ☕
              </div>

              <div>
                <strong>Özel Kahve</strong>

                <span>
                  Taze çekilmiş espresso
                </span>
              </div>

              <b>₺120</b>
            </div>
          </div>

          <div className="hero-product-bottom">
            <span>🛒 Sepet</span>
            <span>🔔 Garson Çağır</span>
            <span>⭐ Yorum</span>
          </div>
        </div>
      </section>

      {/* =====================================================
          STRIP
      ====================================================== */}
      <section className="landing-strip">
        <span>QR</span>
        <span>NFC</span>
        <span>DİJİTAL MENÜ</span>
        <span>SİPARİŞ</span>
        <span>ANALİTİK</span>
        <span>MÜŞTERİ DENEYİMİ</span>
      </section>

      {/* =====================================================
          FEATURES
      ====================================================== */}
      <section
        id="ozellikler"
        className="landing-section"
      >
        <div className="section-heading">
          <div className="eyebrow">
            TEK PLATFORM
          </div>

          <h2>
            Restoranınızın dijital operasyonu
            tek yerde.
          </h2>

          <p>
            Müşterinin masaya oturduğu andan
            siparişin tamamlanmasına kadar deneyimi
            sadeleştirin.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article
              className="feature-card"
              key={feature.title}
            >
              <div className="feature-icon">
                {feature.icon}
              </div>

              <h3>
                {feature.title}
              </h3>

              <p>
                {feature.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================
          CUSTOMER FLOW
      ====================================================== */}
      <section className="landing-demo-section">
        <div className="demo-copy">
          <div className="eyebrow">
            MÜŞTERİ AKIŞI
          </div>

          <h2>
            QR&apos;ı okutun. Gerisini sistem
            halletsin.
          </h2>

          <p>
            Masa QR&apos;ı veya NFC etiketi müşteriyi
            doğrudan ilgili masanın dijital menüsüne
            taşır. Müşteri seçer, sipariş verir ve
            durumunu telefonundan takip eder.
          </p>

          <div className="flow-list">
            <span>
              <b>01</b> QR / NFC
            </span>

            <span>
              <b>02</b> Dijital Menü
            </span>

            <span>
              <b>03</b> Sepet &amp; Sipariş
            </span>

            <span>
              <b>04</b> Sipariş Takibi
            </span>
          </div>
        </div>

        <div className="phone-preview">
          <div className="phone-notch" />

          <div className="phone-screen">
            <small>
              OZT KAFE · MASA 12
            </small>

            <h3>
              Siparişiniz hazırlanıyor
            </h3>

            <div className="order-progress">
              <span className="active">
                ✓
              </span>

              <i />

              <span className="active">
                ✓
              </span>

              <i />

              <span className="active">
                ●
              </span>
            </div>

            <div className="phone-order">
              <span>
                OZT Burger × 2
              </span>

              <b>
                ₺640
              </b>
            </div>

            <div className="phone-order">
              <span>
                Özel Kahve × 1
              </span>

              <b>
                ₺120
              </b>
            </div>

            <div className="phone-total">
              <span>
                Toplam
              </span>

              <strong>
                ₺760
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          PRICING
      ====================================================== */}
      <section
        className="landing-section pricing-section"
      >
        <div className="section-heading">
          <div className="eyebrow">
            PAKETLER
          </div>

          <h2>
            İşletmenize uygun planı seçin.
          </h2>

          <p>
            İhtiyacınız büyüdükçe OZT Digital Menu
            de sizinle büyür.
          </p>
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`pricing-card${
                plan.name === "PRO"
                  ? " featured"
                  : ""
              }`}
            >
              {plan.name === "PRO" && (
                <div className="pricing-badge">
                  EN POPÜLER
                </div>
              )}

              <div className="pricing-name">
                {plan.name}
              </div>

              <p>
                {plan.text}
              </p>

              <ul>
                {plan.items.map((item) => (
                  <li key={item}>
                    ✓ {item}
                  </li>
                ))}
              </ul>

              <a href="#iletisim">
                Demo / Bilgi Al →
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================
          CTA
      ====================================================== */}
      <section
        id="iletisim"
        className="landing-cta"
      >
        <div>
          <div className="eyebrow">
            HAZIR MISINIZ?
          </div>

          <h2>
            Restoranınızı dijitale taşıyın.
          </h2>

          <p>
            Demo için bizimle iletişime geçin
            veya işletme paneline giriş yapın.
          </p>
        </div>

        <Link
          href="/admin/login"
          className="landing-primary"
        >
          İşletme Paneline Git <span>→</span>
        </Link>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}
      <footer className="landing-footer">
        <div>
          <strong>
            OZT DIGITAL MENU
          </strong>

          <span>
            Restoranlar için QR &amp; NFC
            dijital deneyim platformu.
          </span>
        </div>

        <nav>
          <Link href="/gizlilik">
            Gizlilik
          </Link>

          <Link href="/kvkk">
            KVKK
          </Link>

          <Link href="/kullanim-sartlari">
            Kullanım Şartları
          </Link>

          <Link href="/cerez-politikasi">
            Çerez Politikası
          </Link>
        </nav>

        <small>
          © {new Date().getFullYear()} OZT Digital Menu.
          Tüm hakları saklıdır.
        </small>
      </footer>
    </main>
  );
}