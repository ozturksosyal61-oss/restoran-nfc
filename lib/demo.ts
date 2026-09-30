import { createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Salt okunur demo yönetim paneli (/demo/panel). Yalnızca sunucu kodunda.
//
// Demo hesabının şifresi hiçbir yerde yazılı değildir; service role
// anahtarından türetilir. Ziyaretçi hesabı değiştirmeye çalışsa bile
// veritabanı (20261005_demo_panel.sql) yazmayı reddeder, giriş bağlantısı
// da şifre ve e-postayı her seferinde onarır.

export const DEMO_RESTAURANT_SLUG = "mira-kitchen";
export const DEMO_EMAIL = "demo-panel@oztdigital.com.tr";

export const DEMO_BLOCKED_MESSAGE =
  "Demo panelinde değişiklik yapılamaz. Bu panel yalnızca inceleme içindir.";

export function demoPassword() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY tanımlı değil.");
  return createHmac("sha256", key).update("ozt-demo-panel-v1").digest("base64url").slice(0, 32);
}

// Oturumdaki kullanıcı demo hesabı mı? Veritabanı güncellenmemişse false.
export async function isDemoSession(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("is_demo_user");
  return !error && data === true;
}
