import SeoPage, { seoMetadata, type SeoContent } from "../seo/SeoPage";

// Metinler: seo-sayfalari.md → SAYFA 1 (birebir).
const content: SeoContent = {
  slug: "qr-menu",
  title: "QR Menü Sistemi – Restoran ve Kafeler için QR Kod Menü | OZT Digital",
  description:
    "Restoran ve kafeniz için QR menü: müşteri kodu okutur, menünüz saniyeler içinde açılır. Uygulama gerekmez, fiyatları panelden anında güncelleyin.",
  breadcrumb: "QR Menü",
  h1: "Restoran ve Kafeler için QR Menü Sistemi",
  intro:
    "Müşteriniz masadaki QR kodu telefonunun kamerasıyla okutur, menünüz saniyeler içinde ekranında açılır. Uygulama indirmek, kayıt olmak ya da beklemek yok. OZT Digital QR menü ile basılı menü maliyetinden kurtulur, fiyat ve ürünlerinizi tek tıkla güncellersiniz.",
  heroActions: [
    { label: "Demoyu İncele", href: "/demo" },
    { label: "Masa Ürünlerini Gör", href: "/urunler" },
  ],
  heroImage: {
    src: "/products/gold-metal-qr-menu-plaque.png",
    alt: "Restoran masası için gold metal QR menü plakası",
  },
  sections: [
    {
      h2: "QR menü nedir?",
      blocks: [
        {
          kind: "p",
          text: "QR menü, restoran ve kafelerin menüsünü dijital bir sayfa olarak sunduğu, masaya yerleştirilen bir QR kod ile açılan menüdür. Müşteri telefonunun kamerasını koda tuttuğunda menü tarayıcıda açılır. Basılı menünün yerini alır ya da onu tamamlar.",
        },
        {
          kind: "p",
          text: "OZT Digital'de her masa için ayrı bir QR kod oluşturulur. Böylece müşteri menüyü açtığında sistem hangi masada oturduğunu bilir; sipariş, garson çağırma ve hesap isteme gibi işlemler doğrudan o masaya bağlanır.",
        },
      ],
    },
    {
      h2: "QR menü nasıl çalışır?",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              h3: "1. Müşteri QR kodu okutur",
              text: "Masadaki stant, kart ya da metal plaka üzerindeki QR kod telefon kamerasıyla okutulur. Ek bir uygulama gerekmez.",
            },
            {
              h3: "2. Menü telefonda açılır",
              text: "Kategoriler, ürün fotoğrafları, açıklamalar ve fiyatlar mobil uyumlu, hızlı bir sayfada görüntülenir.",
            },
            {
              h3: "3. İsterseniz sipariş de alırsınız",
              text: "Pro ve Premium paketlerde müşteri menüden ürün seçip siparişini masadan gönderebilir. Sipariş, masa numarasıyla birlikte yönetim panelinize düşer.",
            },
          ],
        },
      ],
    },
    {
      h2: "QR menünün işletmenize faydaları",
      blocks: [
        {
          kind: "list",
          items: [
            "**Baskı maliyeti biter:** Fiyat değiştiğinde menü bastırmanız gerekmez. Panelden güncellediğiniz anda tüm masalarda yeni fiyat görünür.",
            "**Her zaman güncel menü:** Biten ürünü gizleyin, yeni ürün ekleyin, kampanya etiketi koyun. Değişiklikler anında yayında.",
            "**Fotoğraflı ve açıklamalı ürünler:** Müşteri ne sipariş edeceğini görerek seçer.",
            "**Çok dilli menü:** Yabancı misafirleriniz menüyü kendi dilinde görüntüleyebilir (Pro ve üzeri).",
            "**Menü istatistikleri:** Hangi ürünlerin daha çok ilgi gördüğünü panelden takip edin.",
            "**Google yorumlarına yönlendirme:** Memnun müşterileri işletmenizin Google sayfasına yönlendirin.",
          ],
        },
      ],
    },
    {
      h2: "Masaya özel QR kod ürünleri",
      blocks: [
        {
          kind: "p",
          text: "QR kodunuz, işletmenizin logosu ve masa numarasıyla özelleştirilmiş şık ürünlerle masanıza gelir:",
        },
        {
          kind: "products",
          headings: false,
          items: [
            {
              title: "Premium NFC Menü Standı:",
              text: "Hem QR kod hem NFC içerir, masada dik durur.",
              image: "/products/menu-stand-black.png",
              alt: "Masada dik duran siyah premium NFC ve QR menü standı",
            },
            {
              title: "NFC Menü Kartı:",
              text: "Masa numaralı, QR ve NFC bir arada.",
              image: "/products/nfc-card-black.png",
              alt: "Masa numaralı siyah NFC ve QR menü kartı",
            },
            {
              title: "Gold Metal QR Menü Plağı:",
              text: "Dayanıklı, şık metal plaka.",
              image: "/products/gold-metal-qr-menu-plaque.png",
              alt: "Gold renkli metal QR menü plakası",
            },
          ],
        },
        { kind: "link", text: "**[Tüm ürünleri incele](/urunler)**" },
        {
          kind: "p",
          text: "Telefonunu dokundurarak menü açmak isteyen müşterileriniz için QR kodun yanında NFC de kullanabilirsiniz. Ayrıntılar için [NFC menü](/nfc-menu) sayfamıza göz atın.",
        },
      ],
    },
    {
      h2: "Hangi paket size uygun?",
      blocks: [
        {
          kind: "list",
          items: [
            "**Başlangıç:** Sadece şık bir QR dijital menü isteyen, sipariş almayan kafe ve restoranlar için.",
            "**Pro:** Masaya özel QR ve NFC, masadan sipariş, garson çağırma, hesap isteme ve satış raporları.",
            "**Premium:** Masadan kartla ödeme, garson ve mutfak ekranları ve yapay zekâ özellikleri ile tam restoran sistemi.",
          ],
        },
        { kind: "link", text: "**[Paketleri ve demoyu incele](/demo)**" },
      ],
    },
  ],
  faq: [
    {
      q: "Müşterilerin QR menü için uygulama indirmesi gerekir mi?",
      a: "Hayır. Telefonun kamerasıyla QR kodu okutmak yeterlidir; menü tarayıcıda açılır.",
    },
    {
      q: "QR menüdeki fiyatları kendim değiştirebilir miyim?",
      a: "Evet. Ürün, fiyat, kategori ve kampanyaları yönetim panelinden dilediğiniz zaman düzenleyebilirsiniz. Değişiklik anında tüm masalara yansır.",
    },
    {
      q: "Her masa için ayrı QR kod mu olur?",
      a: "Evet. Pro ve Premium paketlerde her masanın kendine ait QR kodu vardır; siparişler ve garson çağrıları hangi masadan geldiğiyle birlikte panele düşer.",
    },
    {
      q: "QR menü eski telefonlarda çalışır mı?",
      a: "Günümüzde kullanılan akıllı telefonların büyük çoğunluğu QR kodu doğrudan kamera uygulamasıyla okuyabilir. Menü sayfası hafif ve mobil uyumlu olduğu için eski cihazlarda da açılır.",
    },
    {
      q: "QR menü ile NFC menü arasındaki fark nedir?",
      a: "QR menüde müşteri kodu kamerayla okutur; NFC menüde ise telefonunu etikete yaklaştırması yeterlidir. OZT Digital ürünlerinde ikisi bir arada bulunur. [NFC menü hakkında daha fazla bilgi](/nfc-menu)",
    },
  ],
  cta: {
    h2: "Menünüzü bugün dijitale taşıyın",
    text: "QR menünüzü inceleyin, işletmenize nasıl görüneceğini görün.",
    actions: [
      { label: "Demoyu İncele", href: "/demo" },
      { label: "Ürünleri Gör", href: "/urunler" },
    ],
  },
};

export const metadata = seoMetadata(content);

export default function QrMenuPage() {
  return <SeoPage content={content} />;
}
