import { createClient } from "../../../lib/supabase/client";

// "₺1.160" biçiminde fiyat.
export function formatLira(value: number) {
  return `₺${Number(value || 0).toLocaleString("tr-TR", {
    maximumFractionDigits: 2,
  })}`;
}

// Admin panelinde virgül, noktalı virgül veya satır sonuyla girilen listeyi ayırır.
// Arapça çevirilerdeki "،" ve "؛" işaretleri de ayırıcı sayılır.
export function splitList(value: string | null | undefined) {
  return (value || "")
    .split(/[,;\n،؛]+/)
    .map((part) => part.trim().replace(/\.+$/, ""))
    .filter(Boolean);
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
