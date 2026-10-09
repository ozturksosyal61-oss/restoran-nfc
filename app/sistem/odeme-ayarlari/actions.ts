"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { requireSystemAdmin } from "../../../lib/system-admin";
import { decryptCredentials, encryptCredentials, encryptionConfigured, ENCRYPTION_KEY_MISSING_MESSAGE, maskSecret } from "../../../lib/payments/crypto";
import { isMode } from "../../../lib/payments/providers";
import {
  applyRestaurantPlan,
  billingCredentials,
  BILLING_MISSING_MESSAGE,
  cancelBilling,
  loadBillingAccount,
  loadBillingSettings,
  loadPlans,
  PLATFORM_KEY_SCOPE,
  syncFromIyzico,
  type Interval,
  type PlanRef,
} from "../../../lib/billing/service";
import {
  createPricingPlan,
  createProduct,
  testConnection,
  type BillingCredentials,
} from "../../../lib/billing/iyzico-subscription";

// Platformun iyzico abonelik hesabı ve restoran bazında otomatik ödeme.
// Her işlem önce sistem yöneticisi yetkisini doğrular.

export type BillingAdminResult = { ok: boolean; message: string } | null;

function refresh(restaurantId?: number) {
  revalidatePath("/sistem/odeme-ayarlari");
  if (restaurantId) revalidatePath(`/sistem/restoran/${restaurantId}`);
  revalidatePath("/admin", "layout");
  revalidatePath("/restoran", "layout");
}

/* ---------------- Platform ayarları ---------------- */

