import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import ContactLink from "../ContactLink";
import SiteHeader from "../SiteHeader";
import SiteFooter from "../SiteFooter";
import SiteIcon from "../SiteIcon";
import { siteFontClass } from "../site-fonts";
import { whatsappUrl } from "../../lib/contact";
import { pageMetadata } from "../../lib/site";
import home from "../page.module.css";
import seo from "../seo/seo.module.css";
import styles from "./urunler.module.css";

// Tanıtım sitesi: masa ürünleri (NFC stand, NFC kart, QR plaka).
// Ana sayfanın ortak başlık, alt bilgi ve stilleriyle; fiyatlar teklif üzerine.

export const metadata: Metadata = pageMetadata({
  path: "/urunler",
  title: "NFC Menü Standı, QR Menü Kartı ve Masa Ürünleri",
  description:
    "Restoranınız için NFC menü standları, NFC menü kartları ve QR menü plakaları: UV baskı, pleksi ve özel tasarım seçenekleriyle dijital menünüze tek dokunuşla erişim. Fiyatlar teklif üzerine.",
});

type Product = {
  title: string;
  image: string;
  alt: string;
  text: string;
  tags: string[];
};

const GROUPS: { id: string; eyebrow: string; title: string; em: string; text: string; items: Product[] }[] = [
  {
    id: "standlar",
    eyebrow: "Menü standları",
    title: "Masanız için",
    em: "iki farklı stil.",
    text: "Restoranınızın konseptine göre siyah premium ya da açık mermer görünümlü stand seçenekleri.",
    items: [
      {
        title: "Siyah Premium NFC Menü Standı",
        image: "/products/menu-stand-black.png",
        alt: "Restoran masasında duran siyah premium NFC menü standı",
        text: "Masanızda güçlü ve premium bir görünüm. Müşteriniz telefonunu NFC alanına yaklaştırarak ya da QR kodu okutarak dijital menünüze saniyeler içinde ulaşır.",
        tags: ["NFC + QR", "UV baskı", "Pleksi", "Özel tasarım"],
      },
      {
        title: "Beyaz Mermer NFC Menü Standı",
        image: "/products/menu-stand-white.png",
        alt: "Beyaz mermer görünümlü NFC menü standı",
        text: "Açık tonlu ve şık restoran konseptleri için modern NFC menü standı. Markanıza özel tasarımla masanızın bir parçasına dönüşür.",
        tags: ["NFC + QR", "Mermer görünüm", "Özel baskı"],
      },
    ],
  },
  {
    id: "kartlar",
    eyebrow: "NFC menü kartları",
    title: "Telefonu yaklaştır,",
    em: "menü açılsın.",
    text: "Standart kredi kartı ölçüsünde, restoranınızın kimliğine göre özel tasarlanan NFC kartlar.",
    items: [
      {
        title: "Siyah NFC Menü Kartı",
        image: "/products/nfc-card-black.png",
        alt: "Masa numaralı siyah NFC ve QR menü kartı",
        text: "Kredi kartı boyutunda, restoranınıza özel tasarlanan NFC kart. Müşteri telefonunu karta yaklaştırır, dijital menü açılır.",
        tags: ["NFC + QR", "PVC", "Özel baskı", "85,6 × 54 mm"],
      },
      {
        title: "Beyaz NFC Menü Kartı",
        image: "/products/nfc-card-white.png",
        alt: "Beyaz NFC menü kartı",
        text: "Minimal ve temiz görünüm isteyen markalar için beyaz NFC kart. Kurumsal kimliğinize göre özel tasarlanabilir.",
        tags: ["NFC + QR", "PVC", "Çift yüz", "85,6 × 54 mm"],
      },
    ],
  },
  {
    id: "plakalar",
    eyebrow: "QR menü plakaları",
    title: "Masada şıklık,",
    em: "telefonda menü.",
    text: "Gold metal QR menü plakası ile dijital menünüzü masanın üzerinde premium ve dikkat çekici bir şekilde sunun.",
    items: [
      {
        title: "Gold Metal QR Menü Plakası",
        image: "/products/gold-metal-qr-menu-plaque.png",
        alt: "Restoran masası için gold metal QR menü plakası",
        text: "Restoran ve kafelerin masalarında şık bir şekilde konumlandırılan gold metal QR menü plakası. Müşteriler QR kodu telefonlarıyla okutarak dijital menünüze hızlıca ulaşır.",
        tags: ["QR menü", "Gold metal", "Özel tasarım"],
      },
    ],
  },
];

