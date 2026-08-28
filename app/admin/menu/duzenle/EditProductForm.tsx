"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type Product = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  ingredients: string | null;
  allergens: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
};

type Category = {
  id: number;
  name: string;
};

export default function EditProductForm({
  product,
  categories,
}: {
  product: Product;
  categories: Category[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(product.name);

  const [description, setDescription] = useState(
    product.description || ""
  );

  const [ingredients, setIngredients] = useState(
    product.ingredients || ""
  );

  const [allergens, setAllergens] = useState(
    product.allergens || ""
  );

  const [price, setPrice] = useState(
    String(product.price)
  );

  const [categoryId, setCategoryId] = useState(
    String(product.category_id)
  );

  const [isAvailable, setIsAvailable] = useState(
    product.is_available !== false
  );

  const [image, setImage] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (
      !name.trim() ||
      !price ||
      !categoryId
    ) {
      setError(
        "Kategori, ürün adı ve fiyat zorunludur."
      );

      return;
    }

    setLoading(true);

    try {
      let imageUrl = product.image_url;

      /* =====================================================
         YENİ FOTOĞRAF YÜKLE
         ===================================================== */

      if (image) {
        const fileExtension =
          image.name
            .split(".")
            .pop()
            ?.toLowerCase();

        const fileName =
          `${crypto.randomUUID()}.${fileExtension}`;

        const filePath =
          `products/${fileName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("product-images")
          .upload(
            filePath,
            image
          );

        if (uploadError) {
          setError(
            "Fotoğraf yüklenemedi: " +
              uploadError.message
          );

          setLoading(false);

          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("product-images")
          .getPublicUrl(
            filePath
          );

        imageUrl = publicUrl;
      }

      /* =====================================================
         ÜRÜNÜ GÜNCELLE
         ===================================================== */

      const { error: updateError } =
        await supabase
          .from("products")
          .update({
            category_id:
              Number(categoryId),

            name:
              name.trim(),

            description:
              description.trim() || null,

            ingredients:
              ingredients.trim() || null,

            allergens:
              allergens.trim() || null,

            price:
              Number(price),

            image_url:
              imageUrl,

            is_available:
              isAvailable,
          })
          .eq(
            "id",
            product.id
          );

      if (updateError) {
        console.error(
          "Product update error:",
          updateError
        );

        setError(
          "Ürün güncellenemedi: " +
            updateError.message
        );

        setLoading(false);

        return;
      }

      /* =====================================================
         ESKİ FOTOĞRAFI SİL
         ===================================================== */

      if (
        image &&
        product.image_url
      ) {
        try {
          const marker =
            "/product-images/";

          const index =
            product.image_url.indexOf(
              marker
            );

          if (index !== -1) {
            const oldFilePath =
              product.image_url.substring(
                index +
                  marker.length
              );

            await supabase.storage
              .from("product-images")
              .remove([
                oldFilePath,
              ]);
          }
        } catch (storageError) {
          console.error(
            "Eski fotoğraf silinemedi:",
            storageError
          );
        }
      }

      setLoading(false);

      router.push(
        "/admin/menu"
      );

      router.refresh();

    } catch (error) {
      console.error(error);

      setError(
        "Beklenmeyen bir hata oluştu. " +
          "Lütfen tekrar deneyin."
      );

      setLoading(false);
    }
  }

  return (
    <main className="admin-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <section className="admin-header">

        <a href="/admin/menu">
          ← Menü Yönetimi
        </a>

        <h1>
          Ürün Düzenle
        </h1>

        <p>
          Ürün bilgilerini güncelleyin.
        </p>

      </section>

      {/* =====================================================
          FORM
          ===================================================== */}

      <section className="admin-form">

        <form onSubmit={handleSubmit}>

          {/* =================================================
              KATEGORİ
              ================================================= */}

          <label>
            Kategori

            <select
              value={categoryId}
              onChange={(event) =>
                setCategoryId(
                  event.target.value
                )
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

          {/* =================================================
              ÜRÜN ADI
              ================================================= */}

          <label>
            Ürün Adı

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Örn. Cheeseburger"
              required
            />

          </label>

          {/* =================================================
              AÇIKLAMA
              ================================================= */}

          <label>
            Açıklama

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Ürünün kısa açıklaması"
            />

          </label>

          {/* =================================================
              İÇİNDEKİLER
              ================================================= */}

          <label>
            İçindekiler

            <textarea
              value={ingredients}
              onChange={(event) =>
                setIngredients(
                  event.target.value
                )
              }
              placeholder="Örn. Dana eti, cheddar peyniri, marul, domates, soğan, özel sos"
            />

            <small>
              Üründe bulunan
              malzemeleri
              yazabilirsiniz.
            </small>

          </label>

          {/* =================================================
              ALERJENLER
              ================================================= */}

          <label>
            Alerjenler

            <textarea
              value={allergens}
              onChange={(event) =>
                setAllergens(
                  event.target.value
                )
              }
              placeholder="Örn. Süt ürünü, gluten, yumurta"
            />

            <small>
              Varsa üründeki
              alerjenleri
              belirtin.
            </small>

          </label>

          {/* =================================================
              FİYAT
              ================================================= */}

          <label>
            Fiyat (TL)

            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) =>
                setPrice(
                  event.target.value
                )
              }
              placeholder="380"
              required
            />

          </label>

          {/* =================================================
              ÜRÜN DURUMU
              ================================================= */}

          <div
            style={{
              marginTop: "8px",
              padding: "18px",
              border:
                "1px solid #e5dfd3",
              borderRadius: "14px",
              background:
                "#faf9f6",
            }}
          >

            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: "15px",
              }}
            >

              <div>

                <strong
                  style={{
                    display:
                      "block",
                    marginBottom:
                      "5px",
                  }}
                >
                  Ürün Durumu
                </strong>

                <small
                  style={{
                    color: "#777",
                  }}
                >
                  Ürünün müşteri
                  menüsünde
                  görünüp
                  görünmeyeceğini
                  belirleyin.
                </small>

              </div>

              <button
                type="button"
                onClick={() =>
                  setIsAvailable(
                    !isAvailable
                  )
                }
                disabled={loading}
                style={{
                  minWidth:
                    "130px",
                  padding:
                    "10px 15px",
                  border: "none",
                  borderRadius:
                    "10px",
                  background:
                    isAvailable
                      ? "#dcfce7"
                      : "#fee2e2",
                  color:
                    isAvailable
                      ? "#15803d"
                      : "#b91c1c",
                  fontWeight: 800,
                  cursor:
                    loading
                      ? "not-allowed"
                      : "pointer",
                }}
              >

                {isAvailable
                  ? "🟢 YAYINDA"
                  : "🔴 GİZLİ"}

              </button>

            </div>

          </div>

          {/* =================================================
              FOTOĞRAF
              ================================================= */}

          <label>
            Ürün Fotoğrafı

            {product.image_url && (
              <div
                style={{
                  marginBottom:
                    "14px",
                }}
              >

                <p>
                  Mevcut fotoğraf:
                </p>

                <img
                  src={
                    product.image_url
                  }
                  alt={
                    product.name
                  }
                  style={{
                    width:
                      "180px",
                    height:
                      "180px",
                    objectFit:
                      "cover",
                    borderRadius:
                      "14px",
                    display:
                      "block",
                  }}
                />

              </div>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {

                const file =
                  event.target
                    .files?.[0] ||
                  null;

                if (!file) {
                  setImage(null);
                  return;
                }

                if (
                  file.size >
                  5 *
                    1024 *
                    1024
                ) {
                  setError(
                    "Fotoğraf en fazla 5 MB olabilir."
                  );

                  event.target.value =
                    "";

                  setImage(null);

                  return;
                }

                setError("");

                setImage(file);
              }}
            />

            <small>
              Yeni fotoğraf
              seçerseniz mevcut
              fotoğraf
              değiştirilecektir.
              <br />
              JPG, PNG veya WEBP
              — maksimum 5 MB
            </small>

          </label>

          {/* =================================================
              HATA
              ================================================= */}

          {error && (
            <p className="login-error">
              ❌ {error}
            </p>
          )}

          {/* =================================================
              KAYDET
              ================================================= */}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Kaydediliyor..."
              : "Değişiklikleri Kaydet"}
          </button>

        </form>

      </section>

    </main>
  );
}