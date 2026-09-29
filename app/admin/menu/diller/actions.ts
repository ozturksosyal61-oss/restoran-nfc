"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { AiError, aiConfigured, AI_NOT_CONFIGURED_MESSAGE, callAiTool } from "../../../../lib/ai";
import {
  isMenuLanguage,
  languageMeta,
  normalizeLanguages,
  readTranslations,
  sourceFingerprint,
  type MenuLanguage,
  type TranslatedFields,
} from "../../../../lib/menu-i18n";

export type LanguageResult = { ok: boolean; message: string } | null;

const MISSING_COLUMN =
  "Çok dilli menü için önce 20261002_languages_feedback.sql dosyasının Supabase'de çalıştırılması gerekiyor.";

// Bir tıklamada en fazla bu kadar yapay zekâ isteği; sayfa zaman aşımına
// uğramasın diye kalanlar bir sonraki tıklamaya bırakılır.
const CHUNK_SIZE = 20;
const MAX_REQUESTS_PER_RUN = 6;
const PARALLEL = 2;

type Row = {
  id: number;
  name: string;
  description?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  translations: unknown;
};

type Job = {
  kind: "category" | "product";
  row: Row;
};

function refresh() {
  revalidatePath("/admin/menu/diller");
}

/* ---------------- Dil seçimi ---------------- */

export async function saveMenuLanguages(_prev: LanguageResult, formData: FormData): Promise<LanguageResult> {
  const admin = await getAdminRestaurant();
  if (!admin) return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };

  const languages = normalizeLanguages(formData.getAll("languages").map(String));

  const { error } = await admin.supabase
    .from("restaurants")
    .update({ menu_languages: languages })
    .eq("id", admin.restaurantId);

  if (error) {
    console.error("MENÜ DİLLERİ KAYDETME HATASI:", error);
    return {
      ok: false,
      message: /menu_languages/i.test(error.message) ? MISSING_COLUMN : `Kaydedilemedi: ${error.message}`,
    };
  }

  refresh();
  return {
    ok: true,
    message:
      languages.length === 0
        ? "Menünüz yalnızca Türkçe gösterilecek."
        : `Menünüz ${languages.map((code) => languageMeta(code).turkish).join(", ")} olarak da gösterilecek.`,
  };
}

/* ---------------- Otomatik çeviri ---------------- */

async function loadMenu(supabase: SupabaseClient, restaurantId: number) {
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, translations")
    .eq("restaurant_id", restaurantId);

  if (categoryError) throw categoryError;

  const categoryIds = (categories ?? []).map((category) => category.id);
  let products: Row[] = [];

  if (categoryIds.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, ingredients, allergens, translations")
      .in("category_id", categoryIds);

    if (error) throw error;
    products = (data ?? []) as Row[];
  }

  return { categories: (categories ?? []) as Row[], products };
}

type TranslatedItem = {
  key: string;
  name: string;
  description?: string;
  ingredients?: string;
  allergens?: string;
};

async function translateChunk(language: MenuLanguage, jobs: Job[]) {
  const items = jobs.map((job) => ({
    key: `${job.kind === "category" ? "c" : "p"}${job.row.id}`,
    name: job.row.name,
    ...(job.row.description?.trim() ? { description: job.row.description.trim() } : {}),
    ...(job.row.ingredients?.trim() ? { ingredients: job.row.ingredients.trim() } : {}),
    ...(job.row.allergens?.trim() ? { allergens: job.row.allergens.trim() } : {}),
  }));

  const meta = languageMeta(language);

  const result = await callAiTool<{ items: TranslatedItem[] }>({
    system:
      `You translate Turkish restaurant menus into ${meta.label} (${language}) for tourists. ` +
      "Keep it natural and appetising, the way a good local menu in that language would read. " +
      "Keep well-known Turkish dish names (e.g. Adana Kebap, İskender, Lahmacun, Künefe, Mantı) in their original form " +
      "and add a short explanation only in the description when one exists. " +
      "ingredients and allergens are comma-separated lists; translate each item and keep them comma-separated. " +
      "Do not invent information, prices or ingredients. Return every key you receive exactly once.",
    content: [
      {
        type: "text",
        text:
          "Translate these menu entries. Keys starting with c are categories, p are products.\n" +
          JSON.stringify(items),
      },
    ],
    toolName: "save_translations",
    toolDescription: "Save the translated menu entries.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              ingredients: { type: "string" },
              allergens: { type: "string" },
            },
            required: ["key", "name"],
          },
        },
      },
      required: ["items"],
    },
    maxTokens: 12000,
  });

  return Array.isArray(result.items) ? result.items : [];
}

async function saveTranslation(
  supabase: SupabaseClient,
  job: Job,
  language: MenuLanguage,
  fields: TranslatedFields
) {
  const current = readTranslations(job.row.translations);
  const next = {
    ...current,
    [language]: { ...fields, src: sourceFingerprint(job.row) },
  };

  const { error } = await supabase
    .from(job.kind === "category" ? "categories" : "products")
    .update({ translations: next })
    .eq("id", job.row.id);

  if (error) throw error;
  // Aynı satırın başka dil çevirisi de bu nesneyi kullansın.
  job.row.translations = next;
}

