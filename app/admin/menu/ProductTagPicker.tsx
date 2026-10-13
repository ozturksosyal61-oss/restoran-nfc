"use client";

import {
  DIET_TAGS,
  HIGHLIGHT_TAGS,
  SPICY_TAGS,
  normalizeTags,
  spicyLevel,
  tagLabel,
  todayInTurkey,
  type ProductTag,
} from "../../../lib/product-tags";

// Ürün formundaki etiket seçimi: öne çıkarma rozetleri, acılık ve
// beslenme bilgileri. "Yeni" seçilince bitiş günü sorulur.

// "Yeni" için varsayılan süre.
export const NEW_TAG_DAYS = 30;

export function defaultNewUntil() {
  const date = new Date();
  date.setDate(date.getDate() + NEW_TAG_DAYS);
  return todayInTurkey(date);
}

export default function ProductTagPicker({
  tags,
  onTags,
  newUntil,
  onNewUntil,
  disabled,
}: {
  tags: ProductTag[];
  onTags: (tags: ProductTag[]) => void;
  newUntil: string;
  onNewUntil: (value: string) => void;
  disabled?: boolean;
}) {
  const level = spicyLevel(tags);

  function toggle(tag: ProductTag) {
    const next = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
    if (tag === "new" && !tags.includes("new") && !newUntil) onNewUntil(defaultNewUntil());
    onTags(normalizeTags(next));
  }

  function setSpicy(nextLevel: number) {
    const rest = tags.filter((tag) => !tag.startsWith("spicy_"));
    onTags(normalizeTags(nextLevel > 0 ? [...rest, SPICY_TAGS[nextLevel - 1]] : rest));
  }

  return (
    <div className="adm-form" style={{ gap: 14 }}>
      <div className="adm-field">
        <span className="adm-label">Öne çıkarma</span>
        <div className="adm-tag-picks" role="group" aria-label="Öne çıkarma etiketleri">
          {HIGHLIGHT_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`adm-chip ${tags.includes(tag) ? "is-active" : ""}`}
              aria-pressed={tags.includes(tag)}
              onClick={() => toggle(tag)}
              disabled={disabled}
            >
              {tagLabel(tag)}
            </button>
          ))}
        </div>
        <span className="adm-hint">Kartta rozet olarak görünür; kampanya etiketiyle birlikte en fazla 2 rozet.</span>
      </div>

      {tags.includes("new") && (
        <div className="adm-field">
          <label className="adm-label" htmlFor="urun-yeni-bitis">
            &quot;Yeni&quot; etiketi şu güne kadar <em>· boş bırakılırsa kalıcı</em>
          </label>
          <input
            id="urun-yeni-bitis"
            className="adm-input"
            type="date"
            value={newUntil}
            min={todayInTurkey()}
            onChange={(event) => onNewUntil(event.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      <div className="adm-field">
        <span className="adm-label">Acılık</span>
        <div className="adm-seg" role="radiogroup" aria-label="Acılık">
          {["Yok", "Az", "Orta", "Çok"].map((label, index) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={level === index}
              className={level === index ? "is-active" : ""}
              onClick={() => setSpicy(index)}
              disabled={disabled}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-field">
        <span className="adm-label">Beslenme bilgisi</span>
        <div className="adm-tag-picks" role="group" aria-label="Beslenme bilgisi">
          {DIET_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`adm-chip ${tags.includes(tag) ? "is-active" : ""}`}
              aria-pressed={tags.includes(tag)}
              onClick={() => toggle(tag)}
              disabled={disabled}
            >
              {tagLabel(tag)}
            </button>
          ))}
        </div>
        <span className="adm-hint">
          Menüde simge olarak görünür; Pro paketinde müşteri bunlara göre filtreleyebilir. Beyan işletmenin
          sorumluluğundadır.
        </span>
      </div>
    </div>
  );
}
