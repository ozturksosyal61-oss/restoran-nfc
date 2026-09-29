"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import AdminIcon from "../../AdminIcon";
import { analyzeMenu, importMenu, type DraftCategory } from "./actions";

type Row = DraftCategory["products"][number] & { key: string; include: boolean; exists: boolean };
type Group = { key: string; name: string; include: boolean; rows: Row[] };

const MAX_SIDE = 1800;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

// Telefon fotoğrafları çok büyük olabilir; göndermeden önce küçültülür.
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // Tarayıcı bu biçimi açamadıysa (ör. HEIC) olduğu gibi gönderilir.
    return file;
  }
}

function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function MenuImporter({
  aiReady,
  existingCategories,
  existingProducts,
}: {
  aiReady: boolean;
  existingCategories: string[];
  // "kategori adı|ürün adı" biçiminde, küçük harfle
  existingProducts: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState("");
  const [reading, startReading] = useTransition();
  const [result, importAction, importing] = useActionState(importMenu, null);

  const categorySet = useMemo(() => new Set(existingCategories.map(normalize)), [existingCategories]);
  const productSet = useMemo(() => new Set(existingProducts), [existingProducts]);

  function pickFiles(list: FileList | null) {
    setError("");
    const next = Array.from(list ?? []).filter(
      (file) => file.type.startsWith("image/") || file.type === "application/pdf"
    );
    if (list && next.length < list.length) {
      setError("Yalnızca fotoğraf (JPG, PNG, WEBP) ve PDF dosyaları eklenebilir.");
    }
    setFiles((current) => [...current, ...next].slice(0, 8));
    if (inputRef.current) inputRef.current.value = "";
  }

  function read() {
    if (files.length === 0 || reading) return;
    setError("");

    startReading(async () => {
      const formData = new FormData();
      for (const file of files) formData.append("files", await shrinkImage(file));

      const response = await analyzeMenu(formData);

      if (!response.ok) {
        setError(response.message);
        return;
      }

      setGroups(
        response.categories.map((category, groupIndex) => ({
          key: `g${groupIndex}`,
          name: category.name,
          include: true,
          rows: category.products.map((product, rowIndex) => {
            const exists = productSet.has(`${normalize(category.name)}|${normalize(product.name)}`);
            return { ...product, key: `g${groupIndex}-${rowIndex}`, include: !exists, exists };
          }),
        }))
      );
    });
  }

  function updateGroup(key: string, patch: Partial<Group>) {
    setGroups((current) => current?.map((group) => (group.key === key ? { ...group, ...patch } : group)) ?? null);
  }

  function updateRow(groupKey: string, rowKey: string, patch: Partial<Row>) {
    setGroups(
      (current) =>
        current?.map((group) =>
          group.key === groupKey
            ? { ...group, rows: group.rows.map((row) => (row.key === rowKey ? { ...row, ...patch } : row)) }
            : group
        ) ?? null
    );
  }

  const selected = (groups ?? [])
    .filter((group) => group.include && group.name.trim())
    .map((group) => ({ name: group.name.trim(), products: group.rows.filter((row) => row.include) }))
    .filter((group) => group.products.length > 0);

  const selectedCount = selected.reduce((sum, group) => sum + group.products.length, 0);
  const missingPrice = selected.some((group) => group.products.some((row) => row.price === null));

  const payload = JSON.stringify(
    selected.map((group) => ({
      name: group.name,
      products: group.products.map(({ name, description, price, ingredients, allergens }) => ({
        name,
        description,
        price,
        ingredients,
        allergens,
      })),
    }))
  );

  /* ---------------- Tamamlandı ---------------- */

  if (result?.ok) {
    return (
      <section className="adm-card">
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="check" /></span>
          <strong>{result.message}</strong>
          <p>Ürün fotoğraflarını daha sonra ürünleri düzenleyerek ekleyebilirsiniz.</p>
          <div className="adm-form-actions" style={{ justifyContent: "center" }}>
            <Link className="adm-btn adm-btn-primary" href="/admin/menu">
              <AdminIcon name="menu" size={16} />
              Ürünlere git
            </Link>
            <Link className="adm-btn" href="/admin/menu/diller">
              Menüyü çevir
            </Link>
          </div>
        </div>
      </section>
    );
  }

  /* ---------------- Önizleme ---------------- */

  if (groups) {
    return (
      <form action={importAction} className="adm-imp">
        <input type="hidden" name="payload" value={payload} />

        <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
          <AdminIcon name="info" size={16} />
          Yapay zekâ okuması hatalı olabilir. Adları ve fiyatları kontrol edin; eklemek istemediklerinizin işaretini
          kaldırın.
        </p>

        {groups.map((group) => {
          const existingCategory = categorySet.has(normalize(group.name));
          const groupId = `imp-cat-${group.key}`;
          return (
            <section key={group.key} className={`adm-card adm-imp-group ${group.include ? "" : "is-off"}`}>
              <div className="adm-imp-group-head">
                <input
                  type="checkbox"
                  checked={group.include}
                  onChange={(event) => updateGroup(group.key, { include: event.target.checked })}
                  aria-label={`${group.name} kategorisini ekle`}
                />
                <label className="adm-sr" htmlFor={groupId}>Kategori adı</label>
                <input
                  id={groupId}
                  className="adm-input adm-imp-cat"
                  value={group.name}
                  onChange={(event) => updateGroup(group.key, { name: event.target.value })}
                  maxLength={60}
                />
                <span className={`adm-badge ${existingCategory ? "s-accent" : "s-ok"}`}>
                  {existingCategory ? "Mevcut kategoriye" : "Yeni kategori"}
                </span>
              </div>

              <div className="adm-table-wrap">
                <table className="adm-table adm-imp-table">
                  <thead>
                    <tr>
                      <th scope="col"><span className="adm-sr">Ekle</span></th>
                      <th scope="col">Ürün</th>
                      <th scope="col">Açıklama</th>
                      <th scope="col">Fiyat (₺)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={row.key} className={row.include ? "" : "is-off"}>
                        <td>
                          <input
                            type="checkbox"
                            checked={row.include}
                            onChange={(event) => updateRow(group.key, row.key, { include: event.target.checked })}
                            aria-label={`${row.name} ürününü ekle`}
                            disabled={!group.include}
                          />
                        </td>
                        <td>
                          <input
                            className="adm-input"
                            value={row.name}
                            onChange={(event) => updateRow(group.key, row.key, { name: event.target.value })}
                            aria-label="Ürün adı"
                            maxLength={120}
                          />
                          {row.exists && <small className="adm-imp-note">Menünüzde zaten var</small>}
                        </td>
                        <td>
                          <input
                            className="adm-input"
                            value={row.description}
                            onChange={(event) => updateRow(group.key, row.key, { description: event.target.value })}
                            aria-label="Açıklama"
                            placeholder="—"
                            maxLength={500}
                          />
                        </td>
                        <td>
                          <input
                            className={`adm-input adm-imp-price ${row.price === null && row.include ? "is-missing" : ""}`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            value={row.price ?? ""}
                            onChange={(event) =>
                              updateRow(group.key, row.key, {
                                price: event.target.value === "" ? null : Number(event.target.value),
                              })
                            }
                            aria-label="Fiyat"
                            placeholder="Fiyat"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        {result && !result.ok && (
          <p className="adm-alert adm-alert-error" role="alert" style={{ margin: 0 }}>
            <AdminIcon name="alert" size={16} />
            {result.message}
          </p>
        )}

        <div className="adm-sticky-actions">
          <span>
            {selectedCount} ürün eklenecek
            {missingPrice && <b className="adm-text-danger"> · fiyatı eksik ürünler var</b>}
          </span>
          <button
            type="button"
            className="adm-btn"
            onClick={() => {
              setGroups(null);
              setFiles([]);
            }}
            disabled={importing}
          >
            Baştan başla
          </button>
          <button
            type="submit"
            className="adm-btn adm-btn-primary"
            disabled={importing || selectedCount === 0 || missingPrice}
          >
            <AdminIcon name="plus" size={16} />
            {importing ? "Ekleniyor…" : "Menüye ekle"}
          </button>
        </div>
      </form>
    );
  }

  /* ---------------- Dosya seçimi ---------------- */

  return (
    <section className="adm-card" aria-labelledby="aktar-baslik">
      <div className="adm-card-head">
        <div>
          <h2 id="aktar-baslik">Menünüzü yükleyin</h2>
          <p>Basılı menünüzün fotoğraflarını (en fazla 8 sayfa) ya da PDF dosyasını seçin.</p>
        </div>
      </div>

      {!aiReady && (
        <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
          <AdminIcon name="info" size={16} />
          Menü aktarma şu an kullanılamıyor. Lütfen OZT Digital ile iletişime geçin.
        </p>
      )}

      <label className={`adm-imp-drop ${reading ? "is-busy" : ""}`}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={(event) => pickFiles(event.target.files)}
          disabled={!aiReady || reading}
        />
        <span className="adm-empty-icon"><AdminIcon name="image" /></span>
        <strong>Fotoğraf ya da PDF seçin</strong>
        <small>Telefondan menünün fotoğrafını çekebilirsiniz. Işık iyi, yazılar net olsun.</small>
      </label>

      {files.length > 0 && (
        <ul className="adm-list adm-imp-files">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="adm-row">
              <span className="adm-row-icon">
                <AdminIcon name={file.type === "application/pdf" ? "menu" : "image"} size={16} />
              </span>
              <span className="adm-row-main">
                <strong>{file.name}</strong>
                <small>{formatSize(file.size)}</small>
              </span>
              <button
                type="button"
                className="adm-btn adm-btn-sm adm-btn-ghost"
                onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                disabled={reading}
                aria-label={`${file.name} dosyasını kaldır`}
              >
                <AdminIcon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="adm-alert adm-alert-error" role="alert" style={{ margin: 0 }}>
          <AdminIcon name="alert" size={16} />
          {error}
        </p>
      )}

      <div className="adm-form-actions">
        <button
          type="button"
          className="adm-btn adm-btn-primary"
          onClick={read}
          disabled={!aiReady || files.length === 0 || reading}
        >
          <AdminIcon name="refresh" size={16} />
          {reading ? "Menü okunuyor… (yarım dakika kadar)" : "Menüyü oku"}
        </button>
      </div>
    </section>
  );
}
