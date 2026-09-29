"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireSystemAdmin } from "../../../lib/system-admin";

// Abonelik işlemleri. Mantık önceki sürümle aynı: deneme 14 gün, aktif
// abonelik aylık / yıllık dönem; restoranın başka deneme / aktif aboneliği
// varsa iptal edilir ve restaurants.plan en güncel aboneliğe göre eşitlenir.
// Fark: her işlem artık başarı / hata mesajı döndürür.

export type SubscriptionResult = { ok: boolean; message: string } | null;

const VALID_STATUSES = ["trial", "active", "cancelled", "expired"];
const VALID_INTERVALS = ["monthly", "yearly"];

/* ---------------- restaurants.plan eşitleme ---------------- */

async function syncRestaurantPlan(supabase: SupabaseClient, restaurantId: number) {
  const { data: activeSubscription } = await supabase
    .from("subscriptions")
    .select("id, status, plan_id, subscription_plans ( slug )")
    .eq("restaurant_id", restaurantId)
    .in("status", ["trial", "active"])
    .order("current_period_start", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  let restaurantPlan = "starter";

  if (activeSubscription) {
    const related = activeSubscription.subscription_plans as
      | { slug: string }
      | { slug: string }[]
      | null;
    const plan = Array.isArray(related) ? related[0] : related;

    if (plan?.slug === "pro" || plan?.slug === "profesyonel") restaurantPlan = "pro";
    if (plan?.slug === "premium") restaurantPlan = "premium";
  }

  await supabase.from("restaurants").update({ plan: restaurantPlan }).eq("id", restaurantId);
  return restaurantPlan;
}

async function closeOtherActiveSubscriptions(
  supabase: SupabaseClient,
  restaurantId: number,
  exceptSubscriptionId?: string
) {
  let query = supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId)
    .in("status", ["trial", "active"]);

  if (exceptSubscriptionId) query = query.neq("id", exceptSubscriptionId);

  await query;
}

// Duruma göre dönem tarihleri.
function periodFields(status: string, billingInterval: string) {
  const now = new Date();
  const fields: Record<string, string | null> = {
    trial_started_at: null,
    trial_ends_at: null,
    current_period_start: null,
    current_period_end: null,
    cancelled_at: null,
  };

  if (status === "trial") {
    const end = new Date(now);
    end.setDate(end.getDate() + 14);
    fields.trial_started_at = now.toISOString();
    fields.trial_ends_at = end.toISOString();
  }

  if (status === "active") {
    const end = new Date(now);
    if (billingInterval === "yearly") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    fields.current_period_start = now.toISOString();
    fields.current_period_end = end.toISOString();
  }

  if (status === "cancelled") fields.cancelled_at = now.toISOString();

  return fields;
}

function refresh() {
  revalidatePath("/sistem", "layout");
  revalidatePath("/abonelik");
  revalidatePath("/admin", "layout");
}

function readForm(formData: FormData) {
  return {
    subscriptionId: String(formData.get("subscription_id") || ""),
    restaurantId: Number(formData.get("restaurant_id")),
    planId: String(formData.get("plan_id") || ""),
    status: String(formData.get("status") || "trial").toLowerCase(),
    billingInterval: String(formData.get("billing_interval") || "monthly").toLowerCase(),
  };
}

function validate(form: ReturnType<typeof readForm>) {
  if (!Number.isInteger(form.restaurantId) || form.restaurantId <= 0) return "Restoran seçin.";
  if (!form.planId) return "Paket seçin.";
  if (!VALID_STATUSES.includes(form.status)) return "Geçersiz abonelik durumu.";
  if (!VALID_INTERVALS.includes(form.billingInterval)) return "Geçersiz ödeme dönemi.";
  return null;
}

async function checkTargets(supabase: SupabaseClient, restaurantId: number, planId: string) {
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .maybeSingle();
  if (!restaurant) return "Restoran bulunamadı.";

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return "Paket bulunamadı.";

  return null;
}

