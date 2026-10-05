"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { COOKIE_CONSENT_KEY, COOKIE_CONSENT_VERSION, COOKIE_SETTINGS_EVENT } from "../lib/legal";
import styles from "./CookieConsent.module.css";

// Çerez onayı ve Meta Pixel.
// - Pixel yalnızca ziyaretçi "Pazarlama" çerezlerine izin verirse yüklenir.
// - Restoran menüleri, işletme / personel / sistem panelleri ve ödeme
//   dönüşü sayfalarında Pixel hiç yüklenmez ve bant gösterilmez: oradaki
//   kişiler restoranın müşterisi ya da çalışanıdır, reklam izlemesine konu
//   olmamalıdır.

const PIXEL_ID = "1417151607050534";

const NO_TRACKING_PREFIXES = ["/restoran", "/admin", "/personel", "/sistem", "/odeme", "/odeme-donus", "/api"];

type Consent = { v: number; marketing: boolean; at: string };

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function isTrackedPath(pathname: string) {
  return !NO_TRACKING_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    return parsed?.v === COOKIE_CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function saveConsent(marketing: boolean) {
  const consent: Consent = { v: COOKIE_CONSENT_VERSION, marketing, at: new Date().toISOString() };
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Tarayıcı depolaması kapalıysa tercih yalnızca bu sayfa için geçerli olur.
  }
  return consent;
}

export default function CookieConsent() {
  const pathname = usePathname() || "/";
  const tracked = isTrackedPath(pathname);

  // undefined: henüz okunmadı (sunucu ve ilk çizim), null: tercih yok.
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const [panel, setPanel] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    const stored = readConsent();
    // Tercih tarayıcı depolamasından okunur; ilk çizim sunucuyla aynı kalmalı.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(stored);
    setMarketing(stored?.marketing ?? false);
    // İlk sayfanın görüntülemesini Pixel'in kendisi gönderir.
    lastTracked.current = window.location.pathname;

    function openSettings() {
      setPanel(true);
      setConsent((current) => current ?? null);
    }
    window.addEventListener(COOKIE_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, openSettings);
  }, []);

  const pixelAllowed = tracked && consent?.marketing === true;

  // Sayfa değişimlerinde de sayfa görüntüleme gönderilir (Pixel yüklüyse).
  useEffect(() => {
    if (!pixelAllowed || !window.fbq || lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    window.fbq("track", "PageView");
  }, [pathname, pixelAllowed]);

  function choose(nextMarketing: boolean) {
    const saved = saveConsent(nextMarketing);
    lastTracked.current = pathname;
    setConsent(saved);
    setMarketing(nextMarketing);
    setPanel(false);
    // İzin geri alındıysa yüklenmiş Pixel'in çalışmaya devam etmemesi için sayfa yenilenir.
    if (!nextMarketing && window.fbq) window.location.reload();
  }

  const showBanner = tracked && (consent === null || panel);

  return (
    <>
      {pixelAllowed && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}

      {showBanner && (
        <section className={styles.banner} role="dialog" aria-modal="false" aria-labelledby="cerez-baslik">
          <div className={styles.text}>
            <strong id="cerez-baslik">Çerez tercihleriniz</strong>
            <p>
              Sitenin çalışması için gerekli çerezleri her zaman kullanırız. İzin verirseniz reklamlarımızın
              etkisini ölçmek için Meta Pixel de kullanırız. Ayrıntılar{" "}
              <Link href="/cerez-politikasi">Çerez Politikası</Link>&apos;nda.
            </p>
          </div>

          {panel && (
            <div className={styles.options}>
              <label className={styles.option}>
                <input type="checkbox" checked disabled />
                <span>
                  <b>Zorunlu çerezler</b>
                  <small>Oturum, güvenlik ve tercihlerinizin hatırlanması. Kapatılamaz.</small>
                </span>
              </label>
              <label className={styles.option}>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                />
                <span>
                  <b>Pazarlama çerezleri</b>
                  <small>Meta Pixel: reklamlarımızı gören kişilerin siteyi ziyaret edip etmediğini ölçer.</small>
                </span>
              </label>
            </div>
          )}

          <div className={styles.actions}>
            {panel ? (
              <button type="button" className={styles.primary} onClick={() => choose(marketing)}>
                Seçimimi kaydet
              </button>
            ) : (
              <>
                <button type="button" className={styles.secondary} onClick={() => setPanel(true)}>
                  Ayarlar
                </button>
                <button type="button" className={styles.secondary} onClick={() => choose(false)}>
                  Reddet
                </button>
                <button type="button" className={styles.primary} onClick={() => choose(true)}>
                  Kabul et
                </button>
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}
