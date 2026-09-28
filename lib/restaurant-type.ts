import type { SupabaseClient } from "@supabase/supabase-js";

// "Sadece menü" restoranı: müşteri yalnızca menüyü görür; sipariş, garson
// çağırma, ödeme ve masa kodları yoktur. Tek bir QR kod menüye açılır.
//
// menu_only sütunu 20260930_menu_only_restaurants.sql ile eklenir. Sütun
// henüz yoksa sorgu hata verir; bu durumda restoran tam sürüm sayılır ve
// mevcut sayfalar bozulmaz.
export async function readMenuOnly(
  client: SupabaseClient,
  restaurantId: number
): Promise<boolean> {
  const { data, error } = await client
    .from("restaurants")
    .select("menu_only")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error) return false;
  return data?.menu_only === true;
}

export function restaurantMenuPath(slug: string) {
  return `/restoran/${encodeURIComponent(slug)}/menu`;
}
