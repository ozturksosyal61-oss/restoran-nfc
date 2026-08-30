"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type Category = {
  id: number;
  name: string;
};

export default function NewProductPage() {
  const router = useRouter();
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [allergens, setAllergens] = useState("");
  const [price, setPrice] = useState("");

  const [image, setImage] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     KATEGORİLERİ GETİR
     ===================================================== */

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("id");

      if (error) {
        setError("Kategoriler yüklenemedi: " + error.message);
        return;
      }

      setCategories(data || []);
    }

    loadCategories();
  }, []);

  /* =====================================================
     ÜRÜN KAYDET
     ===================================================== */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!categoryId || !name.trim() || !price) {
      setError(
        "Kategori, ürün adı ve fiyat zorunludur."
      );
      return;
    }

    setLoading(true);

    try {
      let imageUrl: string | null = null;

      /* =================================================
         FOTOĞRAF YÜKLE
         ================================================= */

      if (image) {
        const fileExtension =
          image.name.split(".").pop()?.toLowerCase();

        const fileName =
          `${crypto.randomUUID()}.${fileExtension}`;

        const filePath =
          `products/${fileName}`;

        const { error: uploadError } =
          await supabase.storage
            .from("product-images")
            .upload(filePath, image);

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
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      /* =================================================
         ÜRÜNÜ VERİTABANINA KAYDET
         ================================================= */

      const { error: insertError } =
        await supabase
          .from("products")
          .insert({
            category_id: Number(categoryId),

            name: name.trim(),

            description:
              description.trim() || null,

            ingredients:
              ingredients.trim() || null,

            allergens:
              allergens.trim() || null,

            price: Number(price),

            image_url: imageUrl,
          });

      if (insertError) {
        console.error(
          "Product insert error:",
          insertError
        );

        setError(
          "Ürün kaydedilemedi: " +
          insertError.message
        );

        setLoading(false);
        return;
      }

      /* =================================================
         BAŞARILI
         ================================================= */

      router.push("/admin/menu");
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

  /* =====================================================
     EKRAN
     ===================================================== */

  return (
    <main className="admin-page">

      {/* HEADER */}

      <section className="admin-header">

        <a href="/admin/menu">
          ← Menü Yönetimi
        </a>

        <h1>
          Yeni Ürün Ekle
        </h1>

        <p>
          Menünüze yeni bir ürün ekleyin.
        </p>

      </section>

      {/* FORM */}

      <section className="admin-form">

        <form onSubmit={handleSubmit}>

          {/* KATEGORİ */}

          <label>
            Kategori

            <select
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value)
              }
              required
            >
              <option value="">
                Kategori seçin
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          {/* ÜRÜN ADI */}

          <label>
            Ürün Adı

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Örn. Cheeseburger"
              required
            />
          </label>

          {/* AÇIKLAMA */}

          <label>
            Açıklama

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Ürünün kısa açıklaması"
            />
          </label>

          {/* İÇİNDEKİLER */}

          <label>
            İçindekiler

            <textarea
              value={ingredients}
              onChange={(event) =>
                setIngredients(event.target.value)
              }
              placeholder="Örn. Dana eti, cheddar peyniri, marul, domates, soğan, özel sos"
            />

            <small>
              Üründe bulunan malzemeleri yazabilirsiniz.
            </small>
          </label>

          {/* ALERJENLER */}

          <label>
            Alerjenler

            <textarea
              value={allergens}
              onChange={(event) =>
                setAllergens(event.target.value)
              }
              placeholder="Örn. Süt ürünü, gluten, yumurta"
            />

            <small>
              Varsa üründeki alerjenleri belirtin.
            </small>
          </label>

          {/* FİYAT */}

          <label>
            Fiyat (TL)

            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) =>
                setPrice(event.target.value)
              }
              placeholder="380"
              required
            />
          </label>

          {/* FOTOĞRAF */}

          <label>
            Ürün Fotoğrafı

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {

                const file =
                  event.target.files?.[0] || null;

                if (!file) {
                  setImage(null);
                  return;
                }

                if (
                  file.size >
                  5 * 1024 * 1024
                ) {
                  setError(
                    "Fotoğraf en fazla 5 MB olabilir."
                  );

                  event.target.value = "";

                  setImage(null);

                  return;
                }

                setError("");

                setImage(file);
              }}
            />

            <small>
              JPG, PNG veya WEBP — maksimum 5 MB
            </small>
          </label>

          {/* HATA */}

          {error && (
            <p className="login-error">
              ❌ {error}
            </p>
          )}

          {/* KAYDET */}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Kaydediliyor..."
              : "Ürünü Kaydet"}
          </button>

        </form>

      </section>

    </main>
  );
}