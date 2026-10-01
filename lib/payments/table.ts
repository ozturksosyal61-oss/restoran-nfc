import { hasPlanFeature } from "../plan";
import { createSupabaseAdminClient } from "../supabase-admin";
import { encryptionConfigured } from "./crypto";
import { PROVIDERS } from "./providers";
import {
  CANCELLED_MESSAGE,
  loadPaymentSettings,
  newReference,
  openCheckout,
  type PaymentSettings,
} from "./service";

// Masadan kartla ödeme (müşteri tarafı). Müşteri oturum açmaz; masa kodu
// (QR'daki gizli anahtar) her istekte veritabanında yeniden doğrulanır.
// Tutarlar ve ayrılan ürünler yalnızca veritabanı fonksiyonlarında hesaplanır.

export type SplitMode = "full" | "items" | "equal";

export type TableItem = {
  id: number;
  order_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  paid_units: number;
  taken_units: number;
};

export type TableState = {
  open: boolean;
  table_number: string;
  open_total?: number;
  paid_total?: number;
  pending_total?: number;
  due?: number;
  remaining?: number;
  items?: TableItem[];
  split?: { of: number; total: number; share: number; parts_taken: number } | null;
};

export type TablePaymentInfo = {
  enabled: boolean;
  providerName: string | null;
  state: TableState | null;
  error?: string;
};

const UNAVAILABLE = "Bu restoranda online ödeme şu anda kullanılamıyor. Ödemenizi garsonunuza yapabilirsiniz.";

async function loadRestaurant(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/i.test(slug)) return null;
  const { data } = await createSupabaseAdminClient()
    .from("restaurants")
    .select("id, name, slug, address, phone, plan, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.is_active === false) return null;
  return data;
}

async function menuOnly(restaurantId: number) {
  const { data, error } = await createSupabaseAdminClient()
    .from("restaurants")
    .select("menu_only")
    .eq("id", restaurantId)
    .maybeSingle();
  return !error && data?.menu_only === true;
}

// Online ödeme müşteriye açık mı: Pro/Premium, sadece menü değil, sağlayıcı
// bağlı, test edilmiş ve restoran tarafından açılmış.
async function activeSettings(restaurant: { id: number; plan: unknown }): Promise<PaymentSettings | null> {
  if (!encryptionConfigured() || !hasPlanFeature(restaurant.plan, "orders")) return null;
  if (await menuOnly(Number(restaurant.id))) return null;
  const { settings } = await loadPaymentSettings(Number(restaurant.id));
  if (!settings || !settings.is_enabled || !settings.verified_at) return null;
  return settings;
}

function validToken(token: string) {
  return /^[A-Za-z0-9_-]{6,128}$/.test(token);
}

function dbMessage(error: { message?: string } | null, fallback: string) {
  const message = error?.message ?? "";
  // Veritabanı fonksiyonlarının Türkçe açıklamaları müşteriye gösterilir.
  return /[ğüşıöçĞÜŞİÖÇ]/.test(message) ? message : fallback;
}

export async function getTablePaymentInfo(slug: string, token: string): Promise<TablePaymentInfo> {
  const restaurant = await loadRestaurant(slug);
  if (!restaurant || !validToken(token)) {
    return { enabled: false, providerName: null, state: null, error: "Masa doğrulanamadı." };
  }

  const settings = await activeSettings(restaurant);
  if (!settings) return { enabled: false, providerName: null, state: null };

  const { data, error } = await createSupabaseAdminClient().rpc("get_table_payment_state", {
    p_restaurant_id: restaurant.id,
    p_public_token: token,
  });

  if (error) {
    return {
      enabled: true,
      providerName: PROVIDERS[settings.provider].name,
      state: null,
      error: dbMessage(error, "Hesap bilgisi alınamadı."),
    };
  }

  return { enabled: true, providerName: PROVIDERS[settings.provider].name, state: data as TableState };
}

export type StartTablePaymentInput = {
  slug: string;
  token: string;
  mode: SplitMode;
  items: { id: number; units: number }[];
  splitOf: number | null;
  parts: number | null;
  tip: number;
};

export async function startTablePayment(
  input: StartTablePaymentInput
): Promise<{ ok: true; redirectUrl: string; reference: string } | { ok: false; message: string }> {
  const restaurant = await loadRestaurant(input.slug);
  if (!restaurant || !validToken(input.token)) return { ok: false, message: "Masa doğrulanamadı." };

  const settings = await activeSettings(restaurant);
  if (!settings) return { ok: false, message: UNAVAILABLE };

  const reference = newReference();
  const { data, error } = await createSupabaseAdminClient().rpc("reserve_table_payment", {
    p_restaurant_id: restaurant.id,
    p_public_token: input.token,
    p_mode: input.mode,
    p_items: input.mode === "items" ? input.items : null,
    p_split_of: input.mode === "equal" ? input.splitOf : null,
    p_parts: input.mode === "equal" ? input.parts : null,
    p_tip: input.tip,
    p_reference: reference,
    p_provider: settings.provider,
    p_pay_mode: settings.mode,
  });

  if (error || !data) return { ok: false, message: dbMessage(error, "Ödeme başlatılamadı. Lütfen tekrar deneyin.") };

  const reserved = data as { amount: number; table_number: string };
  const result = await openCheckout({
    settings,
    restaurantId: Number(restaurant.id),
    reference,
    amount: Number(reserved.amount),
    itemName: `Masa ${reserved.table_number} hesabı`,
    address: String(restaurant.address ?? "").trim() || String(restaurant.name),
    phone: String(restaurant.phone ?? ""),
    paytrFramePath: `/restoran/${encodeURIComponent(restaurant.slug)}/odeme/kart/paytr`,
  });

  if (!result.ok) return { ok: false, message: `Ödeme sayfası açılamadı: ${result.message}` };
  return { ok: true, redirectUrl: result.redirectUrl, reference };
}

// Müşteri ödeme sayfasından vazgeçti: ayrılan ürünler hemen serbest kalır.
export async function cancelTablePayment(reference: string) {
  if (!/^[A-Za-z0-9]{8,64}$/.test(reference)) return false;
  const { data } = await createSupabaseAdminClient()
    .from("payment_transactions")
    .update({ status: "failed", message: CANCELLED_MESSAGE, completed_at: new Date().toISOString() })
    .eq("reference", reference)
    .eq("kind", "bill")
    .eq("status", "pending")
    .select("id");
  return Boolean(data?.length);
}
