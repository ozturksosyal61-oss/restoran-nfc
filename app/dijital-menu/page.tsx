import SeoPage, { seoMetadata, type SeoContent } from "../seo/SeoPage";

// Metinler: seo-sayfalari.md → SAYFA 3 (birebir).
const content: SeoContent = {
  slug: "dijital-menu",
  title: "Dijital Menü – Restoran ve Kafeler için Dijital Menü Sistemi | OZT Digital",
  description:
    "Restoran ve kafeniz için dijital menü: QR ve NFC ile açılan, çok dilli, fotoğraflı menü. Masadan sipariş, garson çağırma ve yönetim paneli tek sistemde.",
  breadcrumb: "Dijital Menü",
  h1: "Restoran ve Kafeler için Dijital Menü Sistemi",
  intro:
    "Dijital menü, basılı menünüzün telefonda açılan, her zaman güncel ve fotoğraflı halidir. OZT Digital ile menünüzü QR kod ya da NFC ile müşterilerinize sunar; ister yalnızca menü gösterin, ister masadan sipariş, garson çağırma ve ödemeyi de aynı sistemden yönetin.",
  heroActions: [
    { label: "Demoyu İncele", href: "/demo" },
    { label: "Ürünleri İncele", href: "/urunler" },
  ],
  heroImage: {
    src: "/products/menu-stand-black.png",
    alt: "Restoran masasında dijital menüye açılan siyah NFC ve QR menü standı",
  },
  sections: [
    {
      h2: "Dijital menü nedir?",
      blocks: [
        {
          kind: "p",
          text: "Dijital menü, restoran ve kafelerin ürünlerini, fiyatlarını ve açıklamalarını internet üzerinden, müşterinin kendi telefonunda gösterdiği menüdür. Müşteri menüye masadaki [QR kodu](/qr-menu) okutarak ya da [NFC etiketine](/nfc-menu) dokunarak ulaşır. Menü bir uygulama değil, tarayıcıda açılan bir sayfadır; müşteri hiçbir şey indirmez.",
        },
      ],
    },
    {
      h2: "Basılı menü ile dijital menü karşılaştırması",
      blocks: [
        {
          kind: "table",
          head: ["", "Basılı menü", "Dijital menü"],
          rows: [
            ["Fiyat güncelleme", "Yeniden baskı gerekir", "Panelden anında"],
            ["Ürün fotoğrafı", "Sınırlı", "Her ürün için"],
            ["Yabancı dil", "Ayrı baskı", "Çok dilli menü"],
            ["Biten ürün", "Menüde kalır", "Tek tıkla gizlenir"],
            ["Kampanya", "Ek baskı / masa kartı", "İndirim ve kampanya etiketi"],
            ["Hijyen", "Elden ele dolaşır", "Her müşteri kendi telefonu"],
          ],
        },
      ],
    },
    {
      h2: "OZT Digital dijital menü özellikleri",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              h3: "Menü yönetimi",
              text: "Ürün, kategori, fiyat ve fotoğrafları panelden yönetin. 8 hazır tema arasından işletmenize uygun olanı seçin.",
            },
            {
              h3: "Masadan sipariş ve sipariş takibi",
              text: "Müşteri menüden seçer, siparişini gönderir; sipariş masa numarasıyla panelinize düşer. Müşteri siparişinin durumunu telefonundan takip eder.",
            },
            {
              h3: "Garson çağırma ve hesap isteme",
              text: "Tek dokunuşla garson çağrısı ve hesap talebi. Ekibiniz talepleri panelden anında görür.",
            },
            {
              h3: "Masadan ödeme",
              text: "Premium pakette müşteri hesabını masadan kartla öder, hesabı bölüşebilir ve bahşiş bırakabilir.",
            },
            {
              h3: "Çok dilli menü ve otomatik çeviri",
              text: "Menünüz yabancı misafirleriniz için farklı dillerde görüntülenir; yapay zekâ ile otomatik çeviri yapılabilir.",
            },
            {
              h3: "Yapay zekâ ile menü aktarma",
              text: "Mevcut menünüzün fotoğrafını ya da PDF'ini yükleyin, ürünler sisteme otomatik aktarılsın. Menüyü tek tek girmekle uğraşmayın.",
            },
            {
              h3: "Menü açılış duyurusu ve kampanyalar",
              text: "Müşteri menüyü açtığında görünen duyurularla kampanyalarınızı öne çıkarın.",
            },
            {
              h3: "Raporlar ve analiz",
              text: "Satış raporları, ürün satış analizi ve menü istatistikleriyle neyin çalıştığını görün.",
            },
          ],
        },
      ],
    },
    {
      h2: "Dijital menüye geçiş nasıl olur?",
      blocks: [
        {
          kind: "ordered",
          items: [
            "**Paketinizi seçin:** Sadece menü için Başlangıç, sipariş için Pro, ödeme ve tam sistem için Premium.",
            "**Menünüzü aktarın:** Ürünleri panelden girin ya da menünüzün fotoğrafını yükleyip yapay zekâ ile aktarın.",
            "**Temanızı seçin:** İşletmenizin tarzına uygun temayı belirleyin.",
            "**Masa ürünlerinizi alın:** Logonuz ve masa numaralarınızla hazırlanan QR/NFC stant, kart ya da plakalar masanıza yerleşir.",
            "**Yayına alın:** Müşterileriniz ilk günden menüyü telefonlarından açar.",
          ],
        },
      ],
    },
    {
      h2: "Kimler için uygun?",
      blocks: [
        {
          kind: "p",
          text: "Restoranlar, kafeler, pastaneler, barlar, otel restoranları ve masa servisi yapan tüm işletmeler için. Tek masalı küçük bir kafeden çok salonlu restorana kadar ölçeklenir.",
        },
      ],
    },
  ],
  faq: [
    {
      q: "Dijital menü için müşterinin uygulama indirmesi gerekir mi?",
      a: "Hayır. Menü telefonun tarayıcısında açılır; QR kodu okutmak veya NFC etiketine dokunmak yeterlidir.",
    },
    {
      q: "Dijital menüyü kendim güncelleyebilir miyim?",
      a: "Evet. Ürün, fiyat, kategori ve kampanyaları yönetim panelinden dilediğiniz zaman düzenleyebilirsiniz.",
    },
    {
      q: "Mevcut menümü tek tek girmem mi gerekiyor?",
      a: "Hayır. Premium pakette menünüzün fotoğrafını yükleyerek ürünleri yapay zekâ ile otomatik aktarabilirsiniz.",
    },
    {
      q: "Dijital menü yabancı dillerde gösterilebilir mi?",
      a: "Evet. Pro ve Premium paketlerde çok dilli menü bulunur; Premium'da otomatik çeviri de yapılabilir.",
    },
    {
      q: "Sadece menü istiyorum, sipariş almak istemiyorum. Uygun mu?",
      a: "Evet. Başlangıç paketi, sipariş almayan işletmeler için şık bir QR dijital menü sunar.",
    },
  ],
  cta: {
    h2: "Menünüzü dijitale taşıyın",
    text: "Dijital menünüzün müşterilerinize nasıl görüneceğini demoda inceleyin.",
    actions: [
      { label: "Demoyu İncele", href: "/demo" },
      { label: "Ürünleri İncele", href: "/urunler" },
    ],
  },
};

export const metadata = seoMetadata(content);

export default function DigitalMenuPage() {
  return <SeoPage content={content} />;
}
