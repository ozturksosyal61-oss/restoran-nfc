"use server";

import { revalidatePath } from "next/cache";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { DEMO_BLOCKED_MESSAGE } from "../../../../lib/demo";
import { AiError, aiConfigured, AI_NOT_CONFIGURED_MESSAGE, callAiTool, type AiContent } from "../../../../lib/ai";

export type DraftProduct = {
  name: string;
  description: string;
  price: number | null;
  ingredients: string;
  allergens: string;
};

export type DraftCategory = {
  name: string;
  products: DraftProduct[];
};

export type AnalyzeResult =
  | { ok: true; categories: DraftCategory[] }
  | { ok: false; message: string };

export type ImportResult = { ok: boolean; message: string; created?: number } | null;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILES = 8;
const MAX_TOTAL_BYTES = 5.5 * 1024 * 1024;
const MAX_PRODUCTS = 400;

function clean(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanPrice(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number) || number < 0 || number > 1_000_000) return null;
  return Math.round(number * 100) / 100;
}

/* ---------------- 1) Menüyü oku ---------------- */

export async function analyzeMenu(formData: FormData): Promise<AnalyzeResult> {
  const admin = await getAdminRestaurant();
  if (!admin) return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  if (admin.isDemo) return { ok: false, message: DEMO_BLOCKED_MESSAGE };
  if (!aiConfigured()) return { ok: false, message: AI_NOT_CONFIGURED_MESSAGE };

  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length === 0) return { ok: false, message: "Menünüzün fotoğrafını ya da PDF dosyasını seçin." };
  if (files.length > MAX_FILES) return { ok: false, message: `En fazla ${MAX_FILES} dosya yükleyebilirsiniz.` };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_BYTES) {
    return { ok: false, message: "Dosyalar toplamda çok büyük (en fazla 5 MB). Daha az sayfa seçin." };
  }

  const content: AiContent[] = [];

  for (const file of files) {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");

    if (file.type === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    } else if (IMAGE_TYPES.includes(file.type)) {
      content.push({ type: "image", source: { type: "base64", media_type: file.type, data } });
    } else {
      return { ok: false, message: `"${file.name}" desteklenmiyor. JPG, PNG, WEBP ya da PDF yükleyin.` };
    }
  }

  content.push({
    type: "text",
    text:
      "Bu dosyalar bir restoranın menüsü. Menüdeki tüm kategorileri ve ürünleri, menüdeki sırasıyla çıkar.",
  });

  try {
    const result = await callAiTool<{ categories: DraftCategory[] }>({
      system:
        "Sen Türk restoran menülerini dijitale aktaran bir asistansın. Görsellerdeki ya da PDF'teki menüyü " +
        "olduğu gibi aktar; bilgi uydurma. Metni Türkçe bırak, yalnızca bariz yazım/okuma hatalarını düzelt. " +
        "Fiyatlar Türk lirasıdır; price alanına yalnızca sayı yaz (örn. 185 ya da 92.5). Fiyat okunamıyorsa price'ı boş bırak. " +
        "Bir ürünün birden fazla boyutu/fiyatı varsa her birini ayrı ürün yap: 'Çay (Küçük)', 'Çay (Büyük)'. " +
        "description yalnızca menüde yazan açıklamadır; yoksa boş bırak. ingredients ve allergens yalnızca menüde " +
        "açıkça yazıyorsa, virgülle ayrılmış liste olarak doldur. Kategori başlığı yoksa ürünleri anlamlı " +
        "kategorilere (Yemekler, İçecekler, Tatlılar gibi) grupla.",
      content,
      toolName: "save_menu",
      toolDescription: "Menüden çıkarılan kategorileri ve ürünleri kaydet.",
      inputSchema: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                products: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      price: { type: ["number", "null"] },
                      ingredients: { type: "string" },
                      allergens: { type: "string" },
                    },
                    required: ["name"],
                  },
                },
              },
              required: ["name", "products"],
            },
          },
        },
        required: ["categories"],
      },
      maxTokens: 16000,
    });

    const categories = (Array.isArray(result.categories) ? result.categories : [])
      .map((category) => ({
        name: clean(category?.name, 60) || "Diğer",
        products: (Array.isArray(category?.products) ? category.products : [])
          .map((product) => ({
            name: clean(product?.name, 120),
            description: clean(product?.description, 500),
            price: cleanPrice(product?.price),
            ingredients: clean(product?.ingredients, 500),
            allergens: clean(product?.allergens, 300),
          }))
          .filter((product) => product.name),
      }))
      .filter((category) => category.products.length > 0);

    if (categories.length === 0) {
      return {
        ok: false,
        message: "Menüde ürün bulunamadı. Fotoğrafın net ve menünün tamamen görünür olduğundan emin olun.",
      };
    }

    return { ok: true, categories };
  } catch (error) {
    console.error("MENÜ OKUMA HATASI:", error);
    return {
      ok: false,
      message: error instanceof AiError ? error.message : "Menü okunamadı. Tekrar deneyin.",
    };
  }
}

