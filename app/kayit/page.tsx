import type { Metadata } from "next";
import Link from "next/link";
import styles from "./kayit.module.css";

export const metadata: Metadata = {
  title: "İşletme hesabı",
  robots: { index: false },
};

// Herkese açık kayıt kapalı: işletme hesapları sistem panelinden açılır.
export default function KayitPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.brand}>OZT DIGITAL</div>

        <div className={styles.eyebrow}>İŞLETME HESABI</div>

        <h1 className={styles.title}>Hesabınızı biz açıyoruz.</h1>

        <p className={styles.subtitle}>
          Yeni işletme hesapları ekibimiz tarafından kurulur. Menünüz, temanız
          ve QR / NFC kodlarınız hazırlandıktan sonra giriş bilgileriniz size
          iletilir. Hesabınız varsa İşletme Girişi&apos;nden devam edin.
        </p>

        <div className={styles.actions}>
          <Link href="/admin/login" className={styles.primary}>
            İşletme Girişi
          </Link>
          <Link href="/demo" className={styles.secondary}>
            Demoyu İncele
          </Link>
          <Link href="/abonelik" className={styles.secondary}>
            ← Paketlere Dön
          </Link>
        </div>
      </section>
    </main>
  );
}
