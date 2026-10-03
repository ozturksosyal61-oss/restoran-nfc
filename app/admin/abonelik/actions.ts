"use server";

import { revalidatePath } from "next/cache";
import { getAdminRestaurant } from "../../../lib/admin-restaurant";
import { DEMO_BLOCKED_MESSAGE } from "../../../lib/demo";
import {
  cancelBilling,
  changePlan,
  loadBillingAccount,
  loadPlans,
  startCardUpdate,
  startSubscription,
  validateSubscriber,
  type Interval,
} from "../../../lib/billing/service";

// İşletme sahibinin abonelik işlemleri. Yalnızca restoranın kendi yöneticisi;
// restoran oturumdan okunur, istekten gelmez.

export type BillingActionResult = { ok: boolean; message: string; checkout?: string } | null;

async function requireAccount() {
  const admin = await getAdminRestaurant();
  if (!admin) return { error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  if (admin.isDemo) return { error: DEMO_BLOCKED_MESSAGE };
  const account = await loadBillingAccount(admin.restaurantId);
  if (!account) return { error: "Aboneliğiniz OZT Digital tarafından yönetiliyor." };
  return { account };
}

async function readPlan(formData: FormData): Promise<{ planId: string; interval: Interval } | null> {
  const planId = String(formData.get("plan_id") ?? "");
  const interval = formData.get("interval") === "yearly" ? "yearly" : "monthly";
  const plans = await loadPlans();
  return plans.some((plan) => plan.id === planId) ? { planId, interval } : null;
}

function refresh() {
  revalidatePath("/admin/abonelik");
  revalidatePath("/admin", "layout");
}

export async function startSubscriptionAction(_prev: BillingActionResult, formData: FormData): Promise<BillingActionResult> {
  const access = await requireAccount();
  if (!access.account) return { ok: false, message: access.error };

  const plan = await readPlan(formData);
  if (!plan) return { ok: false, message: "Paket seçin." };

  const field = (name: string) => String(formData.get(name) ?? "");
  const subscriber = validateSubscriber({
    name: field("name"),
    surname: field("surname"),
    email: field("email"),
    phone: field("phone"),
    identity: field("identity"),
    city: field("city"),
    address: field("address"),
  });
  if (!subscriber.ok) return { ok: false, message: subscriber.message };

  const result = await startSubscription(access.account, plan.planId, plan.interval, subscriber.subscriber);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: "Kart bilgilerinizi iyzico'nun güvenli formuna girin.", checkout: result.content };
}

export async function cardUpdateAction(): Promise<BillingActionResult> {
  const access = await requireAccount();
  if (!access.account) return { ok: false, message: access.error };
  const result = await startCardUpdate(access.account);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: "Yeni kartınızı iyzico'nun güvenli formuna girin.", checkout: result.content };
}

export async function changePlanAction(_prev: BillingActionResult, formData: FormData): Promise<BillingActionResult> {
  const access = await requireAccount();
  if (!access.account) return { ok: false, message: access.error };
  const plan = await readPlan(formData);
  if (!plan) return { ok: false, message: "Paket seçin." };
  const result = await changePlan(access.account, plan.planId, plan.interval);
  refresh();
  return result;
}

export async function cancelAction(): Promise<BillingActionResult> {
  const access = await requireAccount();
  if (!access.account) return { ok: false, message: access.error };
  const result = await cancelBilling(access.account);
  refresh();
  return result;
}
