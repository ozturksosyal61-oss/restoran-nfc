"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import { normalizeRestaurantTheme } from "../../lib/themes";

export async function updateRestaurantPlan(formData: FormData) {
  const restaurantId = Number(formData.get("restaurant_id"));
  const plan = String(formData.get("plan") || "starter").toLowerCase();

  const theme = normalizeRestaurantTheme(
    String(formData.get("theme") || "classic").toLowerCase()
  );

  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new Error("Geçersiz restoran ID.");
  }

  if (!["starter", "pro", "premium"].includes(plan)) {
    throw new Error("Geçersiz paket.");
  }

  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sistem/login");
  }

  const { data: systemAdmin } = await supabase
    .from("system_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!systemAdmin) {
    redirect("/admin");
  }

  const { error } = await supabase
    .from("restaurants")
    .update({ plan, theme })
    .eq("id", restaurantId);

  if (error) {
    console.error("RESTORAN PAKET / TEMA GÜNCELLEME HATASI:", error);
    throw new Error(`Paket ve tema güncellenemedi: ${error.message}`);
  }

  revalidatePath("/sistem");
  revalidatePath("/restoran/[slug]", "page");
  revalidatePath("/restoran/[slug]/menu", "page");
}
