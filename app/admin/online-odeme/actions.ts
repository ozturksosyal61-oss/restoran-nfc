"use server";

import { revalidatePath } from "next/cache";
import { getAdminRestaurant } from "../../../lib/admin-restaurant";
import { DEMO_BLOCKED_MESSAGE } from "../../../lib/demo";
import { hasPlanFeature } from "../../../lib/plan";
import { readMenuOnly } from "../../../lib/restaurant-type";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import {
  decryptCredentials,
  encryptCredentials,
  encryptionConfigured,
  ENCRYPTION_KEY_MISSING_MESSAGE,
  maskSecret,
} from "../../../lib/payments/crypto";
import { isMode, isProvider, PROVIDERS } from "../../../lib/payments/providers";
import { loadPaymentSettings, PAYMENT_TABLES_MISSING_MESSAGE, startTestPayment } from "../../../lib/payments/service";

export type PaymentActionResult = { ok: boolean; message: string; redirectUrl?: string } | null;

function refresh() {
  revalidatePath("/admin/online-odeme");
}

// Yalnızca sipariş alan (Pro / Premium, sadece menü olmayan) restoranın
// gerçek yöneticisi ödeme ayarlarına dokunabilir.
type Admin = NonNullable<Awaited<ReturnType<typeof getAdminRestaurant>>>;

