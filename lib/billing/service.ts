import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "../supabase-admin";
import { decryptCredentials } from "../payments/crypto";
import { requestContext } from "../payments/service";
import type { PaymentMode } from "../payments/providers";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  getSubscription,
  initCardUpdate,
  initSubscriptionCheckout,
  retrieveSubscriptionCheckout,
  retryOrder,
  type BillingCredentials,
  type SubscriberInfo,
} from "./iyzico-subscription";

// Otomatik abonelik tahsilatının sunucu tarafı. Tablolar yalnızca service
// role ile okunur; çağıran taraf yetkiyi önceden doğrulamış olmalıdır.

export type Interval = "monthly" | "yearly";
export type Access = "open" | "grace" | "blocked";

export type PlanRef = { ref: string; price: number };
export type BillingSettings = {
  mode: PaymentMode;
  credentials: string | null;
  credentials_hint: Record<string, string>;
  product_ref: string | null;
  plan_refs: Record<string, Partial<Record<Interval, PlanRef>>>;
  trial_days: number;
  grace_days: number;
  updated_at: string;
};

export type BillingAccount = {
  restaurant_id: number;
  plan_id: string;
  billing_interval: Interval;
  status: "trial" | "active" | "past_due" | "cancelled" | "suspended";
  trial_ends_at: string | null;
  paid_until: string | null;
  past_due_since: string | null;
  cancelled_at: string | null;
  billing_name: string | null;
  billing_surname: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  billing_identity: string | null;
  billing_city: string | null;
  billing_address: string | null;
  iyzico_customer_ref: string | null;
  iyzico_subscription_ref: string | null;
  last_order_ref: string | null;
  pending_token: string | null;
  pending_plan_id: string | null;
  pending_interval: string | null;
  last_error: string | null;
  last_synced_at: string | null;
  updated_at: string;
};

export type PlanRow = { id: string; name: string; slug: string; monthly_price: number; yearly_price: number };

// Platform ayarlarındaki şifreli kaydın "restoran" bağlamı (gerçek restoran yok).
export const PLATFORM_KEY_SCOPE = 0;

export const BILLING_MISSING_MESSAGE =
  "Otomatik ödeme için veritabanı güncellemesi bekleniyor: 20261013_auto_billing.sql dosyasını Supabase'de çalıştırın.";
export const BILLING_NOT_READY_MESSAGE =
  "Otomatik ödeme henüz hazır değil. Lütfen OZT Digital ile iletişime geçin.";

function db() {
  return createSupabaseAdminClient();
}

export async function loadBillingSettings(): Promise<{ settings: BillingSettings | null; missing: boolean }> {
  const { data, error } = await db()
    .from("billing_settings")
    .select("mode, credentials, credentials_hint, product_ref, plan_refs, trial_days, grace_days, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) return { settings: null, missing: true };
  return { settings: (data as BillingSettings | null) ?? null, missing: false };
}

export function billingCredentials(settings: BillingSettings | null): BillingCredentials | null {
  if (!settings?.credentials) return null;
  try {
    return decryptCredentials<BillingCredentials>(settings.credentials, PLATFORM_KEY_SCOPE);
  } catch {
    return null;
  }
}

export async function loadPlans(): Promise<PlanRow[]> {
  const { data } = await db()
    .from("subscription_plans")
    .select("id, name, slug, monthly_price, yearly_price, is_active")
    .eq("is_active", true)
    .order("monthly_price", { ascending: true });
  return ((data ?? []) as (PlanRow & { is_active: boolean })[]).map((plan) => ({
    id: String(plan.id),
    name: String(plan.name),
    slug: String(plan.slug),
    monthly_price: Number(plan.monthly_price ?? 0),
    yearly_price: Number(plan.yearly_price ?? 0),
  }));
}

export async function loadBillingAccount(restaurantId: number): Promise<BillingAccount | null> {
  const { data, error } = await db().from("billing_accounts").select("*").eq("restaurant_id", restaurantId).maybeSingle();
  if (error) return null;
  return (data as BillingAccount | null) ?? null;
}

// Veritabanındaki kural (billing_access) tek kaynaktır; hata olursa açık sayılır.
export async function getBillingAccess(restaurantId: number): Promise<Access> {
  const { data, error } = await db().rpc("billing_access", { p_restaurant_id: restaurantId });
  if (error || (data !== "grace" && data !== "blocked")) return "open";
  return data;
}

// Paket kısaltmasını restaurants.plan değerine çevirir (sistem panelindeki eşitlemeyle aynı).
function restaurantPlanFromSlug(slug: string | null | undefined) {
  if (slug === "premium") return "premium";
  if (slug === "pro" || slug === "profesyonel") return "pro";
  return "starter";
}

export async function applyRestaurantPlan(restaurantId: number, planId: string) {
  const { data: plan } = await db().from("subscription_plans").select("slug").eq("id", planId).maybeSingle();
  await db()
    .from("restaurants")
    .update({ plan: restaurantPlanFromSlug(plan?.slug) })
    .eq("id", restaurantId);
}

async function updateAccount(restaurantId: number, fields: Partial<BillingAccount>) {
  await db()
    .from("billing_accounts")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId);
}

