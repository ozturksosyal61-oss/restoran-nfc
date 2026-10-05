import Link from "next/link";
import type { Metadata } from "next";
import LegalDocument, { CompanyCard } from "../LegalDocument";
import { COMPANY } from "../../lib/legal";
import styles from "../LegalDocument.module.css";

export const metadata: Metadata = {
  title: "Veri İşleme Sözleşmesi",
  description: "OZT Digital Menu ile işletmeler arasında KVKK kapsamındaki veri işleme sözleşmesi.",
};

export default function DataProcessingPage() {
  return (
    <LegalDocument
      path="/veri-isleme-sozlesmesi"
      title="Veri İşleme Sözleşmesi"
      intro={
        <p>
          Bu sözleşme, 6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun (&quot;KVKK&quot;) 12. maddesi uyarınca,
          hizmeti kullanan işletme (&quot;Veri Sorumlusu&quot;) ile {COMPANY.brand} (&quot;Veri İşleyen&quot;)
          arasında, işletmenin müşterilerine ve çalışanlarına ait kişisel verilerin işlenmesine ilişkin kuralları
          belirler. İşletme paneline girişte elektronik olarak onaylanır.
        </p>
      }
      sections={[
        {
          title: "Taraflar ve roller",
          body: (
            <>
              <p>
                <strong>Veri Sorumlusu:</strong> Hizmeti kullanan restoran / işletme. Kendi müşterilerinin ve
                çalışanlarının verileri bakımından işleme amaçlarını ve vasıtalarını belirler.
              </p>
              <p>
                <strong>Veri İşleyen:</strong>
              </p>
              <CompanyCard />
            </>
          ),
        },
        {
          title: "İşlenen veriler ve ilgili kişiler",
          body: (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>İlgili kişi</th>
                    <th>Veriler</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>İşletmenin müşterileri</td>
                    <td>
                      Masa numarası, sipariş içeriği ve tutarı, isteğe bağlı ad ve sipariş notu, garson çağırma / hesap
                      isteme kayıtları, geri bildirim ve değerlendirmeler, isteğe bağlı iletişim bilgisi, online ödeme
                      tutarı / bahşiş / sonucu ve IP adresi
                    </td>
                  </tr>
                  <tr>
                    <td>İşletmenin çalışanları</td>
                    <td>Ad soyad, e-posta, telefon, rol, giriş bilgileri, müşteri değerlendirmeleri</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ),
        },
        {
          title: "İşlemenin amacı ve süresi",
          body: (
            <p>
              Veri İşleyen, kişisel verileri yalnızca dijital menü, sipariş, garson çağırma, masadan ödeme, raporlama ve
              geri bildirim hizmetlerini sunmak amacıyla, Veri Sorumlusu&apos;nun talimatları ve bu sözleşme çerçevesinde,
              abonelik süresince işler. Verileri kendi amaçları için kullanmaz, satmaz ve reklam amacıyla paylaşmaz.
            </p>
          ),
        },
        {
          title: "Veri İşleyen'in yükümlülükleri",
          body: (
            <ul>
              <li>Verileri yalnızca Veri Sorumlusu&apos;nun talimatlarıyla ve hizmetin gerektirdiği ölçüde işlemek.</li>
              <li>
                KVKK 12. madde kapsamında uygun teknik ve idari tedbirleri almak: şifreli bağlantı, işletmeler arası
                veritabanı düzeyinde erişim ayrımı, geri çözülemeyen şifre saklama, gizli anahtarların şifrelenmesi,
                yetkili erişimin sınırlandırılması.
              </li>
              <li>Verilere erişen kişilerin gizlilik yükümlülüğü altında olmasını sağlamak.</li>
              <li>
                Bir veri ihlalini öğrendiğinde Veri Sorumlusu&apos;nu gecikmeksizin ve en geç 48 saat içinde
                bilgilendirmek; ihlalin etkilerini gidermek için gerekli bilgi ve desteği sağlamak.
              </li>
              <li>
                İlgili kişilerin başvurularının yanıtlanmasında Veri Sorumlusu&apos;na makul destek vermek; kendisine
                doğrudan ulaşan başvuruları gecikmeksizin Veri Sorumlusu&apos;na iletmek.
              </li>
              <li>Bu sözleşmeye uyumu gösteren bilgileri talep hâlinde Veri Sorumlusu&apos;na sunmak.</li>
            </ul>
          ),
        },
        {
          title: "Alt veri işleyenler",
          body: (
            <>
              <p>Veri Sorumlusu, hizmetin sunulması için aşağıdaki alt veri işleyenlerin kullanılmasını kabul eder:</p>
              <ul>
                <li>Supabase: veritabanı, kimlik doğrulama ve dosya depolama (sunucular Güney Kore)</li>
                <li>Vercel: uygulamanın barındırılması</li>
                <li>iyzico / PayTR: Veri Sorumlusu&apos;nun tercih ettiği masadan online ödeme kuruluşu</li>
                <li>Anthropic: yalnızca menü içeriğinin okunması ve çevirisi (müşteri verisi gönderilmez)</li>
              </ul>
              <p>
                Alt veri işleyen eklenmesi veya değiştirilmesi durumunda Veri Sorumlusu panel veya e-posta yoluyla
                önceden bilgilendirilir. Veri İşleyen, alt veri işleyenlerin bu sözleşmedekilere denk koruma sağlamasını
                gözetir.
              </p>
            </>
          ),
        },
        {
          title: "Yurt dışına aktarım",
          body: (
            <p>
              Alt veri işleyenlerin sunucuları yurt dışında bulunduğundan veriler yurt dışına aktarılmaktadır. Aktarım,
              KVKK 9. maddesinde öngörülen güvencelere uygun olarak yapılır. Veri Sorumlusu, bu aktarımı kendi
              müşterilerine yönelik aydınlatma yükümlülüğü kapsamında açıklar.
            </p>
          ),
        },
        {
          title: "Veri Sorumlusu'nun yükümlülükleri",
          body: (
            <ul>
              <li>
                Kendi müşterilerini ve çalışanlarını KVKK kapsamında aydınlatmak. Veri İşleyen, müşteri menüsünde{" "}
                <Link href="/kvkk#menu-kullanicilari">aydınlatma metnine</Link> bağlantı sağlar; Veri Sorumlusu kendi
                aydınlatma metnini de ayrıca sunabilir.
              </li>
              <li>Sisteme hukuka uygun olarak elde edilmiş veriler girmek.</li>
              <li>İlgili kişi başvurularını KVKK&apos;da öngörülen sürede yanıtlamak.</li>
              <li>Panel şifrelerini ve çalışan hesaplarını güvenli tutmak.</li>
            </ul>
          ),
        },
        {
          title: "Sözleşmenin sona ermesi",
          body: (
            <p>
              Abonelik sona erdiğinde Veri Sorumlusu talep ederse verileri kendisine iletilir. Veri İşleyen, sözleşmenin
              sona ermesinden itibaren en geç 90 gün içinde kişisel verileri siler veya anonim hâle getirir; mevzuat
              gereği saklanması zorunlu kayıtlar bu sürenin dışındadır.
            </p>
          ),
        },
        {
          title: "Yürürlük",
          body: (
            <p>
              Bu sözleşme, Veri Sorumlusu&apos;nun işletme panelinde onay vermesiyle yürürlüğe girer ve abonelik süresince
              geçerlidir. <Link href="/kullanim-sartlari">Kullanım Şartları</Link>&apos;nın ayrılmaz parçasıdır.
            </p>
          ),
        },
      ]}
    />
  );
}
