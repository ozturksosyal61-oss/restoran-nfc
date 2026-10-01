"use client";

import { useEffect, useState } from "react";
import ProductFormView from "../ProductFormView";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { compressImage } from "../../../../lib/image-compress";

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
        // Fotoğraf yüklenmeden önce küçültülür (menü hızlı açılsın).
        const compressed = await compressImage(image);

        const fileName =
          `${crypto.randomUUID()}.${compressed.extension}`;

        const filePath =
          `products/${fileName}`;

        // Dosya adı benzersiz olduğu için tarayıcı uzun süre önbellekte tutabilir.
        const { error: uploadError } =
          await supabase.storage
            .from("product-images")
            .upload(filePath, compressed.file, { cacheControl: "31536000", contentType: compressed.file.type });

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
    <ProductFormView
      mode="new"
      categories={categories}
      categoryId={categoryId}
      onCategoryId={setCategoryId}
      name={name}
      onName={setName}
      description={description}
      onDescription={setDescription}
      ingredients={ingredients}
      onIngredients={setIngredients}
      allergens={allergens}
      onAllergens={setAllergens}
      price={price}
      onPrice={setPrice}
      image={image}
      onImage={setImage}
      error={error}
      onError={setError}
      loading={loading}
      onSubmit={handleSubmit}
    />
  );
}
