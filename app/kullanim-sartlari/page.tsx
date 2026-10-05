import Link from "next/link";
import type { Metadata } from "next";
import LegalDocument, { CompanyCard } from "../LegalDocument";
import { COMPANY } from "../../lib/legal";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/kullanim-sartlari",
  title: "Kullanım Şartları",
  description:
    "OZT Digital dijital menü ve sipariş platformunun işletmeler için kullanım şartları.",
});

export default function TermsPage() {
  return (
    <LegalDocument
      path="/kullanim-sartlari"
      title="Kullanım Şartları"
      intro={
        <>
          <p>
            Bu şartlar, {COMPANY.brand} platformunu kullanan restoran, kafe ve benzeri işletmeler (&quot;İşletme&quot;)
            ile hizmet sağlayıcı {COMPANY.owner} (&quot;{COMPANY.brand}&quot;) arasındaki ilişkiyi düzenler. İşletme
            paneline girişte bu şartlar elektronik olarak onaylanır.
          </p>
          <CompanyCard />
        </>
      }
      sections={[
        {
          title: "Hizmetin kapsamı",
          body: (
            <>
              <p>
                {COMPANY.brand}; QR / NFC dijital menü, masadan sipariş, garson çağırma, sipariş takibi, raporlar,
                kampanyalar, çalışan ekranları, masadan online ödeme ve yapay zekâ destekli menü araçları gibi
                özellikler sunan bulut tabanlı bir yazılım hizmetidir.
              </p>
              <p>
                Hangi özelliklerin kullanılabileceği İşletme&apos;nin paketine (Başlangıç, Pro, Premium) göre belirlenir.
                Paket içerikleri tanıtım sitesinde ve panelde yayımlanır.
              </p>
            </>
          ),
        },
        {
          title: "Hesap ve güvenlik",
          body: (
            <ul>
              <li>İşletme hesapları {COMPANY.brand} tarafından açılır; giriş bilgileri İşletme yetkilisine iletilir.</li>
              <li>
                İşletme, panel şifresinin ve oluşturduğu çalışan (garson / mutfak) hesaplarının gizliliğinden
                sorumludur. Yetkisiz kullanım fark edilirse derhâl bildirilmelidir.
              </li>
              <li>Masa QR / NFC kodlarının yetkisiz kişilere dağıtılmaması İşletme&apos;nin sorumluluğundadır.</li>
            </ul>
          ),
        },
        {
          title: "İşletme'nin sorumlulukları",
          body: (
            <ul>
              <li>
                Menüde yer alan ürün adları, fiyatlar, içerikler, alerjen ve kalori bilgileri, kampanyalar ve görsellerin
                doğruluğu ve güncelliği İşletme&apos;nin sorumluluğundadır.
              </li>
              <li>
                Yapay zekâ ile oluşturulan içerikler (fotoğraftan aktarılan menü, çeviriler, kalori tahminleri) yayına
                alınmadan önce İşletme tarafından kontrol edilmelidir; bu içerikler tahmini niteliktedir.
              </li>
              <li>
                İşletme, kendi müşterilerinin kişisel verileri bakımından veri sorumlusudur ve KVKK kapsamındaki
                yükümlülükleri (aydınlatma, başvuruların yanıtlanması vb.) yerine getirir. Taraflar arasındaki veri
                işleme ilişkisi <Link href="/veri-isleme-sozlesmesi">Veri İşleme Sözleşmesi</Link> ile düzenlenir.
              </li>
              <li>
                İşletme, platformu hukuka aykırı, yanıltıcı veya üçüncü kişilerin haklarını (marka, telif vb.) ihlal eden
                içerik yayımlamak için kullanamaz.
              </li>
              <li>
                Sistemin güvenliğini tehlikeye atacak girişimlerde bulunulamaz; başka işletmelerin verilerine erişilmeye
                çalışılamaz, otomatik araçlarla aşırı yük oluşturulamaz.
              </li>
            </ul>
          ),
        },
        {
          title: "Masadan online ödeme",
          body: (
            <p>
              Masadan online ödeme, İşletme&apos;nin kendi adına açtığı ödeme kuruluşu (iyzico veya PayTR) hesabıyla
              çalışır. Tahsilat doğrudan İşletme&apos;nin hesabına yapılır; {COMPANY.brand} bu ödemelerin tarafı değildir
              ve tahsil edilen tutarlara erişmez. Müşteri iadeleri, itirazlar ve ödeme kuruluşu komisyonları İşletme ile
              ödeme kuruluşu arasındadır.
            </p>
          ),
        },
        {
          title: "Ücretler ve abonelik",
          body: (
            <p>
              Abonelik ücreti, ödeme dönemi, deneme süresi, otomatik yenileme, iptal ve iade koşulları{" "}
              <Link href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</Link> ve{" "}
              <Link href="/iptal-iade">İptal ve İade Koşulları</Link>&apos;nda düzenlenir. Ödemesi alınamayan aboneliklerde
              ek süre sonunda menü ve panel erişimi ödeme yapılana kadar durdurulur.
            </p>
          ),
        },
        {
          title: "Hizmetin sürekliliği",
          body: (
            <p>
              {COMPANY.brand} hizmetin kesintisiz ve hatasız çalışması için makul özeni gösterir; ancak bakım, güncelleme,
              altyapı sağlayıcılarından veya internet bağlantısından kaynaklanan kesintiler olabilir. Planlı bakımlar
              mümkün olduğunca yoğun olmayan saatlerde yapılır.
            </p>
          ),
        },
        {
          title: "Sorumluluğun sınırı",
          body: (
            <p>
              Kast veya ağır ihmal hâlleri saklı kalmak kaydıyla, {COMPANY.brand}&apos;in bu sözleşmeden doğan toplam
              sorumluluğu, zararın doğduğu tarihten önceki 12 ay içinde İşletme&apos;nin ödediği abonelik ücreti
              toplamıyla sınırlıdır. Kâr kaybı, ciro kaybı gibi dolaylı zararlardan sorumluluk kabul edilmez.
            </p>
          ),
        },
        {
          title: "Fikri mülkiyet",
          body: (
            <p>
              Platformun yazılımı, tasarımı ve markası {COMPANY.brand}&apos;e aittir; İşletme&apos;ye abonelik süresince
              kullanım hakkı tanınır. İşletme&apos;nin yüklediği menü, logo ve fotoğrafların hakları İşletme&apos;de kalır;
              İşletme bunların hizmet kapsamında gösterilmesine izin verir.
            </p>
          ),
        },
        {
          title: "Sözleşmenin sona ermesi",
          body: (
            <p>
              İşletme aboneliğini dilediği zaman iptal edebilir; iptal, ödenmiş dönemin sonunda geçerli olur. Şartlara
              aykırılık hâlinde {COMPANY.brand} hesabı askıya alabilir veya sözleşmeyi feshedebilir. Sözleşme sona
              erdiğinde İşletme talep ederse verileri kendisine iletilir; veriler en geç 90 gün içinde silinir (yasal
              saklama yükümlülüğü olan kayıtlar hariç).
            </p>
          ),
        },
        {
          title: "Değişiklikler",
          body: (
            <p>
              Bu şartlar güncellenebilir. Esaslı değişiklikler panel üzerinden duyurulur ve İşletme&apos;den yeniden onay
              istenir. Güncel sürüm her zaman bu sayfadadır.
            </p>
          ),
        },
        {
          title: "Uygulanacak hukuk ve yetki",
          body: (
            <p>
              Bu şartlar Türk hukukuna tabidir. Uyuşmazlıklarda İstanbul Anadolu Mahkemeleri ve İcra Daireleri
              yetkilidir.
            </p>
          ),
        },
      ]}
    />
  );
}
