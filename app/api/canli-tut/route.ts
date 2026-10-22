import { isCronAuthorized } from "../../../lib/cron-auth";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";

// Supabase ücretsiz planı 7 gün hareketsiz kalan projeyi uykuya alır; uyuyan
// projede menüler açılmaz. Vercel zamanlanmış görevi (vercel.json) her gün
// buraya gelir ve veritabanına küçük bir okuma isteği gönderir.

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return new Response("UNAUTHORIZED", { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { count, error } = await admin.from("restaurants").select("id", { count: "exact", head: true });
  if (error) {
    console.error("Canlı tutma sorgusu başarısız", error);
    return new Response("ERROR", { status: 500 });
  }
  return Response.json({ ok: true, restaurants: count, at: new Date().toISOString() });
}
