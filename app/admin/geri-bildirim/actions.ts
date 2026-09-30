"use server";

import { revalidatePath } from "next/cache";
import { getAdminRestaurant } from "../../../lib/admin-restaurant";

export async function setFeedbackResolved(formData: FormData) {
  const admin = await getAdminRestaurant();
  if (!admin || admin.isDemo) return;

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  const { error } = await admin.supabase
    .from("customer_feedback")
    .update({ is_resolved: formData.get("resolved") === "1" })
    .eq("id", id)
    .eq("restaurant_id", admin.restaurantId);

  if (error) console.error("GERİ BİLDİRİM GÜNCELLENEMEDİ:", error);

  revalidatePath("/admin/geri-bildirim");
}
