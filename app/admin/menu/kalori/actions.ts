"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { DEMO_BLOCKED_MESSAGE } from "../../../../lib/demo";
import { AiError, aiConfigured, AI_NOT_CONFIGURED_MESSAGE, callAiTool } from "../../../../lib/ai";

export type CalorieResult = { ok: boolean; message: string } | null;

const MISSING_COLUMN =
  "Kalori bilgisi için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin.";

const CHUNK_SIZE = 30;
const MAX_REQUESTS_PER_RUN = 6;
const PARALLEL = 2;

type Row = {
  id: number;
  name: string;
  description: string | null;
  ingredients: string | null;
  category: string;
  calories: number | null;
  calories_source: string | null;
};

function refresh() {
  revalidatePath("/admin/menu/kalori");
}

async function loadProducts(supabase: SupabaseClient, restaurantId: number): Promise<Row[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, ingredients, calories, calories_source, categories!inner(name, restaurant_id)")
    .eq("categories.restaurant_id", restaurantId);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const category = row.categories as unknown as { name: string } | { name: string }[] | null;
    return {
      id: Number(row.id),
      name: String(row.name),
      description: row.description ?? null,
      ingredients: row.ingredients ?? null,
      category: (Array.isArray(category) ? category[0]?.name : category?.name) ?? "",
      calories: row.calories ?? null,
      calories_source: row.calories_source ?? null,
    };
  });
}

async function estimateChunk(rows: Row[]) {
  const items = rows.map((row) => ({
    key: `p${row.id}`,
    name: row.name,
    ...(row.category ? { category: row.category } : {}),
    ...(row.description?.trim() ? { description: row.description.trim() } : {}),
    ...(row.ingredients?.trim() ? { ingredients: row.ingredients.trim() } : {}),
  }));

  const result = await callAiTool<{ items: { key: string; calories: number }[] }>({
    system:
      "Sen bir diyetisyensin. Türkiye'deki bir restoran menüsündeki ürünlerin tek porsiyonluk yaklaşık " +
      "kalorisini (kcal) tahmin ediyorsun. Türkiye'deki restoranların olağan porsiyon büyüklüklerini esas al; " +
      "ad, kategori, açıklama ve içindekilerde yazanları dikkate al. İçecekler için olağan bardak ya da şişe " +
      "büyüklüğünü düşün (şekersiz çay ve sade kahve çok düşük, su 0). Paylaşımlık ürünlerde (ör. '2 kişilik') " +
      "tabağın tamamını hesapla. Her ürün için tek bir tam sayı ver; emin olmasan da en makul tahmini yap. " +
      "Aldığın her anahtarı tam olarak bir kez döndür.",
    content: [
      {
        type: "text",
        text: "Bu ürünlerin porsiyon başına yaklaşık kalorisini tahmin et:\n" + JSON.stringify(items),
      },
    ],
    toolName: "save_calories",
    toolDescription: "Ürünlerin tahmini kalorilerini kaydet.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              calories: { type: "integer" },
            },
            required: ["key", "calories"],
          },
        },
      },
      required: ["items"],
    },
    maxTokens: 4000,
  });

  return Array.isArray(result.items) ? result.items : [];
}

