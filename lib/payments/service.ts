import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "../supabase-admin";
import { decryptCredentials, encryptionConfigured, ENCRYPTION_KEY_MISSING_MESSAGE } from "./crypto";
import { iyzicoCancel, iyzicoRetrieveCheckout, iyzicoStartCheckout } from "./iyzico";
import { paytrRefund, paytrStartPayment, paytrVerifyNotification, type PaytrNotification } from "./paytr";
import {
  isMode,
  isProvider,
  TEST_AMOUNT,
  type IyzicoCredentials,
  type PaymentMode,
  type PaymentProvider,
  type PaytrCredentials,
} from "./providers";

// Online ödemenin sunucu tarafı. Tablolar yalnızca service role ile okunur;
// buradaki fonksiyonlar çağrılmadan ÖNCE yetki kontrolü yapılmış olmalıdır
// (sağlayıcıdan gelen dönüş ve bildirimler hariç: onlar imza ve sağlayıcı
// sorgusuyla doğrulanır).

export const PAYMENT_TABLES_MISSING_MESSAGE =
  "Online ödeme için veritabanı güncellemesi bekleniyor. Lütfen OZT Digital ile iletişime geçin.";

export type PaymentSettings = {
  restaurant_id: number;
  provider: PaymentProvider;
  mode: PaymentMode;
  is_enabled: boolean;
  credentials: string;
  credentials_hint: Record<string, string>;
  verified_at: string | null;
  updated_at: string;
};

export type PaymentTransaction = {
  id: string;
  restaurant_id: number;
  kind: "test" | "bill";
  provider: PaymentProvider;
  mode: PaymentMode;
  reference: string;
  amount: number;
  status: "pending" | "success" | "failed" | "refunded";
  provider_token: string | null;
  provider_payment_id: string | null;
  card_last4: string | null;
  message: string | null;
  created_at: string;
  completed_at: string | null;
  // Masa ödemeleri (20261007 SQL); test ödemelerinde boştur.
  tip_amount?: number | null;
  session_id?: number | null;
  table_id?: number | null;
  split_mode?: "full" | "items" | "equal" | null;
  split_of?: number | null;
  split_parts?: number | null;
};

const TX_COLUMNS =
  "id, restaurant_id, kind, provider, mode, reference, amount, status, provider_token, provider_payment_id, card_last4, message, created_at, completed_at";
const BILL_COLUMNS = `${TX_COLUMNS}, tip_amount, session_id, table_id, split_mode, split_of, split_parts`;

// Müşteri ödeme sayfasından vazgeçtiğinde yazılan not. Bu durumdaki işlem,
// sağlayıcıdan sonradan "başarılı" sonucu gelirse yine de kaydedilir.
export const CANCELLED_MESSAGE = "Ödemeden vazgeçildi.";

function isMissingTable(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "")));
}

export async function loadPaymentSettings(
  restaurantId: number
): Promise<{ settings: PaymentSettings | null; tablesMissing: boolean }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("payment_settings")
    .select("restaurant_id, provider, mode, is_enabled, credentials, credentials_hint, verified_at, updated_at")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) return { settings: null, tablesMissing: isMissingTable(error) };
  if (!data || !isProvider(data.provider) || !isMode(data.mode)) return { settings: null, tablesMissing: false };
  return { settings: data as PaymentSettings, tablesMissing: false };
}

export async function loadTransactions(restaurantId: number, kind: "test" | "bill", limit = 5) {
  const admin = createSupabaseAdminClient();
  const read = (columns: string) =>
    admin
      .from("online_payments")
      .select(columns)
      .eq("restaurant_id", restaurantId)
      .eq("kind", kind)
      .order("created_at", { ascending: false })
      .limit(limit);
  let { data, error } = await read(kind === "bill" ? BILL_COLUMNS : TX_COLUMNS);
  if (error && kind === "bill") ({ data, error } = await read(TX_COLUMNS));
  return (data ?? []) as unknown as PaymentTransaction[];
}

