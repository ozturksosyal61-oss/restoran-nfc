import webpush from "web-push";
import { createSupabaseAdminClient } from "./supabase-admin";

// Telefona bildirim (web push). Abonelikler push_subscriptions tablosunda,
// gönderimi veritabanı tetikleyicisi başlatır
// (supabase/migrations/20261023_push_notifications.sql). Yalnızca sunucu kodu.

export type PushRole = "yonetici" | "garson" | "mutfak";
export type PushEvent = "order:new" | "order:ready" | "request:new";

type Message = { title: string; body: string; tag: string; roles: PushRole[] };

const STAFF_URL = "/personel";
const ADMIN_URL = "/admin/orders";

export function pushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
  );
}

export function isPushEvent(value: unknown): value is PushEvent {
  return value === "order:new" || value === "order:ready" || value === "request:new";
}

function tableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? `Masa ${text}` : "Masa";
}

async function buildMessage(event: PushEvent, id: number, restaurantId: number): Promise<Message | null> {
  const admin = createSupabaseAdminClient();

  if (event === "request:new") {
    const { data } = await admin
      .from("service_requests")
      .select("id, request_type, restaurant_tables(table_number)")
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (!data) return null;

    const table = data.restaurant_tables as unknown as { table_number?: unknown } | { table_number?: unknown }[] | null;
    const number = Array.isArray(table) ? table[0]?.table_number : table?.table_number;
    const bill = data.request_type === "hesap";
    return {
      title: bill ? "💳 Hesap istendi" : "🔔 Garson çağrısı",
      body: `${tableText(number)} ${bill ? "hesap istiyor" : "garson çağırıyor"}.`,
      tag: `request-${data.id}`,
      roles: ["garson", "yonetici"],
    };
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, daily_number, table_number, status")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (!order) return null;

  const number = `#${order.daily_number ?? order.id}`;

  if (event === "order:ready") {
    if (order.status !== "ready") return null;
    return {
      title: "✅ Sipariş hazır",
      body: `${tableText(order.table_number)} · ${number} servise hazır.`,
      tag: `ready-${order.id}`,
      roles: ["garson"],
    };
  }

  const { count } = await admin
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);
  const items = count ? ` · ${count} ürün` : "";
  return {
    title: "🧾 Yeni sipariş",
    body: `${tableText(order.table_number)}${items} · ${number}`,
    tag: `order-${order.id}`,
    roles: ["mutfak", "garson", "yonetici"],
  };
}

// Hâlâ yetkili olan aboneler: kapatılan personel ve restorandan çıkarılan
// yöneticinin cihazları ayıklanır ve silinir.
async function loadRecipients(restaurantId: number, roles: PushRole[]) {
  const admin = createSupabaseAdminClient();
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, user_id, role, endpoint, p256dh, auth")
    .eq("restaurant_id", restaurantId)
    .in("role", roles);
  if (!subscriptions?.length) return [];

  const [{ data: staff }, { data: managers }] = await Promise.all([
    admin.from("staff_accounts").select("user_id").eq("restaurant_id", restaurantId).eq("is_active", true),
    admin.from("restaurant_users").select("user_id").eq("restaurant_id", restaurantId),
  ]);
  const staffIds = new Set((staff ?? []).map((row) => String(row.user_id)));
  const managerIds = new Set((managers ?? []).map((row) => String(row.user_id)));

  const allowed = subscriptions.filter((row) =>
    row.role === "yonetici" ? managerIds.has(String(row.user_id)) : staffIds.has(String(row.user_id))
  );
  const stale = subscriptions.filter((row) => !allowed.includes(row)).map((row) => row.id);
  if (stale.length) await admin.from("push_subscriptions").delete().in("id", stale);

  return allowed;
}

export async function sendPushEvent(event: PushEvent, id: number, restaurantId: number) {
  if (!pushConfigured()) return { sent: 0 };

  const message = await buildMessage(event, id, restaurantId);
  if (!message) return { sent: 0 };

  const recipients = await loadRecipients(restaurantId, message.roles);
  if (!recipients.length) return { sent: 0 };

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const expired: number[] = [];
  const results = await Promise.allSettled(
    recipients.map((row) =>
      webpush
        .sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify({
            title: message.title,
            body: message.body,
            tag: message.tag,
            url: row.role === "yonetici" ? ADMIN_URL : STAFF_URL,
          }),
          { TTL: 600, urgency: "high" }
        )
        .catch((error: { statusCode?: number }) => {
          // Cihaz bildirimi kapatmış ya da uygulamayı silmiş.
          if (error?.statusCode === 404 || error?.statusCode === 410) expired.push(row.id);
          throw error;
        })
    )
  );

  if (expired.length) {
    await createSupabaseAdminClient().from("push_subscriptions").delete().in("id", expired);
  }

  return { sent: results.filter((result) => result.status === "fulfilled").length };
}

// Tetikleyicinin gönderdiği gizli anahtar (push_settings tablosunda üretilir).
export async function loadWebhookSecret() {
  const { data } = await createSupabaseAdminClient()
    .from("push_settings")
    .select("webhook_secret, is_enabled")
    .eq("id", 1)
    .maybeSingle();
  return data?.is_enabled ? String(data.webhook_secret) : null;
}