/* ---------------------------------------------------------------
 * iyzico ile eşitleme
 * ------------------------------------------------------------- */

export async function syncFromIyzico(account: BillingAccount): Promise<{ ok: boolean; message: string }> {
  if (!account.iyzico_subscription_ref) return { ok: false, message: "Abonelik henüz başlatılmadı." };
  const { settings } = await loadBillingSettings();
  const credentials = billingCredentials(settings);
  if (!settings || !credentials) return { ok: false, message: BILLING_NOT_READY_MESSAGE };

  const result = await getSubscription(credentials, settings.mode, account.iyzico_subscription_ref);
  if (!result.ok) {
    await updateAccount(account.restaurant_id, { last_error: result.message, last_synced_at: new Date().toISOString() });
    return { ok: false, message: result.message };
  }

  const snap = result.snapshot;
  const now = new Date().toISOString();
  const fields: Partial<BillingAccount> = {
    last_synced_at: now,
    last_order_ref: snap.lastFailedOrderRef ?? account.last_order_ref,
    iyzico_customer_ref: snap.customerRef ?? account.iyzico_customer_ref,
  };
  if (snap.paidUntil) fields.paid_until = new Date(snap.paidUntil).toISOString();

  if (snap.status === "ACTIVE") {
    fields.status = "active";
    fields.past_due_since = null;
    fields.last_error = null;
  } else if (snap.status === "UNPAID" || snap.status === "PENDING") {
    fields.status = "past_due";
    fields.past_due_since = account.past_due_since ?? now;
    fields.last_error = snap.lastFailureMessage ?? "Dönem ödemesi alınamadı.";
  } else if (snap.status === "CANCELED" || snap.status === "EXPIRED") {
    fields.status = "cancelled";
    fields.cancelled_at = account.cancelled_at ?? now;
  }
  // Sistem yöneticisinin askıya aldığı hesap iyzico durumuyla açılmaz.
  if (account.status === "suspended") delete fields.status;

  await updateAccount(account.restaurant_id, fields);
  return { ok: true, message: "Abonelik durumu güncellendi." };
}

// Dönem sonu yaklaşan ya da ödemesi alınamamış hesabı (bildirim kaçmış
// olabilir diye) en fazla yarım saatte bir iyzico'dan yeniden okur.
export async function refreshIfStale(account: BillingAccount | null) {
  if (!account?.iyzico_subscription_ref) return account;
  const lastSync = account.last_synced_at ? new Date(account.last_synced_at).getTime() : 0;
  const paidUntil = account.paid_until ? new Date(account.paid_until).getTime() : 0;
  const due = account.status === "past_due" || paidUntil - Date.now() < 24 * 60 * 60 * 1000;
  if (!due || Date.now() - lastSync < 30 * 60 * 1000) return account;
  await syncFromIyzico(account).catch(() => null);
  return loadBillingAccount(account.restaurant_id);
}

/* ---------------------------------------------------------------
 * İşletme sahibinin işlemleri
 * ------------------------------------------------------------- */

