import { checkStaffSession, STAFF_DENIED_TEXT } from "../../../../lib/staff";
import { loadFloor } from "../../../../lib/floor";

// Garson ekranındaki masa haritası. Restoran istekten değil oturumdan okunur;
// mutfak hesapları masa haritasını görmez.
export async function GET() {
  const check = await checkStaffSession();
  if (!check.ok) {
    return Response.json(
      { ok: false, message: STAFF_DENIED_TEXT[check.reason] },
      { status: check.reason === "no-user" ? 401 : 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (check.session.role !== "garson") {
    return Response.json({ ok: false, message: "Masa haritası garson hesaplarında açılır." }, { status: 403 });
  }

  const floor = await loadFloor(check.session.restaurantId);
  return Response.json({ ok: true, floor }, { headers: { "Cache-Control": "no-store" } });
}
