import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="demo-page">
      <nav className="demo-nav">
        <Link href="/" className="demo-brand">
          <span className="demo-brand-mark">O</span>
          <span>
            OZT <strong>DIGITAL</strong>
          </span>
        </Link>

        <Link href="/abonelik" className="demo-nav-button">
          14 GÜN ÜCRETSİZ DENE
        </Link>
      </nav>

      <section className="demo-hero">
        <div className="demo-hero-content">
          <div className="landing-eyebrow">
            OZT DIGITAL • CANLI DEMO
          </div>

          <h1>
            Gerçek bir
            <br />
            <span>restoran deneyimini</span>
            <br />
            şimdi keşfedin.
          </h1>

          <p>
            OZT Digital'in müşterileriniz için sunduğu QR menü,
            dijital sipariş ve garson çağırma deneyimini canlı
            olarak deneyin.
          </p>

          <div className="demo-actions">
            <Link
              href="/restoran/mira-kitchen"
              className="demo-primary-button"
            >
              MİRA KITCHEN DEMOSUNU AÇ →
            </Link>

            <Link
              href="/abonelik"
              className="demo-secondary-button"
            >
              14 GÜN ÜCRETSİZ DENE
            </Link>
          </div>

          <div className="demo-note">
            <span>✓</span>
            Demo gerçek çalışan sistem üzerinden hazırlanmıştır.
          </div>
        </div>

        <div className="demo-preview">
          <div className="demo-preview-card">
            <div className="demo-preview-top">
              <span>OZT DIGITAL</span>
              <span>● LIVE DEMO</span>
            </div>

            <div className="demo-restaurant-logo">
              M
            </div>

            <h2>MIRA KITCHEN</h2>

            <p>DİJİTAL MENÜ</p>

            <div className="demo-preview-buttons">
              <div>
                <strong>QR</strong>
                <span>Dijital Menü</span>
              </div>

              <div>
                <strong>NFC</strong>
                <span>Tek Dokunuş</span>
              </div>

              <div>
                <strong>↗</strong>
                <span>Sipariş</span>
              </div>
            </div>

            <div className="demo-preview-menu">
              <div className="demo-menu-heading">
                <strong>Popüler Ürünler</strong>
                <span>→</span>
              </div>

              <div className="demo-menu-item">
                <div className="demo-food-image" />

                <div>
                  <strong>Izgara Burger</strong>
                  <small>Özel sos & patates</small>
                </div>

                <b>₺320</b>
              </div>

              <div className="demo-menu-item">
                <div className="demo-food-image demo-food-two" />

                <div>
                  <strong>Günün Makarnası</strong>
                  <small>Şefin özel sosuyla</small>
                </div>

                <b>₺280</b>
              </div>
            </div>

            <div className="demo-order-button">
              SİPARİŞ VER →
            </div>
          </div>
        </div>
      </section>

      <section className="demo-experience">
        <div className="demo-section-heading">
          <div className="landing-eyebrow">
            DENEYİMİ KENDİNİZ TEST EDİN
          </div>

          <h2>
            Müşterinizin gördüğü
            <br />
            <span>deneyim.</span>
          </h2>
        </div>

        <div className="demo-experience-grid">
          <div className="demo-experience-card">
            <span className="demo-number">01</span>

            <div className="demo-icon">▣</div>

            <h3>Dijital Menü</h3>

            <p>
              Müşteri QR kodu okutur ve restoranınızın
              dijital menüsüne anında ulaşır.
            </p>
          </div>

          <div className="demo-experience-card">
            <span className="demo-number">02</span>

            <div className="demo-icon">↗</div>

            <h3>Dijital Sipariş</h3>

            <p>
              Ürünleri sepete ekler ve masadan doğrudan
              sipariş oluşturur.
            </p>
          </div>

          <div className="demo-experience-card">
            <span className="demo-number">03</span>

            <div className="demo-icon">♧</div>

            <h3>Garson Çağırma</h3>

            <p>
              Tek dokunuşla garson çağrısı oluşturur ve
              restoran paneline bildirim düşer.
            </p>
          </div>
        </div>
      </section>

      <section className="demo-final">
        <div className="landing-eyebrow">
          RESTORANINIZ İÇİN
        </div>

        <h2>
          Şimdi kendi
          <br />
          <span>dijital menünüzü oluşturun.</span>
        </h2>

        <p>
          14 gün boyunca ücretsiz deneyin ve OZT Digital'in
          restoranınız için neler yapabileceğini görün.
        </p>

        <Link
          href="/abonelik"
          className="demo-primary-button"
        >
          14 GÜN ÜCRETSİZ DENE →
        </Link>
      </section>

      <footer className="demo-footer">
        <Link href="/">
          ← OZT Digital Ana Sayfa
        </Link>

        <span>
          © {new Date().getFullYear()} OZT Digital
        </span>
      </footer>
    </main>
  );
}