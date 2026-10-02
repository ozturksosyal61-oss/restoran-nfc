import { checkStaffSession, STAFF_DENIED_TEXT } from "../../../../lib/staff";
import { isStaffAction, runStaffAction } from "../../../../lib/staff-board";

// Garson / mutfak işlemleri: sipariş durumu, çağrı, hesap kapatma.
// Görev ve restoran sunucuda oturumdan okunur; istekten gelmez.
export async function POST(request: Request) {
  const check = await checkStaffSession();
  if (!check.ok) {
    return Response.json({ ok: false, message: STAFF_DENIED_TEXT[check.reason] }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { action?: unknown; id?: unknown } | null;
  const id = Number(body?.id);
  if (!isStaffAction(body?.action) || !Number.isInteger(id) || id <= 0) {
    return Response.json({ ok: false, message: "Geçersiz istek." }, { status: 400 });
  }

  const result = await runStaffAction(check.session, body.action, id);
  return Response.json(result, { status: result.ok ? 200 : 409, headers: { "Cache-Control": "no-store" } });
}
