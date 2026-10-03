import { completeSubscription } from "../../../../../lib/billing/service";

// iyzico abonelik formu, kart bilgisi girildikten sonra tarayıcıyı buraya
// POST eder. Sonuç iyzico'ya sorularak doğrulanır; tarayıcıdan gelen
// bilgiye güvenilmez.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const restaurantId = Number(url.searchParams.get("r"));
  const form = await request.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");

  const result =
    Number.isInteger(restaurantId) && restaurantId > 0
      ? await completeSubscription(restaurantId, token).catch(() => ({ ok: false, message: "Abonelik doğrulanamadı." }))
      : { ok: false, message: "Geçersiz istek." };

  const target = new URL("/admin/abonelik", url.origin);
  target.searchParams.set("sonuc", result.ok ? "ok" : "hata");
  if (!result.ok) target.searchParams.set("mesaj", result.message.slice(0, 200));
  return Response.redirect(target, 303);
}
