import { createSupabaseServerClient } from "./supabase-server";

type AccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

// Oturumdaki kullanıcının bu restoranın yöneticisi veya sistem yöneticisi
// olup olmadığını kontrol eder. Service role ile yazmadan önce çağrılmalı.
export async function checkRestaurantAccess(
  restaurantId: number
): Promise<AccessResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Oturum bulunamadı." };
  }

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (membership) {
    return { ok: true, userId: user.id };
  }

  const { data: systemAdmin } = await supabase
    .from("system_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (systemAdmin) {
    return { ok: true, userId: user.id };
  }

  return {
    ok: false,
    status: 403,
    error: "Bu restoran için yetkiniz yok.",
  };
}

// Demo ödeme gerçek para almaz; canlıda kapalıdır.
// Yerelde (next dev) test için açıktır. Canlıda bilinçli olarak açmak
// gerekirse DEMO_PAYMENTS_ENABLED=true ortam değişkeni kullanılır.
export function demoPaymentsEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.DEMO_PAYMENTS_ENABLED === "true"
  );
}

export const DEMO_PAYMENTS_DISABLED_MESSAGE =
  "Online ödeme şu anda kapalı. Paketinizi aktifleştirmek için lütfen bizimle iletişime geçin.";
