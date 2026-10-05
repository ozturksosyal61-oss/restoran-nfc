"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import { createSupabaseAdminClient } from "../../lib/supabase-admin";
import { isDemoSession } from "../../lib/demo";
import { ACCEPTANCE_DOCUMENTS, LEGAL_VERSION } from "../../lib/legal";

export type LegalActionResult = { ok: boolean; message: string } | null;

// İşletme yetkilisinin sözleşmeleri onayı: kim, hangi sürüm, ne zaman, hangi IP.
export async function acceptLegalAction(_prev: LegalActionResult, formData: FormData): Promise<LegalActionResult> {
  const missing = ACCEPTANCE_DOCUMENTS.filter((document) => formData.get(document.key) !== "on");
  if (missing.length > 0) {
    return { ok: false, message: "Devam etmek için tüm belgeleri onaylayın." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  if (await isDemoSession(supabase)) return { ok: false, message: "Demo panelinde onay gerekmez." };

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership?.restaurant_id) return { ok: false, message: "İşletme bağlantısı bulunamadı." };

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || null;

  const { error } = await createSupabaseAdminClient()
    .from("legal_acceptances")
    .insert({
      restaurant_id: Number(membership.restaurant_id),
      user_id: user.id,
      user_email: user.email ?? null,
      version: LEGAL_VERSION,
      documents: ACCEPTANCE_DOCUMENTS.map((document) => document.key),
      ip_address: ip,
      user_agent: headerList.get("user-agent")?.slice(0, 300) ?? null,
    });

  if (error) return { ok: false, message: `Onay kaydedilemedi: ${error.message}` };

  revalidatePath("/admin", "layout");
  return { ok: true, message: "Teşekkürler, onayınız kaydedildi." };
}
