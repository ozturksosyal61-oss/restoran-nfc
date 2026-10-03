"use server";

import { revalidatePath } from "next/cache";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { DEMO_BLOCKED_MESSAGE } from "../../../../lib/demo";
import { aiConfigured, AI_NOT_CONFIGURED_MESSAGE } from "../../../../lib/ai";
import {
  clean,
  cleanPrice,
  extractMenu,
  MAX_PRODUCTS,
  type AnalyzeResult,
  type DraftCategory,
} from "../../../../lib/menu-extract";

export type { AnalyzeResult, DraftCategory, DraftProduct } from "../../../../lib/menu-extract";

export type ImportResult = { ok: boolean; message: string; created?: number } | null;

/* ---------------- 1) Menüyü oku ---------------- */

export async function analyzeMenu(formData: FormData): Promise<AnalyzeResult> {
  const admin = await getAdminRestaurant();
  if (!admin) return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  if (admin.isDemo) return { ok: false, message: DEMO_BLOCKED_MESSAGE };
  if (!aiConfigured()) return { ok: false, message: AI_NOT_CONFIGURED_MESSAGE };

  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  return extractMenu(files);
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
