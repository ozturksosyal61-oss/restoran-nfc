import { checkStaffSession, STAFF_DENIED_TEXT } from "../../../../lib/staff";
import { loadStaffBoard } from "../../../../lib/staff-board";

// Garson / mutfak ekranının güncel verisi (ekran birkaç saniyede bir yeniler).
export async function GET() {
  const check = await checkStaffSession();
  if (!check.ok) {
    return Response.json(
      { ok: false, reason: check.reason, message: STAFF_DENIED_TEXT[check.reason] },
      { status: check.reason === "no-user" ? 401 : 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  const board = await loadStaffBoard(check.session);
  return Response.json({ ok: true, board }, { headers: { "Cache-Control": "no-store" } });
}