async function requireAccess(): Promise<{ admin: Admin; error?: undefined } | { admin?: undefined; error: string }> {
  const admin = await getAdminRestaurant();
  if (!admin) return { error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  if (admin.isDemo) return { error: DEMO_BLOCKED_MESSAGE };

  const [{ data: restaurant }, menuOnly] = await Promise.all([
    admin.supabase.from("restaurants").select("plan").eq("id", admin.restaurantId).maybeSingle(),
    readMenuOnly(admin.supabase, admin.restaurantId),
  ]);
  if (menuOnly || !hasPlanFeature(restaurant?.plan, "online_payment")) {
    return { error: "Masadan kartla ödeme Premium paketinde kullanılabilir." };
  }
  if (!encryptionConfigured()) return { error: ENCRYPTION_KEY_MISSING_MESSAGE };

  return { admin };
}

export async function savePaymentSettings(_prev: PaymentActionResult, formData: FormData): Promise<PaymentActionResult> {
  const access = await requireAccess();
  if (!access.admin) return { ok: false, message: access.error };
  const { restaurantId } = access.admin;

  const provider = formData.get("provider");
  const mode = formData.get("mode");
  if (!isProvider(provider)) return { ok: false, message: "Ödeme sağlayıcısını seçin." };
  if (!isMode(mode)) return { ok: false, message: "Test ya da canlı modu seçin." };

  const { settings: existing, tablesMissing } = await loadPaymentSettings(restaurantId);
  if (tablesMissing) return { ok: false, message: PAYMENT_TABLES_MISSING_MESSAGE };

  // Boş bırakılan gizli alan, aynı sağlayıcıda kayıtlı değeri korur.
  let previous: Record<string, string> = {};
  if (existing && existing.provider === provider) {
    try {
      previous = decryptCredentials<Record<string, string>>(existing.credentials, restaurantId);
    } catch {
      previous = {};
    }
  }

  const credentials: Record<string, string> = {};
  const hint: Record<string, string> = {};
  for (const field of PROVIDERS[provider].fields) {
    const typed = String(formData.get(field.name) ?? "").trim();
    const value = typed || previous[field.name] || "";
    if (!value) return { ok: false, message: `${field.label} alanını doldurun.` };
    if (value.length > 200 || /\s/.test(value)) return { ok: false, message: `${field.label} geçersiz görünüyor.` };
    credentials[field.name] = value;
    hint[field.name] = field.secret ? maskSecret(value) : value;
  }

  if (provider === "iyzico") {
    const sandbox = credentials.apiKey.startsWith("sandbox-");
    if (mode === "test" && !sandbox) {
      return { ok: false, message: "Test modunda iyzico test (sandbox) anahtarı girilmeli; bu anahtarlar “sandbox-” ile başlar." };
    }
    if (mode === "live" && sandbox) {
      return { ok: false, message: "Canlı modda test (sandbox-) anahtarı kullanılamaz. Canlı API anahtarlarınızı girin." };
    }
  }
  if (provider === "paytr" && !/^\d{3,12}$/.test(credentials.merchantId)) {
    return { ok: false, message: "PayTR mağaza numarası yalnızca rakamlardan oluşur." };
  }

  const changed =
    !existing ||
    existing.provider !== provider ||
    existing.mode !== mode ||
    PROVIDERS[provider].fields.some((field) => previous[field.name] !== credentials[field.name]);

  if (!changed) return { ok: true, message: "Değişiklik yok; bilgiler zaten kayıtlı." };

  const { error } = await createSupabaseAdminClient()
    .from("payment_settings")
    .upsert({
      restaurant_id: restaurantId,
      provider,
      mode,
      credentials: encryptCredentials(credentials, restaurantId),
      credentials_hint: hint,
      // Yeni bilgiler yeniden test edilene kadar doğrulanmamış sayılır.
      verified_at: null,
      is_enabled: false,
      updated_at: new Date().toISOString(),
    });

  if (error) return { ok: false, message: `Kaydedilemedi: ${error.message}` };

  refresh();
  return { ok: true, message: "Bilgiler şifrelenerek kaydedildi. Şimdi test ödemesiyle bağlantıyı deneyin." };
}

export async function removePaymentSettings(): Promise<PaymentActionResult> {
  const access = await requireAccess();
  if (!access.admin) return { ok: false, message: access.error };

  const { error } = await createSupabaseAdminClient()
    .from("payment_settings")
    .delete()
    .eq("restaurant_id", access.admin.restaurantId);

  if (error) return { ok: false, message: `Kaldırılamadı: ${error.message}` };

  refresh();
  return { ok: true, message: "Ödeme bağlantısı kaldırıldı. Kayıtlı anahtarlar silindi." };
}

export async function runTestPayment(): Promise<PaymentActionResult> {
  const access = await requireAccess();
  if (!access.admin) return { ok: false, message: access.error };

  const result = await startTestPayment(access.admin.restaurantId, access.admin.user.id);
  refresh();

  if (!result.ok) return { ok: false, message: `Test ödemesi başlatılamadı: ${result.message}` };
  return { ok: true, message: "Ödeme sayfası açılıyor…", redirectUrl: result.redirectUrl };
}

// Müşterilerin masadan kartla ödeyebilmesini açar / kapatır.
export async function setPaymentEnabled(_prev: PaymentActionResult, formData: FormData): Promise<PaymentActionResult> {
  const access = await requireAccess();
  if (!access.admin) return { ok: false, message: access.error };

  const enabled = formData.get("enabled") === "1";
  const { settings, tablesMissing } = await loadPaymentSettings(access.admin.restaurantId);
  if (tablesMissing) return { ok: false, message: PAYMENT_TABLES_MISSING_MESSAGE };
  if (!settings) return { ok: false, message: "Önce ödeme sağlayıcınızın bilgilerini kaydedin." };
  if (enabled && !settings.verified_at) {
    return { ok: false, message: "Önce başarılı bir test ödemesi yapın; sonra kartla ödemeyi açabilirsiniz." };
  }

  const { error } = await createSupabaseAdminClient()
    .from("payment_settings")
    .update({ is_enabled: enabled })
    .eq("restaurant_id", access.admin.restaurantId);
  if (error) return { ok: false, message: `Kaydedilemedi: ${error.message}` };

  refresh();
  return {
    ok: true,
    message: enabled
      ? "Kartla ödeme açıldı. Müşterileriniz masa hesabı ekranında “Kartla öde” düğmesini görecek."
      : "Kartla ödeme kapatıldı. Müşteriler ödemeyi garsona yapar.",
  };
}
