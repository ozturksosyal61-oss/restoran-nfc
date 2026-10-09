import Link from "next/link";
import CookieSettingsLink from "./CookieSettingsLink";
import { siteFontClass } from "./site-fonts";
import home from "./page.module.css";
import styles from "./SiteFooter.module.css";

// Tanıtım sitesinin ortak alt bilgisi: çözüm sayfaları ve yasal belgeler.
// Renk değişkenleri kendi içinde tanımlı; ana sayfa dışındaki sayfalarda da
// aynı görünür.

export const SOLUTION_LINKS = [
  { href: "/qr-menu", label: "QR Menü" },
  { href: "/nfc-menu", label: "NFC Menü" },
  { href: "/dijital-menu", label: "Dijital Menü" },
];

export default function SiteFooter() {
  return (
    <footer className={`${styles.tokens} ${siteFontClass} ${home.footer}`}>
      <div className={home.footerInner}>
        <div className={home.footerBrand}>
          <span className={home.brand}>
            <span className={home.brandMark}>OZT</span>
            <span>Digital</span>
          </span>
          <p>Restoranlar için QR &amp; NFC dijital deneyim platformu.</p>
        </div>

        <div className={styles.columns}>
          <nav className={styles.column} aria-label="Çözümler">
            <strong>Çözümler</strong>
            {SOLUTION_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            <Link href="/urunler">Masa Ürünleri</Link>
            <Link href="/tasarimlar">Menü Tasarımları</Link>
            <Link href="/demo">Demo</Link>
            <Link href="/#iletisim">İletişim</Link>
          </nav>

          <nav className={styles.column} aria-label="Yasal">
            <strong>Yasal</strong>
            <Link href="/gizlilik">Gizlilik</Link>
            <Link href="/kvkk">KVKK</Link>
            <Link href="/kullanim-sartlari">Kullanım Şartları</Link>
            <Link href="/cerez-politikasi">Çerez Politikası</Link>
            <Link href="/mesafeli-satis-sozlesmesi">Mesafeli Satış</Link>
            <Link href="/iptal-iade">İptal ve İade</Link>
            <Link href="/veri-isleme-sozlesmesi">Veri İşleme Sözleşmesi</Link>
            <CookieSettingsLink />
          </nav>
        </div>
      </div>

      <small className={home.copyright}>© {new Date().getFullYear()} OZT Digital. Tüm hakları saklıdır.</small>
    </footer>
  );
}
