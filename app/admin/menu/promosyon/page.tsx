"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabase/client";

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

  return (
    <main className="promotion-page">
      <div className="promotion-container">
        <header className="promotion-header">
          <div>
            <a
              href="/admin/menu"
              className="back-link"
            >
              ← Menü Yönetimi
            </a>

            <span className="kicker">
              KAMPANYA & PROMOSYON
            </span>

            <h1>
              Kampanyalar
            </h1>

            <p>
              {restaurantName} için indirim,
              popüler ürün ve promosyonları
              yönetin.
            </p>
          </div>

          <div className="header-count">
            <span>AKTİF KAMPANYA</span>
            <strong>
              {
                promotions.filter(
                  (promotion) =>
                    promotion.is_active
                ).length
              }
            </strong>
          </div>
        </header>

        {message && (
          <div className="success-message">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <section className="promotion-form-card">
          <div className="section-title">
            <div>
              <span>
                {editingId
                  ? "KAMPANYA DÜZENLE"
                  : "YENİ KAMPANYA"}
              </span>

              <h2>
                {editingId
                  ? "Kampanyayı güncelle"
                  : "Kampanya oluştur"}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                className="cancel-button"
                onClick={resetForm}
              >
                Vazgeç
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="promotion-form"
          >
            <div className="form-grid">
              <label>
                Kampanya başlığı
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title:
                        event.target.value,
                    })
                  }
                  placeholder="Örn. Hafta Sonu %20 İndirim"
                  required
                />
              </label>

              <label>
                Açıklama
                <input
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target.value,
                    })
                  }
                  placeholder="Kampanya kısa açıklaması"
                />
              </label>

              <label>
                Kampanya hedefi
                <select
                  value={form.targetType}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      targetType:
                        event.target
                          .value as
                          | "product"
                          | "category",
                      productId: "",
                      categoryId: "",
                    })
                  }
                >
                  <option value="product">
                    Tek ürün
                  </option>

                  <option value="category">
                    Kategori
                  </option>
                </select>
              </label>

              {form.targetType ===
              "product" ? (
                <label>
                  Ürün
                  <select
                    value={
                      form.productId
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        productId:
                          event.target
                            .value,
                      })
                    }
                    required
                  >
                    <option value="">
                      Ürün seçin
                    </option>

                    {products.map(
                      (product) => (
                        <option
                          key={
                            product.id
                          }
                          value={
                            product.id
                          }
                        >
                          {product.name} —{" "}
                          {formatPrice(
                            Number(
                              product.price
                            )
                          )}{" "}
                          TL
                        </option>
                      )
                    )}
                  </select>
                </label>
              ) : (
                <label>
                  Kategori
                  <select
                    value={
                      form.categoryId
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        categoryId:
                          event.target
                            .value,
                      })
                    }
                    required
                  >
                    <option value="">
                      Kategori seçin
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}

              <label>
                İndirim tipi
                <select
                  value={
                    form.discountType
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      discountType:
                        event.target
                          .value as
                          | "percentage"
                          | "fixed",
                    })
                  }
                >
                  <option value="percentage">
                    Yüzde indirim
                  </option>

                  <option value="fixed">
                    Sabit TL indirim
                  </option>
                </select>
              </label>

              <label>
                İndirim değeri
                <div className="input-with-suffix">
                  <input
                    type="number"
                    min="0.01"
                    max={
                      form.discountType ===
                      "percentage"
                        ? "100"
                        : undefined
                    }
                    step="0.01"
                    value={
                      form.discountValue
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        discountValue:
                          event.target
                            .value,
                      })
                    }
                    placeholder={
                      form.discountType ===
                      "percentage"
                        ? "20"
                        : "50"
                    }
                    required
                  />

                  <span>
                    {form.discountType ===
                    "percentage"
                      ? "%"
                      : "TL"}
                  </span>
                </div>
              </label>

              <label>
                Başlangıç
                <input
                  type="datetime-local"
                  value={
                    form.startAt
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      startAt:
                        event.target
                          .value,
                    })
                  }
                />
              </label>

              <label>
                Bitiş
                <input
                  type="datetime-local"
                  value={
                    form.endAt
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      endAt:
                        event.target
                          .value,
                    })
                  }
                />
              </label>
            </div>

            <div className="form-options">
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={
                    form.isActive
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      isActive:
                        event.target
                          .checked,
                    })
                  }
                />

                <span>
                  Kampanya aktif
                </span>
              </label>

              <label className="check-option">
                <input
                  type="checkbox"
                  checked={
                    form.isPopular
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      isPopular:
                        event.target
                          .checked,
                    })
                  }
                />

                <span>
                  ⭐ Popüler ürün olarak göster
                </span>
              </label>
            </div>

            {selectedProduct &&
              previewPrice !== null && (
                <div className="price-preview">
                  <div>
                    <span>
                      FİYAT ÖNİZLEMESİ
                    </span>

                    <strong>
                      {selectedProduct.name}
                    </strong>
                  </div>

                  <div className="preview-prices">
                    <del>
                      {formatPrice(
                        Number(
                          selectedProduct.price
                        )
                      )}{" "}
                      TL
                    </del>

                    <strong>
                      {formatPrice(
                        previewPrice
                      )}{" "}
                      TL
                    </strong>
                  </div>
                </div>
              )}

            <button
              type="submit"
              className="save-button"
              disabled={saving}
            >
              {saving
                ? "Kaydediliyor..."
                : editingId
                ? "Değişiklikleri Kaydet"
                : "🏷️ Kampanyayı Oluştur"}
            </button>
          </form>
        </section>

        <section className="promotion-list-card">
          <div className="section-title">
            <div>
              <span>
                KAMPANYALAR
              </span>

              <h2>
                Tanımlı kampanyalar
              </h2>
            </div>

            <strong className="record-count">
              {promotions.length} kayıt
            </strong>
          </div>

          {loading ? (
            <div className="empty-state">
              ⏳ Kampanyalar yükleniyor...
            </div>
          ) : promotions.length ===
            0 ? (
            <div className="empty-state">
              <div>
                🏷️
              </div>

              <strong>
                Henüz kampanya yok.
              </strong>

              <span>
                Yukarıdaki formdan ilk
                kampanyanızı oluşturabilirsiniz.
              </span>
            </div>
          ) : (
            <div className="promotion-list">
              {promotions.map(
                (promotion) => (
                  <article
                    key={promotion.id}
                    className="promotion-row"
                  >
                    <div className="promotion-main">
                      <div className="promotion-icon">
                        {promotion.is_popular
                          ? "⭐"
                          : "🏷️"}
                      </div>

                      <div>
                        <div className="promotion-title-line">
                          <strong>
                            {promotion.title}
                          </strong>

                          <span
                            className={
                              promotion.is_active
                                ? "active-badge"
                                : "passive-badge"
                            }
                          >
                            {promotion.is_active
                              ? "Aktif"
                              : "Pasif"}
                          </span>
                        </div>

                        <span className="promotion-target">
                          {getTargetName(
                            promotion
                          )}
                        </span>

                        {promotion
                          .description && (
                          <p>
                            {
                              promotion.description
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="promotion-discount">
                      <small>
                        İNDİRİM
                      </small>

                      <strong>
                        {getDiscountText(
                          promotion
                        )}
                      </strong>
                    </div>

                    <div className="promotion-dates">
                      <small>
                        GEÇERLİLİK
                      </small>

                      <span>
                        {formatDate(
                          promotion.start_at
                        )}
                      </span>

                      <span>
                        →{" "}
                        {formatDate(
                          promotion.end_at
                        )}
                      </span>
                    </div>

                    <div className="promotion-actions">
                      <button
                        type="button"
                        onClick={() =>
                          togglePromotion(
                            promotion
                          )
                        }
                      >
                        {promotion.is_active
                          ? "⏸ Pasifleştir"
                          : "▶ Aktifleştir"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          startEdit(
                            promotion
                          )
                        }
                      >
                        ✏️ Düzenle
                      </button>

                      <button
                        type="button"
                        className="danger-button"
                        disabled={
                          deletingId ===
                          promotion.id
                        }
                        onClick={() =>
                          deletePromotion(
                            promotion
                          )
                        }
                      >
                        {deletingId ===
                        promotion.id
                          ? "Siliniyor..."
                          : "🗑️ Sil"}
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        <div className="footer-note">
          Kampanyalar yalnızca bağlı olduğunuz
          işletmenin verileri üzerinde çalışır.
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .promotion-page {
          min-height: 100vh;
          padding: 30px 20px 70px;
          background: #f3f1ed;
          color: #171717;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .promotion-container {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .promotion-header {
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 25px;
          margin-bottom: 18px;
          padding: 36px;
          overflow: hidden;
          border-radius: 24px;
          color: white;
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(212, 161, 42, 0.22),
              transparent 31%
            ),
            linear-gradient(
              135deg,
              #11110f,
              #272219
            );
          box-shadow:
            0 20px 50px
              rgba(0, 0, 0, 0.12);
        }

        .promotion-header::after {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          right: -135px;
          top: -175px;
          border: 1px solid
            rgba(220, 165, 43, 0.32);
          border-radius: 50%;
        }

        .back-link {
          display: inline-block;
          margin-bottom: 18px;
          color: #dca52b;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .kicker,
        .section-title > div > span {
          display: block;
          color: #c8941d;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        .promotion-header h1 {
          margin: 7px 0 0;
          font-size: clamp(30px, 4vw, 44px);
          letter-spacing: -0.04em;
        }

        .promotion-header p {
          margin: 10px 0 0;
          max-width: 620px;
          color: rgba(255, 255, 255, 0.65);
          font-size: 13px;
        }

        .header-count {
          position: relative;
          z-index: 2;
          min-width: 145px;
          padding: 17px;
          border: 1px solid
            rgba(255, 255, 255, 0.13);
          border-radius: 14px;
          background: rgba(
            255,
            255,
            255,
            0.05
          );
          text-align: center;
        }

        .header-count span {
          display: block;
          margin-bottom: 5px;
          color: #aaa;
          font-size: 8px;
          font-weight: 900;
        }

        .header-count strong {
          font-size: 26px;
        }

        .success-message,
        .error-message {
          margin-bottom: 14px;
          padding: 13px 16px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 700;
        }

        .success-message {
          border: 1px solid #bde3c6;
          background: #eefaf1;
          color: #26733e;
        }

        .error-message {
          border: 1px solid #edc6c6;
          background: #fff2f2;
          color: #a62c2c;
        }

        .promotion-form-card,
        .promotion-list-card {
          margin-bottom: 18px;
          padding: 24px;
          border: 1px solid #e5dfd5;
          border-radius: 20px;
          background: white;
          box-shadow:
            0 10px 30px
              rgba(60, 50, 30, 0.05);
        }

        .section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 20px;
        }

        .section-title h2 {
          margin: 5px 0 0;
          font-size: 21px;
        }

        .cancel-button {
          border: 0;
          border-radius: 9px;
          padding: 9px 12px;
          background: #f1efeb;
          color: #555;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .promotion-form {
          display: grid;
          gap: 16px;
        }

        .form-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        label {
          display: grid;
          gap: 7px;
          color: #555;
          font-size: 11px;
          font-weight: 800;
        }

        input,
        select {
          width: 100%;
          min-height: 42px;
          padding: 10px 12px;
          border: 1px solid #ddd6ca;
          border-radius: 9px;
          outline: none;
          background: #faf9f6;
          color: #171717;
          font: inherit;
          font-weight: 500;
        }

        input:focus,
        select:focus {
          border-color: #c8941d;
          background: white;
        }

        .input-with-suffix {
          position: relative;
        }

        .input-with-suffix input {
          padding-right: 42px;
        }

        .input-with-suffix span {
          position: absolute;
          top: 50%;
          right: 13px;
          transform: translateY(-50%);
          color: #888;
          font-size: 11px;
          font-weight: 900;
        }

        .form-options {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .check-option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          padding: 10px 12px;
          border: 1px solid #e7dfd1;
          border-radius: 10px;
          background: #fbf8f1;
          cursor: pointer;
        }

        .check-option input {
          width: 17px;
          min-height: 17px;
          accent-color: #c8941d;
        }

        .price-preview {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 14px 16px;
          border: 1px solid #ead8ac;
          border-radius: 12px;
          background: #fffaf0;
        }

        .price-preview span,
        .price-preview strong {
          display: block;
        }

        .price-preview span {
          margin-bottom: 4px;
          color: #b07d0e;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .price-preview > div:first-child strong {
          font-size: 12px;
        }

        .preview-prices {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .preview-prices del {
          color: #999;
          font-size: 11px;
        }

        .preview-prices strong {
          color: #a66f00;
          font-size: 17px;
        }

        .save-button {
          min-height: 44px;
          border: 0;
          border-radius: 10px;
          background: #171717;
          color: white;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .save-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .record-count {
          color: #999;
          font-size: 11px;
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 7px;
          min-height: 220px;
          text-align: center;
          color: #999;
          font-size: 11px;
        }

        .empty-state div {
          font-size: 34px;
        }

        .empty-state strong {
          color: #333;
          font-size: 13px;
        }

        .promotion-list {
          display: grid;
        }

        .promotion-row {
          display: grid;
          grid-template-columns:
            minmax(260px, 1.7fr)
            minmax(100px, 0.65fr)
            minmax(150px, 1fr)
            minmax(190px, 1.15fr);
          gap: 18px;
          align-items: center;
          padding: 17px 0;
          border-bottom: 1px solid #eee9e1;
        }

        .promotion-row:last-child {
          border-bottom: 0;
        }

        .promotion-main {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .promotion-icon {
          display: grid;
          place-items: center;
          flex: 0 0 39px;
          width: 39px;
          height: 39px;
          border-radius: 10px;
          background: #faf4e6;
          font-size: 17px;
        }

        .promotion-title-line {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .promotion-title-line strong {
          font-size: 12px;
        }

        .active-badge,
        .passive-badge {
          padding: 4px 7px;
          border-radius: 6px;
          font-size: 8px;
          font-weight: 900;
        }

        .active-badge {
          background: #eaf8ee;
          color: #237943;
        }

        .passive-badge {
          background: #f1efeb;
          color: #888;
        }

        .promotion-target {
          display: block;
          margin-top: 4px;
          color: #777;
          font-size: 10px;
        }

        .promotion-main p {
          margin: 4px 0 0;
          color: #999;
          font-size: 9px;
        }

        .promotion-discount small,
        .promotion-dates small {
          display: block;
          margin-bottom: 5px;
          color: #aaa;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .promotion-discount strong {
          color: #a66f00;
          font-size: 17px;
        }

        .promotion-dates span {
          display: block;
          color: #777;
          font-size: 9px;
          line-height: 1.6;
        }

        .promotion-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          flex-wrap: wrap;
        }

        .promotion-actions button {
          border: 0;
          border-radius: 8px;
          padding: 7px 9px;
          background: #f1efeb;
          color: #555;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .promotion-actions button:hover {
          background: #e8e3da;
        }

        .promotion-actions .danger-button {
          background: #fff0ef;
          color: #b42318;
        }

        .promotion-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .footer-note {
          padding: 12px;
          color: #999;
          text-align: center;
          font-size: 10px;
        }

        @media (max-width: 950px) {
          .promotion-row {
            grid-template-columns:
              1fr 0.5fr;
          }

          .promotion-actions {
            justify-content: flex-start;
          }

          .promotion-dates {
            display: none;
          }
        }

        @media (max-width: 650px) {
          .promotion-page {
            padding: 16px 11px 50px;
          }

          .promotion-header {
            align-items: flex-start;
            flex-direction: column;
            padding: 25px 20px;
          }

          .header-count {
            width: 100%;
          }

          .promotion-form-card,
          .promotion-list-card {
            padding: 18px;
            border-radius: 16px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .price-preview {
            align-items: flex-start;
            flex-direction: column;
          }

          .promotion-row {
            grid-template-columns: 1fr;
            gap: 11px;
          }

          .promotion-discount {
            padding-left: 50px;
          }

          .promotion-actions {
            padding-left: 50px;
          }
        }
      `}</style>
    </main>
  );
}
