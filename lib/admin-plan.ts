import type { SupabaseClient } from "@supabase/supabase-js";
import { hasPlanFeature, planLockMessage, type PlanFeature } from "./plan";

// Sunucu işlemlerinde paket kontrolü: özellik pakette yoksa kullanıcıya
// gösterilecek mesajı, varsa null döndürür.
export async function planGate(
  admin: { supabase: SupabaseClient; restaurantId: number },
  feature: PlanFeature
): Promise<string | null> {
  const { data } = await admin.supabase.from("restaurants").select("plan").eq("id", admin.restaurantId).maybeSingle();
  return hasPlanFeature(data?.plan, feature) ? null : planLockMessage(feature);
}
