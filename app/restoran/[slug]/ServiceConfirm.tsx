"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { DisplayLanguage } from "../../../lib/menu-i18n";
import type { TableRequestType } from "./aurora-utils";
import styles from "./ServiceConfirm.module.css";

// Garson çağırma / hesap isteme onayı: alttan açılan, restoranın paletiyle
// çizilen küçük pencere. Paletin renk ve yazı tipi değişkenleri restoran
// kabuğunda ([data-palette]) tanımlı olduğu için pencere oraya eklenir.

type Texts = { title: string; text: string; confirm: string; cancel: string };

const TEXTS: Record<DisplayLanguage, Record<TableRequestType, Texts>> = {
  tr: {
    garson: { title: "Garson çağrılsın mı?", text: "Garsonunuz masanıza gelecek.", confirm: "Garsonu çağır", cancel: "Vazgeç" },
    hesap: { title: "Hesap istensin mi?", text: "Hesabınız masanıza getirilecek.", confirm: "Hesabı iste", cancel: "Vazgeç" },
  },
  en: {
    garson: { title: "Call a waiter?", text: "A waiter will come to your table.", confirm: "Call waiter", cancel: "Cancel" },
    hesap: { title: "Ask for the bill?", text: "Your bill will be brought to your table.", confirm: "Ask for bill", cancel: "Cancel" },
  },
  de: {
    garson: { title: "Bedienung rufen?", text: "Die Bedienung kommt an Ihren Tisch.", confirm: "Bedienung rufen", cancel: "Abbrechen" },
    hesap: { title: "Rechnung anfordern?", text: "Die Rechnung wird an Ihren Tisch gebracht.", confirm: "Rechnung anfordern", cancel: "Abbrechen" },
  },
  ru: {
    garson: { title: "Позвать официанта?", text: "Официант подойдёт к вашему столу.", confirm: "Позвать", cancel: "Отмена" },
    hesap: { title: "Попросить счёт?", text: "Счёт принесут к вашему столу.", confirm: "Попросить счёт", cancel: "Отмена" },
  },
  ar: {
    garson: { title: "استدعاء النادل؟", text: "سيأتي النادل إلى طاولتك.", confirm: "استدعاء النادل", cancel: "إلغاء" },
    hesap: { title: "طلب الفاتورة؟", text: "سيتم إحضار الفاتورة إلى طاولتك.", confirm: "طلب الفاتورة", cancel: "إلغاء" },
  },
  fr: {
    garson: { title: "Appeler un serveur ?", text: "Un serveur viendra à votre table.", confirm: "Appeler le serveur", cancel: "Annuler" },
    hesap: { title: "Demander l'addition ?", text: "L'addition sera apportée à votre table.", confirm: "Demander l'addition", cancel: "Annuler" },
  },
};

function Glyph({ type }: { type: TableRequestType }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {type === "garson" ? (
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 21h4" />
      ) : (
        <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3zM9 8h6M9 12h6M9 16h3" />
      )}
    </svg>
  );
}

function Sheet({
  type,
  language,
  onClose,
}: {
  type: TableRequestType;
  language: DisplayLanguage;
  onClose: (confirmed: boolean) => void;
}) {
  const texts = (TEXTS[language] ?? TEXTS.tr)[type];
  const sheetRef = useRef<HTMLDivElement>(null);

  // Odak pencereye alınır (ekran okuyucu başlığı okur); düğmede halka çıkmaz.
  useEffect(() => {
    sheetRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={() => onClose(false)} dir={language === "ar" ? "rtl" : "ltr"}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={styles.sheet}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hizmet-onay-baslik"
        aria-describedby="hizmet-onay-metin"
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.handle} aria-hidden="true" />
        <span className={styles.icon}>
          <Glyph type={type} />
        </span>
        <h2 id="hizmet-onay-baslik">{texts.title}</h2>
        <p id="hizmet-onay-metin">{texts.text}</p>
        <button type="button" className={styles.confirm} onClick={() => onClose(true)}>
          {texts.confirm}
        </button>
        <button type="button" className={styles.cancel} onClick={() => onClose(false)}>
          {texts.cancel}
        </button>
      </div>
    </div>
  );
}

// Pencereyi açar; müşteri onaylarsa true döner.
export function confirmService(type: TableRequestType, language: DisplayLanguage = "tr"): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.querySelector("[data-palette]") ?? document.querySelector(".restaurant-shell") ?? document.body;
    const container = document.createElement("div");
    host.appendChild(container);
    const root = createRoot(container);
    const previousFocus = document.activeElement as HTMLElement | null;

    const close = (confirmed: boolean) => {
      root.unmount();
      container.remove();
      previousFocus?.focus?.();
      resolve(confirmed);
    };

    root.render(<Sheet type={type} language={language} onClose={close} />);
  });
}
