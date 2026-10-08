"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { INSTAGRAM_URL } from "../lib/site";
import { CONTACT_TOPICS } from "../lib/contact";
import { submitContact } from "./contact-actions";
import styles from "./ContactSection.module.css";

// Ana sayfadaki iletişim bölümü: Instagram ve "Bizimle iletişime geçin" formu.
// Form talepleri sistem panelinde "İletişim talepleri" sayfasına düşer.
export default function ContactSection() {
  const [result, action, pending] = useActionState(submitContact, null);
  const startedRef = useRef<HTMLInputElement>(null);

  // Formun ne zaman açıldığı (çok hızlı gönderen botları ayıklamak için).
  useEffect(() => {
    if (startedRef.current) startedRef.current.value = String(Date.now());
  }, []);

  const handle = INSTAGRAM_URL.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");

  return (
    <section id="iletisim" className={styles.section} aria-labelledby="iletisim-baslik">
      <div className={styles.intro}>
        <span className={styles.eyebrow}>İletişim</span>
        <h2 id="iletisim-baslik">
          Restoranınız için <em>konuşalım.</em>
        </h2>
        <p>
          Demo, paketler ya da NFC ürünleri hakkında sorularınızı yazın; size telefonla ya da e-postayla dönüş
          yapalım. İsterseniz Instagram&apos;dan da yazabilirsiniz.
        </p>

        <a className={styles.instagram} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
          <span className={styles.instagramIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <path d="M17.5 6.5h.01" strokeWidth="2.6" />
            </svg>
          </span>
          <span className={styles.instagramText}>
            <small>Instagram</small>
            <strong>@{handle}</strong>
          </span>
          <span className={styles.instagramCta}>Bize yazın</span>
        </a>
      </div>

      <div className={styles.card}>
        {result?.ok ? (
          <div className={styles.done} role="status">
            <span className={styles.doneIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h3>Mesajınız bize ulaştı</h3>
            <p>{result.message}</p>
          </div>
        ) : (
          <form action={action} className={styles.form}>
            <h3>Bizimle iletişime geçin</h3>

            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Adınız soyadınız</span>
                <input name="name" required minLength={2} maxLength={80} autoComplete="name" />
              </label>
              <label className={styles.field}>
                <span>
                  İşletmenizin adı <em>· isteğe bağlı</em>
                </span>
                <input name="business_name" maxLength={120} autoComplete="organization" />
              </label>
              <label className={styles.field}>
                <span>Telefon</span>
                <input name="phone" type="tel" inputMode="tel" maxLength={30} autoComplete="tel" placeholder="05xx xxx xx xx" />
              </label>
              <label className={styles.field}>
                <span>E-posta</span>
                <input name="email" type="email" maxLength={160} autoComplete="email" placeholder="ornek@isletme.com" />
              </label>
              <label className={styles.field}>
                <span>
                  Şehir / semt <em>· isteğe bağlı</em>
                </span>
                <input name="city" maxLength={80} placeholder="Örn. Kadıköy, İstanbul" />
              </label>
              <label className={styles.field}>
                <span>Konu</span>
                <select name="topic" defaultValue="demo">
                  {CONTACT_TOPICS.map((topic) => (
                    <option key={topic.value} value={topic.value}>
                      {topic.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${styles.field} ${styles.full}`}>
                <span>
                  Mesajınız <em>· isteğe bağlı</em>
                </span>
                <textarea name="message" rows={4} maxLength={2000} placeholder="Masa sayınız, aklınızdaki sorular…" />
              </label>
            </div>

            <p className={styles.hint}>Telefon ya da e-postadan en az birini yazın.</p>

            <label className={styles.consent}>
              <input type="checkbox" name="kvkk" required />
              <span>
                Bana dönüş yapılması için bilgilerimin işlenmesine ilişkin{" "}
                <Link href="/kvkk" target="_blank">
                  aydınlatma metnini
                </Link>{" "}
                okudum.
              </span>
            </label>

            {/* Spam koruması: gerçek ziyaretçiler bu alanları görmez. */}
            <input ref={startedRef} type="hidden" name="started_at" defaultValue="" />
            <input type="hidden" name="source" value="/" />
            <label className={styles.trap} aria-hidden="true">
              Web sitesi
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>

            {result && !result.ok && (
              <p className={styles.error} role="alert">
                {result.message}
              </p>
            )}

            <button type="submit" className={styles.submit} disabled={pending}>
              {pending ? "Gönderiliyor…" : "Gönder"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
