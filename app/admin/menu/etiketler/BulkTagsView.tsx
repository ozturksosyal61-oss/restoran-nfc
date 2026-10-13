"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import {
  DIET_TAGS,
  HIGHLIGHT_TAGS,
  SPICY_TAGS,
  normalizeTags,
  tagLabel,
  type ProductTag,
} from "../../../../lib/product-tags";
import AdminIcon from "../../AdminIcon";
import { defaultNewUntil } from "../ProductTagPicker";

export type BulkProduct = {
  id: number;
  category_id: number;
  name: string;
  image_url: string | null;
  is_available: boolean | null;
  tags: string[] | null;
  new_until: string | null;
};

type Category = { id: number; name: string };

type Row = { tags: ProductTag[]; newUntil: string | null };

const GROUPS: { title: string; tags: readonly ProductTag[] }[] = [
  { title: "Öne çıkarma", tags: HIGHLIGHT_TAGS },
  { title: "Acılık", tags: SPICY_TAGS },
  { title: "Beslenme bilgisi", tags: DIET_TAGS },
];

function sameRow(a: Row, b: Row) {
  return a.newUntil === b.newUntil && a.tags.length === b.tags.length && a.tags.every((tag) => b.tags.includes(tag));
}

export default function BulkTagsView({ categories, products }: { categories: Category[]; products: BulkProduct[] }) {
  const router = useRouter();

  const initial = useMemo(
    () =>
      new Map<number, Row>(
        products.map((product) => [
          product.id,
          { tags: normalizeTags(product.tags), newUntil: product.new_until ?? null },
        ])
      ),
    [products]
  );

  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [active, setActive] = useState<ProductTag>("new");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const changed = products.filter((product) => {
    const now = rows.get(product.id);
    const before = saved.get(product.id);
    return now && before && !sameRow(now, before);
  });

  function count(tag: ProductTag) {
    let total = 0;
    rows.forEach((row) => {
      if (row.tags.includes(tag)) total += 1;
    });
    return total;
  }

  function toggle(productId: number) {
    setMessage(null);
    setRows((current) => {
      const next = new Map(current);
      const row = next.get(productId) ?? { tags: [], newUntil: null };
      const has = row.tags.includes(active);
      // Acılık tek seviyedir: yeni seviye eskisinin yerini alır.
      const rest = active.startsWith("spicy_") ? row.tags.filter((tag) => !tag.startsWith("spicy_")) : row.tags;
      const tags = normalizeTags(has ? row.tags.filter((tag) => tag !== active) : [...rest, active]);
      const newUntil = active === "new" ? (has ? null : row.newUntil ?? defaultNewUntil()) : row.newUntil;
      next.set(productId, { tags, newUntil });
      return next;
    });
  }

  async function save() {
    if (saving || changed.length === 0) return;
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const results = await Promise.all(
      changed.map((product) => {
        const row = rows.get(product.id)!;
        return supabase
          .from("products")
          .update({ tags: row.tags, new_until: row.tags.includes("new") ? row.newUntil : null })
          .eq("id", product.id);
      })
    );

    const failed = results.filter((result) => result.error).length;
    setSaving(false);

    if (failed > 0) {
      setMessage({ tone: "error", text: `${failed} ürün kaydedilemedi. Lütfen tekrar deneyin.` });
      return;
    }

    setSaved(new Map(rows));
    setMessage({ tone: "ok", text: `${changed.length} ürünün etiketleri kaydedildi.` });
    router.refresh();
  }

  if (products.length === 0) {
    return (
      <div className="adm-empty">
        <span className="adm-empty-icon"><AdminIcon name="menu" /></span>
        <strong>Henüz ürün yok</strong>
        <p>Ürün ekledikten sonra etiketleri buradan toplu olarak verebilirsiniz.</p>
      </div>
    );
  }

  return (
    <div className="adm-form">
      <section className="adm-card" aria-label="Etiket seçimi">
        {GROUPS.map((group) => (
          <div key={group.title} className="adm-field">
            <span className="adm-label">{group.title}</span>
            <div className="adm-tag-picks" role="radiogroup" aria-label={group.title}>
              {group.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  role="radio"
                  aria-checked={active === tag}
                  className={`adm-chip ${active === tag ? "is-active" : ""}`}
                  onClick={() => setActive(tag)}
                >
                  {tagLabel(tag)}
                  <b>{count(tag)}</b>
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="adm-hint" style={{ margin: 0 }}>
          &quot;Yeni&quot; etiketi verilen ürünlerde etiket 30 gün sonra kendiliğinden kalkar; süreyi ürün
          düzenleme sayfasından değiştirebilirsiniz. &quot;Çok satan&quot; rozeti satışlardan otomatik gelir.
        </p>
      </section>

      {categories.map((category) => {
        const items = products.filter((product) => product.category_id === category.id);
        if (items.length === 0) return null;

        return (
          <section key={category.id} className="adm-card" aria-labelledby={`etiket-kategori-${category.id}`}>
            <div className="adm-card-head">
              <h2 id={`etiket-kategori-${category.id}`}>{category.name}</h2>
            </div>
            <div className="adm-tag-grid">
              {items.map((product) => {
                const row = rows.get(product.id);
                const on = Boolean(row?.tags.includes(active));
                return (
                  <label key={product.id} className={`adm-check ${on ? "is-on" : ""}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(product.id)} />
                    <span className="adm-tag-item">
                      <strong>{product.name}</strong>
                      {row && row.tags.length > 0 && (
                        <span>{row.tags.map((tag) => tagLabel(tag)).join(" · ")}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}

      {message && (
        <p
          className={`adm-alert ${message.tone === "ok" ? "adm-alert-ok" : "adm-alert-error"}`}
          role={message.tone === "ok" ? "status" : "alert"}
          style={{ margin: 0 }}
        >
          <AdminIcon name={message.tone === "ok" ? "check" : "alert"} size={16} />
          {message.text}
        </p>
      )}

      <div className="adm-sticky-actions">
        <span className="adm-hint" style={{ marginInlineEnd: "auto" }}>
          {changed.length > 0 ? `${changed.length} ürün değişti` : "Değişiklik yok"}
        </span>
        <button
          type="button"
          className="adm-btn"
          onClick={() => {
            setRows(saved);
            setMessage(null);
          }}
          disabled={saving || changed.length === 0}
        >
          Vazgeç
        </button>
        <button
          type="button"
          className="adm-btn adm-btn-primary adm-btn-lg"
          onClick={save}
          disabled={saving || changed.length === 0}
        >
          <AdminIcon name="save" size={17} />
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
