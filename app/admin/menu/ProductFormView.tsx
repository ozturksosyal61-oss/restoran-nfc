"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import AdminIcon from "../AdminIcon";

// Yeni ürün ve ürün düzenleme sayfalarının ortak form görünümü.
// Kaydetme mantığı her sayfanın kendisinde kalır.

type Category = { id: number; name: string };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function ProductFormView({
  mode,
  categories,
  categoryId,
  onCategoryId,
  name,
  onName,
  description,
  onDescription,
  ingredients,
  onIngredients,
  allergens,
  onAllergens,
  price,
  onPrice,
  currentImageUrl,
  image,
  onImage,
  isAvailable,
  onAvailable,
  error,
  onError,
  loading,
  onSubmit,
}: {
  mode: "new" | "edit";
  categories: Category[];
  categoryId: string;
  onCategoryId: (value: string) => void;
  name: string;
  onName: (value: string) => void;
  description: string;
  onDescription: (value: string) => void;
  ingredients: string;
  onIngredients: (value: string) => void;
  allergens: string;
  onAllergens: (value: string) => void;
  price: string;
  onPrice: (value: string) => void;
  currentImageUrl?: string | null;
  image: File | null;
  onImage: (file: File | null) => void;
  isAvailable?: boolean;
  onAvailable?: (value: boolean) => void;
  error: string;
  onError: (message: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  // Seçilen dosyanın önizlemesi; bileşen kapanınca adres serbest bırakılır.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreviewUrl(null);
    };
  }, [image]);

  const shownImage = previewUrl || currentImageUrl || null;

  return (
    <main className="adm-page">
      <Link className="adm-back" href="/admin/menu">
        <AdminIcon name="arrowLeft" size={15} />
        Ürünler
      </Link>

      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>{mode === "new" ? "Yeni ürün" : "Ürünü düzenle"}</h1>
          <p>
            {mode === "new"
              ? "Ürün, seçtiğiniz kategorinin sonuna eklenir ve hemen menüde görünür."
              : "Değişiklikler kaydettiğiniz anda müşteri menüsüne yansır."}
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="adm-form">
        <div className="adm-split">
          <section className="adm-card" aria-labelledby="urun-bilgi">
            <div className="adm-card-head">
              <h2 id="urun-bilgi">Ürün bilgileri</h2>
            </div>

            <div className="adm-form-grid">
              <div className="adm-field adm-field-full">
                <label className="adm-label" htmlFor="urun-ad">Ürün adı</label>
                <input
                  id="urun-ad"
                  className="adm-input"
                  type="text"
                  value={name}
                  onChange={(event) => onName(event.target.value)}
                  placeholder="Örn. Izgara köfte"
                  maxLength={120}
                  required
                />
              </div>

              <div className="adm-field">
                <label className="adm-label" htmlFor="urun-kategori">Kategori</label>
                <select
                  id="urun-kategori"
                  className="adm-select"
                  value={categoryId}
                  onChange={(event) => onCategoryId(event.target.value)}
                  required
                >
                  <option value="">Kategori seçin</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="adm-field">
                <label className="adm-label" htmlFor="urun-fiyat">Fiyat</label>
                <div className="adm-input-group">
                  <input
                    id="urun-fiyat"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => onPrice(event.target.value)}
                    placeholder="380"
                    required
                  />
                  <span>₺</span>
                </div>
              </div>

              <div className="adm-field adm-field-full">
                <label className="adm-label" htmlFor="urun-aciklama">
                  Açıklama <em>· isteğe bağlı</em>
                </label>
                <textarea
                  id="urun-aciklama"
                  className="adm-textarea"
                  value={description}
                  onChange={(event) => onDescription(event.target.value)}
                  placeholder="Menüde ürün adının altında görünen kısa tanım"
                  rows={3}
                />
              </div>

              <div className="adm-field">
                <label className="adm-label" htmlFor="urun-icerik">
                  İçindekiler <em>· isteğe bağlı</em>
                </label>
                <textarea
                  id="urun-icerik"
                  className="adm-textarea"
                  value={ingredients}
                  onChange={(event) => onIngredients(event.target.value)}
                  placeholder="Dana kıyma, soğan, maydanoz"
                  rows={3}
                />
                <span className="adm-hint">Virgülle ayırın; menüde etiket olarak görünür.</span>
              </div>

              <div className="adm-field">
                <label className="adm-label" htmlFor="urun-alerjen">
                  Alerjenler <em>· isteğe bağlı</em>
                </label>
                <textarea
                  id="urun-alerjen"
                  className="adm-textarea"
                  value={allergens}
                  onChange={(event) => onAllergens(event.target.value)}
                  placeholder="Gluten, süt ürünü, yumurta"
                  rows={3}
                />
                <span className="adm-hint">Menüde uyarı rengiyle ayrıca gösterilir.</span>
              </div>
            </div>
          </section>

          <div className="adm-form">
            <section className="adm-card" aria-labelledby="urun-foto">
              <div className="adm-card-head">
                <h2 id="urun-foto">Fotoğraf</h2>
              </div>

              <label className="adm-photo">
                {shownImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shownImage} alt="Ürün fotoğrafı önizlemesi" />
                ) : (
                  <span className="adm-photo-empty">
                    <AdminIcon name="image" size={28} />
                    Fotoğraf seçin
                  </span>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="adm-photo-input"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (!file) {
                      onImage(null);
                      return;
                    }
                    if (file.size > MAX_IMAGE_BYTES) {
                      onError("Fotoğraf en fazla 5 MB olabilir.");
                      event.target.value = "";
                      onImage(null);
                      return;
                    }
                    onError("");
                    onImage(file);
                  }}
                />
              </label>
              <span className="adm-hint">
                {image
                  ? `${image.name} · kaydettiğinizde yüklenir`
                  : "JPG, PNG veya WEBP · en fazla 5 MB · kare fotoğraf en iyi görünür"}
              </span>
            </section>

            {onAvailable && (
              <section className="adm-card" aria-label="Menüde görünürlük">
                <label className="adm-switch-row" style={{ margin: 0 }}>
                  <span>
                    <strong>Menüde göster</strong>
                    <small className={isAvailable ? "is-open" : "is-closed"}>
                      {isAvailable ? "Müşteriler görebilir ve sipariş verebilir" : "Menüde gizli"}
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    className="adm-switch"
                    checked={Boolean(isAvailable)}
                    onChange={(event) => onAvailable(event.target.checked)}
                    disabled={loading}
                  />
                </label>
              </section>
            )}
          </div>
        </div>

        {error && (
          <p className="adm-alert adm-alert-error" role="alert" style={{ margin: 0 }}>
            <AdminIcon name="alert" size={16} />
            {error}
          </p>
        )}

        <div className="adm-sticky-actions">
          <Link className="adm-btn" href="/admin/menu">Vazgeç</Link>
          <button type="submit" className="adm-btn adm-btn-primary adm-btn-lg" disabled={loading}>
            <AdminIcon name="save" size={17} />
            {loading ? "Kaydediliyor…" : mode === "new" ? "Ürünü ekle" : "Değişiklikleri kaydet"}
          </button>
        </div>
      </form>
    </main>
  );
}
