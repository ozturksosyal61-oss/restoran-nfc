"use server";
import { planGate } from "../../../../lib/admin-plan";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { DEMO_BLOCKED_MESSAGE } from "../../../../lib/demo";
import { AiError, aiConfigured, AI_NOT_CONFIGURED_MESSAGE, callAiTool } from "../../../../lib/ai";
import {
  isMenuLanguage,
  languageMeta,
  normalizeLanguages,
  isTranslationCurrent,
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
  if (admin.isDemo) return { ok: false, message: DEMO_BLOCKED_MESSAGE };
  {
    const planError = await planGate(admin, "languages");
    if (planError) return { ok: false, message: planError };
  }

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
};

// Modelin çeviriye karıştırdığı not / düşünce metinleri ("wait", "Let's",
// "translated", "Im Original steht", "Allergens:" vb.). Bunlardan birini
// içeren çeviri kaydedilmez.
const JUNK = /(allerg|alerjen|\bwait\b|let'?s\b|context|translat|übersetz|original|strictly|note:|\|)/i;

function jobKey(job: Job) {
  return `${job.kind === "category" ? "c" : "p"}${job.row.id}`;
}

// Çeviri kaynakla uyumlu mu: zorunlu alan dolu, not sızmamış, aşırı uzun değil.
// Alerjenler çevrilmez (lib/allergens sabit sözlüğü kullanılır).
function cleanTranslation(job: Job, item: TranslatedItem | undefined): TranslatedFields | null {
  const name = item?.name?.trim();
  if (!name) return null;

  const fields: [keyof TranslatedItem, string | null | undefined][] = [
    ["name", job.row.name],
    ["description", job.row.description],
    ["ingredients", job.row.ingredients],
  ];

  for (const [field, source] of fields) {
    const value = typeof item?.[field] === "string" ? (item[field] as string).trim() : "";
    if (!value) continue;
    if (JUNK.test(value)) return null;
    const sourceLength = source?.trim().length ?? 0;
    if (sourceLength > 0 && value.length > sourceLength * 3 + 40) return null;
  }

  return {
    name: name.slice(0, 200),
    description: job.row.description?.trim() ? item?.description?.trim().slice(0, 2000) || null : null,
    ingredients: job.row.ingredients?.trim() ? item?.ingredients?.trim().slice(0, 1000) || null : null,
    allergens: null,
  };
}

// Aynı malzemenin farklı ürünlerde farklı çevrilmemesi için sabit terimler.
const GLOSSARY: Partial<Record<MenuLanguage, string>> = {
  en: "roka = arugula (never 'rocket'), dana = beef, kıyma = minced beef, tavuk = chicken, köz = roasted, lavaş = lavash",
  de: "roka = Rucola, dana = Rind, kıyma = Rinderhack, tavuk = Hähnchen, lavaş = Lavash",
  fr: "roka = roquette, dana = bœuf, kıyma = bœuf haché, tavuk = poulet",
  ru: "roka = руккола, dana = говядина, kıyma = говяжий фарш, tavuk = курица",
  ar: "roka = جرجير, dana = لحم بقري, kıyma = لحم مفروم, tavuk = دجاج",
};

async function translateChunk(language: MenuLanguage, jobs: Job[]) {
  const items = jobs.map((job) => ({
    key: jobKey(job),
    name: job.row.name,
    ...(job.row.description?.trim() ? { description: job.row.description.trim() } : {}),
    ...(job.row.ingredients?.trim() ? { ingredients: job.row.ingredients.trim() } : {}),
  }));

  const meta = languageMeta(language);

  const result = await callAiTool<{ items: TranslatedItem[] }>({
    system:
      `You translate Turkish restaurant menus into ${meta.label} (${language}) for tourists. ` +
      "Keep it natural and appetising, the way a good local menu in that language would read. " +
      "Keep well-known Turkish dish names (e.g. Adana Kebap, İskender, Lahmacun, Künefe, Mantı) in their original form " +
      "and add a short explanation only in the description when one exists. " +
      "ingredients is a comma-separated list; translate each item and keep it comma-separated. " +
      "Each field must contain only the translated text of that same field: never add allergens, notes, " +
      "explanations, alternatives, the original text or your reasoning. " +
      "Do not invent information, prices or ingredients. Return every key you receive exactly once." +
      (GLOSSARY[language] ? ` Always use these terms consistently: ${GLOSSARY[language]}.` : ""),
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
            },
            required: ["key", "name"],
            additionalProperties: false,
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
  if (admin.isDemo) return { ok: false, message: DEMO_BLOCKED_MESSAGE };
  {
    const planError = await planGate(admin, "ai");
    if (planError) return { ok: false, message: planError };
  }
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
      return !entry?.name || !isTranslationCurrent(entry, job.row);
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
          const retry: Job[] = [];

          for (const job of task.jobs) {
            const fields = cleanTranslation(job, byKey.get(jobKey(job)));
            if (!fields) {
              retry.push(job);
              continue;
            }
            await saveTranslation(admin.supabase, job, language, fields);
            count++;
          }

          // Bozuk ya da eksik gelenler bir kez daha istenir; yine bozuksa kaydedilmez.
          if (retry.length > 0) {
            const again = new Map((await translateChunk(language, retry)).map((item) => [item.key, item]));
            for (const job of retry) {
              const fields = cleanTranslation(job, again.get(jobKey(job)));
              if (!fields) {
                console.error("ÇEVİRİ REDDEDİLDİ:", language, jobKey(job));
                continue;
              }
              await saveTranslation(admin.supabase, job, language, fields);
              count++;
            }
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
  if (admin.isDemo) return { ok: false, message: DEMO_BLOCKED_MESSAGE };
  {
    const planError = await planGate(admin, "languages");
    if (planError) return { ok: false, message: planError };
  }

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
