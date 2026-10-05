import type { Metadata } from "next";
import LegalDocument from "../LegalDocument";
import CookieSettingsLink from "../CookieSettingsLink";
import styles from "../LegalDocument.module.css";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/cerez-politikasi",
  title: "Çerez Politikası",
  description:
    "OZT Digital'de kullanılan çerezler, tarayıcı depolama kayıtları ve tercihlerin nasıl değiştirileceği.",
});

export default function CookiePolicyPage() {
  return (
    <LegalDocument
      path="/cerez-politikasi"
      title="Çerez Politikası"
      intro={
        <p>
          Çerezler ve benzeri tarayıcı depolama kayıtları, bir siteyi ziyaret ettiğinizde cihazınıza kaydedilen küçük
          dosyalardır. Bu sayfa hangi kayıtları neden kullandığımızı ve tercihinizi nasıl değiştireceğinizi açıklar.
        </p>
      }
      sections={[
        {
          title: "Zorunlu çerezler ve kayıtlar",
          body: (
            <>
              <p>Hizmetin çalışması için gereklidir; izninize bağlı değildir ve kapatılamaz.</p>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Kayıt</th>
                      <th>Amaç</th>
                      <th>Süre</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Oturum çerezleri (sb-…)</td>
                      <td>İşletme, personel ve sistem paneline girişin sürdürülmesi</td>
                      <td>Oturum kapanana kadar</td>
                    </tr>
                    <tr>
                      <td>restaurant-cart</td>
                      <td>Menüde sepetinizin hatırlanması</td>
                      <td>Sipariş verilene ya da siz silene kadar</td>
                    </tr>
                    <tr>
                      <td>ozt_table_token</td>
                      <td>Okuttuğunuz masanın hatırlanması</td>
                      <td>Siz silene kadar</td>
                    </tr>
                    <tr>
                      <td>ozt_menu_language</td>
                      <td>Seçtiğiniz menü dilinin hatırlanması</td>
                      <td>Siz silene kadar</td>
                    </tr>
                    <tr>
                      <td>Sipariş takip kaydı</td>
                      <td>Verdiğiniz siparişin takip ekranının açılabilmesi</td>
                      <td>Siz silene kadar</td>
                    </tr>
                    <tr>
                      <td>Ödeme takip kaydı</td>
                      <td>Masadan ödeme sonrası dekont ekranına dönülebilmesi</td>
                      <td>Ödeme tamamlanana kadar</td>
                    </tr>
                    <tr>
                      <td>ozt_popup_…</td>
                      <td>Restoranın açılış duyurusunun size tekrar tekrar gösterilmemesi</td>
                      <td>Siz silene kadar</td>
                    </tr>
                    <tr>
                      <td>ozt_visitor</td>
                      <td>
                        Menü istatistiklerinde aynı ziyaretçinin bir kez sayılması. Rastgele üretilen bir koddur; adınız,
                        telefonunuz gibi bilgilerle ilişkilendirilmez.
                      </td>
                      <td>Siz silene kadar</td>
                    </tr>
                    <tr>
                      <td>ozt_mv_… / ozt_pv_…</td>
                      <td>Menü ve ürün görüntülemelerinin aynı oturumda iki kez sayılmaması</td>
                      <td>Tarayıcı oturumu</td>
                    </tr>
                    <tr>
                      <td>ozt_cookie_consent</td>
                      <td>Çerez tercihinizin hatırlanması</td>
                      <td>Siz silene kadar</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ),
        },
        {
          title: "Pazarlama çerezleri (yalnızca izninizle)",
          body: (
            <>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Hizmet</th>
                      <th>Amaç</th>
                      <th>Süre</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Meta Pixel (_fbp)</td>
                      <td>Reklamlarımızı gören kişilerin tanıtım sitemizi ziyaret edip etmediğinin ölçülmesi</td>
                      <td>90 gün</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Meta Pixel yalnızca tanıtım sitemizde ve yalnızca &quot;Kabul et&quot; ya da ayarlardan pazarlama
                çerezlerine izin vermeniz hâlinde çalışır. Restoran menülerinde, işletme ve personel panellerinde hiçbir
                koşulda kullanılmaz.
              </p>
            </>
          ),
        },
        {
          title: "Tercihinizi nasıl değiştirirsiniz?",
          body: (
            <>
              <p>
                İzninizi dilediğiniz an geri alabilir veya yeniden verebilirsiniz: <CookieSettingsLink /> (sitenin alt
                kısmında da bulunur).
              </p>
              <p>
                Ayrıca tarayıcınızın ayarlarından çerezleri ve site verilerini silebilirsiniz. Zorunlu kayıtları
                silerseniz sepetiniz ve oturumunuz sıfırlanır.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
