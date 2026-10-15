import { createClient } from "../../../lib/supabase/client";

// "₺1.160" biçiminde fiyat.
// Fiyat ve sayı biçimi menünün diline göre: Türkçede "₺1.220", İngilizcede
// "₺1,220". Menü dili değişince useMenuController ayarlar (yalnızca tarayıcıda;
// sunucuda her zaman Türkçe).
let numberLocale = "tr-TR";

export function setNumberLocale(locale: string) {
  if (typeof window !== "undefined") numberLocale = locale;
}

const formatters = new Map<string, Intl.NumberFormat>();

// Tam sayılar kuruşsuz ("₺1.220"), kuruşlular iki haneli ("₺12,50").
export function formatLira(value: number, locale: string = numberLocale) {
  const amount = Number(value || 0);
  const digits = Number.isInteger(Math.round(amount * 100) / 100) ? 0 : 2;
  const key = `${locale}|${digits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "TRY",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(key, formatter);
  }
  return formatter.format(amount);
}

// Admin panelinde virgül, noktalı virgül veya satır sonuyla girilen listeyi ayırır.
// Arapça çevirilerdeki "،" ve "؛" işaretleri de ayırıcı sayılır.
export function splitList(value: string | null | undefined) {
  return (value || "")
    .split(/[,;\n،؛]+/)
    .map((part) => part.trim().replace(/\.+$/, ""))
    // "—", "-" gibi "yok" anlamındaki işaretler liste öğesi değildir.
    .filter((part) => part && !/^[-–—\s]+$/.test(part));
}

export function readSavedTableToken() {
  try {
    return window.localStorage.getItem("ozt_table_token")?.trim() || "";
  } catch {
    return "";
  }
}

export function readLastOrderId(slug: string, token: string) {
  try {
    const value = window.localStorage.getItem(`ozt_last_order_${slug}_${token}`) || "";
    return /^\d+$/.test(value) ? value : "";
  } catch {
    return "";
  }
}

export type TableRequestType = "garson" | "hesap";

// Garson / hesap talebi. Masa kodu veritabanı fonksiyonunda doğrulanır.
export async function sendTableRequest(
  restaurantId: number,
  tableToken: string,
  type: TableRequestType
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("create_table_service_request", {
    p_restaurant_id: restaurantId,
    p_public_token: tableToken,
    p_request_type: type,
  });

  if (error) {
    console.error(`Masa talebi (${type}) gönderilemedi:`, error);
    return false;
  }

  return true;
}
