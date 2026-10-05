import Link from "next/link";
import type { Metadata } from "next";
import LegalDocument, { CompanyCard } from "../LegalDocument";
import { COMPANY } from "../../lib/legal";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/gizlilik",
  title: "Gizlilik Politikası",
  description:
    "OZT Digital'in verileri nasıl koruduğu ve kullandığına ilişkin gizlilik politikası.",
});

export default function PrivacyPage() {
  return (
    <LegalDocument
      path="/gizlilik"
      title="Gizlilik Politikası"
      intro={
        <>
          <p>
            Bu politika, {COMPANY.brand} hizmetini kullanırken bilgilerinizin nasıl korunduğunu özetler. Hangi verilerin
            hangi amaç ve hukuki sebeple işlendiğinin ayrıntıları <Link href="/kvkk">KVKK Aydınlatma Metni</Link>
            &apos;nde yer alır.
          </p>
          <CompanyCard />
        </>
      }
      sections={[
        {
          title: "Temel ilkelerimiz",
          body: (
            <ul>
              <li>Yalnızca hizmeti sunmak için gereken veriyi toplarız.</li>
              <li>Kişisel verileri satmayız, reklam amacıyla üçüncü kişilerle paylaşmayız.</li>
              <li>Restoran menülerinde reklam veya izleme çerezi kullanmayız.</li>
              <li>Kart bilgilerini saklamayız; ödemeler lisanslı ödeme kuruluşlarının sayfalarında yapılır.</li>
            </ul>
          ),
        },
        {
          title: "Restoran müşterileri",
          body: (
            <p>
              QR / NFC menüyü kullandığınızda verdiğiniz sipariş, yazdığınız not ve bıraktığınız geri bildirim yalnızca
              ilgili restorana iletilir. Bu veriler bakımından veri sorumlusu restorandır; {COMPANY.brand} yalnızca
              hizmetin teknik sağlayıcısıdır. Sipariş verirken ad yazmak zorunlu değildir.
            </p>
          ),
        },
        {
          title: "İşletmeler",
          body: (
            <p>
              Her işletme yalnızca kendi menüsüne, siparişlerine, müşteri geri bildirimlerine ve raporlarına erişebilir.
              İşletmeler arasındaki bu ayrım veritabanı düzeyinde erişim kurallarıyla sağlanır. Garson ve mutfak
              hesapları yalnızca kendi ekranlarına erişebilir.
            </p>
          ),
        },
        {
          title: "Güvenlik önlemleri",
          body: (
            <ul>
              <li>Tüm bağlantılar şifrelidir (HTTPS).</li>
              <li>Şifreler geri çözülemeyecek biçimde saklanır; tarafımızca görülemez.</li>
              <li>Masa QR kodları her masaya özel ve tahmin edilemez kodlar içerir.</li>
              <li>Ödeme anahtarları gibi gizli bilgiler şifrelenerek saklanır.</li>
              <li>Sisteme yönetici erişimi yalnızca yetkili kişilerle sınırlıdır.</li>
              <li>
                Hatalar kişisel veri içermeyecek biçimde kaydedilir ve en fazla 90 gün saklanır; amaç sorunları müşteri
                fark etmeden gidermektir.
              </li>
            </ul>
          ),
        },
        {
          title: "Çerezler",
          body: (
            <p>
              Tanıtım sitemizde zorunlu çerezlerin yanında, yalnızca izin verirseniz pazarlama çerezi (Meta Pixel)
              kullanılır. Ayrıntılar ve tercihinizi değiştirme yolu <Link href="/cerez-politikasi">Çerez Politikası</Link>
              &apos;nda.
            </p>
          ),
        },
        {
          title: "Değişiklikler",
          body: (
            <p>
              Bu politika güncellenebilir. Güncel sürüm her zaman bu sayfada yayımlanır; esaslı değişikliklerde
              işletmeler panel üzerinden bilgilendirilir.
            </p>
          ),
        },
        {
          title: "İletişim",
          body: (
            <p>
              Gizlilikle ilgili sorularınız için: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
            </p>
          ),
        },
      ]}
    />
  );
}
