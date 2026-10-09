import { timingSafeEqual } from "crypto";
import { isPushEvent, loadWebhookSecret, sendPushEvent } from "../../../../lib/push";

// Veritabanı tetikleyicisi (pg_net) yeni sipariş / hazır sipariş / garson
// çağrısında buraya yalnızca kayıt numarasını gönderir. Gizli anahtar
// doğrulanır; bildirimin içeriği kayıttan sunucuda hazırlanır.
export async function POST(request: Request) {
  const secret = await loadWebhookSecret();
  const given = request.headers.get("x-ozt-secret") ?? "";
  const a = Buffer.from(secret ?? "");
  const b = Buffer.from(given);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("UNAUTHORIZED", { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { event?: unknown; id?: unknown; restaurant_id?: unknown } | null;
  const id = Number(body?.id);
  const restaurantId = Number(body?.restaurant_id);
  if (!isPushEvent(body?.event) || !Number.isInteger(id) || !Number.isInteger(restaurantId)) {
    return new Response("BAD_REQUEST", { status: 400 });
  }

  try {
    const result = await sendPushEvent(body.event, id, restaurantId);
    return Response.json(result);
  } catch (error) {
    console.error("Bildirim gönderilemedi", error);
    return new Response("ERROR", { status: 500 });
  }
}
