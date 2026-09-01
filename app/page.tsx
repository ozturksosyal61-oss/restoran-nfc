import Link from "next/link";

const features = [
  {
    icon: "▣",
    title: "QR Menü",
    text: "Müşterileriniz QR kodu okutarak menünüze saniyeler içinde ulaşır.",
  },
  {
    icon: "⌁",
    title: "NFC Menü",
    text: "Telefonu NFC kartınıza yaklaştırın, dijital menünüz anında açılsın.",
  },
  {
    icon: "↗",
    title: "Dijital Sipariş",
    text: "Müşterileriniz masadan hızlı ve kolay şekilde sipariş verebilir.",
  },
  {
    icon: "♧",
    title: "Garson Çağırma",
    text: "Müşterileriniz tek dokunuşla garson talebi oluşturabilir.",
  },
  {
    icon: "⌂",
    title: "Masa Yönetimi",
    text: "Masalarınızı, siparişlerinizi ve çağrıları tek panelden yönetin.",
  },
  {
    icon: "◈",
    title: "Restoran Paneli",
    text: "Menünüzü, ürünlerinizi ve siparişlerinizi kolayca yönetin.",
  },
];

const steps = [
  {
    number: "01",
    title: "Restoranınızı oluşturun",
    text: "Dakikalar içinde restoran hesabınızı oluşturun.",
  },
  {
    number: "02",
    title: "Menünüzü ekleyin",
    text: "Kategori ve ürünlerinizi panel üzerinden yönetin.",
  },
  {
    number: "03",
    title: "QR & NFC'nizi kullanın",
    text: "Müşterileriniz tek dokunuşla dijital menünüze ulaşsın.",
  },
  {
    number: "04",
    title: "Siparişleri yönetin",
    text: "Sipariş ve garson çağrılarını tek ekrandan takip edin.",
  },
];

