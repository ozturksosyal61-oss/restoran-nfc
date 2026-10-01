import { getTablePaymentInfo, startTablePayment, type SplitMode } from "../../../../lib/payments/table";

// Masadan kartla ödeme. GET: hesabın ödeme durumu. POST: ödemeyi başlatır.
// Masa kodu her istekte veritabanında doğrulanır; tutarı sunucu hesaplar.

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const info = await getTablePaymentInfo(url.searchParams.get("slug") ?? "", url.searchParams.get("masa") ?? "");
  return Response.json(info, { headers: NO_STORE });
}

function toInt(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ ok: false, message: "Geçersiz istek." }, { status: 400 });

  const mode = body.mode as SplitMode;
  if (mode !== "full" && mode !== "items" && mode !== "equal") {
    return Response.json({ ok: false, message: "Ödeme şeklini seçin." }, { status: 400 });
  }

  const items = Array.isArray(body.items)
    ? body.items
        .slice(0, 200)
        .map((item) => ({ id: toInt((item as { id?: unknown })?.id), units: Number((item as { units?: unknown })?.units) }))
        .filter((item): item is { id: number; units: number } => item.id !== null && Number.isFinite(item.units) && item.units > 0)
    : [];

  const tip = Math.round(Math.max(0, Number(body.tip) || 0) * 100) / 100;

  const result = await startTablePayment({
    slug: String(body.slug ?? ""),
    token: String(body.masa ?? ""),
    mode,
    items,
    splitOf: toInt(body.splitOf),
    parts: toInt(body.parts),
    tip,
  });

  return Response.json(result, { status: result.ok ? 200 : 400, headers: NO_STORE });
}
