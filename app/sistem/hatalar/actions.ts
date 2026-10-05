"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { requireSystemAdmin } from "../../../lib/system-admin";

// Hata kayıtları: çözüldü işaretle / yeniden aç / çözülenleri temizle.

export async function resolveErrorAction(formData: FormData) {
  await requireSystemAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const reopen = formData.get("reopen") === "1";

  await createSupabaseAdminClient()
    .from("error_logs")
    .update({ resolved_at: reopen ? null : new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/sistem/hatalar");
}

export async function clearResolvedAction() {
  await requireSystemAdmin();
  await createSupabaseAdminClient().from("error_logs").delete().not("resolved_at", "is", null);
  revalidatePath("/sistem/hatalar");
}
