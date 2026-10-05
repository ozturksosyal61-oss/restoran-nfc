import Link from "next/link";
import type { ReactNode } from "react";
import { COMPANY, LEGAL_UPDATED } from "../lib/legal";
import styles from "./LegalDocument.module.css";

// Yasal sayfaların ortak şablonu: başlık, hizmet sağlayıcı bilgisi,
// bölümler ve diğer belgelere bağlantılar.

export type LegalSection = { id?: string; title: string; body: ReactNode };

const DOCUMENTS = [
  { href: "/kvkk", label: "KVKK Aydınlatma Metni" },
  { href: "/gizlilik", label: "Gizlilik Politikası" },
  { href: "/cerez-politikasi", label: "Çerez Politikası" },
  { href: "/kullanim-sartlari", label: "Kullanım Şartları" },
  { href: "/mesafeli-satis-sozlesmesi", label: "Mesafeli Satış Sözleşmesi" },
  { href: "/iptal-iade", label: "İptal ve İade Koşulları" },
  { href: "/veri-isleme-sozlesmesi", label: "Veri İşleme Sözleşmesi" },
];

export function CompanyCard() {
  return (
    <dl className={styles.company}>
      <div>
        <dt>Hizmet sağlayıcı</dt>
        <dd>
          {COMPANY.owner} ({COMPANY.brand})
        </dd>
      </div>
      <div>
        <dt>Adres</dt>
        <dd>{COMPANY.address}</dd>
      </div>
      {COMPANY.taxInfo && (
        <div>
          <dt>Vergi bilgisi</dt>
          <dd>{COMPANY.taxInfo}</dd>
        </div>
      )}
      <div>
        <dt>E-posta</dt>
        <dd>
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </dd>
      </div>
      <div>
        <dt>İnternet sitesi</dt>
        <dd>{COMPANY.website}</dd>
      </div>
    </dl>
  );
}

export default function LegalDocument({
  path,
  title,
  intro,
  sections,
}: {
  path: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/" className={`brand-mark ${styles.brand}`}>
          <span className="brand-mark-box">OZT</span>
          <span>OZT DIGITAL MENU</span>
        </Link>
        <Link href="/" className="legal-back">
          ← Ana sayfa
        </Link>
      </header>

      <article className={`legal-card ${styles.doc}`}>
        <div className="eyebrow">OZT DIGITAL MENU</div>
        <h1>{title}</h1>
        <p className={styles.updated}>Son güncelleme: {LEGAL_UPDATED}</p>
        <div className="legal-intro">{intro}</div>

        {sections.map((section, index) => (
          <section key={section.title} id={section.id} className="legal-block">
            <h2>
              {index + 1}. {section.title}
            </h2>
            <div className={styles.body}>{section.body}</div>
          </section>
        ))}

        <nav className={styles.others} aria-label="Diğer yasal belgeler">
          <strong>Diğer belgeler</strong>
          <ul>
            {DOCUMENTS.filter((document) => document.href !== path).map((document) => (
              <li key={document.href}>
                <Link href={document.href}>{document.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>

      <footer className="legal-footer">
        © {new Date().getFullYear()} {COMPANY.brand} · {COMPANY.email}
      </footer>
    </main>
  );
}