export async function estimateCalories(_prev: CalorieResult, formData: FormData): Promise<CalorieResult> {
  const admin = await getAdminRestaurant();
  if (!admin) return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  if (admin.isDemo) return { ok: false, message: DEMO_BLOCKED_MESSAGE };
  if (!aiConfigured()) return { ok: false, message: AI_NOT_CONFIGURED_MESSAGE };

  // "Tümü" modunda bile işletmenin elle girdiği değerlere dokunulmaz.
  const redo = formData.get("mode") === "all";

  let rows: Row[];
  try {
    rows = await loadProducts(admin.supabase, admin.restaurantId);
  } catch (error) {
    const message = String((error as { message?: string })?.message ?? "");
    return { ok: false, message: /calories/i.test(message) ? MISSING_COLUMN : `Ürünler okunamadı: ${message}` };
  }

  const targets = rows.filter((row) =>
    redo ? row.calories_source !== "manual" : row.calories === null
  );

  if (rows.length === 0) return { ok: false, message: "Menünüzde henüz ürün yok." };
  if (targets.length === 0) {
    return { ok: true, message: "Tüm ürünlerin kalorisi girilmiş. Tahmin edilecek ürün yok." };
  }

  const chunks: Row[][] = [];
  for (let i = 0; i < targets.length; i += CHUNK_SIZE) chunks.push(targets.slice(i, i + CHUNK_SIZE));

  const runNow = chunks.slice(0, MAX_REQUESTS_PER_RUN);
  const leftover = chunks.slice(MAX_REQUESTS_PER_RUN).reduce((sum, chunk) => sum + chunk.length, 0);

  let saved = 0;
  let failure = "";

  for (let i = 0; i < runNow.length; i += PARALLEL) {
    const results = await Promise.allSettled(
      runNow.slice(i, i + PARALLEL).map(async (chunk) => {
        const estimates = new Map((await estimateChunk(chunk)).map((item) => [item.key, item.calories]));
        let count = 0;

        for (const row of chunk) {
          const value = Math.round(Number(estimates.get(`p${row.id}`)));
          if (!Number.isFinite(value) || value < 0 || value > 5000) continue;

          const { error } = await admin.supabase
            .from("products")
            .update({ calories: value, calories_source: "ai" })
            .eq("id", row.id);

          if (error) throw error;
          count++;
        }
        return count;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        saved += result.value;
      } else {
        console.error("KALORİ TAHMİN HATASI:", result.reason);
        failure =
          result.reason instanceof AiError ? result.reason.message : "Bazı kaloriler kaydedilemedi. Tekrar deneyin.";
      }
    }
  }

  refresh();

  if (saved === 0) return { ok: false, message: failure || "Kalori tahmini yapılamadı. Tekrar deneyin." };

  const parts = [`${saved} ürünün kalorisi tahmin edildi. Lütfen göz gezdirip gerekirse düzeltin.`];
  if (leftover > 0) parts.push(`Kalan ${leftover} ürün için düğmeye bir kez daha basın.`);
  if (failure) parts.push(failure);
  return { ok: !failure, message: parts.join(" ") };
}

export async function saveCalories(_prev: CalorieResult, formData: FormData): Promise<CalorieResult> {
  const admin = await getAdminRestaurant();
  if (!admin) return { ok: false, message: "Oturum bulunamadı." };
  if (admin.isDemo) return { ok: false, message: DEMO_BLOCKED_MESSAGE };

  const id = Number(formData.get("id"));
  const raw = String(formData.get("calories") ?? "").trim();
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Geçersiz ürün." };

  const calories = raw === "" ? null : Math.round(Number(raw.replace(",", ".")));
  if (calories !== null && (!Number.isFinite(calories) || calories < 0 || calories > 5000)) {
    return { ok: false, message: "0 ile 5000 arasında bir sayı girin." };
  }

  // Ürün bu restorana ait olmalı (RLS de ayrıca korur).
  const { data: product } = await admin.supabase
    .from("products")
    .select("id, categories!inner(restaurant_id)")
    .eq("id", id)
    .eq("categories.restaurant_id", admin.restaurantId)
    .maybeSingle();

  if (!product) return { ok: false, message: "Ürün bulunamadı." };

  const { error } = await admin.supabase
    .from("products")
    .update({ calories, calories_source: calories === null ? null : "manual" })
    .eq("id", id);

  if (error) {
    console.error("KALORİ KAYDETME HATASI:", error);
    return { ok: false, message: /calories/i.test(error.message) ? MISSING_COLUMN : "Kaydedilemedi." };
  }

  refresh();
  return { ok: true, message: calories === null ? "Kalori kaldırıldı." : "Kaydedildi." };
}
