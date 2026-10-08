import Link from "next/link";
import TrackedLink from "./TrackedLink";
import SiteIcon from "./SiteIcon";
import styles from "./page.module.css";

// Tanıtım sitesinin üst menüsü. Ana sayfada bölümlere kayar; diğer
// sayfalarda ana sayfanın ilgili bölümüne gider.

export const DEMO_EVENT = {
  event: "ViewContent",
  eventParams: { content_name: "Demo", content_category: "OZT Digital" },
};

export const PRODUCTS_EVENT = {
  event: "ViewContent",
  eventParams: { content_name: "Ürünler", content_category: "OZT Digital" },
};

export default function SiteHeader({ onHome = false }: { onHome?: boolean }) {
  const base = onHome ? "" : "/";

  return (
    <header className={styles.nav}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand} aria-label="OZT Digital ana sayfa">
          <span className={styles.brandMark}>OZT</span>
          <span>Digital</span>
        </Link>

        <nav className={styles.navLinks} aria-label="Sayfa bölümleri">
          <a href={`${base}#ozellikler`}>Özellikler</a>
          <a href={`${base}#nasil-calisir`}>Nasıl Çalışır</a>
          <TrackedLink href="/urunler" {...PRODUCTS_EVENT}>
            Ürünler
          </TrackedLink>
          <a href={`${base}#paketler`}>Paketler</a>
          <a href={`${base}#sss`}>SSS</a>
          <a href={`${base}#iletisim`}>İletişim</a>
        </nav>

        <div className={styles.navActions}>
          <Link href="/admin/login" className={styles.navLogin}>
            İşletme Girişi
          </Link>
          <TrackedLink href="/demo" className={styles.navCta} {...DEMO_EVENT}>
            Demoyu İncele
            <SiteIcon name="arrow" className={styles.btnIcon} />
          </TrackedLink>
        </div>
      </div>
    </header>
  );
}
