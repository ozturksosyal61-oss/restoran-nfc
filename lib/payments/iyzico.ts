import { createHmac, randomBytes } from "crypto";
import type { IyzicoCredentials, PaymentMode } from "./providers";

// iyzico Ödeme Formu (Checkout Form) entegrasyonu. Kart bilgisi iyzico'nun
// sayfasında girilir; sunucumuza hiçbir zaman gelmez.
// Belgeler: https://docs.iyzico.com (Ödeme Formu, IYZWSv2 kimlik doğrulama)

const BASE_URL: Record<PaymentMode, string> = {
  test: "https://sandbox-api.iyzipay.com",
  live: "https://api.iyzipay.com",
};

const TIMEOUT_MS = 20_000;

type IyzicoResponse = {
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  [key: string]: unknown;
};

// iyzico fiyatları "1.0", "12.5" biçiminde bekler (resmi kütüphanedeki gibi).
export function iyzicoPrice(value: number) {
  const text = (Math.round(value * 100) / 100).toString();
  return text.includes(".") ? text : `${text}.0`;
}

async function call(
  credentials: IyzicoCredentials,
  mode: PaymentMode,
  path: string,
  body: Record<string, unknown>
): Promise<IyzicoResponse> {
  const json = JSON.stringify(body);
  const random = `${Date.now()}${randomBytes(6).toString("hex")}`;
  const signature = createHmac("sha256", credentials.secretKey)
    .update(random + path + json)
    .digest("hex");
  const authorization = Buffer.from(
    `apiKey:${credentials.apiKey}&randomKey:${random}&signature:${signature}`
  ).toString("base64");

  const response = await fetch(BASE_URL[mode] + path, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `IYZWSv2 ${authorization}`,
      "x-iyzi-rnd": random,
    },
    body: json,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = (await response.json().catch(() => null)) as IyzicoResponse | null;
  if (!data) throw new Error(`iyzico yanıt vermedi (${response.status}).`);
  return data;
}

function failure(data: IyzicoResponse, fallback = "iyzico isteği reddetti.") {
  const code = data.errorCode ? ` (kod ${data.errorCode})` : "";
  return `${data.errorMessage || fallback}${code}`;
}

export type CheckoutInput = {
  reference: string;
  amount: number;
  itemName: string;
  callbackUrl: string;
  buyerIp: string;
  buyerId: string;
  city: string;
  address: string;
};

export async function iyzicoStartCheckout(
  credentials: IyzicoCredentials,
  mode: PaymentMode,
  input: CheckoutInput
): Promise<{ ok: true; token: string; paymentUrl: string } | { ok: false; message: string }> {
  const price = iyzicoPrice(input.amount);
  // Masa müşterisinin kimlik bilgisi alınmaz; iyzico'nun misafir ödemelerde
  // kabul ettiği yer tutucu değerler kullanılır.
  const address = { contactName: "Misafir Müşteri", city: input.city, country: "Turkey", address: input.address };

  const data = await call(credentials, mode, "/payment/iyzipos/checkoutform/initialize/auth/ecom", {
    locale: "tr",
    conversationId: input.reference,
    price,
    paidPrice: price,
    currency: "TRY",
    basketId: input.reference,
    paymentGroup: "PRODUCT",
    callbackUrl: input.callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: input.buyerId,
      name: "Misafir",
      surname: "Müşteri",
      identityNumber: "11111111111",
      email: "odeme@oztdigital.com.tr",
      registrationAddress: input.address,
      ip: input.buyerIp,
      city: input.city,
      country: "Turkey",
    },
    billingAddress: address,
    shippingAddress: address,
    basketItems: [
      {
        id: input.reference,
        name: input.itemName,
        category1: "Restoran",
        itemType: "VIRTUAL",
        price,
      },
    ],
  });

  if (data.status !== "success" || typeof data.token !== "string" || typeof data.paymentPageUrl !== "string") {
    return { ok: false, message: failure(data) };
  }
  return { ok: true, token: data.token, paymentUrl: data.paymentPageUrl };
}

export type CheckoutResult =
  | { ok: true; paymentId: string; paidPrice: number; last4: string | null }
  | { ok: false; message: string };

// Ödeme sonucunu iyzico'dan doğrular. Tarayıcıdan gelen bilgiye güvenilmez.
export async function iyzicoRetrieveCheckout(
  credentials: IyzicoCredentials,
  mode: PaymentMode,
  reference: string,
  token: string
): Promise<CheckoutResult> {
  const data = await call(credentials, mode, "/payment/iyzipos/checkoutform/auth/ecom/detail", {
    locale: "tr",
    conversationId: reference,
    token,
  });

  if (data.status !== "success") return { ok: false, message: failure(data) };
  if (data.conversationId !== reference || data.basketId !== reference) {
    return { ok: false, message: "Ödeme sonucu bu işlemle eşleşmedi." };
  }
  if (data.paymentStatus !== "SUCCESS") {
    return { ok: false, message: failure(data, "Ödeme tamamlanmadı.") };
  }

  return {
    ok: true,
    paymentId: String(data.paymentId ?? ""),
    paidPrice: Number(data.paidPrice ?? 0),
    last4: typeof data.lastFourDigits === "string" ? data.lastFourDigits : null,
  };
}

// Aynı gün içindeki ödemeyi iptal eder (test ödemesinin parasını geri verir).
export async function iyzicoCancel(
  credentials: IyzicoCredentials,
  mode: PaymentMode,
  reference: string,
  paymentId: string,
  ip: string
): Promise<{ ok: boolean; message: string }> {
  const data = await call(credentials, mode, "/payment/cancel", {
    locale: "tr",
    conversationId: reference,
    paymentId,
    ip,
  });
  return data.status === "success" ? { ok: true, message: "" } : { ok: false, message: failure(data) };
}
