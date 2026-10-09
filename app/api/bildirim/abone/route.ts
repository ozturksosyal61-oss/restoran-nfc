import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { pushConfigured, type PushRole } from "../../../../lib/push";
import { checkStaffSession } from "../../../../lib/staff";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";

// Bu cihazı bildirimlere kaydeder (POST) ya da kaydı siler (DELETE).
// Restoran ve görev istekten değil, oturumdan belirlenir.

const MAX_DEVICES_PER_USER = 10;

async function currentMember(): Promise<{ userId: string; restaurantId: number; role: PushRole } | null> {
  const staff = await checkStaffSession();
  if (staff.ok) {
    return { userId: staff.session.userId, restaurantId: staff.session.restaurantId, role: staff.session.role };
  }
  const admin = await getAdminRestaurant();
  // Ortak demo hesabı bildirim alamaz.
  if (!admin || admin.isDemo) return null;
  return { userId: admin.user.id, restaurantId: admin.restaurantId, role: "yonetici" };
}

function readSubscription(value: unknown) {
  const sub = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  const key = /^[A-Za-z0-9_-]+={0,2}$/;
  if (!/^https:\/\/[^\s]{10,990}$/.test(endpoint)) return null;
  if (!key.test(p256dh) || p256dh.length > 200 || !key.test(auth) || auth.length > 100) return null;
  return { endpoint, p256dh, auth };
}

export async function POST(request: Request) {
  if (!pushConfigured()) {
    return Response.json({ ok: false, message: "Bildirim servisi henüz açılmadı." }, { status: 503 });
  }

  const member = await currentMember();
  if (!member) return Response.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { subscription?: unknown } | null;
  const subscription = readSubscription(body?.subscription);
  if (!subscription) return Response.json({ ok: false, message: "Geçersiz bildirim kaydı." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      ...subscription,
      restaurant_id: member.restaurantId,
      user_id: member.userId,
      role: member.role,
      user_agent: (request.headers.get("user-agent") ?? "").slice(0, 300) || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("Bildirim kaydı yapılamadı", error);
    return Response.json({ ok: false, message: "Bildirim kaydı yapılamadı." }, { status: 500 });
  }

  // Kullanıcı başına en yeni cihazlar tutulur.
  const { data: devices } = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", member.userId)
    .order("updated_at", { ascending: false });
  const extra = (devices ?? []).slice(MAX_DEVICES_PER_USER).map((row) => row.id);
  if (extra.length) await admin.from("push_subscriptions").delete().in("id", extra);

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const member = await currentMember();
  if (!member) return Response.json({ ok: false }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (endpoint) {
    await createSupabaseAdminClient()
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", member.userId);
  }
  return Response.json({ ok: true });
}
