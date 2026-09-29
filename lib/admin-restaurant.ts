import { createSupabaseServerClient } from "./supabase-server";

// İşletme paneli işlemleri için: oturumdaki kullanıcı ve bağlı olduğu
// restoran. Yazma işlemleri bu oturumla yapılır; RLS kuralları geçerlidir.
export async function getAdminRestaurant() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const restaurantId = Number(membership?.restaurant_id);
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) return null;

  return { supabase, user, restaurantId };
}
