"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { generatePassword, requireSystemAdmin } from "../../../lib/system-admin";
import { RESTAURANT_THEMES } from "../../../lib/themes";
import { createSubscription, updateSubscription } from "../abonelikler/actions";

// Sistem sahibinin restoran üzerindeki işlemleri. Her işlem önce sistem
// yöneticisi yetkisini doğrular; service role yalnızca bundan sonra kullanılır.

export type ActionResult = {
  ok: boolean;
  message: string;
  // Yalnızca yeni oluşturulan / sıfırlanan şifre bir kez gösterilir.
  credentials?: { email: string; password: string };
} | null;

function readRestaurantId(formData: FormData) {
  const id = Number(formData.get("restaurant_id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function refresh(restaurantId: number) {
  revalidatePath("/sistem");
  revalidatePath(`/sistem/restoran/${restaurantId}`);
  revalidatePath("/sistem/yoneticiler");
  revalidatePath("/restoran", "layout");
  revalidatePath("/admin", "layout");
}

/* ---------------- Restoran türü ---------------- */

export async function setRestaurantType(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const restaurantId = readRestaurantId(formData);
  if (!restaurantId) return { ok: false, message: "Geçersiz restoran." };

  await requireSystemAdmin();
  const menuOnly = formData.get("restaurant_type") === "menu";

  const { error } = await createSupabaseAdminClient()
    .from("restaurants")
    .update({ menu_only: menuOnly })
    .eq("id", restaurantId);

  if (error) {
    console.error("RESTORAN TÜRÜ GÜNCELLEME HATASI:", error);
    return {
      ok: false,
      message: /menu_only/.test(error.message)
        ? "Önce 20260930_menu_only_restaurants.sql dosyasını Supabase'de çalıştırın."
        : `Tür kaydedilemedi: ${error.message}`,
    };
  }

  refresh(restaurantId);
  return { ok: true, message: menuOnly ? "Restoran artık sadece menü." : "Restoran tam sürüme geçti." };
}

/* ---------------- Tema ---------------- */

export async function setRestaurantTheme(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const restaurantId = readRestaurantId(formData);
  const theme = String(formData.get("theme") || "");
  if (!restaurantId) return { ok: false, message: "Geçersiz restoran." };

  const meta = RESTAURANT_THEMES.find((item) => item.value === theme);
  if (!meta) return { ok: false, message: "Geçersiz tema." };

  await requireSystemAdmin();

  // Tema izin listesi lib/themes.ts ve veritabanındaki kısıtla denetlenir.
  const { error } = await createSupabaseAdminClient()
    .from("restaurants")
    .update({ theme })
    .eq("id", restaurantId);

  if (error) {
    console.error("TEMA GÜNCELLEME HATASI:", error);
    return { ok: false, message: `Tema kaydedilemedi: ${error.message}` };
  }

  refresh(restaurantId);
  revalidatePath("/admin/ayarlar");
  return { ok: true, message: `Tema ${meta.label} olarak kaydedildi.` };
}

/* ---------------- Paket ---------------- */

export async function setRestaurantPlan(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const restaurantId = readRestaurantId(formData);
  const planId = String(formData.get("plan_id") || "");
  if (!restaurantId || !planId) return { ok: false, message: "Paket seçin." };

  await requireSystemAdmin();

  const next = new FormData();
  next.set("restaurant_id", String(restaurantId));
  next.set("plan_id", planId);
  next.set("status", String(formData.get("status") || "active"));
  next.set("billing_interval", String(formData.get("billing_interval") || "monthly"));

  const subscriptionId = String(formData.get("subscription_id") || "");
  if (subscriptionId) next.set("subscription_id", subscriptionId);

  const result = subscriptionId ? await updateSubscription(next) : await createSubscription(next);
  if (!result?.ok) return { ok: false, message: result?.message ?? "Paket uygulanamadı." };

  refresh(restaurantId);
  return { ok: true, message: "Paket uygulandı." };
}

/* ---------------- Aktif / pasif ---------------- */

export async function setRestaurantActive(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const restaurantId = readRestaurantId(formData);
  if (!restaurantId) return { ok: false, message: "Geçersiz restoran." };

  await requireSystemAdmin();
  const active = formData.get("active") === "true";

  const { error } = await createSupabaseAdminClient()
    .from("restaurants")
    .update({ is_active: active })
    .eq("id", restaurantId);

  if (error) {
    console.error("RESTORAN DURUM HATASI:", error);
    return { ok: false, message: `Durum değiştirilemedi: ${error.message}` };
  }

  refresh(restaurantId);
  return {
    ok: true,
    message: active
      ? "Restoran yeniden yayında."
      : "Restoran devre dışı. Müşteri sayfası kapandı; kayıtlar duruyor.",
  };
}

/* ---------------- Kalıcı silme ---------------- */

export async function deleteRestaurant(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const restaurantId = readRestaurantId(formData);
  if (!restaurantId) return { ok: false, message: "Geçersiz restoran." };

  const { supabase } = await requireSystemAdmin();

  if (String(formData.get("confirm") || "").trim() !== "RESTORANI SIL") {
    return { ok: false, message: "Onay için kutuya RESTORANI SIL yazın." };
  }

  const { error } = await supabase.rpc("delete_restaurant_completely", {
    p_restaurant_id: restaurantId,
  });

  if (error) {
    console.error("RESTORAN KALICI SİLME HATASI:", error);
    return { ok: false, message: `Restoran silinemedi: ${error.message}` };
  }

  revalidatePath("/sistem");
  revalidatePath("/sistem/abonelikler");
  revalidatePath("/sistem/yoneticiler");
  redirect("/sistem?silindi=1");
}

/* ---------------- Yönetici giriş bilgileri ---------------- */

// Yöneticinin bu restorana bağlı olduğunu doğrular (başka restoranın
// hesabına dokunulmasın diye).
async function findManager(restaurantId: number, userId: string) {
  const { supabase } = await requireSystemAdmin();
  const { data } = await supabase
    .from("restaurant_users")
    .select("id, user_id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function resetManagerPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const restaurantId = readRestaurantId(formData);
  const userId = String(formData.get("user_id") || "");
  const typed = String(formData.get("password") || "").trim();
  if (!restaurantId || !userId) return { ok: false, message: "Geçersiz yönetici." };

  if (typed && typed.length < 8) {
    return { ok: false, message: "Şifre en az 8 karakter olmalı. Boş bırakırsanız otomatik oluşturulur." };
  }

  if (!(await findManager(restaurantId, userId))) {
    return { ok: false, message: "Bu yönetici bu restorana bağlı değil." };
  }

  const password = typed || generatePassword();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.updateUserById(userId, { password });

  if (error || !data.user) {
    console.error("YÖNETİCİ ŞİFRE SIFIRLAMA HATASI:", error);
    return { ok: false, message: `Şifre değiştirilemedi: ${error?.message ?? "hesap bulunamadı"}` };
  }

  return {
    ok: true,
    message: "Yeni şifre kaydedildi. Bu şifre yalnızca şimdi gösterilir.",
    credentials: { email: data.user.email ?? "", password },
  };
}

export async function changeManagerEmail(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const restaurantId = readRestaurantId(formData);
  const userId = String(formData.get("user_id") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!restaurantId || !userId) return { ok: false, message: "Geçersiz yönetici." };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Geçerli bir e-posta adresi girin." };
  }

  if (!(await findManager(restaurantId, userId))) {
    return { ok: false, message: "Bu yönetici bu restorana bağlı değil." };
  }

  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
  });

  if (error) {
    console.error("YÖNETİCİ E-POSTA HATASI:", error);
    return { ok: false, message: `E-posta değiştirilemedi: ${error.message}` };
  }

  refresh(restaurantId);
  return { ok: true, message: `Giriş e-postası ${email} olarak değişti.` };
}

