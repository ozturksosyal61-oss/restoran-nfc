import Link from "next/link";

const standProducts = [
  {
    title: "Siyah Premium NFC Menü Standı",
    image: "/products/menu-stand-black.png",
    accent: "LUXURY",
    text: "Masanızda güçlü ve premium bir görünüm. Müşteriniz telefonunu NFC alanına yaklaştırarak dijital menünüze saniyeler içinde ulaşır.",
    tags: ["NFC", "UV Baskı", "Pleksi", "Özel Tasarım"],
    kind: "stand" as const,
  },
  {
    title: "Beyaz Mermer NFC Menü Standı",
    image: "/products/menu-stand-white.png",
    accent: "ELEGANT",
    text: "Açık tonlu ve şık restoran konseptleri için modern NFC menü standı. Markanıza özel tasarım ile masanızın bir parçasına dönüşür.",
    tags: ["NFC", "Mermer Görünüm", "Özel Baskı", "Masa Tasarımı"],
    kind: "stand" as const,
  },
];

const cardProducts = [
  {
    title: "Siyah NFC Menü Kartı",
    image: "/products/nfc-card-black.png",
    accent: "PREMIUM CARD",
    text: "Kredi kartı boyutunda, restoranınıza özel tasarlanan NFC kart. Telefonunuzu karta yaklaştırın ve dijital deneyimi başlatın.",
    tags: ["NFC", "PVC", "Özel Baskı", "85,6 × 54 mm"],
    kind: "card" as const,
  },
  {
    title: "Beyaz NFC Menü Kartı",
    image: "/products/nfc-card-white.png",
    accent: "MINIMAL CARD",
    text: "Minimal ve temiz görünüm isteyen markalar için beyaz NFC kart. Kurumsal kimliğinize göre özel tasarlanabilir.",
    tags: ["NFC", "PVC", "Çift Yüz", "85,6 × 54 mm"],
    kind: "card" as const,
  },
];

function ProductCard({
  title,
  image,
  accent,
  text,
  tags,
  kind,
}: {
  title: string;
  image: string;
  accent: string;
  text: string;
  tags: string[];
  kind: "stand" | "card";
}) {
  return (
    <article className={`product-card ${kind}`}>
      <div className="product-visual" aria-hidden="true">
        <div className="product-floor-glow" />
        <div className="product-3d">
          <img src={image} alt="" />
        </div>
      </div>
      <div className="product-body">
        <div className="product-eyebrow">{accent}</div>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="product-tags">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="product-bottom">
          <span>OZT DIGITAL</span>
          <span className="product-dot">•</span>
          <span>Restoranınıza özel</span>
        </div>
      </div>
    </article>
  );
}

