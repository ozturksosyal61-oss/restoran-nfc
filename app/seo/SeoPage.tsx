import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import TrackedLink from "../TrackedLink";
import SiteHeader, { DEMO_EVENT, PRODUCTS_EVENT } from "../SiteHeader";
import SiteFooter from "../SiteFooter";
import SiteIcon from "../SiteIcon";
import { siteFontClass } from "../site-fonts";
import { SITE_URL, pageMetadata } from "../../lib/site";
import home from "../page.module.css";
import styles from "./seo.module.css";
import { plain, rich } from "./rich";

// QR menü, NFC menü ve dijital menü açılış sayfalarının ortak şablonu.
// Metinler seo-sayfalari.md'den birebir alınır; sayfa sunucuda çizilir.

export type SeoAction = { label: string; href: string };
export type SeoProduct = { title: string; text: string; image: string; alt: string };

export type SeoBlock =
  | { kind: "p"; text: string }
  | { kind: "cards"; numbered?: boolean; items: { h3: string; text: string }[] }
  | { kind: "list"; items: string[] }
  | { kind: "ordered"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "products"; headings: boolean; items: SeoProduct[] }
  | { kind: "link"; text: string };

export type SeoContent = {
  slug: string;
  title: string;
  description: string;
  breadcrumb: string;
  h1: string;
  intro: string;
  heroActions: SeoAction[];
  heroImage: { src: string; alt: string };
  sections: { h2: string; blocks: SeoBlock[] }[];
  faq: { q: string; a: string }[];
  cta: { h2: string; text: string; actions: SeoAction[] };
};

export function seoMetadata(content: SeoContent): Metadata {
  return pageMetadata({
    path: `/${content.slug}`,
    title: content.title,
    absoluteTitle: true,
    description: content.description,
  });
}

const PRODUCT_LINKS = new Set(["/urunler"]);

function ActionLink({ action, className }: { action: SeoAction; className: string }) {
  const event = action.href === "/demo" ? DEMO_EVENT : PRODUCT_LINKS.has(action.href) ? PRODUCTS_EVENT : null;
  const children = (
    <>
      {action.label}
      <SiteIcon name="arrow" className={home.btnIcon} />
    </>
  );
  return event ? (
    <TrackedLink href={action.href} className={className} {...event}>
      {children}
    </TrackedLink>
  ) : (
    <Link href={action.href} className={className}>
      {children}
    </Link>
  );
}

// "**[Metin](/adres)**" biçimindeki tek başına bağlantı satırları.
function standaloneLink(text: string): SeoAction | null {
  const match = text.match(/^\*\*\[(.+?)\]\((\/[^)\s]*)\)\*\*$/);
  return match ? { label: match[1], href: match[2] } : null;
}

function Block({ block }: { block: SeoBlock }) {
  switch (block.kind) {
    case "p":
      return <p className={styles.text}>{rich(block.text, styles.inlineLink)}</p>;

    case "link": {
      const action = standaloneLink(block.text);
      return action ? (
        <ActionLink action={action} className={home.textLink} />
      ) : (
        <p className={styles.text}>{rich(block.text, styles.inlineLink)}</p>
      );
    }

    case "cards":
      return (
        <div className={styles.cards}>
          {block.items.map((item) => (
            <article key={item.h3} className={`${home.card} ${styles.card}`}>
              <h3>{item.h3}</h3>
              <p>{rich(item.text, styles.inlineLink)}</p>
            </article>
          ))}
        </div>
      );

    case "list":
      return (
        <ul className={styles.checks}>
          {block.items.map((item) => (
            <li key={item}>
              <SiteIcon name="check" className={styles.checkIcon} />
              <span>{rich(item, styles.inlineLink)}</span>
            </li>
          ))}
        </ul>
      );

    case "ordered":
      return (
        <ol className={styles.ordered}>
          {block.items.map((item) => (
            <li key={item}>{rich(item, styles.inlineLink)}</li>
          ))}
        </ol>
      );

    case "table":
      return (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {block.head.map((cell, index) => (
                  <th key={index} scope="col">
                    {cell ? rich(cell) : <span className={styles.srOnly}>Özellik</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th key={index} scope="row">
                        {rich(cell)}
                      </th>
                    ) : (
                      <td key={index}>{rich(cell)}</td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "products":
      return (
        <div className={home.products}>
          {block.items.map((product) => (
            <article key={product.title} className={`${home.product} ${styles.product}`}>
              <span className={home.productImage}>
                <Image src={product.image} alt={product.alt} fill sizes="(max-width: 760px) 90vw, 380px" />
              </span>
              <span className={styles.productText}>
                {block.headings ? <h3>{product.title}</h3> : <strong>{product.title}</strong>}
                <span>{rich(product.text, styles.inlineLink)}</span>
              </span>
            </article>
          ))}
        </div>
      );
  }
}

export default function SeoPage({ content }: { content: SeoContent }) {
  const url = `${SITE_URL}/${content.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: content.breadcrumb, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#sss`,
        mainEntity: content.faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: plain(item.a) },
        })),
      },
    ],
  };

  return (
    <main className={`${home.page} ${siteFontClass}`}>
      <script
        type="application/ld+json"
        // "<" kaçırılır; metin içinden etiket enjekte edilemez.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <SiteHeader />

      {/* GİRİŞ */}
      <section className={`${home.hero} ${styles.hero}`}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <nav aria-label="Sayfa konumu" className={styles.breadcrumb}>
              <ol>
                <li>
                  <Link href="/">Ana Sayfa</Link>
                </li>
                <li aria-current="page">{content.breadcrumb}</li>
              </ol>
            </nav>

            <h1 className={styles.h1}>{content.h1}</h1>
            <p className={styles.intro}>{rich(content.intro, styles.inlineLink)}</p>

            <div className={styles.heroActions}>
              {content.heroActions.map((action, index) => (
                <ActionLink
                  key={action.href}
                  action={action}
                  className={index === 0 ? home.btnPrimary : home.btnSecondary}
                />
              ))}
            </div>
          </div>

          <div className={styles.heroImage}>
            <Image
              src={content.heroImage.src}
              alt={content.heroImage.alt}
              fill
              preload
              sizes="(max-width: 900px) 90vw, 480px"
            />
          </div>
        </div>
      </section>

      {/* İÇERİK */}
      {content.sections.map((section) => (
        <section key={section.h2} className={styles.section}>
          <h2 className={styles.h2}>{section.h2}</h2>
          <div className={styles.blocks}>
            {section.blocks.map((block, index) => (
              <Block key={index} block={block} />
            ))}
          </div>
        </section>
      ))}

      {/* SSS */}
      <section id="sss" className={`${styles.section} ${styles.sectionLast}`}>
        <h2 className={styles.h2}>Sıkça sorulan sorular</h2>
        <div className={home.faq}>
          {content.faq.map((item) => (
            <details key={item.q} className={home.faqItem}>
              <summary>
                {item.q}
                <SiteIcon name="plus" className={home.faqIcon} />
              </summary>
              <p>{rich(item.a, styles.inlineLink)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={home.ctaWrap}>
        <div className={home.cta}>
          <h2>{content.cta.h2}</h2>
          <p>{content.cta.text}</p>
          <div className={home.ctaActions}>
            {content.cta.actions.map((action, index) => (
              <ActionLink key={action.href} action={action} className={index === 0 ? home.btnGold : home.btnGhost} />
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