const packages = [
  {
    name: "BAŞLANGIÇ",
    price: "499",
    description: "Dijital menüye yeni başlayan işletmeler için.",
    features: [
      "QR Dijital Menü",
      "Ürün & Kategori Yönetimi",
      "Masa Yönetimi",
      "Sipariş Yönetimi",
    ],
  },
  {
    name: "PROFESYONEL",
    price: "799",
    description: "Dijital sipariş deneyimini büyütmek isteyen restoranlar için.",
    featured: true,
    features: [
      "Başlangıç paketindeki her şey",
      "NFC Menü",
      "Garson Çağırma",
      "Gelişmiş Sipariş Yönetimi",
    ],
  },
  {
    name: "PREMIUM",
    price: "1.299",
    description: "Tüm dijital restoran deneyimini tek platformda isteyenler için.",
    features: [
      "Profesyonel paketindeki her şey",
      "Gelişmiş restoran yönetimi",
      "Müşteri değerlendirmeleri",
      "Öncelikli destek",
    ],
  },
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link href="/" className="landing-brand">
          <span className="landing-brand-mark">O</span>
          <span>
            OZT <strong>DIGITAL</strong>
          </span>
        </Link>

        <div className="landing-nav-links">
          <a href="#ozellikler">Özellikler</a>
          <a href="#nasil-calisir">Nasıl Çalışır?</a>
          <a href="#paketler">Paketler</a>
          <Link href="/demo">Demo</Link>
        </div>

        <Link href="/abonelik" className="landing-nav-button">
          Ücretsiz Dene
        </Link>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-glow landing-hero-glow-one" />
        <div className="landing-hero-glow landing-hero-glow-two" />

        <div className="landing-hero-content">
          <div className="landing-eyebrow">
            QR MENÜ • NFC • SİPARİŞ • RESTORAN YÖNETİMİ
          </div>

          <h1>
            Restoranınızın
            <br />
            <span>tüm dijital deneyimi</span>
            <br />
            tek platformda.
          </h1>

          <p>
            QR menü, NFC menü, dijital sipariş, garson çağırma ve
            restoran yönetimini tek bir sistemde birleştirin.
          </p>

          <div className="landing-hero-actions">
            <Link href="/abonelik" className="landing-button landing-button-primary">
              14 GÜN ÜCRETSİZ DENE
              <span>→</span>
            </Link>

            <Link href="/demo" className="landing-button landing-button-secondary">
              DEMOYU İNCELE
            </Link>
          </div>

          <div className="landing-trust">
            <span>✓ Kredi kartı gerekmez</span>
            <span>✓ 14 gün ücretsiz</span>
            <span>✓ Kurulumu kolay</span>
          </div>
        </div>

        <div className="landing-product-preview">
          <div className="landing-preview-glow" />

          <div className="landing-phone">
            <div className="landing-phone-top">
              <span>OZT DIGITAL</span>
              <span>•••</span>
            </div>

            <div className="landing-phone-logo">M</div>

            <h3>MIRA KITCHEN</h3>
            <p>DİJİTAL MENÜ</p>

            <div className="landing-phone-actions">
              <div>QR MENÜ</div>
              <div>NFC</div>
              <div>SİPARİŞ</div>
            </div>

            <div className="landing-phone-menu">
              <div>
                <span>Popüler Ürünler</span>
                <b>→</b>
              </div>

              <div className="landing-phone-item">
                <span />
                <div>
                  <strong>Izgara Burger</strong>
                  <small>Özel sos & patates</small>
                </div>
                <b>₺320</b>
              </div>

              <div className="landing-phone-item">
                <span />
                <div>
                  <strong>Makarna</strong>
                  <small>Günün özel sosuyla</small>
                </div>
                <b>₺280</b>
              </div>
            </div>

            <div className="landing-phone-cart">
              <span>Sepet</span>
              <strong>Sipariş Ver →</strong>
            </div>
          </div>

          <div className="landing-floating-card landing-floating-card-left">
            <span>◈</span>
            <div>
              <strong>QR + NFC</strong>
              <small>Tek dokunuşta menü</small>
            </div>
          </div>

          <div className="landing-floating-card landing-floating-card-right">
            <span>✓</span>
            <div>
              <strong>Sipariş Alındı</strong>
              <small>Masa 12 • 485 ₺</small>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-stats">
        <div>
          <strong>24/7</strong>
          <span>Dijital erişim</span>
        </div>
        <div>
          <strong>QR</strong>
          <span>Temassız menü</span>
        </div>
        <div>
          <strong>NFC</strong>
          <span>Tek dokunuş</span>
        </div>
        <div>
          <strong>1 PANEL</strong>
          <span>Tüm yönetim</span>
        </div>
      </section>

      <section id="ozellikler" className="landing-section">
        <div className="landing-section-heading">
          <div className="landing-eyebrow">NEDEN OZT DIGITAL?</div>
          <h2>
            Restoranınız için
            <br />
            <span>daha akıllı bir deneyim.</span>
          </h2>
          <p>
            Müşterinizin masaya oturduğu andan siparişin mutfağa
            ulaşmasına kadar tüm süreci dijitalleştirin.
          </p>
        </div>

        <div className="landing-feature-grid">
          {features.map((feature) => (
            <div className="landing-feature-card" key={feature.title}>
              <div className="landing-feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <span className="landing-feature-arrow">→</span>
            </div>
          ))}
        </div>
      </section>

      <section id="nasil-calisir" className="landing-section landing-how-section">
        <div className="landing-section-heading">
          <div className="landing-eyebrow">NASIL ÇALIŞIR?</div>
          <h2>
            Başlamak
            <br />
            <span>çok kolay.</span>
          </h2>
        </div>

        <div className="landing-steps">
          {steps.map((step) => (
            <div className="landing-step" key={step.number}>
              <span className="landing-step-number">{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-demo-section">
        <div className="landing-demo-content">
          <div className="landing-eyebrow">CANLI DEMO</div>

          <h2>
            Anlatmak yerine
            <br />
            <span>deneyin.</span>
          </h2>

          <p>
            Gerçek çalışan restoran demosunu inceleyin. QR menüyü,
            siparişi ve müşteri deneyimini kendiniz test edin.
          </p>

          <Link href="/demo" className="landing-button landing-button-primary">
            DEMOYU İNCELE
            <span>→</span>
          </Link>
        </div>

        <div className="landing-demo-visual">
          <div className="landing-demo-qr">
            <div className="landing-qr-pattern">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="landing-nfc-card">
            <div className="landing-nfc-logo">OZT</div>
            <div className="landing-nfc-lines">
              <span>DIGITAL MENU</span>
              <small>NFC • QR</small>
            </div>
            <div className="landing-nfc-symbol">◉</div>
          </div>
        </div>
      </section>

      <section id="paketler" className="landing-section landing-pricing-section">
        <div className="landing-section-heading landing-section-heading-center">
          <div className="landing-eyebrow">PAKETLER</div>
          <h2>
            İhtiyacınıza uygun
            <br />
            <span>paketi seçin.</span>
          </h2>
          <p>
            14 gün boyunca ücretsiz deneyin. Memnun kalırsanız devam edin.
          </p>
        </div>

        <div className="landing-pricing-grid">
          {packages.map((item) => (
            <div
              className={`landing-price-card ${
                item.featured ? "landing-price-card-featured" : ""
              }`}
              key={item.name}
            >
              {item.featured && (
                <div className="landing-price-badge">EN ÇOK TERCİH EDİLEN</div>
              )}

              <div className="landing-price-name">{item.name}</div>

              <div className="landing-price">
                <strong>{item.price}</strong>
                <span>₺ / ay</span>
              </div>

              <p className="landing-price-description">{item.description}</p>

              <div className="landing-price-divider" />

              <ul>
                {item.features.map((feature) => (
                  <li key={feature}>
                    <span>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/abonelik"
                className={
                  item.featured
                    ? "landing-price-button landing-price-button-dark"
                    : "landing-price-button"
                }
              >
                14 GÜN ÜCRETSİZ DENE →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-final-cta">
        <div className="landing-final-glow" />

        <div className="landing-eyebrow">OZT DIGITAL</div>

        <h2>
          Restoranınızı
          <br />
          <span>bugün dijitale taşıyın.</span>
        </h2>

        <p>
          14 gün ücretsiz deneyin. Kurulumu kolay, kullanımı basit,
          restoranınız için tasarlanmış dijital çözüm.
        </p>

        <div className="landing-hero-actions">
          <Link href="/abonelik" className="landing-button landing-button-primary">
            ÜCRETSİZ DENEMEYİ BAŞLAT
            <span>→</span>
          </Link>

          <Link href="/demo" className="landing-button landing-button-secondary">
            DEMOYU İNCELE
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <span className="landing-brand-mark">O</span>
          <div>
            <strong>OZT DIGITAL</strong>
            <small>Restoranlar için dijital deneyim.</small>
          </div>
        </div>

        <div className="landing-footer-links">
          <Link href="/demo">Demo</Link>
          <Link href="/abonelik">Paketler</Link>
          <Link href="/admin">Restoran Girişi</Link>
          <Link href="/sistem/login">Sistem Girişi</Link>
        </div>

        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} OZT Digital</span>
          <span>QR • NFC • DIGITAL MENU</span>
        </div>
      </footer>
    </main>
  );
}