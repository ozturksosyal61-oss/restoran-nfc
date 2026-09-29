import { redirect, unstable_rethrow } from "next/navigation";
import { createSupabaseServerClient } from "./supabase-server";

// Sistem sahibi sayfaları ve işlemleri için ortak kontrol. Oturum yoksa
// giriş sayfasına, sistem yöneticisi değilse işletme paneline yönlendirir.
export async function requireSystemAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return { supabase, user };
}

// Sayfa yönlendirmeden yalnızca "sistem yöneticisi mi?" sorusunu yanıtlar.
export async function getSystemAdminUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: systemAdmin } = await supabase
      .from("system_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    return systemAdmin ? user : null;
  } catch (error) {
    // Next.js'in "dinamik sayfa" sinyali yutulmasın.
    unstable_rethrow(error);
    return null;
  }
}

// Güçlü, okunabilir geçici şifre (karışan 0/O, 1/l harfleri yok).
export function generatePassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}
