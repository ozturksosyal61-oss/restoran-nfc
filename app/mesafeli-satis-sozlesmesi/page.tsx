import Link from "next/link";
import type { Metadata } from "next";
import LegalDocument, { CompanyCard } from "../LegalDocument";
import { COMPANY } from "../../lib/legal";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi",
  description: "OZT Digital Menu abonelik hizmeti için mesafeli satış sözleşmesi.",
};

export default function DistanceSalesPage() {
  return (
    <LegalDocument
      path="/mesafeli-satis-sozlesmesi"
      title="Mesafeli Satış Sözleşmesi"
      intro={
        <p>
          Bu sözleşme, aşağıda bilgileri yer alan Satıcı ile {COMPANY.brand} aboneliğini satın alan İşletme
          (&quot;Alıcı&quot;) arasında, elektronik ortamda kurulmuştur.
        </p>
      }
      sections={[
        {
          title: "Taraflar",
          body: (
            <>
              <p>
                <strong>Satıcı:</strong>
              </p>
              <CompanyCard />
              <p>
                <strong>Alıcı:</strong> Aboneliği başlatan işletme. Alıcı&apos;nın unvanı, iletişim ve fatura bilgileri
                işletme panelinde ve ödeme sırasında beyan ettiği bilgilerdir.
              </p>
            </>
          ),
        },
        {
          title: "Sözleşmenin konusu",
          body: (
            <p>
              Konu; Alıcı&apos;nın seçtiği pakete göre {COMPANY.brand} bulut tabanlı dijital menü ve sipariş yazılımının
              (&quot;Hizmet&quot;) abonelik süresince kullanımına ilişkin tarafların hak ve yükümlülükleridir. Hizmet
              fiziksel teslimat içermez; elektronik ortamda sunulur.
            </p>
          ),
        },
        {
          title: "Hizmet, fiyat ve ödeme",
          body: (
            <ul>
              <li>
                Paketlerin içeriği tanıtım sitesinde ve panelde, güncel fiyatlar ödeme ekranında gösterilir. Ödeme
                ekranında gösterilen tutar, Alıcı&apos;nın ödeyeceği toplam tutardır.
              </li>
              <li>
                Ödeme, lisanslı ödeme kuruluşu iyzico üzerinden kredi / banka kartıyla alınır. Kart bilgileri
                iyzico&apos;nun sayfasında girilir; Satıcı tarafından saklanmaz.
              </li>
              <li>
                Abonelik, Alıcı iptal edene kadar her dönem sonunda aynı kartla <strong>otomatik olarak yenilenir</strong>
                .
              </li>
              <li>
                Yeni aboneliklerde, panelde belirtilmesi hâlinde <strong>7 gün ücretsiz deneme</strong> süresi
                uygulanır. Deneme süresi içinde iptal edilen aboneliklerden ücret alınmaz.
              </li>
              <li>
                Yenileme ödemesi alınamazsa Alıcı&apos;ya <strong>7 gün ek süre</strong> tanınır. Ek süre sonunda ödeme
                yapılmamışsa müşteri menüsü ve panel erişimi durdurulur; ödeme yapıldığında hizmet kaldığı yerden devam
                eder.
              </li>
            </ul>
          ),
        },
        {
          title: "Hizmetin ifası",
          body: (
            <p>
              Hizmet, ödemenin alınması (deneme süresi varsa abonelik başlangıcı) ile birlikte elektronik ortamda derhâl
              ifa edilmeye başlanır ve abonelik süresince kesintisiz olarak sunulur.
            </p>
          ),
        },
        {
          title: "Cayma hakkı",
          body: (
            <p>
              Alıcı, Hizmet&apos;i ticari veya mesleki amaçlarla satın alan bir işletmedir; bu nedenle 6502 sayılı
              Tüketicinin Korunması Hakkında Kanun kapsamında tüketici sayılmaz ve tüketicilere tanınan cayma hakkı
              uygulanmaz. Ayrıca Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15. maddesi uyarınca elektronik ortamda anında
              ifa edilen hizmetlerde cayma hakkı bulunmamaktadır.
            </p>
          ),
        },
        {
          title: "İptal ve iade",
          body: (
            <>
              <p>
                Alıcı aboneliğini dilediği zaman panelden iptal edebilir. <strong>İptal, ödenmiş dönemin sonunda</strong>{" "}
                geçerli olur; dönem sonuna kadar Hizmet kullanılmaya devam edilir ve bir sonraki dönem için ücret
                alınmaz.
              </p>
              <p>
                <strong>Ödenen abonelik ücretleri iade edilmez</strong>; kullanılmayan günler için kısmi iade yapılmaz.
                Ayrıntılar: <Link href="/iptal-iade">İptal ve İade Koşulları</Link>.
              </p>
            </>
          ),
        },
        {
          title: "Fiyat değişiklikleri",
          body: (
            <p>
              Satıcı fiyatları değiştirebilir. Değişiklik en az 30 gün önceden panel veya e-posta yoluyla bildirilir ve
              bildirimden sonraki ilk yenileme döneminden itibaren uygulanır. Alıcı yeni fiyatı kabul etmezse aboneliğini
              dönem sonunda iptal edebilir.
            </p>
          ),
        },
        {
          title: "Belgelendirme",
          body: (
            <p>
              Tahsil edilen ücretler için mevzuata uygun fatura veya belge düzenlenerek Alıcı&apos;nın kayıtlı e-posta
              adresine gönderilir.
            </p>
          ),
        },
        {
          title: "Uyuşmazlıkların çözümü",
          body: (
            <p>
              Bu sözleşme Türk hukukuna tabidir. Uyuşmazlıklarda İstanbul Anadolu Mahkemeleri ve İcra Daireleri
              yetkilidir.
            </p>
          ),
        },
        {
          title: "Yürürlük",
          body: (
            <p>
              Alıcı, işletme panelinde sözleşmeyi onaylayarak ve ödeme adımını tamamlayarak bu sözleşmenin tüm
              hükümlerini okuduğunu ve kabul ettiğini beyan eder. Onay kaydı (tarih, saat ve IP adresi) Satıcı
              tarafından saklanır.
            </p>
          ),
        },
      ]}
    />
  );
}
