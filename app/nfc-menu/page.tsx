import SeoPage, { seoMetadata, type SeoContent } from "../seo/SeoPage";

// Metinler: seo-sayfalari.md → SAYFA 2 (birebir).
const content: SeoContent = {
  slug: "nfc-menu",
  title: "NFC Menü – Dokun, Menü Açılsın | NFC Menü Standı ve Kartı | OZT Digital",
  description:
    "NFC menü ile müşteriniz telefonunu masaya yaklaştırır, menü anında açılır. QR kod da içeren NFC menü standı ve kartları, logonuz ve masa numaranızla.",
  breadcrumb: "NFC Menü",
  h1: "NFC Menü: Telefonu Yaklaştır, Menü Açılsın",
  intro:
    "NFC menü, restoran ve kafeler için en hızlı menü deneyimidir. Müşteriniz telefonunu masadaki stanta ya da karta yaklaştırır, menünüz tek dokunuşla açılır. Kamera açmak, kod hizalamak yok. OZT Digital NFC menü ürünleri aynı zamanda QR kod da içerir; böylece her müşteri menüye ulaşabilir.",
  heroActions: [
    { label: "NFC Ürünlerini İncele", href: "/urunler" },
    { label: "Demoyu İncele", href: "/demo" },
  ],
  heroImage: {
    src: "/products/nfc-card-black.png",
    alt: "Telefonla dokunarak menü açılan masa numaralı siyah NFC menü kartı",
  },
  sections: [
    {
      h2: "NFC menü nedir?",
      blocks: [
        {
          kind: "p",
          text: "NFC (Near Field Communication / Yakın Alan İletişimi), telefonların birkaç santimetre mesafedeki bir etiketle veri alışverişi yapmasını sağlayan teknolojidir. Temassız kartla ödeme yaparken kullandığınız teknolojiyle aynıdır.",
        },
        {
          kind: "p",
          text: "NFC menüde masadaki stant ya da kartın içinde küçük bir NFC etiketi bulunur. Müşteri telefonunu etikete yaklaştırdığında, o masaya ait dijital menü telefonda otomatik olarak açılır.",
        },
      ],
    },
    {
      h2: "NFC menü nasıl çalışır?",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              h3: "1. Telefonu yaklaştırın",
              text: "Müşteri, NFC destekli telefonunu masadaki stant ya da karta yaklaştırır.",
            },
            {
              h3: "2. Menü anında açılır",
              text: "Telefonda bir bildirim çıkar; dokunulduğunda o masanın menüsü tarayıcıda açılır. Uygulama gerekmez.",
            },
            {
              h3: "3. Sipariş, garson, hesap",
              text: "Pro ve Premium paketlerde müşteri aynı ekrandan sipariş verebilir, garson çağırabilir ya da hesap isteyebilir.",
            },
          ],
        },
      ],
    },
    {
      h2: "NFC menü mü, QR menü mü?",
      blocks: [
        {
          kind: "table",
          head: ["", "NFC menü", "QR menü"],
          rows: [
            ["Nasıl açılır?", "Telefonu etikete yaklaştırarak", "Kamerayla kodu okutarak"],
            ["Hız", "Tek dokunuş", "Kamera açma ve hizalama gerekir"],
            ["Telefon uyumu", "NFC destekli telefonlar", "Kameralı tüm akıllı telefonlar"],
            ["Uygulama gerekir mi?", "Hayır", "Hayır"],
          ],
        },
        {
          kind: "p",
          text: "İkisinden birini seçmek zorunda değilsiniz: **OZT Digital ürünlerinde NFC ve QR bir arada bulunur.** NFC'si olmayan ya da kapalı olan telefonlar aynı üründeki QR kodu okutarak menüye ulaşır. [QR menü hakkında daha fazla bilgi](/qr-menu)",
        },
      ],
    },
    {
      h2: "NFC menü ürünleri",
      blocks: [
        {
          kind: "p",
          text: "Her ürün işletmenizin logosu, adı ve masa numarasıyla özelleştirilir ve dijital menü sistemiyle birlikte teslim edilir.",
        },
        {
          kind: "products",
          headings: true,
          items: [
            {
              title: "Premium NFC Menü Standı",
              text: "Masada dik duran, şık siyah stant. NFC etiketi ve QR kod bir arada.",
              image: "/products/menu-stand-black.png",
              alt: "Masada dik duran siyah premium NFC menü standı",
            },
            {
              title: "NFC Menü Kartı",
              text: "Masa numaralı, kompakt kart. Dokunarak ya da okutarak menüye ulaşım.",
              image: "/products/nfc-card-black.png",
              alt: "Masa numaralı kompakt siyah NFC menü kartı",
            },
            {
              title: "Gold Metal QR Menü Plağı",
              text: "Dayanıklı, lüks görünümlü metal plaka.",
              image: "/products/gold-metal-qr-menu-plaque.png",
              alt: "Lüks görünümlü gold metal QR menü plakası",
            },
          ],
        },
        { kind: "link", text: "**[Tüm ürünleri ve detayları gör](/urunler)**" },
      ],
    },
    {
      h2: "NFC menünün işletmenize faydaları",
      blocks: [
        {
          kind: "list",
          items: [
            "**Daha hızlı deneyim:** Müşteri saniyeler içinde menüde olur; kod hizalama derdi yok.",
            "**Modern ve şık görünüm:** Masanızdaki ürün, işletmenizin kalitesini yansıtır.",
            "**Masaya özel bağlantı:** Her etiket kendi masasına bağlıdır; siparişler ve garson çağrıları doğru masadan gelir.",
            "**Hijyenik:** Elden ele dolaşan basılı menü yerine her müşteri kendi telefonunu kullanır.",
            "**Her zaman güncel:** Menü dijital olduğu için fiyat ve ürün değişikliği için etiketi değiştirmeniz gerekmez.",
          ],
        },
      ],
    },
  ],
  faq: [
    {
      q: "NFC menü her telefonda çalışır mı?",
      a: "NFC destekli telefonlarda etikete yaklaştırmak yeterlidir. NFC'si olmayan telefonlar için aynı üründe QR kod da bulunur, bu yüzden her müşteri menüye ulaşabilir.",
    },
    {
      q: "iPhone'larda NFC menü çalışır mı?",
      a: "NFC destekli güncel iPhone modelleri NFC etiketlerini okuyabilir. Bazı modellerde etiketin telefonun üst kısmına yaklaştırılması gerekir. Okumayan durumlarda QR kod kullanılabilir.",
    },
    {
      q: "NFC menü için uygulama gerekir mi?",
      a: "Hayır. Telefon etiketi okuduğunda menü doğrudan tarayıcıda açılır.",
    },
    {
      q: "Menümü değiştirirsem NFC etiketini de değiştirmem gerekir mi?",
      a: "Hayır. Etiket sizin dijital menünüze yönlendirir. Menüdeki ürün ve fiyatları panelden güncellediğinizde etiket aynı kalır.",
    },
    {
      q: "NFC menü ürünleri işletmeme özel mi hazırlanıyor?",
      a: "Evet. Stant, kart ve plakalar işletmenizin logosu, adı ve masa numarasıyla özelleştirilir.",
    },
  ],
  cta: {
    h2: "Masalarınıza NFC menü getirin",
    text: "Ürünleri inceleyin, menünüzün telefonda nasıl görüneceğini demoda görün.",
    actions: [
      { label: "Ürünleri İncele", href: "/urunler" },
      { label: "Demoyu İncele", href: "/demo" },
    ],
  },
};

export const metadata = seoMetadata(content);

export default function NfcMenuPage() {
  return <SeoPage content={content} />;
}
