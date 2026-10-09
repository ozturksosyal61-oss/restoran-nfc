import Link from "next/link";
import TrackedLink from "../TrackedLink";
import SiteHeader, { DEMO_EVENT } from "../SiteHeader";
import SiteFooter from "../SiteFooter";
import SiteIcon from "../SiteIcon";
import { siteFontClass } from "../site-fonts";
import { pageMetadata } from "../../lib/site";
import home from "../page.module.css";
import seo from "../seo/seo.module.css";
import DesignShowcase, { type ShowcaseDesign } from "./DesignShowcase";
import styles from "./tasarimlar.module.css";

// Tanıtım sitesi: müşteri menüsü tasarımları (Aurora, Zest, Linen, Luna)
// ve renk paletleri. Görüntüler demo restoranının gerçek ekranlarıdır.

export const metadata = pageMetadata({
  path: "/tasarimlar",
  title: "Menü Tasarımları – Restoranınıza Uygun QR Menü Görünümü | OZT Digital",
  absoluteTitle: true,
  description:
    "Aurora, Zest, Linen ve Luna: fast food'dan fine dining'e, kafeden bara her işletmeye uygun dört QR menü tasarımı ve renk paletleri. Ekranları telefonda nasıl göründüğüyle inceleyin.",
});

const DESIGNS: ShowcaseDesign[] = [
  {
    key: "aurora",
    name: "Aurora",
    forWhom: "Her tür restoran · premium",
    description:
      "Kapak fotoğrafıyla açılan sinematik bir ana sayfa ve zarif serif başlıklar. Restoranınızın atmosferini ilk ekranda hissettirir.",
    highlights: [
      "Tam ekran kapak fotoğrafı ve logo",
      "Fotoğraflı ürün satırları, kampanya şeridi",
      "7 renk paleti: koyu, açık, altın ve daha fazlası",
    ],
    palettes: [
      { key: "krem", label: "Krem", ground: "#f4efe6", accent: "#8a6424" },
      { key: "dark", label: "Dark", ground: "#12100d", accent: "#e0c07c" },
      { key: "gold", label: "Gold", ground: "#140e07", accent: "#edc979" },
      { key: "lacivert", label: "Lacivert", ground: "#0c1221", accent: "#e7cd92" },
    ],
  },
  {
    key: "zest",
    name: "Zest",
    forWhom: "Fast food · burgerci · kafe",
    description:
      "Büyük ürün fotoğrafları, iri başlıklar ve tek dokunuşla sepete ekleme. Müşteri hızlı karar verir, siparişi hızlı verir.",
    highlights: [
      "İki sütunlu, büyük fotoğraflı ürün kartları",
      "Her zaman görünen sepet çubuğu",
      "Öne çıkan kampanya kartları",
    ],
    palettes: [
      { key: "kirmizi", label: "Kırmızı", ground: "#f6f3ee", accent: "#d7261e" },
      { key: "turuncu", label: "Turuncu", ground: "#f6f3ee", accent: "#c2410c" },
      { key: "yesil", label: "Yeşil", ground: "#f6f3ee", accent: "#157a47" },
      { key: "mavi", label: "Mavi", ground: "#f6f3ee", accent: "#2747c9" },
    ],
  },
  {
    key: "linen",
    name: "Linen",
    forWhom: "Fine dining · bistro · meyhane",
    description:
      "Basılı restoran menüsü hissi: ince çizgiler, serif başlıklar, ürün adıyla fiyat arasında noktalı çizgi. Sakin, özenli ve okunaklı.",
    highlights: [
      "Tipografi ağırlıklı, sade menü düzeni",
      "Küçük ürün fotoğrafları, öne çıkan şef önerisi",
      "Fildişi, beyaz, zeytin ve bordo tonlar",
    ],
    palettes: [
      { key: "fildisi", label: "Fildişi", ground: "#f3f1ea", accent: "#1f2b25" },
      { key: "beyaz", label: "Beyaz", ground: "#ffffff", accent: "#141414" },
      { key: "zeytin", label: "Zeytin", ground: "#eeefe6", accent: "#3a4526" },
      { key: "bordo", label: "Bordo", ground: "#f6f0ee", accent: "#5e1622" },
    ],
  },
  {
    key: "luna",
    name: "Luna",
    forWhom: "Bar · pub · kokteyl",
    description:
      "Koyu zemin ve tek parlak vurgu rengi. Kokteyller büyük kartlarda öne çıkar, masa oyunları ana sayfada ilk sırada yer alır.",
    highlights: [
      "Gece için tasarlanmış koyu ekran",
      "Yana kaydırmalı kampanya kartları",
      "Masa oyunları ana sayfada öne çıkar",
    ],
    palettes: [
      { key: "nane", label: "Nane", ground: "#0f0e15", accent: "#5ef2c2" },
      { key: "amber", label: "Amber", ground: "#0f0e15", accent: "#ffb84d" },
      { key: "mavi", label: "Mavi", ground: "#0f0e15", accent: "#8fa8ff" },
      { key: "pembe", label: "Pembe", ground: "#0f0e15", accent: "#ff8cc0" },
    ],
  },
];

