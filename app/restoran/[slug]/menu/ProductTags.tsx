"use client";

import type { DisplayLanguage } from "../../../../lib/menu-i18n";
import {
  cardBadges,
  detailsTitle,
  dietNotice,
  filterTitle,
  infoTags,
  spicyLevel,
  tagLabel,
  type DietTag,
  type SpicyTag,
} from "../../../../lib/product-tags";
import type { MenuController, MenuProduct } from "./useMenuController";
import styles from "./ProductTags.module.css";

// Ürün etiketlerinin dört tasarımda ortak parçaları: ürün adının yanındaki
// küçük simgeler, beslenme filtresi ve ürün detayındaki etiket listesi.
// Kart rozetleri her tasarımın kendi rozet stiliyle çizilir (cardBadges).

function Glyph({ name }: { name: "pepper" | DietTag }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "pepper":
      // Dolu kırmızı biber: küçük boyutta da tanınsın.
      return (
        <svg {...common} strokeWidth={1.8}>
          <path
            d="M15.5 8.5c1.6.4 2.5 1.8 2.3 3.6-.5 4.6-5.5 8.4-12.3 8.9-.9.1-1.2-1-.4-1.4 4.2-2 6.6-5.2 7.4-9 .3-1.6 1.6-2.5 3-2.1Z"
            fill="currentColor"
          />
          <path d="M15.5 8.5c0-2 .8-3.6 2.5-4.5" />
        </svg>
      );
    case "vegetarian":
      return (
        <svg {...common}>
          <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" />
          <path d="M5 19 13 11" />
        </svg>
      );
    case "vegan":
      return (
        <svg {...common}>
          <path d="M4 5l8 15 8-15" />
          <path d="M14 5c2-2 4-2 6-1-1 2-3 3-6 1Z" />
        </svg>
      );
    case "gluten_free":
      return (
        <svg {...common}>
          <path d="M12 21V9" />
          <path d="M12 13c-2 0-4-2-4-4 2 0 4 2 4 4Zm0 0c2 0 4-2 4-4-2 0-4 2-4 4Zm0-4c-1.5-1-2-3-1-5 1.5 1 2 3 1 5Z" />
          <path d="M3 3l18 18" />
        </svg>
      );
    case "lactose_free":
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v3l-2 4v11h8V10l-2-4V3" />
          <path d="M3 3l18 18" />
        </svg>
      );
    case "alcohol":
      return (
        <svg {...common}>
          <path d="M7 3h10l-1 7a4 4 0 0 1-8 0L7 3Z" />
          <path d="M12 14v7M8 21h8" />
        </svg>
      );
  }
}

function InfoGlyph({ tag, language }: { tag: SpicyTag | DietTag; language: DisplayLanguage }) {
  const label = tagLabel(tag, language);

  if (tag.startsWith("spicy_")) {
    const level = spicyLevel([tag]);
    return (
      <span className={`${styles.icon} ${styles.spicy}`} role="img" aria-label={label} title={label}>
        {Array.from({ length: level }, (_, index) => (
          <Glyph key={index} name="pepper" />
        ))}
      </span>
    );
  }

  return (
    <span className={styles.icon} role="img" aria-label={label} title={label}>
      <Glyph name={tag as DietTag} />
    </span>
  );
}

// Ürün adının yanında: acılık ve diyet simgeleri.
export function DietIcons({ product, language }: { product: MenuProduct; language: DisplayLanguage }) {
  const tags = infoTags(product.tags);
  if (tags.length === 0) return null;

  return (
    <span className={styles.icons}>
      {tags.map((tag) => (
        <InfoGlyph key={tag} tag={tag} language={language} />
      ))}
    </span>
  );
}

// Arama kutusunun altında: Vejetaryen, Vegan, Glutensiz, Laktozsuz, Acısız.
export function DietFilter({ menu, className = "" }: { menu: MenuController; className?: string }) {
  const { dietFilters, diet, toggleDiet, language } = menu;
  if (dietFilters.length === 0) return null;

  return (
    <div className={`${styles.filter} ${className}`} role="group" aria-label={filterTitle(language)}>
      {dietFilters.map((filter) => {
        const on = diet.includes(filter);
        return (
          <button
            type="button"
            key={filter}
            className={`${styles.pill} ${on ? styles.pillOn : ""}`}
            aria-pressed={on}
            onClick={() => toggleDiet(filter)}
          >
            {filter === "not_spicy" ? (
              <span className={styles.notSpicy} aria-hidden="true">
                <Glyph name="pepper" />
              </span>
            ) : (
              <Glyph name={filter} />
            )}
            {tagLabel(filter, language)}
          </button>
        );
      })}
    </div>
  );
}

// Ürün detayında: rozetler ve beslenme bilgileri yazıyla, altında uyarı.
// listClass / kickerClass tasarımın mevcut etiket listesi stilidir.
export function ProductTagDetails({
  product,
  language,
  kickerClass,
  listClass,
}: {
  product: MenuProduct;
  language: DisplayLanguage;
  kickerClass?: string;
  listClass?: string;
}) {
  const badges = cardBadges(product, 5);
  const info = infoTags(product.tags);
  if (badges.length === 0 && info.length === 0) return null;

  return (
    <div>
      <span className={kickerClass}>{detailsTitle(language)}</span>
      <ul className={listClass}>
        {badges.map((tag) => (
          <li key={tag}>{tagLabel(tag, language)}</li>
        ))}
        {info.map((tag) => (
          <li key={tag} className={styles.detailItem}>
            <InfoGlyph tag={tag} language={language} />
            {tagLabel(tag, language)}
          </li>
        ))}
      </ul>
      {info.some((tag) => !tag.startsWith("spicy_") && tag !== "alcohol") && (
        <p className={styles.notice}>{dietNotice(language)}</p>
      )}
    </div>
  );
}
