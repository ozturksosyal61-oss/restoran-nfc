import { createHmac, timingSafeEqual } from "crypto";
import { failure, iyzicoPrice, iyzicoRequest } from "../payments/iyzico";
import type { PaymentMode } from "../payments/providers";

// iyzico Abonelik (v2) API'si: platformun kendi iyzico hesabıyla restoranlardan
// abonelik ücretini otomatik tahsil eder. Kart iyzico'nun formunda girilir.
// Belgeler: docs.iyzico.com → Ürünler → Abonelik; Ek servisler → Webhook.

export type BillingCredentials = { apiKey: string; secretKey: string; merchantId: string };

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; message: string };

const creds = (c: BillingCredentials) => ({ apiKey: c.apiKey, secretKey: c.secretKey });

function data(response: Record<string, unknown>) {
  return (response.data ?? {}) as Record<string, unknown>;
}

// Anahtarları denemek için zararsız bir okuma isteği.
export async function testConnection(c: BillingCredentials, mode: PaymentMode): Promise<Ok<object> | Fail> {
  const response = await iyzicoRequest(creds(c), mode, "GET", "/v2/subscription/products?page=1&count=1");
  return response.status === "success" ? { ok: true } : { ok: false, message: failure(response) };
}

export async function createProduct(c: BillingCredentials, mode: PaymentMode): Promise<Ok<{ ref: string }> | Fail> {
  const response = await iyzicoRequest(creds(c), mode, "POST", "/v2/subscription/products", {
    locale: "tr",
    name: "OZT Digital Menü aboneliği",
    description: "Restoranlar için QR / NFC dijital menü ve sipariş sistemi",
  });
  const ref = data(response).referenceCode;
  return response.status === "success" && typeof ref === "string"
    ? { ok: true, ref }
    : { ok: false, message: failure(response) };
}

export async function createPricingPlan(
  c: BillingCredentials,
  mode: PaymentMode,
  productRef: string,
  input: { name: string; price: number; interval: "monthly" | "yearly" }
): Promise<Ok<{ ref: string }> | Fail> {
  const response = await iyzicoRequest(creds(c), mode, "POST", `/v2/subscription/products/${productRef}/pricing-plans`, {
    locale: "tr",
    name: input.name,
    price: iyzicoPrice(input.price),
    currencyCode: "TRY",
    paymentInterval: input.interval === "yearly" ? "YEARLY" : "MONTHLY",
    paymentIntervalCount: 1,
    planPaymentType: "RECURRING",
  });
  const ref = data(response).referenceCode;
  return response.status === "success" && typeof ref === "string"
    ? { ok: true, ref }
    : { ok: false, message: failure(response) };
}

export type SubscriberInfo = {
  name: string;
  surname: string;
  email: string;
  phone: string;
  identity: string;
  city: string;
  address: string;
};

export async function initSubscriptionCheckout(
  c: BillingCredentials,
  mode: PaymentMode,
  input: { pricingPlanRef: string; callbackUrl: string; conversationId: string; subscriber: SubscriberInfo }
): Promise<Ok<{ token: string; content: string }> | Fail> {
  const s = input.subscriber;
  const address = { contactName: `${s.name} ${s.surname}`, city: s.city, country: "Turkey", address: s.address };
  const response = await iyzicoRequest(creds(c), mode, "POST", "/v2/subscription/checkoutform/initialize", {
    locale: "tr",
    conversationId: input.conversationId,
    callbackUrl: input.callbackUrl,
    pricingPlanReferenceCode: input.pricingPlanRef,
    subscriptionInitialStatus: "ACTIVE",
    customer: {
      name: s.name,
      surname: s.surname,
      email: s.email,
      gsmNumber: s.phone,
      identityNumber: s.identity,
      billingAddress: address,
      shippingAddress: address,
    },
  });
  const token = response.token;
  const content = response.checkoutFormContent;
  return response.status === "success" && typeof token === "string" && typeof content === "string"
    ? { ok: true, token, content }
    : { ok: false, message: failure(response) };
}

export async function retrieveSubscriptionCheckout(
  c: BillingCredentials,
  mode: PaymentMode,
  token: string
): Promise<Ok<{ subscriptionRef: string; customerRef: string; status: string }> | Fail> {
  const response = await iyzicoRequest(creds(c), mode, "GET", `/v2/subscription/checkoutform/${encodeURIComponent(token)}`);
  const d = data(response);
  return response.status === "success" && typeof d.referenceCode === "string"
    ? {
        ok: true,
        subscriptionRef: d.referenceCode,
        customerRef: String(d.customerReferenceCode ?? ""),
        status: String(d.subscriptionStatus ?? ""),
      }
    : { ok: false, message: failure(response, "Abonelik başlatılamadı.") };
}

export type SubscriptionSnapshot = {
  status: string;
  pricingPlanRef: string | null;
  customerRef: string | null;
  // Başarılı ödenmiş son dönemin sonu (epoch ms).
  paidUntil: number | null;
  lastFailedOrderRef: string | null;
  lastFailureMessage: string | null;
};

