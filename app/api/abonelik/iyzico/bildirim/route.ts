import { createSupabaseAdminClient } from "../../../../../lib/supabase-admin";
import { billingCredentials, loadBillingSettings, syncFromIyzico, type BillingAccount } from "../../../../../lib/billing/service";
import { verifyWebhook, type WebhookPayload } from "../../../../../lib/billing/iyzico-subscription";

// iyzico abonelik bildirimi (her dönem ödemesi başarılı / başarısız olduğunda).
// Bildirimin içeriğine göre işlem yapılmaz: imza doğrulanır, ardından abonelik
// durumu iyzico'dan yeniden okunur. iyzico 2xx almazsa 15 dakikada bir
// (en fazla 3 kez) yeniden gönderir.
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as WebhookPayload | null;
  if (!payload?.subscriptionReferenceCode) return new Response("BAD_REQUEST", { status: 400 });

  const { settings } = await loadBillingSettings();
  const credentials = billingCredentials(settings);
  if (!credentials) return new Response("NOT_CONFIGURED", { status: 503 });

  // Mağaza no girilmişse imza zorunludur.
  if (credentials.merchantId && !verifyWebhook(credentials, payload, request.headers.get("x-iyz-signature-v3"))) {
    return new Response("BAD_SIGNATURE", { status: 401 });
  }

  const { data } = await createSupabaseAdminClient()
    .from("billing_accounts")
    .select("*")
    .eq("iyzico_subscription_ref", payload.subscriptionReferenceCode)
    .maybeSingle();

  // Tanınmayan abonelik için de 200 dönülür; iyzico boşuna tekrar denemesin.
  if (!data) return new Response("OK");

  const account = data as BillingAccount;
  if (payload.iyziEventType === "subscription.order.failure" && payload.orderReferenceCode) {
    await createSupabaseAdminClient()
      .from("billing_accounts")
      .update({ last_order_ref: payload.orderReferenceCode })
      .eq("restaurant_id", account.restaurant_id);
    account.last_order_ref = payload.orderReferenceCode;
  }

  await syncFromIyzico(account).catch((error) => console.error("Abonelik eşitlenemedi", error));
  return new Response("OK");
}