export async function translateMenu(_prev: LanguageResult, formData: FormData): Promise<LanguageResult> {
  const admin = await getAdminRestaurant();
  if (!admin) return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  if (!aiConfigured()) return { ok: false, message: AI_NOT_CONFIGURED_MESSAGE };

  const redo = formData.get("mode") === "all";
  const only = String(formData.get("language") || "");

  const { data: restaurant, error: restaurantError } = await admin.supabase
    .from("restaurants")
    .select("menu_languages")
    .eq("id", admin.restaurantId)
    .maybeSingle();

  if (restaurantError) {
    return { ok: false, message: /menu_languages/i.test(restaurantError.message) ? MISSING_COLUMN : restaurantError.message };
  }

  let languages = normalizeLanguages(restaurant?.menu_languages);
  if (isMenuLanguage(only)) languages = languages.filter((code) => code === only);

  if (languages.length === 0) {
    return { ok: false, message: "Önce menünüzün gösterileceği dilleri seçip kaydedin." };
  }

  let menu: Awaited<ReturnType<typeof loadMenu>>;
  try {
    menu = await loadMenu(admin.supabase, admin.restaurantId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? "");
    return { ok: false, message: /translations/i.test(message) ? MISSING_COLUMN : `Menü okunamadı: ${message}` };
  }

  const allJobs: Job[] = [
    ...menu.categories.map((row) => ({ kind: "category" as const, row })),
    ...menu.products.map((row) => ({ kind: "product" as const, row })),
  ];

  if (allJobs.length === 0) {
    return { ok: false, message: "Menünüzde henüz çevrilecek kategori ya da ürün yok." };
  }

  // Dil başına çevrilmesi gerekenler, parçalara bölünmüş hâlde.
  const tasks: { language: MenuLanguage; jobs: Job[] }[] = [];
  for (const language of languages) {
    const pending = allJobs.filter((job) => {
      if (redo) return true;
      const entry = readTranslations(job.row.translations)[language];
      return !entry?.name || entry.src !== sourceFingerprint(job.row);
    });
    for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
      tasks.push({ language, jobs: pending.slice(i, i + CHUNK_SIZE) });
    }
  }

  if (tasks.length === 0) {
    return { ok: true, message: "Tüm çeviriler güncel. Çevrilecek yeni bir şey yok." };
  }

  const runNow = tasks.slice(0, MAX_REQUESTS_PER_RUN);
  const leftover = tasks.slice(MAX_REQUESTS_PER_RUN).reduce((sum, task) => sum + task.jobs.length, 0);

  let translated = 0;
  let failure = "";

  // Aynı satırın farklı dilleri aynı anda yazılmasın diye diller sırayla,
  // her dilin parçaları paralel çalışır.
  for (const language of languages) {
    const languageTasks = runNow.filter((task) => task.language === language);

    for (let i = 0; i < languageTasks.length; i += PARALLEL) {
      const batch = languageTasks.slice(i, i + PARALLEL);

      const results = await Promise.allSettled(
        batch.map(async (task) => {
          const items = await translateChunk(language, task.jobs);
          const byKey = new Map(items.map((item) => [item.key, item]));
          let count = 0;

          for (const job of task.jobs) {
            const item = byKey.get(`${job.kind === "category" ? "c" : "p"}${job.row.id}`);
            if (!item?.name?.trim()) continue;

            await saveTranslation(admin.supabase, job, language, {
              name: item.name.trim().slice(0, 200),
              description: item.description?.trim().slice(0, 2000) || null,
              ingredients: item.ingredients?.trim().slice(0, 1000) || null,
              allergens: item.allergens?.trim().slice(0, 1000) || null,
            });
            count++;
          }
          return count;
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          translated += result.value;
        } else {
          console.error("ÇEVİRİ HATASI:", result.reason);
          failure =
            result.reason instanceof AiError
              ? result.reason.message
              : "Bazı çeviriler kaydedilemedi. Tekrar deneyin.";
        }
      }
    }
  }

  refresh();

  if (translated === 0) {
    return { ok: false, message: failure || "Çeviri yapılamadı. Tekrar deneyin." };
  }

  const parts = [`${translated} çeviri kaydedildi.`];
  if (leftover > 0) parts.push(`Kalan ${leftover} çeviri için düğmeye bir kez daha basın.`);
  if (failure) parts.push(failure);

  return { ok: !failure, message: parts.join(" ") };
}

/* ---------------- Elle düzeltme ---------------- */

export async function saveManualTranslation(_prev: LanguageResult, formData: FormData): Promise<LanguageResult> {
  const admin = await getAdminRestaurant();
  if (!admin) return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };

  const kind = formData.get("kind") === "category" ? "category" : "product";
  const id = Number(formData.get("id"));
  const language = String(formData.get("language") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!Number.isInteger(id) || id <= 0 || !isMenuLanguage(language)) {
    return { ok: false, message: "Geçersiz kayıt." };
  }
  if (!name) return { ok: false, message: "Çeviri adı boş olamaz." };

  const table = kind === "category" ? "categories" : "products";
  const columns = kind === "category" ? "id, name, translations" : "id, name, description, ingredients, allergens, translations, categories!inner(restaurant_id)";

  // Kayıt bu restorana ait olmalı (RLS de ayrıca korur).
  let query = admin.supabase.from(table).select(columns).eq("id", id);
  query =
    kind === "category"
      ? query.eq("restaurant_id", admin.restaurantId)
      : query.eq("categories.restaurant_id", admin.restaurantId);

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    if (error) console.error("ÇEVİRİ KAYDI OKUNAMADI:", error);
    return { ok: false, message: "Kayıt bulunamadı." };
  }

  const row = data as unknown as Row;
  const existing = readTranslations(row.translations)[language];

  try {
    await saveTranslation(admin.supabase, { kind, row }, language, {
      name: name.slice(0, 200),
      description: kind === "product" ? description.slice(0, 2000) || null : null,
      ingredients: existing?.ingredients ?? null,
      allergens: existing?.allergens ?? null,
    });
  } catch (saveError) {
    console.error("ÇEVİRİ KAYDETME HATASI:", saveError);
    return { ok: false, message: "Çeviri kaydedilemedi." };
  }

  refresh();
  return { ok: true, message: "Kaydedildi." };
}