export async function addManager(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const restaurantId = readRestaurantId(formData);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const typed = String(formData.get("password") || "").trim();
  if (!restaurantId) return { ok: false, message: "Geçersiz restoran." };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Geçerli bir e-posta adresi girin." };
  }
  if (typed && typed.length < 8) {
    return { ok: false, message: "Şifre en az 8 karakter olmalı. Boş bırakırsanız otomatik oluşturulur." };
  }

  await requireSystemAdmin();
  const admin = createSupabaseAdminClient();
  const password = typed || generatePassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    console.error("YÖNETİCİ OLUŞTURMA HATASI:", createError);
    const exists = /already|registered|exists/i.test(createError?.message ?? "");
    return {
      ok: false,
      message: exists
        ? "Bu e-posta ile bir hesap zaten var. Farklı bir e-posta kullanın."
        : `Hesap oluşturulamadı: ${createError?.message ?? "bilinmeyen hata"}`,
    };
  }

  const { error: linkError } = await admin.from("restaurant_users").insert({
    user_id: created.user.id,
    restaurant_id: restaurantId,
    role: "manager",
  });

  if (linkError) {
    console.error("YÖNETİCİ BAĞLAMA HATASI:", linkError);
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, message: `Yönetici restorana bağlanamadı: ${linkError.message}` };
  }

  refresh(restaurantId);
  return {
    ok: true,
    message: "Yönetici eklendi. Şifre yalnızca şimdi gösterilir.",
    credentials: { email, password },
  };
}

export async function removeManager(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const restaurantId = readRestaurantId(formData);
  const userId = String(formData.get("user_id") || "");
  if (!restaurantId || !userId) return { ok: false, message: "Geçersiz yönetici." };

  const manager = await findManager(restaurantId, userId);
  if (!manager) return { ok: false, message: "Bu yönetici bu restorana bağlı değil." };

  const { error } = await createSupabaseAdminClient()
    .from("restaurant_users")
    .delete()
    .eq("id", manager.id);

  if (error) {
    console.error("YÖNETİCİ KALDIRMA HATASI:", error);
    return { ok: false, message: `Yönetici kaldırılamadı: ${error.message}` };
  }

  refresh(restaurantId);
  return { ok: true, message: "Yöneticinin bu restorana erişimi kaldırıldı." };
}