export async function loadTransaction(reference: string, restaurantId?: number) {
  if (!/^[A-Za-z0-9]{8,64}$/.test(reference)) return null;
  const admin = createSupabaseAdminClient();
  const read = (columns: string) => {
    let query = admin.from("online_payments").select(columns).eq("reference", reference);
    if (restaurantId !== undefined) query = query.eq("restaurant_id", restaurantId);
    return query.maybeSingle();
  };
  // Masa ödemesi sütunları yoksa (20261007 SQL çalışmadıysa) temel sütunlarla okunur.
  let { data, error } = await read(BILL_COLUMNS);
  if (error) ({ data, error } = await read(TX_COLUMNS));
  return (data as unknown as PaymentTransaction | null) ?? null;
}

// İsteğin geldiği adres ve müşterinin IP'si (sağlayıcılar IP ister).
export async function requestContext() {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "www.oztdigital.com.tr";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const ip = (list.get("x-forwarded-for") ?? "").split(",")[0].trim() || list.get("x-real-ip") || "127.0.0.1";
  return { origin: `${proto}://${host}`, ip };
}

export function newReference() {
  return `OZT${randomBytes(10).toString("hex").toUpperCase()}`;
}

// Panelde test ödemesinin sonucunun gösterildiği adres.
export function testResultPath(reference: string) {
  return `/admin/online-odeme?test=${encodeURIComponent(reference)}`;
}

// Ödeme bitince müşterinin döneceği sayfa.
export async function resultPath(tx: PaymentTransaction | null) {
  if (!tx) return "/";
  if (tx.kind === "test") return testResultPath(tx.reference);
  const { data } = await createSupabaseAdminClient()
    .from("restaurants")
    .select("slug")
    .eq("id", tx.restaurant_id)
    .maybeSingle();
  return data?.slug
    ? `/restoran/${encodeURIComponent(data.slug)}/odeme/dekont?ref=${encodeURIComponent(tx.reference)}`
    : "/";
}

export function errorText(error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") return "Ödeme sağlayıcısı zamanında yanıt vermedi.";
  return error instanceof Error ? error.message : "Bilinmeyen hata.";
}

/* ---------------------------------------------------------------
 * Ödeme sayfasını açma (test ve masa ödemesi ortak)
 * ------------------------------------------------------------- */

type CheckoutRequest = {
  settings: PaymentSettings;
  restaurantId: number;
  reference: string;
  amount: number;
  itemName: string;
  address: string;
  phone: string;
  // PayTR çerçevesinin açılacağı sayfa (panel ya da müşteri sayfası).
  paytrFramePath: string;
};

// İşlem satırı önceden oluşturulmuş olmalıdır. Başarısızlıkta işlem
// "başarısız" işaretlenir; masa ödemesinde ayrılan ürünler serbest kalır.
export async function openCheckout(
  request: CheckoutRequest
): Promise<{ ok: true; redirectUrl: string } | { ok: false; message: string }> {
  const { settings, restaurantId, reference, amount, itemName, address } = request;
  const admin = createSupabaseAdminClient();
  const { origin, ip } = await requestContext();

  async function fail(message: string) {
    await admin
      .from("online_payments")
      .update({ status: "failed", message, completed_at: new Date().toISOString() })
      .eq("reference", reference)
      .eq("status", "pending");
    return { ok: false as const, message };
  }

  try {
    if (settings.provider === "iyzico") {
      const credentials = decryptCredentials<IyzicoCredentials>(settings.credentials, restaurantId);
      const result = await iyzicoStartCheckout(credentials, settings.mode, {
        reference,
        amount,
        itemName,
        callbackUrl: `${origin}/api/odeme/iyzico/donus?ref=${reference}`,
        buyerIp: ip,
        buyerId: `R${restaurantId}`,
        city: "Türkiye",
        address,
      });
      if (!result.ok) return fail(result.message);
      await admin.from("online_payments").update({ provider_token: result.token }).eq("reference", reference);
      return { ok: true, redirectUrl: result.paymentUrl };
    }

    const credentials = decryptCredentials<PaytrCredentials>(settings.credentials, restaurantId);
    const back = `${origin}/odeme-donus?ref=${reference}`;
    const result = await paytrStartPayment(credentials, settings.mode, {
      reference,
      amount,
      itemName,
      buyerIp: ip,
      okUrl: back,
      failUrl: back,
      phone: request.phone.replace(/[^\d+]/g, "") || "05000000000",
      address,
    });
    if (!result.ok) return fail(result.message);
    await admin.from("online_payments").update({ provider_token: result.token }).eq("reference", reference);
    return { ok: true, redirectUrl: `${request.paytrFramePath}?ref=${reference}` };
  } catch (error) {
    return fail(errorText(error));
  }
}

