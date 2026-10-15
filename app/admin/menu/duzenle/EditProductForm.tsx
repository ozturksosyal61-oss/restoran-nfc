"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import { compressImage } from "../../../../lib/image-compress";
import ProductFormView from "../ProductFormView";
import { normalizeTags, type ProductTag } from "../../../../lib/product-tags";
import { allergenText, normalizeAllergens, type AllergenCode } from "../../../../lib/allergens";

export type EditableProduct = Product;

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
  tags?: string[] | null;
  new_until?: string | null;
  allergen_codes?: string[] | null;
};

type Category = {
  id: number;
  name: string;
};

export default function EditProductForm({
  product,
  categories,
  tagsSupported = false,
  allergensSupported = false,
}: {
  product: Product;
  categories: Category[];
  // Etiket sütunları veritabanında varsa.
  tagsSupported?: boolean;
  allergensSupported?: boolean;
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

  const [tags, setTags] = useState<ProductTag[]>(normalizeTags(product.tags));

  const [newUntil, setNewUntil] = useState(product.new_until || "");

  const [allergenCodes, setAllergenCodes] = useState<AllergenCode[]>(normalizeAllergens(product.allergen_codes));

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
        // Fotoğraf yüklenmeden önce küçültülür (menü hızlı açılsın).
        const compressed = await compressImage(image);

        const fileName =
          `${crypto.randomUUID()}.${compressed.extension}`;

        const filePath =
          `products/${fileName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("product-images")
          .upload(
            filePath,
            compressed.file,
            // Dosya adı benzersiz olduğu için tarayıcı uzun süre önbellekte tutabilir.
            { cacheControl: "31536000", contentType: compressed.file.type }
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

            allergens: allergensSupported
              ? allergenText(allergenCodes) || null
              : allergens.trim() || null,

            ...(allergensSupported ? { allergen_codes: allergenCodes } : {}),

            price:
              Number(price),

            image_url:
              imageUrl,

            is_available:
              isAvailable,

            ...(tagsSupported
              ? {
                  tags,
                  new_until: tags.includes("new") && newUntil ? newUntil : null,
                }
              : {}),
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
    <ProductFormView
      mode="edit"
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
      currentImageUrl={product.image_url}
      image={image}
      onImage={setImage}
      isAvailable={isAvailable}
      onAvailable={setIsAvailable}
      tags={tagsSupported ? tags : undefined}
      onTags={tagsSupported ? setTags : undefined}
      newUntil={newUntil}
      onNewUntil={tagsSupported ? setNewUntil : undefined}
      allergenCodes={allergensSupported ? allergenCodes : undefined}
      onAllergenCodes={allergensSupported ? setAllergenCodes : undefined}
      error={error}
      onError={setError}
      loading={loading}
      onSubmit={handleSubmit}
    />
  );
}
