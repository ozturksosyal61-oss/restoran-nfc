import { getAdminRestaurant } from "../../../lib/admin-restaurant";
import { planGate } from "../../../lib/admin-plan";
import { loadFloor } from "../../../lib/floor";

// Yöneticinin canlı masa haritası verisi (Salon sayfası yeniler).
export async function GET() {
  const admin = await getAdminRestaurant();
  if (!admin) return Response.json({ ok: false, message: "Oturum bulunamadı." }, { status: 401 });

  const locked = await planGate(admin, "orders");
  if (locked) return Response.json({ ok: false, message: locked }, { status: 403 });

  const floor = await loadFloor(admin.restaurantId);
  return Response.json({ ok: true, floor }, { headers: { "Cache-Control": "no-store" } });
}