export async function startTestPayment(
  restaurantId: number,
  userId: string
): Promise<{ ok: true; redirectUrl: string } | { ok: false; message: string }> {
  if (!encryptionConfigured()) return { ok: false, message: ENCRYPTION_KEY_MISSING_MESSAGE };

  const { settings, tablesMissing } = await loadPaymentSettings(restaurantId);
  if (tablesMissing) return { ok: false, message: PAYMENT_TABLES_MISSING_MESSAGE };
  if (!settings) return { ok: false, message: "Önce ödeme sağlayıcınızın bilgilerini kaydedin." };

  const admin = createSupabaseAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("name, address, phone")
    .eq("id", restaurantId)
    .maybeSingle();

  const reference = newReference();
  const { error: insertError } = await admin.from("online_payments").insert({
    restaurant_id: restaurantId,
    kind: "test",
    provider: settings.provider,
    mode: settings.mode,
    reference,
    amount: TEST_AMOUNT,
    created_by: userId,
  });
  if (insertError) {
    return { ok: false, message: isMissingTable(insertError) ? PAYMENT_TABLES_MISSING_MESSAGE : insertError.message };
  }

  return openCheckout({
    settings,
    restaurantId,
    reference,
    amount: TEST_AMOUNT,
    itemName: "Bağlantı testi",
    address: String(restaurant?.address ?? "").trim() || String(restaurant?.name ?? "Restoran"),
    phone: String(restaurant?.phone ?? ""),
    paytrFramePath: "/admin/online-odeme/paytr",
  });
}

/* ---------------------------------------------------------------
 * Sonuçlandırma (iyzico dönüşü ve PayTR bildirimi ortak)
 * ------------------------------------------------------------- */

async function finish(
  tx: PaymentTransaction,
  settings: PaymentSettings,
  outcome: { ok: true; paymentId: string; last4: string | null } | { ok: false; message: string },
  refund: () => Promise<{ ok: boolean; message: string }>
) {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (!outcome.ok) {
    await admin
      .from("online_payments")
      .update({ status: "failed", message: outcome.message, completed_at: now })
      .eq("id", tx.id)
      .eq("status", "pending");
    return;
  }

  // Yalnızca sonuçlanmamış ya da müşterinin vazgeçtiği işlem güncellenir;
  // para çekildiyse vazgeçilmiş olsa bile kayda geçmelidir.
  if (tx.status !== "pending" && !(tx.status === "failed" && tx.message === CANCELLED_MESSAGE)) return;

  let status: PaymentTransaction["status"] = "success";
  let message = "Ödeme başarılı.";

  // Canlı moddaki test ödemesinin parası hemen geri verilir.
  if (tx.kind === "test" && tx.mode === "live") {
    try {
      const refunded = await refund();
      status = refunded.ok ? "refunded" : "success";
      message = refunded.ok
        ? "Ödeme başarılı, 1 ₺ iade edildi."
        : `Ödeme başarılı ancak iade yapılamadı: ${refunded.message} İadeyi sağlayıcı panelinizden yapabilirsiniz.`;
    } catch (error) {
      message = `Ödeme başarılı ancak iade yapılamadı: ${errorText(error)} İadeyi sağlayıcı panelinizden yapabilirsiniz.`;
    }
  }

  const { data: updated } = await admin
    .from("online_payments")
    .update({
      status,
      message,
      provider_payment_id: outcome.paymentId || null,
      card_last4: outcome.last4,
      completed_at: now,
    })
    .eq("id", tx.id)
    .eq("status", tx.status)
    .select("id");

  // Masa ödemesi: hesap tamamen ödendiyse siparişler kapanır.
  if (tx.kind === "bill" && updated?.length) {
    const { error } = await admin.rpc("settle_table_payment", { p_transaction_id: tx.id });
    if (error) console.error("Masa hesabı kapatılamadı", error);
  }

  // Test, bu ayarlarla yapıldıysa bağlantı doğrulanmış sayılır. Test
  // başladıktan sonra anahtarlar değiştiyse doğrulama verilmez.
  if (
    tx.kind === "test" &&
    updated?.length &&
    settings.provider === tx.provider &&
    settings.mode === tx.mode &&
    new Date(settings.updated_at) <= new Date(tx.created_at)
  ) {
    await admin.from("payment_settings").update({ verified_at: now }).eq("restaurant_id", tx.restaurant_id);
  }
}