export async function getSubscription(
  c: BillingCredentials,
  mode: PaymentMode,
  subscriptionRef: string
): Promise<Ok<{ snapshot: SubscriptionSnapshot }> | Fail> {
  const response = await iyzicoRequest(
    creds(c),
    mode,
    "GET",
    `/v2/subscription/subscriptions/${encodeURIComponent(subscriptionRef)}`
  );
  if (response.status !== "success") return { ok: false, message: failure(response) };

  const d = data(response);
  const items = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [d];
  const item = items.find((entry) => entry.referenceCode === subscriptionRef) ?? items[0] ?? {};
  const orders = Array.isArray(item.orders) ? (item.orders as Record<string, unknown>[]) : [];

  let paidUntil: number | null = null;
  let lastFailedOrderRef: string | null = null;
  let lastFailureMessage: string | null = null;
  let lastFailedStart = -1;

  for (const order of orders) {
    const status = String(order.orderStatus ?? "");
    const end = Number(order.endPeriod);
    const start = Number(order.startPeriod);
    if (status === "SUCCESS" && Number.isFinite(end)) paidUntil = Math.max(paidUntil ?? 0, end);
    if (status === "FAILED" && Number.isFinite(start) && start > lastFailedStart) {
      lastFailedStart = start;
      lastFailedOrderRef = typeof order.referenceCode === "string" ? order.referenceCode : null;
      const attempts = Array.isArray(order.paymentAttempts) ? (order.paymentAttempts as Record<string, unknown>[]) : [];
      const last = attempts[attempts.length - 1];
      lastFailureMessage = last?.errorMessage ? String(last.errorMessage) : null;
    }
  }

  return {
    ok: true,
    snapshot: {
      status: String(item.subscriptionStatus ?? ""),
      pricingPlanRef: typeof item.pricingPlanReferenceCode === "string" ? item.pricingPlanReferenceCode : null,
      customerRef: typeof item.customerReferenceCode === "string" ? item.customerReferenceCode : null,
      paidUntil,
      lastFailedOrderRef,
      lastFailureMessage,
    },
  };
}

export async function cancelSubscription(c: BillingCredentials, mode: PaymentMode, subscriptionRef: string): Promise<Ok<object> | Fail> {
  const response = await iyzicoRequest(
    creds(c),
    mode,
    "POST",
    `/v2/subscription/subscriptions/${encodeURIComponent(subscriptionRef)}/cancel`,
    { locale: "tr" }
  );
  return response.status === "success" ? { ok: true } : { ok: false, message: failure(response) };
}

// Paket değişikliği bir sonraki dönemden geçerli olur (ödenmiş dönem bozulmaz).
export async function changeSubscriptionPlan(
  c: BillingCredentials,
  mode: PaymentMode,
  subscriptionRef: string,
  newPricingPlanRef: string
): Promise<Ok<{ newSubscriptionRef: string | null }> | Fail> {
  const response = await iyzicoRequest(
    creds(c),
    mode,
    "POST",
    `/v2/subscription/subscriptions/${encodeURIComponent(subscriptionRef)}/upgrade`,
    { locale: "tr", newPricingPlanReferenceCode: newPricingPlanRef, upgradePeriod: "NEXT_PERIOD", useTrial: false, resetRecurrenceCount: true }
  );
  const d = data(response);
  return response.status === "success"
    ? { ok: true, newSubscriptionRef: typeof d.referenceCode === "string" ? d.referenceCode : null }
    : { ok: false, message: failure(response) };
}

export async function initCardUpdate(
  c: BillingCredentials,
  mode: PaymentMode,
  input: { customerRef: string; subscriptionRef: string; callbackUrl: string }
): Promise<Ok<{ token: string; content: string }> | Fail> {
  const response = await iyzicoRequest(creds(c), mode, "POST", "/v2/subscription/card-update/checkoutform/initialize", {
    locale: "tr",
    callbackUrl: input.callbackUrl,
    customerReferenceCode: input.customerRef,
    subscriptionReferenceCode: input.subscriptionRef,
  });
  const token = response.token;
  const content = response.checkoutFormContent;
  return response.status === "success" && typeof token === "string" && typeof content === "string"
    ? { ok: true, token, content }
    : { ok: false, message: failure(response) };
}

// Başarısız dönemin ödemesini yeniden dener (kart güncellendikten sonra).
export async function retryOrder(c: BillingCredentials, mode: PaymentMode, orderRef: string): Promise<Ok<object> | Fail> {
  const response = await iyzicoRequest(creds(c), mode, "POST", "/v2/subscription/operation/retry", {
    locale: "tr",
    referenceCode: orderRef,
  });
  return response.status === "success" ? { ok: true } : { ok: false, message: failure(response) };
}

export type WebhookPayload = {
  orderReferenceCode?: string;
  customerReferenceCode?: string;
  subscriptionReferenceCode?: string;
  iyziEventType?: string;
};

// X-IYZ-SIGNATURE-V3 = HMAC-SHA256(secretKey, merchantId + secretKey + eventType +
// subscriptionReferenceCode + orderReferenceCode + customerReferenceCode) → hex
export function verifyWebhook(c: BillingCredentials, payload: WebhookPayload, signature: string | null) {
  if (!c.merchantId || !signature) return false;
  const message =
    c.merchantId +
    c.secretKey +
    (payload.iyziEventType ?? "") +
    (payload.subscriptionReferenceCode ?? "") +
    (payload.orderReferenceCode ?? "") +
    (payload.customerReferenceCode ?? "");
  const expected = Buffer.from(createHmac("sha256", c.secretKey).update(message).digest("hex"));
  const given = Buffer.from(signature.trim().toLowerCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}
