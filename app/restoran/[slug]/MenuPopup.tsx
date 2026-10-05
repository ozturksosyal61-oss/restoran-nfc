"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { normalizePopup, popupIsLive, safeUrl, todayInTurkey } from "../../../lib/menu-popup";
import styles from "./MenuPopup.module.css";

// Müşteri menüyü açtığında gösterilen duyuru penceresi (panelden ayarlanır).
// Yalnızca menü sayfasında, ayarlanan sıklıkta (her açılışta / günde bir /
// bir kez) çıkar. Tercih telefonun tarayıcısında tutulur.

const DAY = 24 * 60 * 60 * 1000;

function scrollToCategory(categoryId: number) {
  const target =
    document.getElementById(`kategori-${categoryId}`) ?? document.getElementById(`category-${categoryId}`);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function MenuPopup({
  restaurantId,
  popup: rawPopup,
  instagramUrl,
  preview = false,
}: {
  restaurantId: number;
  popup: unknown;
  instagramUrl?: string | null;
  // Panel önizlemesi: her zaman gösterilir, sıklık kaydı tutulmaz.
  preview?: boolean;
}) {
  const pathname = usePathname() || "";
  const popup = normalizePopup(rawPopup);
  const [open, setOpen] = useState(preview);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onMenu = /\/restoran\/[^/]+\/menu\/?$/.test(pathname);
  const storageKey = `ozt_popup_${restaurantId}_${popup.version}`;

  useEffect(() => {
    if (preview || !onMenu || !popupIsLive(popup, todayInTurkey())) return;
    let last = 0;
    try {
      last = Number(window.localStorage.getItem(storageKey) || 0);
    } catch {
      last = 0;
    }
    if (popup.frequency === "once" && last > 0) return;
    if (popup.frequency === "daily" && last > 0 && Date.now() - last < DAY) return;

    // Menü yerleşsin diye kısa bir gecikmeyle açılır.
    const timer = window.setTimeout(() => {
      setOpen(true);
      try {
        window.localStorage.setItem(storageKey, String(Date.now()));
      } catch {
        // Depolama kapalıysa her açılışta gösterilir.
      }
    }, 700);
    return () => window.clearTimeout(timer);
    // Ayar değişince (version) yeniden değerlendirilir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMenu, storageKey, preview]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const link =
    popup.linkType === "url"
      ? popup.url
      : popup.linkType === "instagram"
        ? safeUrl(instagramUrl)
        : null;
  const hasAction = Boolean(popup.buttonLabel) && (popup.linkType === "category" ? popup.categoryId !== null : Boolean(link));

  function act() {
    setOpen(false);
    if (preview) return;
    if (popup.linkType === "category" && popup.categoryId) {
      window.setTimeout(() => scrollToCategory(popup.categoryId!), 120);
    }
  }

  return (
    <div className={`${styles.backdrop} ${preview ? styles.inline : ""}`} onClick={() => !preview && setOpen(false)}>
      <section
        className={styles.card}
        role="dialog"
        aria-modal={preview ? undefined : true}
        aria-labelledby={popup.title ? "menu-duyuru-baslik" : undefined}
        aria-label={popup.title ? undefined : "Duyuru"}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Kapat"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </button>

        {popup.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- işletmenin yüklediği duyuru görseli
          <img className={styles.image} src={popup.imageUrl} alt={popup.title || "Restoran duyurusu görseli"} />
        )}

        <div className={styles.body}>
          {popup.title && (
            <h2 id="menu-duyuru-baslik" className={styles.title}>
              {popup.title}
            </h2>
          )}
          {popup.text && <p className={styles.text}>{popup.text}</p>}

          <div className={styles.actions}>
            {hasAction &&
              (link ? (
                <a className={styles.primary} href={link} target="_blank" rel="noopener noreferrer" onClick={act}>
                  {popup.buttonLabel}
                </a>
              ) : (
                <button type="button" className={styles.primary} onClick={act}>
                  {popup.buttonLabel}
                </button>
              ))}
            <button type="button" className={hasAction ? styles.secondary : styles.primary} onClick={() => setOpen(false)}>
              {hasAction ? "Menüye geç" : "Tamam"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
