"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { INSTAGRAM_URL } from "../lib/site";
import { COMPANY } from "../lib/legal";
import { CONTACT_PREFILL_EVENT, CONTACT_TOPICS, whatsappUrl, type ContactPrefill } from "../lib/contact";
import { submitContact } from "./contact-actions";
import styles from "./ContactSection.module.css";

const TOPIC_VALUES = new Set<string>(CONTACT_TOPICS.map((topic) => topic.value));

// Ana sayfadaki iletişim bölümü: WhatsApp, telefon, Instagram ve
// "Bizimle iletişime geçin" formu. Form talepleri sistem panelinde
// "İletişim talepleri" sayfasına düşer.
//
// Paket ve ürün düğmeleri formu doldurabilir: aynı sayfada ContactLink
// olayıyla, başka sayfadan gelince adresteki ?konu=…&mesaj=… ile.
export default function ContactSection() {
  const [result, action, pending] = useActionState(submitContact, null);
  const startedRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Formun ne zaman açıldığı (çok hızlı gönderen botları ayıklamak için).
  useEffect(() => {
    if (startedRef.current) startedRef.current.value = String(Date.now());
  }, []);

  useEffect(() => {
    function prefill({ topic, message }: ContactPrefill) {
      if (topic && TOPIC_VALUES.has(topic) && topicRef.current) topicRef.current.value = topic;
      if (message && messageRef.current) messageRef.current.value = message.slice(0, 2000);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.has("konu") || params.has("mesaj")) {
      prefill({ topic: params.get("konu") ?? undefined, message: params.get("mesaj") ?? undefined });
    }

    const onPrefill = (event: Event) => prefill((event as CustomEvent<ContactPrefill>).detail ?? {});
    window.addEventListener(CONTACT_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(CONTACT_PREFILL_EVENT, onPrefill);
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
          Demo, paketler ya da NFC ürünleri hakkında sorularınızı yazın; size aynı gün dönüş yapalım. En hızlı yol
          WhatsApp; isterseniz arayabilir ya da Instagram&apos;dan yazabilirsiniz.
        </p>

        <a className={styles.instagram} href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
          <span className={`${styles.instagramIcon} ${styles.whatsappIcon}`} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.2 21.8l5.1-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.7-1.1.2-.5.2-1 .1-1.1l-.6-.2Z" />
            </svg>
          </span>
          <span className={styles.instagramText}>
            <small>WhatsApp</small>
            <strong>{COMPANY.phone}</strong>
          </span>
          <span className={styles.instagramCta}>Yazın</span>
        </a>

        <a className={styles.instagram} href={COMPANY.phoneHref}>
          <span className={`${styles.instagramIcon} ${styles.phoneIcon}`} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
            </svg>
          </span>
          <span className={styles.instagramText}>
            <small>Telefon</small>
            <strong>{COMPANY.phone}</strong>
          </span>
          <span className={styles.instagramCta}>Arayın</span>
        </a>

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
                <select ref={topicRef} name="topic" defaultValue="demo">
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
                <textarea ref={messageRef} name="message" rows={4} maxLength={2000} placeholder="Masa sayınız, aklınızdaki sorular…" />
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
