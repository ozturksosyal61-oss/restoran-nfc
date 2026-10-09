"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aiConfigured, AI_NOT_CONFIGURED_MESSAGE } from "../../../lib/ai";
import { extractMenu, MAX_PRODUCTS } from "../../../lib/menu-extract";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { generatePassword, requireSystemAdmin } from "../../../lib/system-admin";
import { SELECTABLE_THEMES, normalizeRestaurantTheme } from "../../../lib/themes";

// Müşteriye özel demo: işletmenin menü fotoğrafından birkaç dakikada o
// işletmenin adıyla çalışan bir demo restoran kurar. Her işlem önce sistem
// yöneticisi yetkisini doğrular; service role yalnızca bundan sonra kullanılır.

export type CreatedDemo = {
  restaurantId: number;
  name: string;
  slug: string;
  tableToken: string;
  expiresAt: string;
  categoryCount: number;
  productCount: number;
  missingPrices: number;
  credentials: { email: string; password: string } | null;
};

export type DemoResult = { ok: boolean; message: string; demo?: CreatedDemo } | null;

const DEMO_TABLES = 3;
const DURATIONS = [3, 7, 14, 30];

function refresh() {
  revalidatePath("/sistem");
  revalidatePath("/sistem/demolar");
}

// "Köşe Kahvesi & Bistro" → "kose-kahvesi-bistro"
function slugBase(name: string) {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
  return (
    name
      .toLocaleLowerCase("tr-TR")
      .replace(/[çğıiöşüâîû]/g, (char) => map[char] ?? char)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32)
      .replace(/-+$/g, "") || "restoran"
  );
}

function randomSuffix() {
  return randomBytes(3).toString("hex").slice(0, 4);
}

