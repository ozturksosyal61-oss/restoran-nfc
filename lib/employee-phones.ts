import type { SupabaseClient } from "@supabase/supabase-js";

// Çalışan telefonları tablodan doğrudan okunamaz; yalnızca kendi
// restoranının yöneticisi get_employee_phones() ile alabilir.
// Fonksiyon henüz yoksa (migration çalışmamışsa) telefonlar boş gelir.
export async function loadEmployeePhones(
  supabase: SupabaseClient,
  restaurantId: number
): Promise<Map<number, string | null>> {
  const { data, error } = await supabase.rpc("get_employee_phones", {
    p_restaurant_id: restaurantId,
  });

  if (error) {
    console.error("Çalışan telefonları alınamadı:", error.message);
    return new Map();
  }

  return new Map(
    ((data ?? []) as { id: number; phone: string | null }[]).map((row) => [
      Number(row.id),
      row.phone,
    ])
  );
}
