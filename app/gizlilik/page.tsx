import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Bu sayfa OZT Digital Menu hizmetini kullanırken kişisel verilerin nasıl işlendiğine ilişkin genel bilgilendirme metnidir.",
};

export default function LegalPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/" className="brand-mark"><span className="brand-mark-box">OZT</span><span>OZT DIGITAL MENU</span></Link>
        <Link href="/" className="legal-back">← Ana sayfa</Link>
      </header>
      <article className="legal-card">
        <div className="eyebrow">OZT DIGITAL MENU</div>
        <h1>Gizlilik Politikası</h1>
        <p className="legal-intro">Bu sayfa OZT Digital Menu hizmetini kullanırken kişisel verilerin nasıl işlendiğine ilişkin genel bilgilendirme metnidir.</p>
        <section className="legal-block"><h2>Toplanan bilgiler</h2><p>Hesap, restoran yönetimi ve sipariş özelliklerinin çalışması için gerekli kullanıcı, işletme ve işlem bilgileri işlenebilir.</p></section><section className="legal-block"><h2>Kullanım amacı</h2><p>Veriler; hesabın yönetilmesi, dijital menü ve sipariş hizmetlerinin sunulması, güvenliğin sağlanması ve hizmetin geliştirilmesi amacıyla kullanılabilir.</p></section><section className="legal-block"><h2>Saklama ve güvenlik</h2><p>Veriler hizmetin çalışması için gerekli süre boyunca ve ilgili mevzuatın gerektirdiği sürelerde saklanır. Erişim yetkileri ve veritabanı güvenlik politikaları uygulanır.</p></section><section className="legal-block"><h2>Üçüncü taraf hizmetler</h2><p>Kimlik doğrulama, veritabanı ve barındırma gibi hizmetler için kullanılan sağlayıcılar, hizmetin teknik olarak sunulması kapsamında veri işleyebilir.</p></section><section className="legal-block"><h2>Haklarınız</h2><p>Kişisel verilerinizle ilgili yasal taleplerinizi ilgili veri sorumlusuna iletebilirsiniz.</p></section>
        <div className="legal-note"><strong>Önemli:</strong> Bu metin ürünün mevcut yapısına göre genel bilgilendirme amaçlı hazırlanmıştır. Ticari ve hukuki süreçler kesinleştirilmeden önce hukuk danışmanı tarafından gözden geçirilmelidir.</div>
      </article>
      <footer className="legal-footer">© {new Date().getFullYear()} OZT Digital Menu</footer>
    </main>
  );
}