const SHARED = [
  "Masadan sipariş ve sipariş takibi",
  "Garson çağırma ve hesap isteme",
  "Masadan kartla ödeme (Pro ve Premium)",
  "Çok dilli menü ve kalori bilgisi",
  "Kampanyalar ve duyuru penceresi",
  "Masa oyunları ve müşteri değerlendirmesi",
];

export default function DesignsPage() {
  return (
    <main className={`${home.page} ${siteFontClass}`}>
      <SiteHeader />

      <section className={`${home.hero} ${seo.hero}`}>
        <div className={styles.heroInner}>
          <nav aria-label="Sayfa konumu" className={seo.breadcrumb}>
            <ol>
              <li>
                <Link href="/">Ana Sayfa</Link>
              </li>
              <li aria-current="page">Tasarımlar</li>
            </ol>
          </nav>
          <h1 className={seo.h1}>
            Restoranınıza uygun <em>menü tasarımını</em> seçin
          </h1>
          <p className={seo.intro}>
            Dört farklı tasarım, her biri için birden fazla renk paleti. Aşağıdaki ekranlar demo restoranımızın
            gerçek görüntüleri: telefon çerçevesinin içinde kaydırarak inceleyebilir, renk paletini değiştirerek
            işletmenize en uygun görünümü bulabilirsiniz.
          </p>
          <div className={seo.heroActions}>
            <TrackedLink href="/demo" className={home.btnPrimary} {...DEMO_EVENT}>
              Demoyu İncele
              <SiteIcon name="arrow" className={home.btnIcon} />
            </TrackedLink>
            <Link href="/#iletisim" className={home.btnSecondary}>
              Bize Ulaşın
              <SiteIcon name="arrow" className={home.btnIcon} />
            </Link>
          </div>
          <nav className={styles.jump} aria-label="Tasarımlar">
            {DESIGNS.map((design) => (
              <a key={design.key} href={`#${design.key}`}>
                {design.name}
                <small>{design.forWhom.split(" · ")[0]}</small>
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className={styles.designs} aria-label="Menü tasarımları">
        {DESIGNS.map((design, index) => (
          <DesignShowcase key={design.key} design={design} reverse={index % 2 === 1} />
        ))}
      </section>

      <section className={`${seo.section} ${seo.sectionLast}`}>
        <h2 className={seo.h2}>Hangi tasarımı seçerseniz seçin</h2>
        <p className={styles.sharedLead}>
          Tasarım yalnızca görünümü değiştirir. Paketinizdeki tüm özellikler her tasarımda aynı şekilde çalışır;
          tasarımı ya da renk paletini daha sonra da değiştirebilirsiniz.
        </p>
        <ul className={styles.shared}>
          {SHARED.map((item) => (
            <li key={item}>
              <SiteIcon name="check" className={styles.sharedIcon} />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className={home.ctaWrap}>
        <div className={home.cta}>
          <h2>Tasarımınızı birlikte seçelim</h2>
          <p>Menünüzü seçtiğiniz tasarım ve renklerle hazırlayalım; işletmenizde nasıl duracağını önceden görün.</p>
          <div className={home.ctaActions}>
            <Link href="/#iletisim" className={home.btnGold}>
              İletişime Geçin
              <SiteIcon name="arrow" className={home.btnIcon} />
            </Link>
            <TrackedLink href="/demo" className={home.btnGhost} {...DEMO_EVENT}>
              Demoyu İncele
              <SiteIcon name="arrow" className={home.btnIcon} />
            </TrackedLink>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
