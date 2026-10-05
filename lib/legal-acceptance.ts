import { createSupabaseAdminClient } from "./supabase-admin";
import { LEGAL_VERSION } from "./legal";

// İşletmenin güncel sözleşme sürümünü onaylayıp onaylamadığı.
// Tablo henüz yoksa (20261018 SQL çalıştırılmadıysa) panel engellenmez.
export async function hasAcceptedLegal(restaurantId: number) {
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("legal_acceptances")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("version", LEGAL_VERSION)
      .limit(1);
    if (error) return true;
    return (data ?? []).length > 0;
  } catch {
    return true;
  }
}