// iyzico ödeme formundan dönen müşteri. Sonuç iyzico'ya sorularak doğrulanır.
export async function completeIyzico(reference: string, token: string, ip: string) {
  const tx = await loadTransaction(reference);
  if (!tx || tx.provider !== "iyzico") return null;
  const open = tx.status === "pending" || (tx.status === "failed" && tx.message === CANCELLED_MESSAGE);
  if (!open || !token || token !== tx.provider_token) return tx;

  const { settings } = await loadPaymentSettings(tx.restaurant_id);
  if (!settings || settings.provider !== "iyzico") {
    await createSupabaseAdminClient()
      .from("online_payments")
      .update({ status: "failed", message: "Ödeme ayarları bulunamadı.", completed_at: new Date().toISOString() })
      .eq("id", tx.id)
      .eq("status", "pending");
    return tx;
  }

  try {
    const credentials = decryptCredentials<IyzicoCredentials>(settings.credentials, tx.restaurant_id);
    const result = await iyzicoRetrieveCheckout(credentials, tx.mode, reference, token);
    const outcome =
      result.ok && Math.abs(result.paidPrice - Number(tx.amount)) > 0.009
        ? { ok: false as const, message: "Ödenen tutar beklenen tutarla eşleşmedi." }
        : result;
    await finish(tx, settings, outcome, () =>
      result.ok ? iyzicoCancel(credentials, tx.mode, reference, result.paymentId, ip) : Promise.resolve({ ok: false, message: "" })
    );
  } catch (error) {
    await finish(tx, settings, { ok: false, message: errorText(error) }, async () => ({ ok: false, message: "" }));
  }
  return tx;
}

// PayTR'nin sunucumuza gönderdiği bildirim. true: PayTR'ye "OK" dönülür.
export async function handlePaytrNotification(notification: PaytrNotification) {
  const tx = await loadTransaction(notification.merchant_oid);
  if (!tx || tx.provider !== "paytr") return false;

  const { settings } = await loadPaymentSettings(tx.restaurant_id);
  if (!settings || settings.provider !== "paytr") return false;

  const credentials = decryptCredentials<PaytrCredentials>(settings.credentials, tx.restaurant_id);
  if (!paytrVerifyNotification(credentials, notification)) return false;

  // Aynı bildirim birden çok kez gelebilir; sonuçlanmış işlem değişmez.
  const open = tx.status === "pending" || (tx.status === "failed" && tx.message === CANCELLED_MESSAGE);
  if (!open) return true;

  const expected = Math.round(Number(tx.amount) * 100);
  const outcome =
    notification.status !== "success"
      ? {
          ok: false as const,
          message:
            [notification.failed_reason_msg, notification.failed_reason_code && `(kod ${notification.failed_reason_code})`]
              .filter(Boolean)
              .join(" ") || "Ödeme tamamlanmadı.",
        }
      : Number(notification.total_amount) < expected
        ? { ok: false as const, message: "Ödenen tutar beklenen tutarla eşleşmedi." }
        : { ok: true as const, paymentId: notification.merchant_oid, last4: null };

  await finish(tx, settings, outcome, () => paytrRefund(credentials, tx.reference, Number(tx.amount)));
  return true;
}