const STEPS = [
  { title: "Ürünü masanıza koyun", text: "Stand, kart ya da plaka; logonuz ve masa numaranızla hazırlanır." },
  { title: "Müşteri telefonunu yaklaştırır", text: "NFC'ye dokunur ya da QR kodu okutur; uygulama gerekmez." },
  { title: "Dijital menü anında açılır", text: "O masaya ait menü, müşterinin telefonunda saniyeler içinde açılır." },
  { title: "Sipariş ve diğer işlemler devam eder", text: "Paketinize göre sipariş, garson çağırma ve ödeme aynı ekrandan." },
];

const HIGHLIGHTS = ["NFC ve QR bir arada", "Markanıza özel tasarım", "UV baskı", "Masa numaralı"];

function ProductCard({ product }: { product: Product }) {
  return (
    <article className={`${home.product} ${styles.card}`}>
      <span className={home.productImage}>
        <Image src={product.image} alt={product.alt} fill sizes="(max-width: 760px) 90vw, 560px" />
      </span>
      <div className={styles.body}>
        <h3>{product.title}</h3>
        <p>{product.text}</p>
        <ul className={styles.tags}>
          {product.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
        <div className={styles.actions}>
          <ContactLink topic="urun" message={`${product.title} için teklif almak istiyorum.`} className={home.btnPrimary}>
            Teklif al
            <SiteIcon name="arrow" className={home.btnIcon} />
          </ContactLink>
          <a
            href={whatsappUrl(`Merhaba, ${product.title} için teklif almak istiyorum.`)}
            className={styles.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp&apos;tan sor
          </a>
        </div>
      </div>
    </article>
  );
}

export default function ProductsPage() {
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
              <li aria-current="page">Ürünler</li>
            </ol>
          </nav>
          <span className={home.eyebrow}>Masa ürünleri</span>
          <h1 className={seo.h1}>
            Masada görünen <em>dijital deneyim.</em>
          </h1>
          <p className={seo.intro}>
            Markanıza özel NFC menü standları, NFC menü kartları ve QR menü plakalarıyla müşterilerinizi tek
            dokunuşta dijital menünüze ulaştırın. Tasarım, baskı ve dijital sistem tek çatı altında. Fiyatlar masa
            sayınıza ve tasarıma göre teklif üzerine belirlenir.
          </p>
          <ul className={home.trust}>
            {HIGHLIGHTS.map((item) => (
              <li key={item}>
                <SiteIcon name="check" className={home.trustIcon} />
                {item}
              </li>
            ))}
          </ul>
          <div className={seo.heroActions}>
            <ContactLink topic="urun" message="Masa ürünleri için teklif almak istiyorum." className={home.btnPrimary}>
              Teklif alın
              <SiteIcon name="arrow" className={home.btnIcon} />
            </ContactLink>
            <a
              href={whatsappUrl("Merhaba, OZT Digital masa ürünleri (NFC stand, kart, plaka) hakkında bilgi almak istiyorum.")}
              className={home.btnSecondary}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp&apos;tan yazın
            </a>
          </div>
        </div>
      </section>

      {GROUPS.map((group) => (
        <section key={group.id} id={group.id} className={home.section}>
          <div className={home.heading}>
            <span className={home.eyebrow}>{group.eyebrow}</span>
            <h2>
              {group.title} <em>{group.em}</em>
            </h2>
            <p>{group.text}</p>
          </div>
          <div className={styles.grid}>
            {group.items.map((product) => (
              <ProductCard key={product.title} product={product} />
            ))}
          </div>
        </section>
      ))}

      <section className={home.dark}>
        <div className={styles.flow}>
          <div className={`${home.heading} ${home.headingDark}`}>
            <span className={home.eyebrow}>Nasıl çalışır</span>
            <h2>
              Fiziksel ürün, <em>dijital sistem.</em>
            </h2>
            <p className={styles.darkText}>
              Masadaki ürün, restoranınızın dijital menüsüne açılan kapıdır. Menü, sipariş ve diğer işlemler aynı
              sistem üzerinden devam eder.
            </p>
          </div>
          <ol className={home.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className={home.stepNo}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={home.ctaWrap}>
        <div className={home.cta}>
          <span className={home.eyebrow}>Restoranınıza özel</span>
          <h2>
            Masa ürünlerinizi <em>birlikte tasarlayalım.</em>
          </h2>
          <p>Masa sayınızı ve tarzınızı yazın; size uygun ürünleri ve fiyat teklifini aynı gün iletelim.</p>
          <div className={home.ctaActions}>
            <ContactLink topic="urun" message="Masa ürünleri için teklif almak istiyorum." className={home.btnGold}>
              Bize ulaşın
              <SiteIcon name="arrow" className={home.btnIcon} />
            </ContactLink>
            <a href={whatsappUrl()} className={home.btnGhost} target="_blank" rel="noopener noreferrer">
              WhatsApp&apos;tan yazın
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