/* ---------------- 2) Onaylananları menüye ekle ---------------- */

export async function importMenu(_prev: ImportResult, formData: FormData): Promise<ImportResult> {
  const admin = await getAdminRestaurant();
  if (!admin) return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  if (admin.isDemo) return { ok: false, message: DEMO_BLOCKED_MESSAGE };

  let draft: DraftCategory[];
  try {
    draft = JSON.parse(String(formData.get("payload") || "[]"));
    if (!Array.isArray(draft)) throw new Error("dizi değil");
  } catch {
    return { ok: false, message: "Aktarılacak liste okunamadı. Sayfayı yenileyip tekrar deneyin." };
  }

  const categories = draft
    .map((category) => ({
      name: clean(category?.name, 60),
      products: (Array.isArray(category?.products) ? category.products : [])
        .map((product) => ({
          name: clean(product?.name, 120),
          description: clean(product?.description, 500),
          price: cleanPrice(product?.price),
          ingredients: clean(product?.ingredients, 500),
          allergens: clean(product?.allergens, 300),
        }))
        .filter((product) => product.name),
    }))
    .filter((category) => category.name && category.products.length > 0);

  const productCount = categories.reduce((sum, category) => sum + category.products.length, 0);

  if (productCount === 0) return { ok: false, message: "Eklenecek ürün seçilmedi." };
  if (productCount > MAX_PRODUCTS) {
    return { ok: false, message: `Tek seferde en fazla ${MAX_PRODUCTS} ürün eklenebilir.` };
  }

  const missingPrice = categories.flatMap((category) => category.products).find((product) => product.price === null);
  if (missingPrice) {
    return { ok: false, message: `"${missingPrice.name}" için fiyat girin ya da bu ürünü listeden çıkarın.` };
  }

  const { supabase, restaurantId } = admin;

  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", restaurantId);

  if (existingError) {
    console.error("KATEGORİLER OKUNAMADI:", existingError);
    return { ok: false, message: "Mevcut kategoriler okunamadı." };
  }

  const byName = new Map(
    (existing ?? []).map((category) => [category.name.trim().toLocaleLowerCase("tr-TR"), Number(category.id)])
  );
  let nextCategoryOrder = Math.max(0, ...(existing ?? []).map((category) => Number(category.sort_order) || 0)) + 1;

  let created = 0;

  for (const category of categories) {
    const key = category.name.toLocaleLowerCase("tr-TR");
    let categoryId = byName.get(key);

    if (!categoryId) {
      const { data: inserted, error } = await supabase
        .from("categories")
        .insert({ restaurant_id: restaurantId, name: category.name, sort_order: nextCategoryOrder++ })
        .select("id")
        .single();

      if (error || !inserted) {
        console.error("KATEGORİ EKLENEMEDİ:", error);
        return {
          ok: created > 0,
          message: `"${category.name}" kategorisi eklenemedi. ${created > 0 ? `${created} ürün eklendi.` : ""}`.trim(),
          created,
        };
      }

      categoryId = Number(inserted.id);
      byName.set(key, categoryId);
    }

    const { data: last } = await supabase
      .from("products")
      .select("sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    let order = Number(last?.sort_order ?? 0) + 1;

    const { error: productError } = await supabase.from("products").insert(
      category.products.map((product) => ({
        category_id: categoryId,
        name: product.name,
        description: product.description || null,
        ingredients: product.ingredients || null,
        allergens: product.allergens || null,
        price: product.price,
        image_url: null,
        sort_order: order++,
      }))
    );

    if (productError) {
      console.error("ÜRÜNLER EKLENEMEDİ:", productError);
      return {
        ok: created > 0,
        message: `"${category.name}" ürünleri eklenemedi: ${productError.message}. ${
          created > 0 ? `Önceki ${created} ürün eklendi.` : ""
        }`.trim(),
        created,
      };
    }

    created += category.products.length;
  }

  revalidatePath("/admin/menu");
  revalidatePath("/admin/menu/kategori");

  return { ok: true, message: `${created} ürün menünüze eklendi.`, created };
}
