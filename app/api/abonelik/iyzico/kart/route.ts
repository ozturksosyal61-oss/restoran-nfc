import { completeCardUpdate } from "../../../../../lib/billing/service";

// Kart değiştirme formundan dönüş. Abonelik durumu iyzico'dan yeniden
// okunur; ödemesi alınamamış dönem varsa yeni kartla yeniden denenir.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const restaurantId = Number(url.searchParams.get("r"));
  const form = await request.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");

  const result =
    Number.isInteger(restaurantId) && restaurantId > 0
      ? await completeCardUpdate(restaurantId, token).catch(() => ({ ok: false, message: "Kart güncellemesi doğrulanamadı." }))
      : { ok: false, message: "Geçersiz istek." };

  const target = new URL("/admin/abonelik", url.origin);
  target.searchParams.set("sonuc", result.ok ? "kart" : "hata");
  if (!result.ok) target.searchParams.set("mesaj", result.message.slice(0, 200));
  return Response.redirect(target, 303);
}
