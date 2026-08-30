import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerin işlenmesine ilişkin genel bilgilendirmedir.",
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
        <h1>KVKK Aydınlatma Metni</h1>
        <p className="legal-intro">6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerin işlenmesine ilişkin genel bilgilendirmedir.</p>
        <section className="legal-block"><h2>Veri sorumlusu</h2><p>İlgili restoran işletmesi, kendi müşterileri ve çalışanları bakımından veri sorumlusu olabilir. OZT Digital Menu ise hizmetin teknik sağlayıcısı olarak rol alabilir; somut ilişki sözleşme ve hizmet modeline göre belirlenir.</p></section><section className="legal-block"><h2>İşlenen veriler</h2><p>Ad-soyad, iletişim bilgileri, sipariş bilgileri, masa/sipariş bilgileri, çalışan hesabı bilgileri ve teknik kullanım kayıtları hizmetin ilgili özelliğine göre işlenebilir.</p></section><section className="legal-block"><h2>Hukuki sebepler</h2><p>Veriler; sözleşmenin kurulması veya ifası, hukuki yükümlülükler, meşru menfaatler ve gerektiğinde açık rıza gibi KVKK'da öngörülen hukuki sebeplere dayanılarak işlenebilir.</p></section><section className="legal-block"><h2>Başvuru</h2><p>KVKK kapsamındaki haklarınıza ilişkin başvurularınızı ilgili veri sorumlusuna iletebilirsiniz.</p></section>
        <div className="legal-note"><strong>Önemli:</strong> Bu metin ürünün mevcut yapısına göre genel bilgilendirme amaçlı hazırlanmıştır. Ticari ve hukuki süreçler kesinleştirilmeden önce hukuk danışmanı tarafından gözden geçirilmelidir.</div>
      </article>
      <footer className="legal-footer">© {new Date().getFullYear()} OZT Digital Menu</footer>
    </main>
  );
}
