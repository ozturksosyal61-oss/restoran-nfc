import { completeIyzico, resultPath } from "../../../../../lib/payments/service";

// iyzico ödeme formu, ödeme bitince müşterinin tarayıcısını buraya POST
// ile gönderir. Gelen token'a güvenilmez; sonuç iyzico'ya sorularak
// doğrulanır, ardından müşteri sonuç sayfasına yönlendirilir.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("ref") ?? "";
  const form = await request.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "127.0.0.1";

  const tx = await completeIyzico(reference, token, ip);

  // 303: tarayıcı sonuç sayfasını GET ile açar.
  const target = await resultPath(tx);
  return Response.redirect(new URL(target, url.origin), 303);
}
