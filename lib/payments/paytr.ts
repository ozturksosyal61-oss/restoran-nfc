import { createHmac, timingSafeEqual } from "crypto";
import type { PaymentMode, PaytrCredentials } from "./providers";

// PayTR iFrame API entegrasyonu. Kart bilgisi PayTR'nin güvenli ödeme
// çerçevesinde girilir; sunucumuza hiçbir zaman gelmez.
// Sonuç, PayTR'nin sunucumuza gönderdiği bildirimle (Bildirim URL) kesinleşir.
// Belgeler: https://dev.paytr.com (iFrame API, İade API)

const TIMEOUT_MS = 20_000;

function hmac(credentials: PaytrCredentials, text: string) {
  return createHmac("sha256", credentials.merchantKey).update(text).digest("base64");
}

async function post(url: string, fields: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = (await response.json().catch(() => null)) as
    | { status?: string; token?: string; reason?: string; err_msg?: string; err_no?: string }
    | null;
  if (!data) throw new Error(`PayTR yanıt vermedi (${response.status}).`);
  return data;
}

// PayTR sipariş numarası yalnızca harf ve rakam içerebilir.
export function paytrReference(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").slice(0, 64);
}

export function paytrFrameUrl(token: string) {
  return `https://www.paytr.com/odeme/guvenli/${encodeURIComponent(token)}`;
}

export type PaytrStartInput = {
  reference: string;
  amount: number;
  itemName: string;
  buyerIp: string;
  okUrl: string;
  failUrl: string;
  phone: string;
  address: string;
};

export async function paytrStartPayment(
  credentials: PaytrCredentials,
  mode: PaymentMode,
  input: PaytrStartInput
): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const amountText = input.amount.toFixed(2);
  const fields = {
    merchant_id: credentials.merchantId,
    user_ip: input.buyerIp,
    merchant_oid: input.reference,
    email: "odeme@oztdigital.com.tr",
    // Kuruş cinsinden tam sayı.
    payment_amount: String(Math.round(input.amount * 100)),
    user_basket: Buffer.from(JSON.stringify([[input.itemName, amountText, 1]])).toString("base64"),
    no_installment: "1",
    max_installment: "0",
    currency: "TL",
    test_mode: mode === "test" ? "1" : "0",
  };

  const hashText =
    fields.merchant_id +
    fields.user_ip +
    fields.merchant_oid +
    fields.email +
    fields.payment_amount +
    fields.user_basket +
    fields.no_installment +
    fields.max_installment +
    fields.currency +
    fields.test_mode;

  const data = await post("https://www.paytr.com/odeme/api/get-token", {
    ...fields,
    paytr_token: hmac(credentials, hashText + credentials.merchantSalt),
    debug_on: mode === "test" ? "1" : "0",
    user_name: "Misafir Müşteri",
    user_address: input.address,
    user_phone: input.phone,
    merchant_ok_url: input.okUrl,
    merchant_fail_url: input.failUrl,
    // Masa ödemesinde ürünler 20 dakika ayrılır; ödeme süresi bunun içinde kalır.
    timeout_limit: "15",
    lang: "tr",
  });

  if (data.status !== "success" || !data.token) {
    return { ok: false, message: data.reason || "PayTR isteği reddetti." };
  }
  return { ok: true, token: data.token };
}

export type PaytrNotification = {
  merchant_oid: string;
  status: string;
  total_amount: string;
  hash: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
};

// Bildirimin gerçekten PayTR'den geldiğini mağaza anahtarıyla doğrular.
export function paytrVerifyNotification(credentials: PaytrCredentials, notification: PaytrNotification) {
  const expected = hmac(
    credentials,
    notification.merchant_oid + credentials.merchantSalt + notification.status + notification.total_amount
  );
  const a = Buffer.from(expected);
  const b = Buffer.from(notification.hash ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Ödemenin tamamını iade eder (canlı moddaki test ödemesi için).
export async function paytrRefund(
  credentials: PaytrCredentials,
  reference: string,
  amount: number
): Promise<{ ok: boolean; message: string }> {
  const returnAmount = amount.toFixed(2);
  const data = await post("https://www.paytr.com/odeme/iade", {
    merchant_id: credentials.merchantId,
    merchant_oid: reference,
    return_amount: returnAmount,
    paytr_token: hmac(credentials, credentials.merchantId + reference + returnAmount + credentials.merchantSalt),
  });
  return data.status === "success"
    ? { ok: true, message: "" }
    : { ok: false, message: data.err_msg || "PayTR iadeyi reddetti." };
}
