import { getAdminRestaurant } from "../../../../lib/admin-restaurant";
import { planGate } from "../../../../lib/admin-plan";
import { DEMO_BLOCKED_MESSAGE } from "../../../../lib/demo";
import { isStaffAction, runBoardAction } from "../../../../lib/staff-board";

// Masa haritasından hızlı işlemler: çağrıyı tamamla, siparişi kabul et /
// teslim et, hesabı kapat. Garson ekranıyla aynı kurallar uygulanır.
export async function POST(request: Request) {
  const admin = await getAdminRestaurant();
  if (!admin) return Response.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });
  if (admin.isDemo) return Response.json({ ok: false, message: DEMO_BLOCKED_MESSAGE }, { status: 403 });

  const locked = await planGate(admin, "orders");
  if (locked) return Response.json({ ok: false, message: locked }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { action?: unknown; id?: unknown } | null;
  const id = Number(body?.id);
  if (!isStaffAction(body?.action) || body.action === "order:prepare" || body.action === "order:ready" || !Number.isInteger(id) || id <= 0) {
    return Response.json({ ok: false, message: "Geçersiz istek." }, { status: 400 });
  }

  // Yönetici, garsonun yapabildiği işlemleri yapar.
  const result = await runBoardAction(admin.restaurantId, "garson", body.action, id);
  return Response.json(result, { status: result.ok ? 200 : 409, headers: { "Cache-Control": "no-store" } });
}
