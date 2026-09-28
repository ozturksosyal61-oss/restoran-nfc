"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabase/client";
import AdminIcon from "../../AdminIcon";

type Product = {
  id: number;
  category_id: number;
  name: string;
  price: number;
};

type Category = {
  id: number;
  name: string;
};

type Promotion = {
  id: number;
  restaurant_id: number;
  product_id: number | null;
  category_id: number | null;
  title: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  is_popular: boolean;
  created_at: string;
};

type FormState = {
  title: string;
  description: string;
  targetType: "product" | "category";
  productId: string;
  categoryId: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  isPopular: boolean;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  targetType: "product",
  productId: "",
  categoryId: "",
  discountType: "percentage",
  discountValue: "",
  startAt: "",
  endAt: "",
  isActive: true,
  isPopular: false,
};

function formatPrice(value: number) {
  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null) {
  if (!value) return "Süresiz";

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInputValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const pad = (number: number) =>
    String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function calculateDiscountedPrice(
  price: number,
  type: "percentage" | "fixed",
  value: number
) {
  if (type === "percentage") {
    return Math.max(
      0,
      price - price * (value / 100)
    );
  }

  return Math.max(0, price - value);
}

export default function PromotionsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [restaurantId, setRestaurantId] =
    useState<number | null>(null);

  const [restaurantName, setRestaurantName] =
    useState("Restoran");

  const [products, setProducts] =
    useState<Product[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [promotions, setPromotions] =
    useState<Promotion[]>([]);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        setError(
          "Oturum bulunamadı. Lütfen tekrar giriş yapın."
        );
        return;
      }

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("restaurant_users")
        .select("restaurant_id")
        .eq("user_id", user.id)
        .single();

      if (
        membershipError ||
        !membership?.restaurant_id
      ) {
        setError(
          "İşletme bağlantısı bulunamadı."
        );
        return;
      }

      const id = Number(
        membership.restaurant_id
      );

      setRestaurantId(id);

      const [
        restaurantResult,
        categoriesResult,
        productsResult,
        promotionsResult,
      ] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id, name")
          .eq("id", id)
          .single(),

        supabase
          .from("categories")
          .select("id, name")
          .eq("restaurant_id", id)
          .order("sort_order", {
            ascending: true,
          }),

        supabase
          .from("products")
          .select(
            "id, category_id, name, price"
          )
          .in(
            "category_id",
            (
              await supabase
                .from("categories")
                .select("id")
                .eq("restaurant_id", id)
            ).data?.map(
              (category) => category.id
            ) || [-1]
          )
          .order("sort_order", {
            ascending: true,
          }),

        supabase
          .from("promotions")
          .select(
            `
              id,
              restaurant_id,
              product_id,
              category_id,
              title,
              description,
              discount_type,
              discount_value,
              start_at,
              end_at,
              is_active,
              is_popular,
              created_at
            `
          )
          .eq("restaurant_id", id)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (restaurantResult.error) {
        throw restaurantResult.error;
      }

      if (categoriesResult.error) {
        throw categoriesResult.error;
      }

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (promotionsResult.error) {
        throw promotionsResult.error;
      }

      setRestaurantName(
        restaurantResult.data?.name ||
          "Restoran"
      );

      setCategories(
        (categoriesResult.data ||
          []) as Category[]
      );

      setProducts(
        (productsResult.data ||
          []) as Product[]
      );

      setPromotions(
        (promotionsResult.data ||
          []) as Promotion[]
      );
    } catch (loadError) {
      console.error(loadError);

      setError(
        "Kampanya bilgileri yüklenemedi."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(
    promotion: Promotion
  ) {
    setEditingId(promotion.id);

    setForm({
      title: promotion.title,
      description:
        promotion.description || "",
      targetType: promotion.product_id
        ? "product"
        : "category",
      productId: promotion.product_id
        ? String(promotion.product_id)
        : "",
      categoryId: promotion.category_id
        ? String(promotion.category_id)
        : "",
      discountType:
        promotion.discount_type,
      discountValue: String(
        promotion.discount_value
      ),
      startAt: toLocalInputValue(
        promotion.start_at
      ),
      endAt: toLocalInputValue(
        promotion.end_at
      ),
      isActive: promotion.is_active,
      isPopular: promotion.is_popular,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!restaurantId) {
      setError(
        "Restoran bilgisi bulunamadı."
      );
      return;
    }

    if (!form.title.trim()) {
      setError(
        "Kampanya başlığı zorunludur."
      );
      return;
    }

    const discountValue = Number(
      form.discountValue
    );

    if (
      !Number.isFinite(discountValue) ||
      discountValue <= 0
    ) {
      setError(
        "İndirim değeri 0'dan büyük olmalıdır."
      );
      return;
    }

    if (
      form.discountType ===
        "percentage" &&
      discountValue > 100
    ) {
      setError(
        "Yüzde indirim 100'den büyük olamaz."
      );
      return;
    }

    if (
      form.targetType === "product" &&
      !form.productId
    ) {
      setError(
        "Lütfen kampanya uygulanacak ürünü seçin."
      );
      return;
    }

    if (
      form.targetType === "category" &&
      !form.categoryId
    ) {
      setError(
        "Lütfen kampanya uygulanacak kategoriyi seçin."
      );
      return;
    }

    if (
      form.startAt &&
      form.endAt &&
      new Date(form.endAt) <
        new Date(form.startAt)
    ) {
      setError(
        "Bitiş tarihi başlangıç tarihinden önce olamaz."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        restaurant_id: restaurantId,
        product_id:
          form.targetType === "product"
            ? Number(form.productId)
            : null,
        category_id:
          form.targetType === "category"
            ? Number(form.categoryId)
            : null,
        title: form.title.trim(),
        description:
          form.description.trim() || null,
        discount_type:
          form.discountType,
        discount_value:
          discountValue,
        start_at: form.startAt
          ? new Date(
              form.startAt
            ).toISOString()
          : null,
        end_at: form.endAt
          ? new Date(
              form.endAt
            ).toISOString()
          : null,
        is_active: form.isActive,
        is_popular: form.isPopular,
      };

      if (editingId) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from("promotions")
          .update(payload)
          .eq("id", editingId)
          .eq(
            "restaurant_id",
            restaurantId
          )
          .select(
            `
              id,
              restaurant_id,
              product_id,
              category_id,
              title,
              description,
              discount_type,
              discount_value,
              start_at,
              end_at,
              is_active,
              is_popular,
              created_at
            `
          )
          .single();

        if (updateError) {
          throw updateError;
        }

        setPromotions((current) =>
          current.map((promotion) =>
            promotion.id === editingId
              ? (data as Promotion)
              : promotion
          )
        );

        setMessage(
          "Kampanya başarıyla güncellendi."
        );
      } else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("promotions")
          .insert(payload)
          .select(
            `
              id,
              restaurant_id,
              product_id,
              category_id,
              title,
              description,
              discount_type,
              discount_value,
              start_at,
              end_at,
              is_active,
              is_popular,
              created_at
            `
          )
          .single();

        if (insertError) {
          throw insertError;
        }

        setPromotions((current) => [
          data as Promotion,
          ...current,
        ]);

        setMessage(
          "Kampanya başarıyla oluşturuldu."
        );
      }

      resetForm();
    } catch (saveError) {
      console.error(saveError);

      setError(
        "Kampanya kaydedilemedi: " +
          (saveError instanceof Error
            ? saveError.message
            : "Bilinmeyen hata")
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePromotion(
    promotion: Promotion
  ) {
    if (!restaurantId) return;

    setError("");
    setMessage("");

    const {
      data,
      error: updateError,
    } = await supabase
      .from("promotions")
      .update({
        is_active:
          !promotion.is_active,
      })
      .eq("id", promotion.id)
      .eq(
        "restaurant_id",
        restaurantId
      )
      .select(
        "id, is_active"
      )
      .single();

    if (updateError) {
      setError(
        "Kampanya durumu değiştirilemedi: " +
          updateError.message
      );
      return;
    }

    setPromotions((current) =>
      current.map((item) =>
        item.id === promotion.id
          ? {
              ...item,
              is_active:
                data.is_active,
            }
          : item
      )
    );
  }

  async function deletePromotion(
    promotion: Promotion
  ) {
    if (!restaurantId) return;

    const confirmed =
      window.confirm(
        `"${promotion.title}" kampanyasını silmek istediğinize emin misiniz?`
      );

    if (!confirmed) return;

    setDeletingId(promotion.id);
    setError("");
    setMessage("");

    const { error: deleteError } =
      await supabase
        .from("promotions")
        .delete()
        .eq("id", promotion.id)
        .eq(
          "restaurant_id",
          restaurantId
        );

    if (deleteError) {
      setError(
        "Kampanya silinemedi: " +
          deleteError.message
      );
      setDeletingId(null);
      return;
    }

    setPromotions((current) =>
      current.filter(
        (item) =>
          item.id !== promotion.id
      )
    );

    if (editingId === promotion.id) {
      resetForm();
    }

    setMessage(
      "Kampanya silindi."
    );

    setDeletingId(null);
  }

  function getTargetName(
    promotion: Promotion
  ) {
    if (promotion.product_id) {
      return (
        products.find(
          (product) =>
            product.id ===
            promotion.product_id
        )?.name ||
        `Ürün #${promotion.product_id}`
      );
    }

    if (promotion.category_id) {
      return (
        categories.find(
          (category) =>
            category.id ===
            promotion.category_id
        )?.name ||
        `Kategori #${promotion.category_id}`
      );
    }

    return "Tanımsız hedef";
  }

  function getDiscountText(
    promotion: Promotion
  ) {
    return promotion.discount_type ===
      "percentage"
      ? `%${formatPrice(
          promotion.discount_value
        )}`
      : `${formatPrice(
          promotion.discount_value
        )} TL`;
  }

  const selectedProduct = products.find(
    (product) =>
      product.id ===
      Number(form.productId)
  );

  const previewPrice = selectedProduct
    ? calculateDiscountedPrice(
        Number(selectedProduct.price),
        form.discountType,
        Number(form.discountValue) || 0
      )
    : null;

  const activeCount = promotions.filter((promotion) => promotion.is_active).length;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Menü</span>
          <h1>Kampanyalar</h1>
          <p>{restaurantName} için indirimleri ve öne çıkan ürünleri yönetin.</p>
        </div>
        <span className="adm-badge s-ok is-dot">{activeCount} aktif kampanya</span>
      </header>

      {message && (
        <p className="adm-alert adm-alert-ok" role="status">
          <AdminIcon name="check" size={16} />
          {message.replace(/^[✓✅]\s*/, "")}
        </p>
      )}

      {error && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          {error}
        </p>
      )}

      <div className="adm-split">
        {/* ============ LİSTE ============ */}
        <section className="adm-section" aria-labelledby="kampanya-listesi">
          <div className="adm-section-head">
            <div>
              <h2 id="kampanya-listesi">Tanımlı kampanyalar</h2>
              <p>{promotions.length} kayıt</p>
            </div>
          </div>

          {loading ? (
            <p className="adm-hint">Kampanyalar yükleniyor…</p>
          ) : promotions.length === 0 ? (
            <div className="adm-empty">
              <span className="adm-empty-icon"><AdminIcon name="promo" /></span>
              <strong>Henüz kampanya yok</strong>
              <p>Sağdaki formdan ilk kampanyanızı oluşturun; ürün ya da kategori bazında indirim tanımlayabilirsiniz.</p>
            </div>
          ) : (
            <div className="adm-reviews">
              {promotions.map((promotion) => (
                <article
                  key={promotion.id}
                  className={`adm-card adm-promo ${promotion.is_active ? "" : "is-off"} ${editingId === promotion.id ? "is-editing" : ""}`}
                >
                  <div className="adm-promo-top">
                    <span className="adm-promo-value">{getDiscountText(promotion)}</span>
                    <span className="adm-row-main">
                      <strong>
                        {promotion.title}
                        {promotion.is_popular && (
                          <span className="adm-badge s-accent">
                            <AdminIcon name="star" size={11} /> Popüler
                          </span>
                        )}
                      </strong>
                      <small>{getTargetName(promotion)}</small>
                    </span>
                    <span className={`adm-badge is-dot ${promotion.is_active ? "s-ok" : "s-delivered"}`}>
                      {promotion.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </div>

                  {promotion.description && <p className="adm-review-text">{promotion.description}</p>}

                  <div className="adm-review-foot">
                    <span className="adm-muted" style={{ fontSize: 12.5 }}>
                      <AdminIcon name="calendar" size={14} />{" "}
                      {formatDate(promotion.start_at)} → {formatDate(promotion.end_at)}
                    </span>
                    <span className="adm-review-actions">
                      <button type="button" className="adm-btn adm-btn-sm" onClick={() => togglePromotion(promotion)}>
                        <AdminIcon name={promotion.is_active ? "eyeOff" : "eye"} size={15} />
                        {promotion.is_active ? "Durdur" : "Başlat"}
                      </button>
                      <button type="button" className="adm-btn adm-btn-sm" onClick={() => startEdit(promotion)}>
                        <AdminIcon name="edit" size={15} />
                        Düzenle
                      </button>
                      <button
                        type="button"
                        className="adm-btn adm-btn-sm adm-btn-icon adm-btn-ghost adm-text-danger"
                        disabled={deletingId === promotion.id}
                        onClick={() => deletePromotion(promotion)}
                        aria-label="Kampanyayı sil"
                        title="Sil"
                      >
                        <AdminIcon name="trash" size={15} />
                      </button>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ============ FORM ============ */}
        <section className="adm-card adm-sticky-card adm-split-side" aria-labelledby="kampanya-form">
          <div className="adm-card-head">
            <div>
              <h2 id="kampanya-form">{editingId ? "Kampanyayı düzenle" : "Yeni kampanya"}</h2>
              <p>{editingId ? "Değişiklikler kaydedince uygulanır." : "Ürün ya da kategori için indirim tanımlayın."}</p>
            </div>
            {editingId && (
              <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={resetForm}>
                Vazgeç
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="adm-form">
            <div className="adm-field">
              <label className="adm-label" htmlFor="kampanya-baslik">Başlık</label>
              <input
                id="kampanya-baslik"
                className="adm-input"
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Örn. Hafta sonu %20 indirim"
                required
              />
            </div>

            <div className="adm-field">
              <label className="adm-label" htmlFor="kampanya-aciklama">
                Açıklama <em>· isteğe bağlı</em>
              </label>
              <input
                id="kampanya-aciklama"
                className="adm-input"
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Kısa açıklama"
              />
            </div>

            <div className="adm-field">
              <span className="adm-label">Hedef</span>
              <div className="adm-seg" role="radiogroup" aria-label="Kampanya hedefi" style={{ width: "100%" }}>
                {(["product", "category"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={form.targetType === type}
                    className={form.targetType === type ? "is-active" : ""}
                    style={{ flex: 1 }}
                    onClick={() => setForm((current) => ({ ...current, targetType: type, productId: "", categoryId: "" }))}
                  >
                    {type === "product" ? "Tek ürün" : "Kategori"}
                  </button>
                ))}
              </div>
            </div>

            {form.targetType === "product" ? (
              <div className="adm-field">
                <label className="adm-label" htmlFor="kampanya-urun">Ürün</label>
                <select
                  id="kampanya-urun"
                  className="adm-select"
                  value={form.productId}
                  onChange={(event) => update("productId", event.target.value)}
                  required
                >
                  <option value="">Ürün seçin</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} — {formatPrice(Number(product.price))} ₺
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="adm-field">
                <label className="adm-label" htmlFor="kampanya-kategori">Kategori</label>
                <select
                  id="kampanya-kategori"
                  className="adm-select"
                  value={form.categoryId}
                  onChange={(event) => update("categoryId", event.target.value)}
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
            )}

            <div className="adm-form-grid">
              <div className="adm-field">
                <label className="adm-label" htmlFor="kampanya-tip">İndirim tipi</label>
                <select
                  id="kampanya-tip"
                  className="adm-select"
                  value={form.discountType}
                  onChange={(event) => update("discountType", event.target.value as "percentage" | "fixed")}
                >
                  <option value="percentage">Yüzde</option>
                  <option value="fixed">Sabit tutar</option>
                </select>
              </div>
              <div className="adm-field">
                <label className="adm-label" htmlFor="kampanya-deger">İndirim</label>
                <div className="adm-input-group">
                  <input
                    id="kampanya-deger"
                    type="number"
                    min="0.01"
                    max={form.discountType === "percentage" ? "100" : undefined}
                    step="0.01"
                    inputMode="decimal"
                    value={form.discountValue}
                    onChange={(event) => update("discountValue", event.target.value)}
                    placeholder={form.discountType === "percentage" ? "20" : "50"}
                    required
                  />
                  <span>{form.discountType === "percentage" ? "%" : "₺"}</span>
                </div>
              </div>
              <div className="adm-field">
                <label className="adm-label" htmlFor="kampanya-bas">Başlangıç <em>· boşsa hemen</em></label>
                <input
                  id="kampanya-bas"
                  className="adm-input"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(event) => update("startAt", event.target.value)}
                />
              </div>
              <div className="adm-field">
                <label className="adm-label" htmlFor="kampanya-bit">Bitiş <em>· boşsa süresiz</em></label>
                <input
                  id="kampanya-bit"
                  className="adm-input"
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(event) => update("endAt", event.target.value)}
                />
              </div>
            </div>

            <label className="adm-check">
              <input type="checkbox" checked={form.isActive} onChange={(event) => update("isActive", event.target.checked)} />
              <span>
                <strong>Kampanya aktif</strong>
                <span>Kapalıyken menüde uygulanmaz.</span>
              </span>
            </label>

            <label className="adm-check">
              <input type="checkbox" checked={form.isPopular} onChange={(event) => update("isPopular", event.target.checked)} />
              <span>
                <strong>Popüler olarak işaretle</strong>
                <span>Ürün menüde öne çıkarılır.</span>
              </span>
            </label>

            {selectedProduct && previewPrice !== null && (
              <div className="adm-price-preview">
                <span>
                  <small>Fiyat önizlemesi</small>
                  <strong>{selectedProduct.name}</strong>
                </span>
                <span className="adm-price-preview-values">
                  <del>{formatPrice(Number(selectedProduct.price))} ₺</del>
                  <strong>{formatPrice(previewPrice)} ₺</strong>
                </span>
              </div>
            )}

            <button type="submit" className="adm-btn adm-btn-primary adm-btn-lg adm-btn-block" disabled={saving}>
              <AdminIcon name={editingId ? "save" : "plus"} size={17} />
              {saving ? "Kaydediliyor…" : editingId ? "Değişiklikleri kaydet" : "Kampanyayı oluştur"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