function readId(formData: FormData) {
  const id = Number(formData.get("restaurant_id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/* ---------------- Oluştur ---------------- */

export async function createDemo(_prev: DemoResult, formData: FormData): Promise<DemoResult> {
  const { supabase: session, user } = await requireSystemAdmin();
  if (!aiConfigured()) return { ok: false, message: AI_NOT_CONFIGURED_MESSAGE };

  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (name.length < 2) return { ok: false, message: "İşletmenin adını yazın." };

  const theme = String(formData.get("theme") ?? "aurora");
  if (!SELECTABLE_THEMES.some((item) => item.value === theme)) return { ok: false, message: "Geçersiz tema." };

  const days = Number(formData.get("days"));
  if (!DURATIONS.includes(days)) return { ok: false, message: "Demo süresini seçin." };

  const withLogin = formData.get("with_login") === "1";
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

  // 1) Menüyü oku (başarısız olursa hiçbir kayıt oluşturulmaz).
  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  const extracted = await extractMenu(files);
  if (!extracted.ok) return { ok: false, message: extracted.message };

  const categories = extracted.categories.slice(0, 40);
  const productCount = categories.reduce((sum, category) => sum + category.products.length, 0);
  if (productCount > MAX_PRODUCTS) {
    return { ok: false, message: `Menüde ${productCount} ürün var; demo için en fazla ${MAX_PRODUCTS} ürün aktarılır. Daha az sayfa seçin.` };
  }

  const admin = createSupabaseAdminClient();
  const slug = `demo-${slugBase(name)}-${randomSuffix()}`;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  // 2) Restoran (tüm özellikler görünsün diye Premium).
  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .insert({
      name,
      slug,
      theme: normalizeRestaurantTheme(theme),
      plan: "premium",
      is_active: true,
      demo_expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (restaurantError || !restaurant) {
    return {
      ok: false,
      message: /demo_expires_at/.test(restaurantError?.message ?? "")
        ? "Önce 20261011_prospect_demos.sql dosyasını Supabase'de çalıştırın."
        : `Demo oluşturulamadı: ${restaurantError?.message ?? "bilinmeyen hata"}`,
    };
  }

  const restaurantId = Number(restaurant.id);
  let managerUserId: string | null = null;

  async function rollback(message: string): Promise<DemoResult> {
    await session.rpc("delete_restaurant_completely", { p_restaurant_id: restaurantId });
    if (managerUserId) await admin.auth.admin.deleteUser(managerUserId);
    return { ok: false, message };
  }

  // 3) Menü
  let missingPrices = 0;
  for (const [index, category] of categories.entries()) {
    const { data: insertedCategory, error: categoryError } = await admin
      .from("categories")
      .insert({ restaurant_id: restaurantId, name: category.name, sort_order: index + 1 })
      .select("id")
      .single();
    if (categoryError || !insertedCategory) return rollback(`Menü aktarılamadı: ${categoryError?.message ?? "kategori"}`);

    const { error: productError } = await admin.from("products").insert(
      category.products.map((product, order) => {
        if (product.price === null) missingPrices += 1;
        return {
          category_id: insertedCategory.id,
          name: product.name,
          description: product.description || null,
          ingredients: product.ingredients || null,
          allergens: product.allergens || null,
          // Okunamayan fiyat 0 yazılır; demo panelinden düzeltilebilir.
          price: product.price ?? 0,
          image_url: null,
          sort_order: order + 1,
        };
      })
    );
    if (productError) return rollback(`Ürünler aktarılamadı: ${productError.message}`);
  }

  // 4) Masalar
  const tables = Array.from({ length: DEMO_TABLES }, (_, index) => ({
    restaurant_id: restaurantId,
    table_number: index + 1,
    public_token: crypto.randomUUID(),
    is_active: true,
  }));
  const { error: tablesError } = await admin.from("restaurant_tables").insert(tables);
  if (tablesError) return rollback(`Masalar oluşturulamadı: ${tablesError.message}`);

  // 5) İsteğe bağlı panel girişi (işletme sahibi kendi menüsüyle paneli dener).
  let credentials: CreatedDemo["credentials"] = null;
  if (withLogin) {
    const email = `${slug}@demo.oztdigital.com.tr`;
    const password = generatePassword();
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { prospect_demo: true },
    });
    if (userError || !created.user) return rollback(`Panel girişi oluşturulamadı: ${userError?.message ?? "bilinmeyen hata"}`);
    managerUserId = created.user.id;

    const { error: memberError } = await admin
      .from("restaurant_users")
      .insert({ user_id: managerUserId, restaurant_id: restaurantId, role: "manager" });
    if (memberError) return rollback(`Panel girişi bağlanamadı: ${memberError.message}`);
    credentials = { email, password };
  }

  // 6) Demo kaydı
  const { error: demoError } = await admin.from("prospect_demos").insert({
    restaurant_id: restaurantId,
    prospect_name: name,
    note,
    manager_user_id: managerUserId,
    manager_email: credentials?.email ?? null,
    created_by: user.id,
  });
  if (demoError) return rollback(`Demo kaydedilemedi: ${demoError.message}`);

  // 7) Saha satıştaki işletmeye bağla (tablo yoksa sessizce geçilir).
  const leadId = Number(formData.get("lead_id"));
  if (Number.isInteger(leadId) && leadId > 0) {
    const { data: lead } = await admin.from("sales_leads").select("stage").eq("id", leadId).maybeSingle();
    if (lead) {
      const advance = ["yeni", "gorusuldu", "ilgileniyor", "teklif"].includes(String(lead.stage));
      await admin
        .from("sales_leads")
        .update({
          demo_restaurant_id: restaurantId,
          ...(advance ? { stage: "demo" } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
      await admin.from("sales_visits").insert({
        lead_id: leadId,
        channel: "sistem",
        note: `Demo kuruldu (${days} gün).`,
        created_by: user.id,
      });
      revalidatePath(`/sistem/saha/${leadId}`);
      revalidatePath("/sistem/saha");
    }
  }

  refresh();
  return {
    ok: true,
    message: "Demo hazır.",
    demo: {
      restaurantId,
      name,
      slug,
      tableToken: tables[0].public_token,
      expiresAt,
      categoryCount: categories.length,
      productCount,
      missingPrices,
      credentials,
    },
  };
}

/* ---------------- Uzat / sil / kalıcı yap ---------------- */

async function loadDemo(restaurantId: number) {
  const { data } = await createSupabaseAdminClient()
    .from("prospect_demos")
    .select("restaurant_id, manager_user_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  return data;
}

export async function extendDemo(_prev: DemoResult, formData: FormData): Promise<DemoResult> {
  await requireSystemAdmin();
  const restaurantId = readId(formData);
  if (!restaurantId || !(await loadDemo(restaurantId))) return { ok: false, message: "Demo bulunamadı." };

  const admin = createSupabaseAdminClient();
  const { data: restaurant } = await admin.from("restaurants").select("demo_expires_at").eq("id", restaurantId).maybeSingle();
  const base = Math.max(Date.now(), restaurant?.demo_expires_at ? new Date(restaurant.demo_expires_at).getTime() : 0);
  const next = new Date(base + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("restaurants").update({ demo_expires_at: next, is_active: true }).eq("id", restaurantId);
  if (error) return { ok: false, message: `Uzatılamadı: ${error.message}` };

  refresh();
  revalidatePath("/restoran", "layout");
  return { ok: true, message: "Demo 7 gün uzatıldı." };
}

export async function deleteDemo(_prev: DemoResult, formData: FormData): Promise<DemoResult> {
  const { supabase } = await requireSystemAdmin();
  const restaurantId = readId(formData);
  const demo = restaurantId ? await loadDemo(restaurantId) : null;
  // Yalnızca demo olarak oluşturulmuş restoranlar buradan silinebilir.
  if (!restaurantId || !demo) return { ok: false, message: "Demo bulunamadı." };

  const { error } = await supabase.rpc("delete_restaurant_completely", { p_restaurant_id: restaurantId });
  if (error) return { ok: false, message: `Silinemedi: ${error.message}` };
  if (demo.manager_user_id) await createSupabaseAdminClient().auth.admin.deleteUser(demo.manager_user_id);

  refresh();
  return { ok: true, message: "Demo silindi." };
}

// Görüşme olumlu geçti: demo süresi kalkar, restoran normal restorana dönüşür.
export async function makeDemoPermanent(_prev: DemoResult, formData: FormData): Promise<DemoResult> {
  await requireSystemAdmin();
  const restaurantId = readId(formData);
  if (!restaurantId || !(await loadDemo(restaurantId))) return { ok: false, message: "Demo bulunamadı." };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("restaurants").update({ demo_expires_at: null, is_active: true }).eq("id", restaurantId);
  if (error) return { ok: false, message: `Kaydedilemedi: ${error.message}` };
  await admin.from("prospect_demos").delete().eq("restaurant_id", restaurantId);

  refresh();
  revalidatePath("/restoran", "layout");
  redirect(`/sistem/restoran/${restaurantId}`);
}