/* ---------------- Güncelle ---------------- */

export async function updateSubscription(formData: FormData): Promise<SubscriptionResult> {
  const form = readForm(formData);
  const invalid = !form.subscriptionId ? "Abonelik bulunamadı." : validate(form);
  if (invalid) return { ok: false, message: invalid };

  const { supabase } = await requireSystemAdmin();
  const missing = await checkTargets(supabase, form.restaurantId, form.planId);
  if (missing) return { ok: false, message: missing };

  if (form.status === "trial" || form.status === "active") {
    await closeOtherActiveSubscriptions(supabase, form.restaurantId, form.subscriptionId);
  }

  const fields = periodFields(form.status, form.billingInterval);

  // İptal ve süresi dolmuş aboneliklerde eski dönem tarihleri korunur.
  const updateData: Record<string, string | null> =
    form.status === "trial" || form.status === "active"
      ? fields
      : { cancelled_at: fields.cancelled_at };

  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: form.planId,
      status: form.status,
      billing_interval: form.billingInterval,
      ...updateData,
    })
    .eq("id", form.subscriptionId)
    .eq("restaurant_id", form.restaurantId);

  if (error) {
    console.error("SUBSCRIPTION UPDATE ERROR:", error);
    return { ok: false, message: `Abonelik güncellenemedi: ${error.message}` };
  }

  await syncRestaurantPlan(supabase, form.restaurantId);
  refresh();
  return { ok: true, message: "Abonelik güncellendi." };
}

/* ---------------- Oluştur ---------------- */

export async function createSubscription(formData: FormData): Promise<SubscriptionResult> {
  const form = readForm(formData);
  const invalid = validate(form);
  if (invalid) return { ok: false, message: invalid };

  const { supabase } = await requireSystemAdmin();
  const missing = await checkTargets(supabase, form.restaurantId, form.planId);
  if (missing) return { ok: false, message: missing };

  await closeOtherActiveSubscriptions(supabase, form.restaurantId);

  const { error } = await supabase.from("subscriptions").insert({
    restaurant_id: form.restaurantId,
    plan_id: form.planId,
    status: form.status,
    billing_interval: form.billingInterval,
    ...periodFields(form.status, form.billingInterval),
  });

  if (error) {
    console.error("SUBSCRIPTION CREATE ERROR:", error);
    return { ok: false, message: `Abonelik oluşturulamadı: ${error.message}` };
  }

  await syncRestaurantPlan(supabase, form.restaurantId);
  refresh();
  return { ok: true, message: "Abonelik oluşturuldu." };
}

/* ---------------- Formlar için (useActionState) ---------------- */

export async function saveSubscription(
  _prev: SubscriptionResult,
  formData: FormData
): Promise<SubscriptionResult> {
  return formData.get("subscription_id")
    ? updateSubscription(formData)
    : createSubscription(formData);
}

export async function deleteSubscription(
  _prev: SubscriptionResult,
  formData: FormData
): Promise<SubscriptionResult> {
  const subscriptionId = String(formData.get("subscription_id") || "");
  if (!subscriptionId) return { ok: false, message: "Abonelik bulunamadı." };

  const { supabase } = await requireSystemAdmin();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, restaurant_id")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (!subscription) return { ok: false, message: "Abonelik bulunamadı." };

  const { count } = await supabase
    .from("payment_transactions")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", subscriptionId);

  if (count && count > 0) {
    return {
      ok: false,
      message: "Bu aboneliğe bağlı ödeme kayıtları var; silinemez. Durumunu “İptal” yapabilirsiniz.",
    };
  }

  const { error } = await supabase.from("subscriptions").delete().eq("id", subscriptionId);

  if (error) {
    console.error("SUBSCRIPTION DELETE ERROR:", error);
    return { ok: false, message: `Abonelik silinemedi: ${error.message}` };
  }

  await syncRestaurantPlan(supabase, Number(subscription.restaurant_id));
  refresh();
  return { ok: true, message: "Abonelik kaydı silindi." };
}
