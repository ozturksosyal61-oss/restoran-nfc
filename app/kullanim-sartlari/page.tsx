import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description: "OZT Digital Menu platformunun kullanımına ilişkin temel kurallar.",
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
        <h1>Kullanım Şartları</h1>
        <p className="legal-intro">OZT Digital Menu platformunun kullanımına ilişkin temel kurallar.</p>
        <section className="legal-block"><h2>Hizmet</h2><p>Platform; dijital menü, QR/NFC erişimi, sipariş, servis çağrıları ve restoran yönetimi gibi özellikler sağlayabilir. Özellikler seçilen plana ve güncel ürün kapsamına göre değişebilir.</p></section><section className="legal-block"><h2>Hesap güvenliği</h2><p>İşletme kullanıcıları hesap bilgilerini gizli tutmak ve hesap üzerinden yapılan işlemlerden sorumlu olmakla yükümlüdür.</p></section><section className="legal-block"><h2>Siparişler</h2><p>Sipariş ve ödeme işlemlerinin ticari tarafı ilgili restoran işletmesidir. Platform, restoran ile müşteri arasındaki işlemlerin teknik altyapısını sağlayabilir.</p></section><section className="legal-block"><h2>Kabul</h2><p>Platformu kullanarak bu şartları ve hizmetin güncel kurallarını kabul etmiş olursunuz.</p></section>
        <div className="legal-note"><strong>Önemli:</strong> Bu metin ürünün mevcut yapısına göre genel bilgilendirme amaçlı hazırlanmıştır. Ticari ve hukuki süreçler kesinleştirilmeden önce hukuk danışmanı tarafından gözden geçirilmelidir.</div>
      </article>
      <footer className="legal-footer">© {new Date().getFullYear()} OZT Digital Menu</footer>
    </main>
  );
}
