import Link from "next/link";
import type { Metadata } from "next";
import LegalDocument from "../LegalDocument";
import { COMPANY } from "../../lib/legal";

export const metadata: Metadata = {
  title: "İptal ve İade Koşulları",
  description: "OZT Digital Menu aboneliğinin iptali ve ücret iadesine ilişkin koşullar.",
};

export default function CancellationPage() {
  return (
    <LegalDocument
      path="/iptal-iade"
      title="İptal ve İade Koşulları"
      intro={
        <p>
          {COMPANY.brand} aboneliğinin nasıl iptal edileceği ve ödenen ücretlere ilişkin kurallar aşağıdadır. Bu koşullar{" "}
          <Link href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</Link>&apos;nin parçasıdır.
        </p>
      }
      sections={[
        {
          title: "Aboneliği iptal etme",
          body: (
            <>
              <p>
                Aboneliğinizi işletme panelinde <strong>Abonelik</strong> sayfasından dilediğiniz zaman iptal
                edebilirsiniz. İsterseniz <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> adresine yazarak da
                iptal talebinde bulunabilirsiniz.
              </p>
              <p>
                <strong>İptal, ödenmiş dönemin sonunda geçerli olur.</strong> Dönem sonuna kadar menünüz ve paneliniz
                çalışmaya devam eder; sonraki dönem için kartınızdan ücret alınmaz.
              </p>
            </>
          ),
        },
        {
          title: "Ücret iadesi",
          body: (
            <ul>
              <li>
                <strong>Ödenen abonelik ücretleri iade edilmez.</strong>
              </li>
              <li>Dönem ortasında yapılan iptallerde kullanılmayan günler için kısmi iade yapılmaz.</li>
              <li>Ücretsiz deneme süresi içinde iptal ederseniz hiçbir ücret alınmaz.</li>
              <li>
                Teknik bir hata nedeniyle aynı dönem için birden fazla tahsilat yapılmışsa fazla alınan tutar, ödemenin
                yapıldığı karta iade edilir.
              </li>
            </ul>
          ),
        },
        {
          title: "Ödeme alınamazsa",
          body: (
            <p>
              Yenileme ödemesi alınamazsa 7 gün ek süre tanınır ve bu süre boyunca hizmet devam eder. Ek süre sonunda ödeme
              yapılmamışsa müşteri menüsü ve panel erişimi durdurulur. Kart bilgilerinizi güncelleyip ödeme yaptığınızda
              hizmet kaldığı yerden devam eder; verileriniz silinmez.
            </p>
          ),
        },
        {
          title: "Paket değişikliği",
          body: (
            <p>
              Paketinizi panelden değiştirdiğinizde yeni paketin özellikleri hemen açılır; yeni paketin ücreti bir sonraki
              ödeme döneminden itibaren alınır. Dönem içindeki değişikliklerde ücret farkı alınmaz ve iade edilmez.
            </p>
          ),
        },
        {
          title: "Verileriniz",
          body: (
            <p>
              Abonelik sona erdikten sonra talep ederseniz menü ve sipariş verileriniz size iletilir. Veriler sözleşmenin
              sona ermesinden itibaren en geç 90 gün içinde silinir; yasal saklama yükümlülüğü olan fatura ve ödeme
              kayıtları mevzuatta öngörülen süre boyunca saklanır.
            </p>
          ),
        },
        {
          title: "Masadan ödeme iadeleri",
          body: (
            <p>
              Restoranlarda masadan online ödeme ile yapılan ödemeler restoranın kendi ödeme kuruluşu hesabına geçer. Bu
              ödemelere ilişkin iade talepleri doğrudan ilgili restorana yapılmalıdır.
            </p>
          ),
        },
      ]}
    />
  );
}
