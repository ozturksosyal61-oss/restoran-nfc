import { handlePaytrNotification } from "../../../../../lib/payments/service";

// PayTR "Bildirim URL": ödeme sonucu PayTR sunucusundan buraya gelir.
// Her restoran kendi PayTR panelinde bu adresi kaydeder. İmza, işlemin
// ait olduğu restoranın mağaza anahtarıyla doğrulanır. PayTR düz "OK"
// yanıtı almazsa bildirimi tekrar gönderir.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return new Response("BAD_REQUEST", { status: 400 });

  const field = (name: string) => String(form.get(name) ?? "");

  try {
    const ok = await handlePaytrNotification({
      merchant_oid: field("merchant_oid"),
      status: field("status"),
      total_amount: field("total_amount"),
      hash: field("hash"),
      failed_reason_code: field("failed_reason_code"),
      failed_reason_msg: field("failed_reason_msg"),
    });
    if (!ok) return new Response("PAYTR notification failed: bad hash", { status: 400 });
  } catch (error) {
    console.error("PayTR bildirimi işlenemedi", error);
    return new Response("ERROR", { status: 500 });
  }

  return new Response("OK", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