export function validateSubscriber(input: Record<string, string>): { ok: true; subscriber: SubscriberInfo } | { ok: false; message: string } {
  const name = input.name.trim();
  const surname = input.surname.trim();
  const email = input.email.trim().toLowerCase();
  const digits = input.phone.replace(/\D/g, "");
  const identity = input.identity.replace(/\D/g, "");
  const city = input.city.trim();
  const address = input.address.trim();

  if (name.length < 2 || surname.length < 2) return { ok: false, message: "Ad ve soyadı yazın." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Geçerli bir e-posta yazın." };
  const phone = digits.startsWith("90") ? digits.slice(2) : digits.replace(/^0/, "");
  if (!/^5\d{9}$/.test(phone)) return { ok: false, message: "Cep telefonunu 05xx xxx xx xx biçiminde yazın." };
  if (!/^\d{10,11}$/.test(identity)) return { ok: false, message: "T.C. kimlik no (11 hane) ya da vergi no (10 hane) yazın." };
  if (city.length < 2) return { ok: false, message: "Şehri yazın." };
  if (address.length < 10) return { ok: false, message: "Fatura adresini açık yazın." };

  return {
    ok: true,
    subscriber: { name, surname, email, phone: `+90${phone}`, identity, city, address },
  };
}

function planRef(settings: BillingSettings, planId: string, interval: Interval) {
  return settings.plan_refs?.[planId]?.[interval]?.ref ?? null;
}

export async function startSubscription(
  account: BillingAccount,
  planId: string,
  interval: Interval,
  subscriber: SubscriberInfo
): Promise<{ ok: true; content: string } | { ok: false; message: string }> {
  if (account.iyzico_subscription_ref && account.status !== "cancelled") {
    return { ok: false, message: "Aboneliğiniz zaten başlatılmış. Paketi ya da kartı aşağıdan değiştirebilirsiniz." };
  }
  const { settings } = await loadBillingSettings();
  const credentials = billingCredentials(settings);
  if (!settings || !credentials) return { ok: false, message: BILLING_NOT_READY_MESSAGE };
  const ref = planRef(settings, planId, interval);
  if (!ref) return { ok: false, message: "Bu paket için ödeme planı henüz hazır değil. Lütfen OZT Digital ile iletişime geçin." };

  const { origin } = await requestContext();
  const result = await initSubscriptionCheckout(credentials, settings.mode, {
    pricingPlanRef: ref,
    callbackUrl: `${origin}/api/abonelik/iyzico/donus?r=${account.restaurant_id}`,
    conversationId: `B${account.restaurant_id}-${randomBytes(4).toString("hex")}`,
    subscriber,
  });
  if (!result.ok) return { ok: false, message: `Ödeme formu açılamadı: ${result.message}` };

  await updateAccount(account.restaurant_id, {
    pending_token: result.token,
    pending_plan_id: planId,
    pending_interval: interval,
    billing_name: subscriber.name,
    billing_surname: subscriber.surname,
    billing_email: subscriber.email,
    billing_phone: subscriber.phone,
    billing_identity: subscriber.identity,
    billing_city: subscriber.city,
    billing_address: subscriber.address,
  });
  return { ok: true, content: result.content };
}

// iyzico formundan dönüş: sonuç iyzico'ya sorularak doğrulanır.
export async function completeSubscription(restaurantId: number, token: string): Promise<{ ok: boolean; message: string }> {
  const account = await loadBillingAccount(restaurantId);
  if (!account || !token || account.pending_token !== token) return { ok: false, message: "Ödeme oturumu bulunamadı." };

  const { settings } = await loadBillingSettings();
  const credentials = billingCredentials(settings);
  if (!settings || !credentials) return { ok: false, message: BILLING_NOT_READY_MESSAGE };

  const result = await retrieveSubscriptionCheckout(credentials, settings.mode, token);
  if (!result.ok) {
    await updateAccount(restaurantId, { pending_token: null, last_error: result.message });
    return { ok: false, message: result.message };
  }

  const planId = account.pending_plan_id ?? account.plan_id;
  const interval = (account.pending_interval === "yearly" ? "yearly" : "monthly") as Interval;
  const period = new Date();
  if (interval === "yearly") period.setFullYear(period.getFullYear() + 1);
  else period.setMonth(period.getMonth() + 1);

  await updateAccount(restaurantId, {
    iyzico_subscription_ref: result.subscriptionRef,
    iyzico_customer_ref: result.customerRef || account.iyzico_customer_ref,
    plan_id: planId,
    billing_interval: interval,
    status: account.status === "suspended" ? "suspended" : "active",
    // iyzico dönem bilgisini verene kadar tahmini dönem sonu.
    paid_until: period.toISOString(),
    past_due_since: null,
    cancelled_at: null,
    pending_token: null,
    pending_plan_id: null,
    pending_interval: null,
    last_error: null,
  });
  await applyRestaurantPlan(restaurantId, planId);

  const fresh = await loadBillingAccount(restaurantId);
  if (fresh) await syncFromIyzico(fresh).catch(() => null);
  return { ok: true, message: "Aboneliğiniz başladı." };
}

export async function startCardUpdate(account: BillingAccount): Promise<{ ok: true; content: string } | { ok: false; message: string }> {
  if (!account.iyzico_subscription_ref || !account.iyzico_customer_ref) {
    return { ok: false, message: "Önce aboneliği başlatın." };
  }
  const { settings } = await loadBillingSettings();
  const credentials = billingCredentials(settings);
  if (!settings || !credentials) return { ok: false, message: BILLING_NOT_READY_MESSAGE };

  const { origin } = await requestContext();
  const result = await initCardUpdate(credentials, settings.mode, {
    customerRef: account.iyzico_customer_ref,
    subscriptionRef: account.iyzico_subscription_ref,
    callbackUrl: `${origin}/api/abonelik/iyzico/kart?r=${account.restaurant_id}`,
  });
  if (!result.ok) return { ok: false, message: `Kart formu açılamadı: ${result.message}` };
  await updateAccount(account.restaurant_id, { pending_token: result.token });
  return { ok: true, content: result.content };
}

// Kart değiştikten sonra: ödemesi alınamamış dönem varsa yeniden denenir.
// Yalnızca panelden başlatılmış (bekleyen form anahtarı olan) güncelleme kabul
// edilir; dışarıdan gelen istek ödeme denemesini tetikleyemez.
export async function completeCardUpdate(restaurantId: number, token: string): Promise<{ ok: boolean; message: string }> {
  const account = await loadBillingAccount(restaurantId);
  if (!account) return { ok: false, message: "Abonelik bulunamadı." };
  if (!account.pending_token || (token && token !== account.pending_token)) {
    return { ok: false, message: "Kart güncelleme oturumu bulunamadı. Lütfen Abonelik sayfasından yeniden deneyin." };
  }
  await updateAccount(restaurantId, { pending_token: null });

  const { settings } = await loadBillingSettings();
  const credentials = billingCredentials(settings);
  if (settings && credentials && account.status === "past_due" && account.last_order_ref) {
    await retryOrder(credentials, settings.mode, account.last_order_ref).catch(() => null);
  }
  const fresh = await loadBillingAccount(restaurantId);
  if (fresh) await syncFromIyzico(fresh).catch(() => null);
  return { ok: true, message: "Kartınız güncellendi." };
}

export async function changePlan(account: BillingAccount, planId: string, interval: Interval): Promise<{ ok: boolean; message: string }> {
  if (account.plan_id === planId && account.billing_interval === interval) return { ok: true, message: "Paket zaten bu." };

  // Deneme sürecinde (kart eklenmeden) yalnızca seçim değişir.
  if (!account.iyzico_subscription_ref || account.status === "cancelled") {
    await updateAccount(account.restaurant_id, { plan_id: planId, billing_interval: interval });
    await applyRestaurantPlan(account.restaurant_id, planId);
    return { ok: true, message: "Paket değiştirildi." };
  }

  const { settings } = await loadBillingSettings();
  const credentials = billingCredentials(settings);
  if (!settings || !credentials) return { ok: false, message: BILLING_NOT_READY_MESSAGE };
  const ref = planRef(settings, planId, interval);
  if (!ref) return { ok: false, message: "Bu paket için ödeme planı henüz hazır değil." };

  const result = await changeSubscriptionPlan(credentials, settings.mode, account.iyzico_subscription_ref, ref);
  if (!result.ok) return { ok: false, message: `Paket değiştirilemedi: ${result.message}` };

  await updateAccount(account.restaurant_id, {
    plan_id: planId,
    billing_interval: interval,
    ...(result.newSubscriptionRef ? { iyzico_subscription_ref: result.newSubscriptionRef } : {}),
  });
  await applyRestaurantPlan(account.restaurant_id, planId);
  return { ok: true, message: "Paket değiştirildi. Yeni ücret bir sonraki dönemden itibaren alınır." };
}

export async function cancelBilling(account: BillingAccount): Promise<{ ok: boolean; message: string }> {
  if (account.iyzico_subscription_ref && account.status !== "cancelled") {
    const { settings } = await loadBillingSettings();
    const credentials = billingCredentials(settings);
    if (!settings || !credentials) return { ok: false, message: BILLING_NOT_READY_MESSAGE };
    const result = await cancelSubscription(credentials, settings.mode, account.iyzico_subscription_ref);
    if (!result.ok) return { ok: false, message: `İptal edilemedi: ${result.message}` };
  }
  await updateAccount(account.restaurant_id, { status: "cancelled", cancelled_at: new Date().toISOString() });
  return {
    ok: true,
    message: account.paid_until
      ? "Aboneliğiniz iptal edildi. Ödenmiş dönemin sonuna kadar kullanmaya devam edebilirsiniz."
      : "Aboneliğiniz iptal edildi.",
  };
}
