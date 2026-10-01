import { cancelTablePayment } from "../../../../../lib/payments/table";

// Müşteri ödeme sayfasından vazgeçti; ayrılan ürünler serbest bırakılır.
// İşlem numarası tahmin edilemez bir anahtardır.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { ref?: unknown } | null;
  const ok = await cancelTablePayment(String(body?.ref ?? ""));
  return Response.json({ ok }, { headers: { "Cache-Control": "no-store" } });
}