export default function ProductsPage() {
  return (
    <main className="products-page">
      <style>{`
        * { box-sizing: border-box; }
        .products-page {
          min-height: 100vh;
          color: #17130d;
          background:
            radial-gradient(circle at 8% 0%, rgba(211,170,83,.16), transparent 24%),
            radial-gradient(circle at 94% 8%, rgba(211,170,83,.10), transparent 22%),
            linear-gradient(180deg, #fffdf9 0%, #f5efe4 100%);
          font-family: Arial, Helvetica, sans-serif;
        }
        .products-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 15px clamp(16px, 5vw, 72px);
          background: rgba(255,253,249,.84);
          border-bottom: 1px solid rgba(24,18,10,.08);
          backdrop-filter: blur(18px);
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #17130d;
          text-decoration: none;
          font-weight: 900;
          letter-spacing: .05em;
        }
        .brand-box {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #17130d;
          color: #dfb75a;
          font-size: 13px;
        }
        .nav-links { display:flex; align-items:center; gap:8px; }
        .nav-link, .nav-cta {
          text-decoration:none;
          border-radius:999px;
          font-weight:900;
          font-size:14px;
          padding:10px 14px;
        }
        .nav-link { color:#40372d; }
        .nav-link:hover { background:#eee5d7; }
        .nav-cta { background:#17130d; color:#fff; }

        .hero {
          max-width: 1180px;
          margin: 0 auto;
          padding: 86px 24px 46px;
          text-align: center;
        }
        .eyebrow {
          display:inline-flex;
          align-items:center;
          gap:8px;
          color:#a17523;
          font-size:12px;
          font-weight:900;
          letter-spacing:.16em;
        }
        .hero h1 {
          margin: 14px 0 15px;
          font-size: clamp(42px, 7vw, 78px);
          line-height: .98;
          letter-spacing: -.055em;
        }
        .hero h1 span { color:#b0832d; }
        .hero p {
          max-width: 760px;
          margin:0 auto;
          color:#6c6256;
          font-size:18px;
          line-height:1.75;
        }
        .feature-strip {
          display:flex;
          justify-content:center;
          flex-wrap:wrap;
          gap:10px;
          margin-top:26px;
        }
        .feature-pill {
          padding:9px 13px;
          border-radius:999px;
          background:rgba(255,255,255,.76);
          border:1px solid rgba(169,128,52,.18);
          font-size:13px;
          font-weight:900;
        }

        .section {
          max-width: 1180px;
          margin: 0 auto;
          padding: 18px 24px 70px;
        }
        .section-heading { margin-bottom:20px; }
        .section-heading h2 {
          margin:8px 0 8px;
          font-size:clamp(30px,4vw,46px);
          letter-spacing:-.04em;
        }
        .section-heading p { margin:0; color:#756b60; line-height:1.7; }
        .products-grid {
          display:grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap:22px;
        }
        .product-card {
          position:relative;
          overflow:visible;
          border:1px solid rgba(54,43,26,.08);
          border-radius:30px;
          background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(250,246,238,.92));
          box-shadow:0 20px 55px rgba(60,43,18,.10);
          padding:0 22px 22px;
          transition:transform .28s ease, box-shadow .28s ease;
        }
        .product-card:hover {
          transform:translateY(-7px);
          box-shadow:0 30px 72px rgba(60,43,18,.15);
        }
        .product-visual {
          position:relative;
          height:340px;
          margin:-4px -4px 0;
          display:flex;
          align-items:flex-end;
          justify-content:center;
          perspective:1100px;
          isolation:isolate;
        }
        .product-floor-glow {
          position:absolute;
          left:13%;
          right:13%;
          bottom:18px;
          height:70px;
          border-radius:50%;
          background:radial-gradient(ellipse at center, rgba(25,18,10,.24) 0%, rgba(25,18,10,.10) 42%, rgba(25,18,10,0) 74%);
          filter:blur(9px);
          transform:translateY(16px);
          z-index:-1;
        }
        .product-3d {
          position:relative;
          width:76%;
          height:310px;
          display:flex;
          align-items:flex-end;
          justify-content:center;
          transform:rotateX(5deg) rotateY(-7deg) rotateZ(-1deg);
          transform-style:preserve-3d;
          transition:transform .35s ease, filter .35s ease;
          filter:drop-shadow(20px 24px 20px rgba(31,23,14,.18));
        }
        .product-card.card .product-3d {
          width:86%;
          height:255px;
          transform:rotateX(8deg) rotateY(-10deg) rotateZ(-1deg);
        }
        .product-card:hover .product-3d {
          transform:rotateX(2deg) rotateY(-2deg) rotateZ(0deg) translateY(-8px) scale(1.02);
          filter:drop-shadow(24px 30px 23px rgba(31,23,14,.20));
        }
        .product-3d::before {
          content:"";
          position:absolute;
          inset:4% -2% 1% 3%;
          border-radius:20px;
          background:linear-gradient(140deg,rgba(255,255,255,.55),rgba(255,255,255,0) 34%,rgba(0,0,0,.12) 80%);
          transform:translateZ(18px);
          pointer-events:none;
          mix-blend-mode:screen;
          opacity:.55;
        }
        .product-3d img {
          width:100%;
          height:100%;
          display:block;
          object-fit:contain;
          border-radius:18px;
          background:transparent;
        }
        .product-body { padding:4px 4px 0; }
        .product-eyebrow {
          color:#a17523;
          font-size:11px;
          letter-spacing:.16em;
          font-weight:900;
        }
        .product-body h3 {
          margin:9px 0 10px;
          font-size:28px;
          letter-spacing:-.035em;
        }
        .product-body p {
          margin:0;
          color:#6e6458;
          font-size:15px;
          line-height:1.72;
        }
        .product-tags { display:flex; flex-wrap:wrap; gap:8px; margin:18px 0; }
        .product-tags span {
          padding:8px 10px;
          border-radius:10px;
          background:#f5eddd;
          color:#76561d;
          font-size:12px;
          font-weight:900;
        }
        .product-bottom {
          display:flex;
          align-items:center;
          gap:8px;
          padding-top:15px;
          border-top:1px solid #eee5d6;
          color:#8a7c68;
          font-size:11px;
          font-weight:900;
          letter-spacing:.08em;
        }
        .product-bottom span:first-child { color:#17130d; }
        .product-dot { color:#b0832d; }

        .experience {
          max-width:1180px;
          margin:0 auto;
          padding: 0 24px 80px;
        }
        .experience-box {
          display:grid;
          grid-template-columns:1.15fr .85fr;
          gap:28px;
          align-items:stretch;
          padding:36px;
          border-radius:32px;
          color:#fff;
          background:linear-gradient(145deg,#15120e,#211a10);
          box-shadow:0 25px 65px rgba(30,20,8,.2);
        }
        .experience h2 {
          margin:8px 0 12px;
          font-size:36px;
          letter-spacing:-.04em;
        }
        .experience p { margin:0; color:#cfc6ba; line-height:1.75; }
        .steps { display:grid; gap:11px; margin-top:22px; }
        .step {
          display:flex;
          align-items:center;
          gap:12px;
          padding:14px 15px;
          border-radius:15px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.08);
          color:#f1eadf;
          font-weight:800;
        }
        .step b {
          width:28px;
          height:28px;
          display:grid;
          place-items:center;
          border-radius:50%;
          background:#d9b45e;
          color:#17130d;
          font-size:12px;
        }
        .experience-card {
          min-height:100%;
          display:flex;
          flex-direction:column;
          justify-content:center;
          padding:28px;
          border-radius:25px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.10);
        }
        .experience-card .big {
          font-size:54px;
          line-height:1;
          font-weight:900;
          letter-spacing:-.05em;
          color:#dfb75a;
        }
        .experience-card strong { margin-top:10px; font-size:21px; }
        .experience-card span { margin-top:7px; color:#bdb4a8; line-height:1.6; }

        .cta {
          text-align:center;
          padding:0 24px 95px;
        }
        .cta h2 { margin:8px 0 10px; font-size:38px; letter-spacing:-.04em; }
        .cta p { max-width:640px; margin:0 auto 22px; color:#756b60; line-height:1.7; }
        .cta-actions { display:flex; justify-content:center; gap:10px; flex-wrap:wrap; }
        .cta-actions a {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          text-decoration:none;
          padding:13px 18px;
          border-radius:999px;
          font-weight:900;
        }
        .cta-main { background:#17130d; color:#fff; }
        .cta-soft { background:#eee5d7; color:#40372d; }

        @media (max-width:820px) {
          .products-grid, .experience-box { grid-template-columns:1fr; }
          .product-visual { height:310px; }
          .product-3d { height:285px; }
          .product-card.card .product-3d { height:235px; }
        }
        @media (max-width:560px) {
          .products-nav { padding:13px 14px; }
          .brand span:last-child, .nav-links .nav-link { display:none; }
          .hero { padding-top:58px; }
          .hero p { font-size:16px; }
          .section, .experience { padding-left:14px; padding-right:14px; }
          .product-visual { height:270px; }
          .product-3d { height:250px; width:82%; }
          .product-card.card .product-3d { height:205px; width:90%; }
          .product-body { padding:22px; }
          .experience-box { padding:23px; }
          .experience h2 { font-size:29px; }
        }
      `}</style>

      <nav className="products-nav">
        <Link href="/" className="brand">
          <span className="brand-box">OZT</span>
          <span>OZT DIGITAL MENU</span>
        </Link>
        <div className="nav-links">
          <Link href="/" className="nav-link">Ana Sayfa</Link>
          <Link href="/demo" className="nav-link">🎯 Demo</Link>
          <Link href="/admin/login" className="nav-cta">İşletme Girişi</Link>
        </div>
      </nav>

      <header className="hero">
        <div className="eyebrow">✨ OZT DIGITAL FİZİKSEL ÜRÜNLER</div>
        <h1>Masada görünen <span>dijital deneyim.</span></h1>
        <p>
          Markanıza özel NFC menü standları ve NFC menü kartlarıyla müşterilerinizi
          tek dokunuşta dijital menünüze ulaştırın. Tasarım, baskı ve dijital sistem
          tek çatı altında.
        </p>
        <div className="feature-strip">
          <span className="feature-pill">📡 NFC Teknolojisi</span>
          <span className="feature-pill">🎨 Markaya Özel Tasarım</span>
          <span className="feature-pill">🖨️ UV Baskı</span>
          <span className="feature-pill">📱 Dijital Menü</span>
          <span className="feature-pill">✨ Premium Görünüm</span>
        </div>
      </header>

      <section className="section">
        <div className="section-heading">
          <div className="eyebrow">🪧 MENÜ STANDLARI</div>
          <h2>Masanız için iki farklı stil.</h2>
          <p>Restoranınızın konseptine göre siyah premium veya açık mermer görünümlü stand seçenekleri.</p>
        </div>
        <div className="products-grid">
          {standProducts.map((product) => <ProductCard key={product.title} {...product} />)}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div className="eyebrow">💳 NFC MENÜ KARTLARI</div>
          <h2>Telefonu yaklaştır, menü açılsın.</h2>
          <p>Standart kredi kartı ölçüsünde, restoranınızın kimliğine göre özel tasarlanabilen NFC kartlar.</p>
        </div>
        <div className="products-grid">
          {cardProducts.map((product) => <ProductCard key={product.title} {...product} />)}
        </div>
      </section>

      <section className="experience">
        <div className="experience-box">
          <div>
            <div className="eyebrow">⚡ NASIL ÇALIŞIR?</div>
            <h2>Fiziksel ürün + dijital sistem.</h2>
            <p>
              Müşteri kartı veya standı telefonuna yaklaştırır. NFC bağlantısı üzerinden
              restoranınızın dijital menüsü açılır. Menü, sipariş ve diğer dijital deneyimler
              aynı sistem üzerinden devam eder.
            </p>
            <div className="steps">
              <div className="step"><b>01</b> NFC standını veya kartı masanıza koyun.</div>
              <div className="step"><b>02</b> Müşteri telefonunu yaklaştırsın.</div>
              <div className="step"><b>03</b> Dijital menü anında açılsın.</div>
              <div className="step"><b>04</b> Sipariş ve diğer işlemler dijital sistemden devam etsin.</div>
            </div>
          </div>
          <div className="experience-card">
            <div className="big">NFC</div>
            <strong>Tek dokunuşla dijital deneyim</strong>
            <span>Restoranınızın adına, logosuna ve konseptine göre tasarlanmış fiziksel ürünler.</span>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="eyebrow">🚀 OZT DIGITAL</div>
        <h2>Restoranınız için özel tasarlayalım.</h2>
        <p>Demo sistemi inceleyin, ardından işletmenize uygun NFC stand ve kart tasarımını birlikte oluşturalım.</p>
        <div className="cta-actions">
          <Link href="/demo" className="cta-main">🎯 Demoyu İncele →</Link>
          <Link href="/admin/login" className="cta-soft">🔐 İşletme Girişi</Link>
        </div>
      </section>
    </main>
  );
}
