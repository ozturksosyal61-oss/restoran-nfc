import Link from "next/link";
import type { Metadata } from "next";
import LegalDocument, { CompanyCard } from "../LegalDocument";
import { COMPANY } from "../../lib/legal";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/kvkk",
  title: "KVKK Aydınlatma Metni",
  description:
    "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında OZT Digital'in kişisel verileri nasıl işlediğine ilişkin aydınlatma metni.",
});

export default function KvkkPage() {
  return (
    <LegalDocument
      path="/kvkk"
      title="KVKK Aydınlatma Metni"
      intro={
        <>
          <p>
            Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) 10. maddesi uyarınca; tanıtım
            sitemizi ziyaret edenleri, hizmetimizi kullanan işletmelerin yetkili ve çalışanlarını ve işletmelerin QR /
            NFC menülerini kullanan müşterileri, kişisel verilerinin nasıl işlendiği hakkında bilgilendirmek için
            hazırlanmıştır.
          </p>
          <CompanyCard />
        </>
      }
      sections={[
        {
          title: "Veri sorumlusu kimdir?",
          body: (
            <>
              <p>
                <strong>Tanıtım sitesi ziyaretçileri, işletme yetkilileri ve abonelik işlemleri</strong> bakımından veri
                sorumlusu {COMPANY.owner}&apos;dür ({COMPANY.brand}).
              </p>
              <p>
                <strong>Restoran müşterileri</strong> (menüyü görüntüleyen, sipariş veren, garson çağıran, ödeme yapan
                veya değerlendirme bırakan kişiler) bakımından veri sorumlusu, menüsünü kullandığınız{" "}
                <strong>restoran / işletmedir</strong>. {COMPANY.brand} bu verileri yalnızca işletme adına, işletmenin
                talimatıyla ve hizmeti sağlamak için işleyen <strong>veri işleyendir</strong> (
                <Link href="/veri-isleme-sozlesmesi">Veri İşleme Sözleşmesi</Link>).
              </p>
            </>
          ),
        },
        {
          title: "Hangi kişisel veriler işlenir?",
          body: (
            <>
              <p>
                <strong>Tanıtım sitesi ziyaretçileri:</strong> IP adresi, tarayıcı ve cihaz bilgisi, ziyaret edilen
                sayfalar, çerez tercihiniz. Yalnızca izin verirseniz Meta Pixel aracılığıyla reklam ölçüm verileri.
                Bizimle iletişime geçerseniz adınız, e-posta adresiniz, telefonunuz ve mesajınız.
              </p>
              <p>
                <strong>İşletme yetkilileri ve çalışanları:</strong> ad soyad, e-posta adresi, telefon numarası, görev /
                rol bilgisi, giriş bilgileri (şifreler geri çözülemeyecek biçimde saklanır, tarafımızca görülemez),
                panelde yapılan işlemlerin kayıtları, sözleşme onay kayıtları (tarih, IP adresi, tarayıcı bilgisi),
                abonelik ve ödeme kayıtları. Kart bilgileri ödeme kuruluşunun (iyzico) sayfasında girilir ve
                sistemimizde saklanmaz.
              </p>
              <p id="menu-kullanicilari">
                <strong>Restoran müşterileri (menü kullanıcıları):</strong>
              </p>
              <ul>
                <li>Masa numarası ve sipariş içeriği (ürünler, adetler, tutar, saat)</li>
                <li>Siparişte isteğe bağlı olarak yazdığınız ad ve sipariş notu</li>
                <li>Garson çağırma ve hesap isteme kayıtları</li>
                <li>
                  Bıraktığınız geri bildirim, puan ve çalışan değerlendirmesi; size dönülmesini isterseniz yazdığınız ad
                  ve telefon numarası
                </li>
                <li>
                  Masadan online ödeme yaparsanız ödeme tutarı, bahşiş, ödeme sonucu ve IP adresiniz. Kart bilgileriniz
                  doğrudan restoranın ödeme kuruluşunun (iyzico veya PayTR) güvenli sayfasında girilir; sistemimize
                  ulaşmaz.
                </li>
                <li>
                  Menünün kaç kez açıldığı ve hangi ürünlere bakıldığı; bu sayımlar kimliğinizle ilişkilendirilmez
                </li>
                <li>Tarayıcınızda saklanan sepet, masa kodu ve dil tercihi</li>
              </ul>
              <p>Restoran menülerinde reklam veya izleme çerezi kullanılmaz.</p>
            </>
          ),
        },
        {
          title: "Kişisel veriler hangi amaçlarla işlenir?",
          body: (
            <ul>
              <li>Dijital menünün gösterilmesi, siparişlerin alınması ve işletmeye iletilmesi</li>
              <li>Garson çağırma, hesap isteme ve masadan ödeme işlemlerinin yürütülmesi</li>
              <li>İşletme hesaplarının açılması, panele güvenli giriş ve yetkilendirme</li>
              <li>Abonelik ücretlerinin tahsili, faturalama ve muhasebe kayıtları</li>
              <li>Geri bildirimlerin ve değerlendirmelerin işletmeye iletilmesi</li>
              <li>Hizmetin güvenliği, kötüye kullanımın önlenmesi, hataların tespiti ve giderilmesi</li>
              <li>Destek taleplerinin ve başvuruların yanıtlanması</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi ve yetkili makamların taleplerinin karşılanması</li>
              <li>Yalnızca izin verilmesi hâlinde, tanıtım sitesindeki reklam kampanyalarının ölçülmesi</li>
            </ul>
          ),
        },
        {
          title: "Hukuki sebepler ve toplama yöntemi",
          body: (
            <>
              <p>
                Kişisel veriler; hizmet sırasında sizin girdiğiniz bilgilerden, menü / panel kullanımından ve
                tarayıcınızdan elektronik ortamda toplanır. KVKK 5. maddesindeki şu hukuki sebeplere dayanılır:
              </p>
              <ul>
                <li>
                  <strong>Sözleşmenin kurulması veya ifası (m. 5/2-c):</strong> sipariş, ödeme, hesap ve abonelik
                  işlemleri
                </li>
                <li>
                  <strong>Hukuki yükümlülük (m. 5/2-ç):</strong> fatura, muhasebe ve yasal saklama yükümlülükleri
                </li>
                <li>
                  <strong>Bir hakkın tesisi, kullanılması veya korunması (m. 5/2-e):</strong> sözleşme onay kayıtları
                </li>
                <li>
                  <strong>Meşru menfaat (m. 5/2-f):</strong> hizmet güvenliği, hata kayıtları, kimliksiz kullanım
                  istatistikleri
                </li>
                <li>
                  <strong>Açık rıza (m. 5/1):</strong> yalnızca tanıtım sitesindeki pazarlama çerezleri (Meta Pixel).
                  Rızanızı &quot;Çerez tercihleri&quot; bağlantısından dilediğiniz an geri alabilirsiniz.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Kişisel veriler kimlere aktarılır?",
          body: (
            <>
              <ul>
                <li>
                  <strong>İlgili restoran / işletme:</strong> menüsünü kullandığınız işletme, kendi siparişlerine, garson
                  çağrılarına, ödemelerine ve geri bildirimlerine erişir.
                </li>
                <li>
                  <strong>Altyapı hizmet sağlayıcıları:</strong> Supabase (veritabanı, giriş ve dosya depolama), Vercel
                  (sitenin barındırılması).
                </li>
                <li>
                  <strong>Ödeme kuruluşları:</strong> iyzico (abonelik ödemeleri ve işletmenin tercihine göre masadan
                  ödeme) ve PayTR (işletmenin tercihine göre masadan ödeme).
                </li>
                <li>
                  <strong>Yapay zekâ hizmeti:</strong> Anthropic; yalnızca işletmenin yüklediği menü fotoğrafının
                  okunması, menü çevirisi ve kalori tahmini için menü içeriği gönderilir, müşteri verisi gönderilmez.
                </li>
                <li>
                  <strong>Meta Platforms:</strong> yalnızca izin verilirse, tanıtım sitesindeki reklam ölçümü için.
                </li>
                <li>
                  <strong>Yetkili kamu kurum ve kuruluşları:</strong> yasal zorunluluk hâlinde.
                </li>
              </ul>
              <p>Kişisel veriler satılmaz ve reklam amacıyla üçüncü kişilerle paylaşılmaz.</p>
            </>
          ),
        },
        {
          title: "Yurt dışına aktarım",
          body: (
            <p>
              Altyapı hizmet sağlayıcılarımızın sunucuları Türkiye dışında (veritabanı Güney Kore&apos;de) bulunmaktadır;
              yapay zekâ ve Meta hizmetleri de yurt dışından sunulmaktadır. Bu nedenle kişisel veriler, KVKK 9.
              maddesinde öngörülen güvencelere (standart sözleşme vb.) uygun olarak yurt dışına aktarılabilir. Veriler
              aktarım sırasında şifreli bağlantı üzerinden iletilir.
            </p>
          ),
        },
        {
          title: "Saklama süreleri",
          body: (
            <ul>
              <li>
                İşletme hesabı ve işletmenin verileri (menü, sipariş, geri bildirim kayıtları): sözleşme süresince;
                sözleşme sona erdikten sonra en geç 90 gün içinde silinir veya anonim hâle getirilir.
              </li>
              <li>Fatura, ödeme ve muhasebe kayıtları: ilgili mevzuatın öngördüğü süre boyunca (10 yıl).</li>
              <li>Sözleşme onay kayıtları: sözleşme süresince ve sona ermesinden itibaren 10 yıl.</li>
              <li>Hata kayıtları: en fazla 90 gün.</li>
              <li>Tarayıcınızdaki sepet, masa kodu, dil ve çerez tercihi: siz silene kadar tarayıcınızda kalır.</li>
            </ul>
          ),
        },
        {
          title: "KVKK 11. madde kapsamındaki haklarınız",
          body: (
            <>
              <p>Veri sorumlusuna başvurarak;</p>
              <ul>
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme,</li>
                <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
                <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
                <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
                <li>KVKK 7. maddedeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme,</li>
                <li>Düzeltme, silme veya yok etme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme,</li>
                <li>
                  Münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz
                  etme,
                </li>
                <li>Kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
              </ul>
              <p>haklarına sahipsiniz.</p>
            </>
          ),
        },
        {
          title: "Başvuru",
          body: (
            <>
              <p>
                Başvurularınızı kimliğinizi doğrulayacak bilgilerle birlikte{" "}
                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> adresine iletebilirsiniz. Başvurular en geç 30 gün
                içinde ücretsiz olarak yanıtlanır.
              </p>
              <p>
                Restoran müşterisi olarak yapacağınız başvuruları, veri sorumlusu olan ilgili restorana yapmanız gerekir.
                Bu başvurular bize ulaşırsa gecikmeksizin ilgili restorana iletilir ve restorana yanıt vermesinde destek
                olunur.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
