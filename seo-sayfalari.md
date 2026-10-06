# OZT Digital – SEO Açılış Sayfaları

Bu dosya üç yeni sayfanın metnini ve teknik gereksinimlerini içerir:

| Sayfa | Adres | Hedef aramalar |
|---|---|---|
| QR Menü | `/qr-menu` | qr menü, qr kod menü, restoran qr menü, qr menü sistemi |
| NFC Menü | `/nfc-menu` | nfc menü, nfc menü standı, nfc masa kartı, temassız menü |
| Dijital Menü | `/dijital-menu` | dijital menü, restoran dijital menü, kafe dijital menü, online menü |

---

## Teknik gereksinimler (Claude Code için)

1. Next.js App Router ile üç ayrı sayfa oluştur: `app/qr-menu/page.tsx`, `app/nfc-menu/page.tsx`, `app/dijital-menu/page.tsx`.
2. Tasarım ana sayfayla aynı dilde olsun (aynı renkler, fontlar, buton stilleri, header ve footer). Ana sayfadaki mevcut bileşenleri ve ürün görsellerini yeniden kullan.
3. İçerik sunucu tarafında render edilsin (Google metni HTML'de görmeli). "Yükleniyor" ekranı bu sayfalarda içeriği gizlememeli.
4. Her sayfada tek bir `<h1>` olsun; başlık hiyerarşisi bu dosyadaki gibi (H1 → H2 → H3).
5. Her sayfa için `generateMetadata` / `metadata` ile:
   - aşağıdaki **title** ve **description**
   - `alternates.canonical`: `https://www.oztdigital.com.tr/<slug>`
   - Open Graph ve Twitter etiketleri (title, description, url, mevcut paylaşım görseli)
6. Her sayfaya JSON-LD ekle:
   - `FAQPage` (sayfadaki SSS soruları ve cevapları birebir)
   - `BreadcrumbList` (Ana Sayfa → Sayfa adı)
7. `sitemap.ts` dosyasına üç sayfayı `priority: 0.8`, `changeFrequency: "monthly"` ile ekle.
8. İç linkler:
   - Footer'a "QR Menü", "NFC Menü", "Dijital Menü" linklerini ekle (tüm sayfalarda görünsün).
   - Ana sayfadaki "QR & NFC Menü" özellik kartının altına "QR menü hakkında" ve "NFC menü hakkında" linkleri ekle.
   - Bu dosyada `[metin](/adres)` şeklinde yazılan linkleri sayfalarda gerçek link yap.
9. Görsellerde açıklayıcı Türkçe `alt` metni kullan.
10. Build al, üç sayfanın `<title>`, canonical ve JSON-LD çıktısını göster, sonra commit edip main'e push et.

---
---

# SAYFA 1: QR Menü — `/qr-menu`

**Title:** QR Menü Sistemi – Restoran ve Kafeler için QR Kod Menü | OZT Digital
**Description:** Restoran ve kafeniz için QR menü: müşteri kodu okutur, menünüz saniyeler içinde açılır. Uygulama gerekmez, fiyatları panelden anında güncelleyin.
**Breadcrumb adı:** QR Menü

## H1: Restoran ve Kafeler için QR Menü Sistemi

Müşteriniz masadaki QR kodu telefonunun kamerasıyla okutur, menünüz saniyeler içinde ekranında açılır. Uygulama indirmek, kayıt olmak ya da beklemek yok. OZT Digital QR menü ile basılı menü maliyetinden kurtulur, fiyat ve ürünlerinizi tek tıkla güncellersiniz.

**[Demoyu İncele](/demo)** · **[Masa Ürünlerini Gör](/urunler)**

## H2: QR menü nedir?

QR menü, restoran ve kafelerin menüsünü dijital bir sayfa olarak sunduğu, masaya yerleştirilen bir QR kod ile açılan menüdür. Müşteri telefonunun kamerasını koda tuttuğunda menü tarayıcıda açılır. Basılı menünün yerini alır ya da onu tamamlar.

OZT Digital'de her masa için ayrı bir QR kod oluşturulur. Böylece müşteri menüyü açtığında sistem hangi masada oturduğunu bilir; sipariş, garson çağırma ve hesap isteme gibi işlemler doğrudan o masaya bağlanır.

## H2: QR menü nasıl çalışır?

### H3: 1. Müşteri QR kodu okutur
Masadaki stant, kart ya da metal plaka üzerindeki QR kod telefon kamerasıyla okutulur. Ek bir uygulama gerekmez.

### H3: 2. Menü telefonda açılır
Kategoriler, ürün fotoğrafları, açıklamalar ve fiyatlar mobil uyumlu, hızlı bir sayfada görüntülenir.

### H3: 3. İsterseniz sipariş de alırsınız
Pro ve Premium paketlerde müşteri menüden ürün seçip siparişini masadan gönderebilir. Sipariş, masa numarasıyla birlikte yönetim panelinize düşer.

## H2: QR menünün işletmenize faydaları

- **Baskı maliyeti biter:** Fiyat değiştiğinde menü bastırmanız gerekmez. Panelden güncellediğiniz anda tüm masalarda yeni fiyat görünür.
- **Her zaman güncel menü:** Biten ürünü gizleyin, yeni ürün ekleyin, kampanya etiketi koyun. Değişiklikler anında yayında.
- **Fotoğraflı ve açıklamalı ürünler:** Müşteri ne sipariş edeceğini görerek seçer.
- **Çok dilli menü:** Yabancı misafirleriniz menüyü kendi dilinde görüntüleyebilir (Pro ve üzeri).
- **Menü istatistikleri:** Hangi ürünlerin daha çok ilgi gördüğünü panelden takip edin.
- **Google yorumlarına yönlendirme:** Memnun müşterileri işletmenizin Google sayfasına yönlendirin.

## H2: Masaya özel QR kod ürünleri

QR kodunuz, işletmenizin logosu ve masa numarasıyla özelleştirilmiş şık ürünlerle masanıza gelir:

- **Premium NFC Menü Standı:** Hem QR kod hem NFC içerir, masada dik durur.
- **NFC Menü Kartı:** Masa numaralı, QR ve NFC bir arada.
- **Gold Metal QR Menü Plağı:** Dayanıklı, şık metal plaka.

**[Tüm ürünleri incele](/urunler)**

Telefonunu dokundurarak menü açmak isteyen müşterileriniz için QR kodun yanında NFC de kullanabilirsiniz. Ayrıntılar için [NFC menü](/nfc-menu) sayfamıza göz atın.

## H2: Hangi paket size uygun?

- **Başlangıç:** Sadece şık bir QR dijital menü isteyen, sipariş almayan kafe ve restoranlar için.
- **Pro:** Masaya özel QR ve NFC, masadan sipariş, garson çağırma, hesap isteme ve satış raporları.
- **Premium:** Masadan kartla ödeme, garson ve mutfak ekranları ve yapay zekâ özellikleri ile tam restoran sistemi.

**[Paketleri ve demoyu incele](/demo)**

## H2: Sıkça sorulan sorular

**Müşterilerin QR menü için uygulama indirmesi gerekir mi?**
Hayır. Telefonun kamerasıyla QR kodu okutmak yeterlidir; menü tarayıcıda açılır.

**QR menüdeki fiyatları kendim değiştirebilir miyim?**
Evet. Ürün, fiyat, kategori ve kampanyaları yönetim panelinden dilediğiniz zaman düzenleyebilirsiniz. Değişiklik anında tüm masalara yansır.

**Her masa için ayrı QR kod mu olur?**
Evet. Pro ve Premium paketlerde her masanın kendine ait QR kodu vardır; siparişler ve garson çağrıları hangi masadan geldiğiyle birlikte panele düşer.

**QR menü eski telefonlarda çalışır mı?**
Günümüzde kullanılan akıllı telefonların büyük çoğunluğu QR kodu doğrudan kamera uygulamasıyla okuyabilir. Menü sayfası hafif ve mobil uyumlu olduğu için eski cihazlarda da açılır.

**QR menü ile NFC menü arasındaki fark nedir?**
QR menüde müşteri kodu kamerayla okutur; NFC menüde ise telefonunu etikete yaklaştırması yeterlidir. OZT Digital ürünlerinde ikisi bir arada bulunur. [NFC menü hakkında daha fazla bilgi](/nfc-menu)

## CTA bölümü

### H2: Menünüzü bugün dijitale taşıyın
QR menünüzü inceleyin, işletmenize nasıl görüneceğini görün.
**[Demoyu İncele](/demo)** · **[Ürünleri Gör](/urunler)**

---
---

# SAYFA 2: NFC Menü — `/nfc-menu`

**Title:** NFC Menü – Dokun, Menü Açılsın | NFC Menü Standı ve Kartı | OZT Digital
**Description:** NFC menü ile müşteriniz telefonunu masaya yaklaştırır, menü anında açılır. QR kod da içeren NFC menü standı ve kartları, logonuz ve masa numaranızla.
**Breadcrumb adı:** NFC Menü

## H1: NFC Menü: Telefonu Yaklaştır, Menü Açılsın

NFC menü, restoran ve kafeler için en hızlı menü deneyimidir. Müşteriniz telefonunu masadaki stanta ya da karta yaklaştırır, menünüz tek dokunuşla açılır. Kamera açmak, kod hizalamak yok. OZT Digital NFC menü ürünleri aynı zamanda QR kod da içerir; böylece her müşteri menüye ulaşabilir.

**[NFC Ürünlerini İncele](/urunler)** · **[Demoyu İncele](/demo)**

## H2: NFC menü nedir?

NFC (Near Field Communication / Yakın Alan İletişimi), telefonların birkaç santimetre mesafedeki bir etiketle veri alışverişi yapmasını sağlayan teknolojidir. Temassız kartla ödeme yaparken kullandığınız teknolojiyle aynıdır.

NFC menüde masadaki stant ya da kartın içinde küçük bir NFC etiketi bulunur. Müşteri telefonunu etikete yaklaştırdığında, o masaya ait dijital menü telefonda otomatik olarak açılır.

## H2: NFC menü nasıl çalışır?

### H3: 1. Telefonu yaklaştırın
Müşteri, NFC destekli telefonunu masadaki stant ya da karta yaklaştırır.

### H3: 2. Menü anında açılır
Telefonda bir bildirim çıkar; dokunulduğunda o masanın menüsü tarayıcıda açılır. Uygulama gerekmez.

### H3: 3. Sipariş, garson, hesap
Pro ve Premium paketlerde müşteri aynı ekrandan sipariş verebilir, garson çağırabilir ya da hesap isteyebilir.

## H2: NFC menü mü, QR menü mü?

| | NFC menü | QR menü |
|---|---|---|
| Nasıl açılır? | Telefonu etikete yaklaştırarak | Kamerayla kodu okutarak |
| Hız | Tek dokunuş | Kamera açma ve hizalama gerekir |
| Telefon uyumu | NFC destekli telefonlar | Kameralı tüm akıllı telefonlar |
| Uygulama gerekir mi? | Hayır | Hayır |

İkisinden birini seçmek zorunda değilsiniz: **OZT Digital ürünlerinde NFC ve QR bir arada bulunur.** NFC'si olmayan ya da kapalı olan telefonlar aynı üründeki QR kodu okutarak menüye ulaşır. [QR menü hakkında daha fazla bilgi](/qr-menu)

## H2: NFC menü ürünleri

Her ürün işletmenizin logosu, adı ve masa numarasıyla özelleştirilir ve dijital menü sistemiyle birlikte teslim edilir.

### H3: Premium NFC Menü Standı
Masada dik duran, şık siyah stant. NFC etiketi ve QR kod bir arada.

### H3: NFC Menü Kartı
Masa numaralı, kompakt kart. Dokunarak ya da okutarak menüye ulaşım.

### H3: Gold Metal QR Menü Plağı
Dayanıklı, lüks görünümlü metal plaka.

**[Tüm ürünleri ve detayları gör](/urunler)**

## H2: NFC menünün işletmenize faydaları

- **Daha hızlı deneyim:** Müşteri saniyeler içinde menüde olur; kod hizalama derdi yok.
- **Modern ve şık görünüm:** Masanızdaki ürün, işletmenizin kalitesini yansıtır.
- **Masaya özel bağlantı:** Her etiket kendi masasına bağlıdır; siparişler ve garson çağrıları doğru masadan gelir.
- **Hijyenik:** Elden ele dolaşan basılı menü yerine her müşteri kendi telefonunu kullanır.
- **Her zaman güncel:** Menü dijital olduğu için fiyat ve ürün değişikliği için etiketi değiştirmeniz gerekmez.

## H2: Sıkça sorulan sorular

**NFC menü her telefonda çalışır mı?**
NFC destekli telefonlarda etikete yaklaştırmak yeterlidir. NFC'si olmayan telefonlar için aynı üründe QR kod da bulunur, bu yüzden her müşteri menüye ulaşabilir.

**iPhone'larda NFC menü çalışır mı?**
NFC destekli güncel iPhone modelleri NFC etiketlerini okuyabilir. Bazı modellerde etiketin telefonun üst kısmına yaklaştırılması gerekir. Okumayan durumlarda QR kod kullanılabilir.

**NFC menü için uygulama gerekir mi?**
Hayır. Telefon etiketi okuduğunda menü doğrudan tarayıcıda açılır.

**Menümü değiştirirsem NFC etiketini de değiştirmem gerekir mi?**
Hayır. Etiket sizin dijital menünüze yönlendirir. Menüdeki ürün ve fiyatları panelden güncellediğinizde etiket aynı kalır.

**NFC menü ürünleri işletmeme özel mi hazırlanıyor?**
Evet. Stant, kart ve plakalar işletmenizin logosu, adı ve masa numarasıyla özelleştirilir.

## CTA bölümü

### H2: Masalarınıza NFC menü getirin
Ürünleri inceleyin, menünüzün telefonda nasıl görüneceğini demoda görün.
**[Ürünleri İncele](/urunler)** · **[Demoyu İncele](/demo)**

---
---

# SAYFA 3: Dijital Menü — `/dijital-menu`

**Title:** Dijital Menü – Restoran ve Kafeler için Dijital Menü Sistemi | OZT Digital
**Description:** Restoran ve kafeniz için dijital menü: QR ve NFC ile açılan, çok dilli, fotoğraflı menü. Masadan sipariş, garson çağırma ve yönetim paneli tek sistemde.
**Breadcrumb adı:** Dijital Menü

## H1: Restoran ve Kafeler için Dijital Menü Sistemi

Dijital menü, basılı menünüzün telefonda açılan, her zaman güncel ve fotoğraflı halidir. OZT Digital ile menünüzü QR kod ya da NFC ile müşterilerinize sunar; ister yalnızca menü gösterin, ister masadan sipariş, garson çağırma ve ödemeyi de aynı sistemden yönetin.

**[Demoyu İncele](/demo)** · **[Ürünleri İncele](/urunler)**

## H2: Dijital menü nedir?

Dijital menü, restoran ve kafelerin ürünlerini, fiyatlarını ve açıklamalarını internet üzerinden, müşterinin kendi telefonunda gösterdiği menüdür. Müşteri menüye masadaki [QR kodu](/qr-menu) okutarak ya da [NFC etiketine](/nfc-menu) dokunarak ulaşır. Menü bir uygulama değil, tarayıcıda açılan bir sayfadır; müşteri hiçbir şey indirmez.

## H2: Basılı menü ile dijital menü karşılaştırması

| | Basılı menü | Dijital menü |
|---|---|---|
| Fiyat güncelleme | Yeniden baskı gerekir | Panelden anında |
| Ürün fotoğrafı | Sınırlı | Her ürün için |
| Yabancı dil | Ayrı baskı | Çok dilli menü |
| Biten ürün | Menüde kalır | Tek tıkla gizlenir |
| Kampanya | Ek baskı / masa kartı | İndirim ve kampanya etiketi |
| Hijyen | Elden ele dolaşır | Her müşteri kendi telefonu |

## H2: OZT Digital dijital menü özellikleri

### H3: Menü yönetimi
Ürün, kategori, fiyat ve fotoğrafları panelden yönetin. 8 hazır tema arasından işletmenize uygun olanı seçin.

### H3: Masadan sipariş ve sipariş takibi
Müşteri menüden seçer, siparişini gönderir; sipariş masa numarasıyla panelinize düşer. Müşteri siparişinin durumunu telefonundan takip eder.

### H3: Garson çağırma ve hesap isteme
Tek dokunuşla garson çağrısı ve hesap talebi. Ekibiniz talepleri panelden anında görür.

### H3: Masadan ödeme
Premium pakette müşteri hesabını masadan kartla öder, hesabı bölüşebilir ve bahşiş bırakabilir.

### H3: Çok dilli menü ve otomatik çeviri
Menünüz yabancı misafirleriniz için farklı dillerde görüntülenir; yapay zekâ ile otomatik çeviri yapılabilir.

### H3: Yapay zekâ ile menü aktarma
Mevcut menünüzün fotoğrafını ya da PDF'ini yükleyin, ürünler sisteme otomatik aktarılsın. Menüyü tek tek girmekle uğraşmayın.

### H3: Menü açılış duyurusu ve kampanyalar
Müşteri menüyü açtığında görünen duyurularla kampanyalarınızı öne çıkarın.

### H3: Raporlar ve analiz
Satış raporları, ürün satış analizi ve menü istatistikleriyle neyin çalıştığını görün.

## H2: Dijital menüye geçiş nasıl olur?

1. **Paketinizi seçin:** Sadece menü için Başlangıç, sipariş için Pro, ödeme ve tam sistem için Premium.
2. **Menünüzü aktarın:** Ürünleri panelden girin ya da menünüzün fotoğrafını yükleyip yapay zekâ ile aktarın.
3. **Temanızı seçin:** İşletmenizin tarzına uygun temayı belirleyin.
4. **Masa ürünlerinizi alın:** Logonuz ve masa numaralarınızla hazırlanan QR/NFC stant, kart ya da plakalar masanıza yerleşir.
5. **Yayına alın:** Müşterileriniz ilk günden menüyü telefonlarından açar.

## H2: Kimler için uygun?

Restoranlar, kafeler, pastaneler, barlar, otel restoranları ve masa servisi yapan tüm işletmeler için. Tek masalı küçük bir kafeden çok salonlu restorana kadar ölçeklenir.

## H2: Sıkça sorulan sorular

**Dijital menü için müşterinin uygulama indirmesi gerekir mi?**
Hayır. Menü telefonun tarayıcısında açılır; QR kodu okutmak veya NFC etiketine dokunmak yeterlidir.

**Dijital menüyü kendim güncelleyebilir miyim?**
Evet. Ürün, fiyat, kategori ve kampanyaları yönetim panelinden dilediğiniz zaman düzenleyebilirsiniz.

**Mevcut menümü tek tek girmem mi gerekiyor?**
Hayır. Premium pakette menünüzün fotoğrafını yükleyerek ürünleri yapay zekâ ile otomatik aktarabilirsiniz.

**Dijital menü yabancı dillerde gösterilebilir mi?**
Evet. Pro ve Premium paketlerde çok dilli menü bulunur; Premium'da otomatik çeviri de yapılabilir.

**Sadece menü istiyorum, sipariş almak istemiyorum. Uygun mu?**
Evet. Başlangıç paketi, sipariş almayan işletmeler için şık bir QR dijital menü sunar.

## CTA bölümü

### H2: Menünüzü dijitale taşıyın
Dijital menünüzün müşterilerinize nasıl görüneceğini demoda inceleyin.
**[Demoyu İncele](/demo)** · **[Ürünleri İncele](/urunler)**
