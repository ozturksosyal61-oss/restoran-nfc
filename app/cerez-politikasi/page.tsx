import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description: "OZT Digital Menu web uygulamasında kullanılan çerezler ve benzeri teknolojiler hakkında genel bilgilendirmedir.",
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
        <h1>Çerez Politikası</h1>
        <p className="legal-intro">OZT Digital Menu web uygulamasında kullanılan çerezler ve benzeri teknolojiler hakkında genel bilgilendirmedir.</p>
        <section className="legal-block"><h2>Zorunlu teknolojiler</h2><p>Oturum yönetimi, güvenlik ve uygulamanın temel işlevleri için gerekli çerezler veya yerel depolama teknolojileri kullanılabilir.</p></section><section className="legal-block"><h2>Tercih ve analiz</h2><p>İleride tercih veya analiz amaçlı ek teknolojiler kullanılabilir. Bunların kullanılması halinde gerekli bilgilendirme ve izin mekanizmaları uygulanır.</p></section><section className="legal-block"><h2>Kontrol</h2><p>Tarayıcı ayarlarınız üzerinden çerezleri yönetebilir veya silebilirsiniz; ancak zorunlu teknolojileri engellemek bazı özelliklerin çalışmasını etkileyebilir.</p></section>
        <div className="legal-note"><strong>Önemli:</strong> Bu metin ürünün mevcut yapısına göre genel bilgilendirme amaçlı hazırlanmıştır. Ticari ve hukuki süreçler kesinleştirilmeden önce hukuk danışmanı tarafından gözden geçirilmelidir.</div>
      </article>
      <footer className="legal-footer">© {new Date().getFullYear()} OZT Digital Menu</footer>
    </main>
  );
}