export async function saveBillingSettings(_prev: BillingAdminResult, formData: FormData): Promise<BillingAdminResult> {
  await requireSystemAdmin();
  if (!encryptionConfigured()) return { ok: false, message: ENCRYPTION_KEY_MISSING_MESSAGE };

  const { settings, missing } = await loadBillingSettings();
  if (missing) return { ok: false, message: BILLING_MISSING_MESSAGE };

  const mode = formData.get("mode");
  if (!isMode(mode)) return { ok: false, message: "Test ya da canlı modu seçin." };
  const trialDays = Number(formData.get("trial_days"));
  const graceDays = Number(formData.get("grace_days"));
  if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 90) return { ok: false, message: "Deneme süresi 0–90 gün olmalı." };
  if (!Number.isInteger(graceDays) || graceDays < 0 || graceDays > 60) return { ok: false, message: "Ek süre 0–60 gün olmalı." };

  let previous: Partial<BillingCredentials> = {};
  if (settings?.credentials) {
    try {
      previous = decryptCredentials<BillingCredentials>(settings.credentials, PLATFORM_KEY_SCOPE);
    } catch {
      previous = {};
    }
  }

  const value = (name: keyof BillingCredentials) => String(formData.get(name) ?? "").trim() || previous[name] || "";
  const credentials: BillingCredentials = { apiKey: value("apiKey"), secretKey: value("secretKey"), merchantId: value("merchantId") };

  const anyKey = credentials.apiKey || credentials.secretKey;
  if (anyKey && (!credentials.apiKey || !credentials.secretKey)) return { ok: false, message: "API anahtarı ve güvenlik anahtarını birlikte girin." };
  if (credentials.apiKey) {
    const sandbox = credentials.apiKey.startsWith("sandbox-");
    if (mode === "test" && !sandbox) return { ok: false, message: "Test modunda iyzico test (sandbox-) anahtarı girilmeli." };
    if (mode === "live" && sandbox) return { ok: false, message: "Canlı modda test (sandbox-) anahtarı kullanılamaz." };
  }
  // Üye işyeri no, iyzico bildirimlerinin imzasını doğrulamak için zorunludur.
  if (credentials.apiKey && !credentials.merchantId) return { ok: false, message: "Üye işyeri numarasını girin (iyzico panelinde Ayarlar bölümünde yazar)." };
  if (credentials.merchantId && !/^\d{3,12}$/.test(credentials.merchantId)) return { ok: false, message: "Üye işyeri numarası yalnızca rakamlardan oluşur." };

  // Anahtar ya da mod değişirse iyzico'daki ürün / planlar yeniden oluşturulmalıdır.
  const accountChanged = settings?.mode !== mode || previous.apiKey !== credentials.apiKey;

  const { error } = await createSupabaseAdminClient()
    .from("billing_settings")
    .update({
      mode,
      trial_days: trialDays,
      grace_days: graceDays,
      credentials: credentials.apiKey ? encryptCredentials(credentials, PLATFORM_KEY_SCOPE) : null,
      credentials_hint: credentials.apiKey
        ? { apiKey: maskSecret(credentials.apiKey), secretKey: maskSecret(credentials.secretKey), merchantId: credentials.merchantId }
        : {},
      ...(accountChanged ? { product_ref: null, plan_refs: {} } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { ok: false, message: `Kaydedilemedi: ${error.message}` };
  refresh();
  return {
    ok: true,
    message: accountChanged && credentials.apiKey
      ? "Kaydedildi. Şimdi bağlantıyı deneyin ve paketleri iyzico'ya aktarın."
      : "Kaydedildi.",
  };
}

export async function testBillingConnection(): Promise<BillingAdminResult> {
  await requireSystemAdmin();
  const { settings } = await loadBillingSettings();
  const credentials = billingCredentials(settings);
  if (!settings || !credentials) return { ok: false, message: "Önce iyzico anahtarlarını kaydedin." };
  try {
    const result = await testConnection(credentials, settings.mode);
    return result.ok ? { ok: true, message: "Bağlantı çalışıyor." } : { ok: false, message: `iyzico: ${result.message}` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "iyzico'ya ulaşılamadı." };
  }
}

// Sistemdeki her paket için iyzico'da aylık / yıllık ödeme planı oluşturur.
// iyzico'da plan fiyatı sonradan değiştirilemez; fiyat değişen paket için
// yeni plan açılır (mevcut aboneler eski fiyattan devam eder).
export async function syncPricingPlans(): Promise<BillingAdminResult> {
  await requireSystemAdmin();
  const { settings } = await loadBillingSettings();
  const credentials = billingCredentials(settings);
  if (!settings || !credentials) return { ok: false, message: "Önce iyzico anahtarlarını kaydedin." };

  const admin = createSupabaseAdminClient();
  try {
    let productRef = settings.product_ref;
    if (!productRef) {
      const product = await createProduct(credentials, settings.mode);
      if (!product.ok) return { ok: false, message: `Ürün oluşturulamadı: ${product.message}` };
      productRef = product.ref;
      await admin.from("billing_settings").update({ product_ref: productRef }).eq("id", 1);
    }

    const refs: Record<string, Partial<Record<Interval, PlanRef>>> = { ...(settings.plan_refs ?? {}) };
    let created = 0;
    for (const plan of await loadPlans()) {
      for (const interval of ["monthly", "yearly"] as Interval[]) {
        const price = interval === "monthly" ? plan.monthly_price : plan.yearly_price;
        if (!(price > 0)) continue;
        const existing = refs[plan.id]?.[interval];
        if (existing && existing.price === price) continue;

        const result = await createPricingPlan(credentials, settings.mode, productRef, {
          name: `${plan.name} · ${interval === "monthly" ? "Aylık" : "Yıllık"} · ${price} TL`,
          price,
          interval,
        });
        if (!result.ok) {
          await admin.from("billing_settings").update({ plan_refs: refs }).eq("id", 1);
          return { ok: false, message: `${plan.name} planı oluşturulamadı: ${result.message}` };
        }
        refs[plan.id] = { ...(refs[plan.id] ?? {}), [interval]: { ref: result.ref, price } };
        created += 1;
      }
    }

    await admin.from("billing_settings").update({ plan_refs: refs, updated_at: new Date().toISOString() }).eq("id", 1);
    refresh();
    return { ok: true, message: created > 0 ? `${created} ödeme planı iyzico'ya aktarıldı.` : "Tüm paketler zaten güncel." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "iyzico'ya ulaşılamadı." };
  }
}

/* ---------------- Restoran bazında ---------------- */

function readRestaurantId(formData: FormData) {
  const id = Number(formData.get("restaurant_id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function enableAutoBilling(_prev: BillingAdminResult, formData: FormData): Promise<BillingAdminResult> {
  await requireSystemAdmin();
  const restaurantId = readRestaurantId(formData);
  if (!restaurantId) return { ok: false, message: "Geçersiz restoran." };
  const planId = String(formData.get("plan_id") ?? "");
  const interval: Interval = formData.get("interval") === "yearly" ? "yearly" : "monthly";
  if (!(await loadPlans()).some((plan) => plan.id === planId)) return { ok: false, message: "Paket seçin." };

  const { settings, missing } = await loadBillingSettings();
  if (missing) return { ok: false, message: BILLING_MISSING_MESSAGE };
  if (await loadBillingAccount(restaurantId)) return { ok: false, message: "Bu restoranda otomatik ödeme zaten açık." };

  const trialEnds = new Date(Date.now() + (settings?.trial_days ?? 7) * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await createSupabaseAdminClient().from("billing_accounts").insert({
    restaurant_id: restaurantId,
    plan_id: planId,
    billing_interval: interval,
    status: "trial",
    trial_ends_at: trialEnds,
  });
  if (error) return { ok: false, message: `Açılamadı: ${error.message}` };

  await applyRestaurantPlan(restaurantId, planId);
  refresh(restaurantId);
  return { ok: true, message: `Otomatik ödeme açıldı; deneme ${settings?.trial_days ?? 7} gün.` };
}

export async function extendTrial(_prev: BillingAdminResult, formData: FormData): Promise<BillingAdminResult> {
  await requireSystemAdmin();
  const restaurantId = readRestaurantId(formData);
  const account = restaurantId ? await loadBillingAccount(restaurantId) : null;
  if (!restaurantId || !account) return { ok: false, message: "Otomatik ödeme hesabı bulunamadı." };
  if (account.status !== "trial") return { ok: false, message: "Yalnızca denemedeki restoranın süresi uzatılabilir." };

  const base = Math.max(Date.now(), account.trial_ends_at ? new Date(account.trial_ends_at).getTime() : 0);
  const { error } = await createSupabaseAdminClient()
    .from("billing_accounts")
    .update({ trial_ends_at: new Date(base + 7 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId);
  if (error) return { ok: false, message: `Uzatılamadı: ${error.message}` };
  refresh(restaurantId);
  return { ok: true, message: "Deneme 7 gün uzatıldı." };
}

export async function setSuspended(_prev: BillingAdminResult, formData: FormData): Promise<BillingAdminResult> {
  await requireSystemAdmin();
  const restaurantId = readRestaurantId(formData);
  const account = restaurantId ? await loadBillingAccount(restaurantId) : null;
  if (!restaurantId || !account) return { ok: false, message: "Otomatik ödeme hesabı bulunamadı." };

  const suspend = formData.get("suspend") === "1";
  const nextStatus = suspend
    ? "suspended"
    : account.iyzico_subscription_ref
      ? "active"
      : "trial";
  const { error } = await createSupabaseAdminClient()
    .from("billing_accounts")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId);
  if (error) return { ok: false, message: `Kaydedilemedi: ${error.message}` };

  if (!suspend && account.iyzico_subscription_ref) {
    const fresh = await loadBillingAccount(restaurantId);
    if (fresh) await syncFromIyzico(fresh).catch(() => null);
  }
  refresh(restaurantId);
  return { ok: true, message: suspend ? "Hizmet durduruldu: panel ve müşteri menüsü kapalı." : "Hizmet yeniden açıldı." };
}

export async function syncRestaurantBilling(_prev: BillingAdminResult, formData: FormData): Promise<BillingAdminResult> {
  await requireSystemAdmin();
  const restaurantId = readRestaurantId(formData);
  const account = restaurantId ? await loadBillingAccount(restaurantId) : null;
  if (!restaurantId || !account) return { ok: false, message: "Otomatik ödeme hesabı bulunamadı." };
  const result = await syncFromIyzico(account);
  refresh(restaurantId);
  return result;
}

// Elle yönetime döner: iyzico'daki abonelik iptal edilir, kayıt silinir.
export async function disableAutoBilling(_prev: BillingAdminResult, formData: FormData): Promise<BillingAdminResult> {
  await requireSystemAdmin();
  const restaurantId = readRestaurantId(formData);
  const account = restaurantId ? await loadBillingAccount(restaurantId) : null;
  if (!restaurantId || !account) return { ok: false, message: "Otomatik ödeme hesabı bulunamadı." };

  if (account.iyzico_subscription_ref && account.status !== "cancelled") {
    const cancelled = await cancelBilling(account);
    if (!cancelled.ok) return cancelled;
  }
  const { error } = await createSupabaseAdminClient().from("billing_accounts").delete().eq("restaurant_id", restaurantId);
  if (error) return { ok: false, message: `Kapatılamadı: ${error.message}` };
  refresh(restaurantId);
  return { ok: true, message: "Otomatik ödeme kapatıldı; restoran artık elle yönetiliyor." };
}
